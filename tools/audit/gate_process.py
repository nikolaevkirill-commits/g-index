"""Contain and drain an audit command's child processes before recording its result."""
import ctypes
import os
from pathlib import Path
import signal
import subprocess
import time


def _drain_linux(proc):
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    children = Path(f"/proc/self/task/{os.getpid()}/children")
    deadline = time.monotonic() + 5
    while True:
        for pid in map(int, children.read_text().split()):
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        while True:
            try:
                pid, _ = os.waitpid(-1, os.WNOHANG)
                if not pid:
                    break
            except ChildProcessError:
                return
        if time.monotonic() >= deadline:
            raise RuntimeError("Linux process tree did not drain")
        time.sleep(.02)


def _linux(argv, cwd, env, timeout, log):
    # Adopt detached grandchildren as well as members of the original process group.
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), "cannot set child subreaper")
    with subprocess.Popen(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                          start_new_session=True) as proc:
        try:
            return proc.wait(timeout=timeout), False
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
            return 124, True
        finally:
            _drain_linux(proc)


def _windows(argv, cwd, env, timeout, log):
    from ctypes import wintypes as w
    import _winapi

    class BasicLimits(ctypes.Structure):
        _fields_ = [("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64),
                    ("flags", w.DWORD), ("min_memory", ctypes.c_size_t),
                    ("max_memory", ctypes.c_size_t), ("active_limit", w.DWORD),
                    ("affinity", ctypes.c_size_t), ("priority", w.DWORD),
                    ("scheduling", w.DWORD)]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [("basic", BasicLimits), ("io", ctypes.c_uint64 * 6),
                    ("memory", ctypes.c_size_t * 4)]

    class Accounting(ctypes.Structure):
        _fields_ = [("times", ctypes.c_int64 * 4), ("page_faults", w.DWORD),
                    ("total", w.DWORD), ("active", w.DWORD), ("terminated", w.DWORD)]

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    def api(name, result, *args):
        fn = getattr(kernel, name)
        fn.restype, fn.argtypes = result, args
        return fn
    create = api("CreateJobObjectW", w.HANDLE, w.LPVOID, w.LPCWSTR)
    limits = api("SetInformationJobObject", w.BOOL, w.HANDLE, ctypes.c_int, w.LPVOID, w.DWORD)
    assign = api("AssignProcessToJobObject", w.BOOL, w.HANDLE, w.HANDLE)
    terminate = api("TerminateJobObject", w.BOOL, w.HANDLE, w.UINT)
    query = api("QueryInformationJobObject", w.BOOL, w.HANDLE, ctypes.c_int, w.LPVOID,
                w.DWORD, w.LPVOID)
    resume = api("ResumeThread", w.DWORD, w.HANDLE)
    def required(result):
        if not result:
            raise ctypes.WinError(ctypes.get_last_error())
    job = create(None, None)
    required(job)
    flags = ExtendedLimits()
    flags.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    try:
        required(limits(job, 9, ctypes.byref(flags), ctypes.sizeof(flags)))
        # Its initial thread cannot spawn a child before the Job is assigned.
        with open(os.devnull, "rb") as stdin:
            import msvcrt
            handles = [msvcrt.get_osfhandle(f.fileno()) for f in (stdin, log)]
            startup = subprocess.STARTUPINFO(dwFlags=subprocess.STARTF_USESTDHANDLES,
                hStdInput=handles[0], hStdOutput=handles[1], hStdError=handles[1],
                lpAttributeList={"handle_list": handles})
            try:
                for handle in handles:
                    os.set_handle_inheritable(handle, True)
                process, thread, _, _ = _winapi.CreateProcess(
                    None, subprocess.list2cmdline(argv), None, None, True,
                    0x4 | 0x80000, env, str(cwd), startup)  # SUSPENDED | EXTENDED_STARTUPINFO
            finally:
                for handle in handles:
                    os.set_handle_inheritable(handle, False)
        try:
            try:
                required(assign(job, process))
            except OSError:
                _winapi.TerminateProcess(process, 125)
                _winapi.WaitForSingleObject(process, 5000)
                raise
            if resume(thread) == 0xFFFFFFFF:
                required(False)
            wait = _winapi.WaitForSingleObject(process, min(0xFFFFFFFE, max(1, int(timeout*1000))))
            if wait == _winapi.WAIT_TIMEOUT:
                return 124, True
            if wait != _winapi.WAIT_OBJECT_0:
                raise RuntimeError("unexpected process wait result")
            return _winapi.GetExitCodeProcess(process), False
        finally:
            try:
                required(terminate(job, 125))
                accounting = Accounting()
                deadline = time.monotonic() + 5
                while True:
                    required(query(job, 1, ctypes.byref(accounting), ctypes.sizeof(accounting), None))
                    if not accounting.active:
                        break
                    if time.monotonic() >= deadline:
                        raise RuntimeError("Windows Job did not drain")
                    time.sleep(.02)
            finally:
                _winapi.CloseHandle(thread)
                _winapi.CloseHandle(process)
    finally:
        _winapi.CloseHandle(job)


def run(argv, cwd, env, timeout, log):
    if os.name == "nt":
        return _windows(argv, cwd, env, timeout, log)
    if os.uname().sysname == "Linux":
        return _linux(argv, cwd, env, timeout, log)
    raise RuntimeError("process containment is supported on Windows and Linux")
