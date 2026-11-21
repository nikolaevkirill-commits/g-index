"""Prove the real #70 browser assertions reject independent missing lifecycle callbacks."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
from tempfile import TemporaryDirectory
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("repo",type=Path)
parser.add_argument("sha")
parser.add_argument("output",type=Path)
parser.add_argument("--only-midnight",action="store_true",help="Run the independent midnight-timer control instead of the three expiry/wake controls")
parser.add_argument("--case",choices=["expiry-render","visibility-resume","persisted-pageshow","midnight-timer"])
args=parser.parse_args()
sha=subprocess.check_output(["git","-C",str(args.repo),"rev-parse",args.sha+"^{commit}"],text=True).strip()
cases=[
 ("expiry-render","day_verdict_v1.js","calendarDeadline=null;\n  render();","calendarDeadline=null;\n  /* scheduled render lost */","--native-ttl-smoke","Calendar expiry native-loss-expert after"),
 ("visibility-resume","civil_time_v1.js","/* Machine keys", "window.addEventListener('visibilitychange',e=>e.stopImmediatePropagation(),true);\n/* Machine keys","--events-only","Calendar visibility-resume native-loss-expert resumed"),
 ("persisted-pageshow","civil_time_v1.js","/* Machine keys","window.addEventListener('pageshow',e=>{if(e.persisted)e.stopImmediatePropagation()},true);\n/* Machine keys","--events-only","Calendar pageshow-persisted native-loss-expert resumed"),
]
if args.only_midnight or args.case=="midnight-timer":
    cases=[("midnight-timer","civil_time_v1.js","timer=setTimeout(()=>sync(false),","timer=setTimeout(()=>{},","--events-only","Calendar midnight native-loss-expert at")]
if args.case:
    cases=[case for case in cases if case[0]==args.case]
    assert len(cases)==1
out=[]
with TemporaryDirectory(prefix="clock-lifecycle-negative-") as work:
    root=Path(work)
    archive=root/"source.tar"
    subprocess.run(["git","-C",str(args.repo),"archive",sha,"-o",str(archive)],check=True)
    with tarfile.open(archive) as tar:
        tar.extractall(root,filter="data")
    checker=root/"tools/public/verify_shared_clock.cjs"
    code=checker.read_text("utf8").splitlines()
    checker_hash=hashlib.sha256(checker.read_bytes()).hexdigest()
    env={k:v for k,v in os.environ.items() if k not in {"VERIFY_CLOCK_SCOPE","VERIFY_CLOCK_EVIDENCE_DIR"}}
    for name,file,old,new,flag,diagnosis in cases:
        source=root/file
        raw=source.read_bytes()
        newline="\r\n" if b"\r\n" in raw else "\n"
        old,new=[t.replace("\n",newline).encode() for t in (old,new)]
        if raw.count(old)!=1: raise RuntimeError("Unexpected mutation anchor: "+name)
        changed=raw.replace(old,new)
        source.write_bytes(changed)
        argv=["node",str(checker),flag] if flag!="--events-only" else ["node",str(checker),"--calendar-edge-smoke",flag]
        result=subprocess.run(argv,cwd=root,env=env,capture_output=True,timeout=450)
        source.write_bytes(raw)
        lines=(result.stdout+result.stderr).decode("utf8",errors="replace").splitlines()
        failure=next((m for line in lines if (m:=re.fullmatch(r"FAIL verify_shared_clock\.cjs:(\d+):\d+ \(AssertionError\); raw data suppressed",line))),None)
        expected=diagnosis+(" selectedDayMatches, scorePresentationMatches, calendarAdviceMatches, explanationMatches" if name=="midnight-timer" else " calendarAdviceMatches, explanationMatches")
        if result.returncode!=1 or not failure or expected not in lines or "calendar expiry updates the already-open page" not in code[int(failure[1])-1]:
            raise RuntimeError(name+" unexpected diagnostic: "+str([line for line in lines if line.startswith(("Calendar ","FAIL ","PASS limited"))][-5:]))
        out.append({"mutation":name,"file":file,"originalSha256":hashlib.sha256(raw).hexdigest(),"mutatedSha256":hashlib.sha256(changed).hexdigest(),"exitCode":result.returncode,"line":int(failure[1]),"expected":expected,"observed_diagnostic":next(line for line in lines if line==expected),"observed_failure":failure[0]})
        print("Verified "+name,flush=True)
tree=subprocess.check_output(["git","-C",str(args.repo),"rev-parse",sha+"^{tree}"],text=True).strip()
if hashlib.sha256(subprocess.check_output(["git","-C",str(args.repo),"show",sha+":tools/public/verify_shared_clock.cjs"])).hexdigest()!=checker_hash:
    raise RuntimeError("The regression checker differs from the immutable Git blob")
receipt={"sha":sha,"tree":tree,"mutations":out,"checker_sha256":checker_hash,"platform":os.environ.get("RUNNER_OS",os.name),
         "github_run_id":os.environ.get("GITHUB_RUN_ID"),"github_run_attempt":os.environ.get("GITHUB_RUN_ATTEMPT"),
         "controller_sha":os.environ.get("GITHUB_SHA"),"controller_ref":os.environ.get("GITHUB_REF")}
with args.output.open("x",encoding="utf8") as f: json.dump(receipt,f,indent=2)
