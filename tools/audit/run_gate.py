"""Source-bound FP575 audit gate with private, locally authenticated resume evidence."""
import argparse
import base64
import hashlib
import hmac
import importlib.metadata
import json
import math
import os
import pathlib
import platform
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

sys.dont_write_bytecode = True
import gate_process

PROTECTED = ('consumer_cloud/forecast.json', 'consumer_cloud/final_score_decisions.json',
             'INDEPENDENT_FORECAST_FEED_v1.json')
SCHEMA = 'fp575-bound-gate-v3'
# Review every command and output-policy change before updating this fingerprint.
CANONICAL_CONTRACT = 'db9bc7b763f7b7099e2423fcfb0bcfea47ba118ffb7fdd9e6223af7d67b033c5'
OVERRIDES = ('B7_', 'CHROME_PATH', 'CSS_UPGRADE_', 'DAYLINE_', 'DEPTH_LIMIT',
             'FP463_', 'FP569', 'NR', 'QA_OLD_NAV', 'SKY_', 'SW_', 'VERIFY_CLOCK_',
             'CACHE_PUBLISHED_BASELINE', 'NODE_OPTIONS', 'PYTHONPATH',
             'PYTHONHOME', 'PYTHONUSERBASE', 'PYTHONSTARTUP', 'PYTHONOPTIMIZE',
             'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH')


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write_new(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=True)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())


def git(root, *args):
    env = {**os.environ, 'GIT_OPTIONAL_LOCKS':'0'}
    return subprocess.check_output(['git', *args], cwd=root, env=env, stderr=subprocess.PIPE)


def snapshot(root, generated):
    head = git(root, 'rev-parse', 'HEAD').decode().strip()
    tree = git(root, 'rev-parse', 'HEAD^{tree}').decode().strip()
    if git(root, 'diff', '--cached', '--name-only', 'HEAD', '--'):
        raise ValueError('index differs from HEAD')
    if git(root, 'diff', '--name-only', '--'):
        raise ValueError('worktree differs from index')
    tags = git(root, 'ls-files', '-v', '-z').decode().split('\0')[:-1]
    if any(s[:2] != 'H ' for s in tags):
        raise ValueError('unsupported index flags on tracked inputs')
    hashes = {}
    for tag in tags:
        name = tag[2:]
        path = root / name
        if not path.is_file() or path.is_symlink():
            raise ValueError('unsupported/missing tracked input: ' + name)
        hashes[name] = file_hash(path)
    for name in PROTECTED:
        if name not in hashes:
            raise ValueError('protected input not tracked: ' + name)
    # Deliberately omit --exclude-standard: ignored files may be executable inputs too.
    untracked = git(root, 'ls-files', '--others', '-z').decode().split('\0')[:-1]
    if any(not any(name == g or name.startswith(g + '/') for g in generated)
           for name in untracked):
        raise ValueError('unexpected untracked or ignored files; use external dependencies and a clean checkout')
    return {'head':head, 'tree':tree, 'index_tree':tree, 'files':hashes,
            'protected':{name:hashes[name] for name in PROTECTED}}


def path_hashes(path, *, internal_links=False):
    if path.is_symlink() or getattr(path, 'is_junction', lambda: False)():
        raise ValueError('linked dependency or generated output is unsupported: ' + str(path))
    if path.is_file():
        return {'':file_hash(path)}
    if not path.is_dir():
        return {}
    result = {".":"directory"}
    for folder, dirs, files in os.walk(path):
        directory = pathlib.Path(folder)
        for name in sorted(dirs + files):
            item = directory / name
            if item.is_symlink() or getattr(item, 'is_junction', lambda: False)():
                target = item.resolve()
                if not internal_links or not target.is_relative_to(path) or not target.exists():
                    raise ValueError('unbound link in dependency or output: ' + str(item))
                result[item.relative_to(path).as_posix()] = 'link:' + target.relative_to(path).as_posix()
                if name in dirs:
                    dirs.remove(name)
                continue
            if item.is_file():
                result[item.relative_to(path).as_posix()] = file_hash(item)
    return result


def generated_fingerprint(root, generated):
    return digest(canonical({name:path_hashes(root / name) for name in generated}))


def execution_env(root, release):
    env = dict(os.environ)
    forbidden = sorted(key for key in env if key.upper().startswith(OVERRIDES))
    if release and forbidden:
        raise ValueError('canonical environment: unset overrides: ' + ', '.join(forbidden))
    if release and sys.flags.optimize:
        raise ValueError('canonical environment: use Python without -O or -OO')
    # Prefer the pinned external dependency path over implicit checkout artifacts.
    if env.get('NODE_PATH'):
        paths = [pathlib.Path(name) for name in env['NODE_PATH'].split(os.pathsep)]
        if any(not path.is_absolute() or not path.is_dir() or
               path.resolve().is_relative_to(root) for path in paths):
            raise ValueError('NODE_PATH entries must be existing absolute paths outside the checkout')
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    return env


def environment(root, env, require_browser, *, verify_record=False):
    def external_roots():
        paths = [parent / 'node_modules' for parent in [root, *root.parents]]
        paths += [pathlib.Path(name) for name in env.get('NODE_PATH', '').split(os.pathsep) if name]
        return sorted({p.resolve() for p in paths if p.is_dir()}, key=str)

    dependencies = {}
    if require_browser:
        if verify_record:
            try:
                version = importlib.metadata.version('pyswisseph')
            except importlib.metadata.PackageNotFoundError:
                raise ValueError('canonical environment: install pyswisseph==2.10.3.2') from None
            if version != '2.10.3.2':
                raise ValueError('canonical environment: expected pyswisseph==2.10.3.2')
        for path in external_roots():
            if path.is_relative_to(root):
                raise ValueError('Node dependencies must be installed outside the checkout')
            dependencies[str(path)] = digest(canonical(path_hashes(path, internal_links=True)))
        # Hash the installed bytes listed by each Python distribution, not only its version.
        packages = []
        for dist in importlib.metadata.distributions():
            name = str(dist.metadata.get('Name') or '[unnamed]')
            if verify_record and not dist.read_text('RECORD'):
                raise ValueError(f'Python distribution {name} lacks RECORD; reinstall in a clean virtual environment')
            records = {}
            for entry in dist.files or ():
                if str(entry).endswith(('.pyc', '.pyo')):
                    continue
                path = dist.locate_file(entry)
                actual = file_hash(path) if path.is_file() else None
                if verify_record:
                    if actual is None:
                        raise ValueError(f'Python RECORD for {name} lists missing file: {entry}')
                    if entry.size is not None and path.stat().st_size != entry.size:
                        raise ValueError(f'Python RECORD size mismatch for {name}: {entry}')
                    if entry.hash is not None:
                        expected = entry.hash
                        if expected.mode != 'sha256':
                            raise ValueError(f'Unsupported Python RECORD hash for {name}: {expected.mode}')
                        encoded = base64.urlsafe_b64encode(bytes.fromhex(actual)).decode('ascii').rstrip('=')
                        if encoded != expected.value:
                            raise ValueError(f'Python RECORD hash mismatch for {name}: {entry}')
                records[str(entry)] = actual
            if not records:
                raise ValueError('Python distribution lacks a file manifest: ' + str(dist.metadata.get('Name')))
            packages.append((dist.metadata.get('Name',''), dist.version, digest(canonical(records))))
    else:
        packages = []
    binaries = {}
    for name in (('node', 'git') if require_browser else ('git',)):
        path = shutil.which(name, path=env.get('PATH'))
        if verify_record and not path:
            raise ValueError(f'canonical environment: {name} executable not found on PATH')
        binaries[name] = file_hash(pathlib.Path(path)) if path else None
    browser = None
    if require_browser:
        command = """const fs=require('fs'),crypto=require('crypto'),p=require('playwright');
(async()=>{const s=await p.chromium.launchServer();try{
const f=s.process().spawnfile,b=await p.chromium.connect(s.wsEndpoint());
console.log(JSON.stringify({module:require.resolve('playwright'),version:require('playwright/package.json').version,
node_version:process.version,browser:b.version(),executable_sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}));
await b.close();}finally{await s.close()}})().catch(e=>{console.error(e.message);process.exitCode=1})"""
        with tempfile.TemporaryFile() as log:
            code, timeout = gate_process.run(['node', '-e', command], root, env, 45, log)
            if code or timeout:
                raise ValueError('required Playwright/browser fingerprint unavailable')
            log.seek(0)
            browser = json.loads(log.read())
        module = pathlib.Path(browser['module']).resolve()
        if not any(module.is_relative_to(pathlib.Path(path)) for path in dependencies):
            raise ValueError('resolved Playwright is outside fingerprinted Node dependencies')
    return {'python':sys.version, 'python_sha256':file_hash(pathlib.Path(sys.executable)),
            'python_packages':sorted(packages), 'binaries_sha256':binaries,
            'node_dependencies_sha256':dependencies, 'browser':browser,
            'platform':platform.platform(), 'machine':platform.machine(),
            'environment_sha256':digest(canonical(env))}


def contract(doc):
    rows = doc.get('checks')
    if not isinstance(rows, list) or not rows:
        raise ValueError('empty command list')
    checks = []
    for n, row in enumerate(rows, 1):
        argv, timeout = row.get('argv'), row.get('timeout', 1200)
        if not isinstance(argv, list) or not argv or not all(isinstance(s, str) and s for s in argv):
            raise ValueError('checks require explicit argv arrays')
        if type(timeout) not in (int, float) or not math.isfinite(timeout) or timeout <= 0:
            raise ValueError('invalid timeout')
        if row.get('index', n) != n:
            raise ValueError('indices must be contiguous and ordered')
        checks.append({'index':n, 'argv':argv, 'timeout':timeout})
    if doc.get('expected_count') != len(checks):
        raise ValueError('expected_count differs from command count')
    generated = doc.get('generated_outputs', [])
    if not isinstance(generated, list) or not all(
        isinstance(g, str) and re.fullmatch(r'[a-zA-Z0-9_-][a-zA-Z0-9_.-]*', g) for g in generated):
        raise ValueError('generated outputs must be explicit top-level paths')
    artifact_env = doc.get('artifact_env', [])
    if artifact_env not in ([], ['SCREENSHOT_DIR']):
        raise ValueError('unsupported external artifact destination')
    browser = doc.get('requires_browser', False)
    if type(browser) is not bool:
        raise ValueError('requires_browser must be boolean')
    return {'checks':checks, 'expected_count':len(checks), 'generated_outputs':generated,
            'requires_browser':browser, 'artifact_env':artifact_env}


def execute(check, root, out, env, attempt, external_artifacts):
    argv = [sys.executable if arg == '{python}' else arg for arg in check['argv']]
    # Resolve argv[0] before CreateProcess, which otherwise searches the current directory.
    executable = shutil.which(argv[0], path=env.get('PATH'))
    if executable:
        argv[0] = os.path.abspath(executable)
    child_env = env.copy()
    if external_artifacts:
        screenshots = out / 'screenshots' / attempt
        screenshots.mkdir(parents=True)
        child_env['SCREENSHOT_DIR'] = str(screenshots)
    log = out / (attempt + '.log')
    started = time.monotonic()
    with log.open('xb') as stream:
        try:
            if not executable:
                raise FileNotFoundError(argv[0])
            code, timed_out = gate_process.run(argv, root, child_env, check['timeout'], stream)
            status = 'TIMEOUT' if timed_out else 'PASS' if code == 0 else 'FAIL'
        except (OSError, RuntimeError) as error:
            stream.write(str(error).encode('utf-8', errors='replace'))
            code, status = 125, 'EXECUTION_ERROR'
        stream.flush()
        os.fsync(stream.fileno())
    return {'exit':code, 'status':status, 'seconds':round(time.monotonic()-started, 3),
            'log':log.name, 'log_sha256':file_hash(log),
            'screenshots':path_hashes(screenshots) if external_artifacts else None}


def mac(key, row):
    return hmac.digest(key, canonical(row), 'sha256').hex()



def environment_key_macs(key, env):
    return {name:mac(key, ['fp575-env-key-v1', name, value]) for name, value in env.items()}


def write_resume_environment(path, key, identity, env):
    receipt = {'schema':'fp575-resume-environment-v1', 'binding':digest(canonical(identity)),
               'keys':environment_key_macs(key, env)}
    write_new(path, {**receipt, 'mac':mac(key, receipt)})


def read_resume_environment(path, key, previous):
    if not path.is_file():
        raise ValueError('resume binding changed: component=legacy_environment; '
                         'exact env keys unavailable; create a fresh run')
    try:
        if path.is_symlink():
            raise ValueError('linked receipt')
        receipt = read(path)
        seal = receipt.pop('mac')
        keys = receipt['keys']
        if (receipt.get('schema') != 'fp575-resume-environment-v1'
                or not isinstance(seal, str) or not hmac.compare_digest(seal, mac(key, receipt))
                or receipt.get('binding') != digest(canonical(previous))
                or not isinstance(keys, dict)
                or any(not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{64}', value)
                       for value in keys.values())):
            raise ValueError('invalid receipt')
    except (ValueError, AttributeError, TypeError, OSError, KeyError):
        raise ValueError('resume binding changed: component=binding_environment_authentication; '
                         'exact env keys unavailable') from None
    return keys


def environment_key_changes(before, current):
    shared = before.keys() & current.keys()
    return {'changed':sorted(name for name in shared if before[name] != current[name]),
            'added':sorted(current.keys()-before.keys()),
            'removed':sorted(before.keys()-current.keys())}


def describe_resume_difference(before, current, env_changes):
    components = sorted(name for name in
        ('source', 'contract', 'scope', 'checkout', 'evidence_dir', 'runner_sha256',
         'process_helper_sha256', 'manifest_sha256') if before.get(name) != current.get(name))
    old_environment, new_environment = before['environment'], current['environment']
    if any(env_changes.values()) or old_environment.get('environment_sha256') != new_environment.get('environment_sha256'):
        components.append('environment.env')
    for name in sorted(old_environment.keys() | new_environment.keys()):
        if name != 'environment_sha256' and old_environment.get(name) != new_environment.get(name):
            # These fixed names are known fields of the fingerprint, never values or paths.
            components.append('environment.' + name)
    if not components:
        components.append('binding_metadata')
    diagnostic = {'components':components, 'env_keys':env_changes}
    return 'resume binding changed: ' + json.dumps(diagnostic, ensure_ascii=True, sort_keys=True)


def resume_records(out, key, binding, checks, *, history=None):
    previous = {}
    last = None
    previous_seal = None
    for sequence, path in enumerate(sorted(out.glob('attempt-*.json')), 1):
        row = read(path)
        seal = row.pop('mac', '')
        if not isinstance(seal, str) or not hmac.compare_digest(seal, mac(key, row)):
            raise ValueError('prior attempt authentication failed')
        if row['sequence'] != sequence or row['previous_mac'] != previous_seal:
            raise ValueError('prior attempt chain is incomplete or out of order')
        previous_seal = seal
        n = row['index']
        if (row['binding'] != binding or not 1 <= n <= len(checks)
                or any(row[k] != v for k, v in checks[n-1].items())
                or row['attempt_id'] != path.stem or row['log'] != path.stem + '.log'):
            raise ValueError('invalid prior attempt identity')
        log = out / row['log']
        if log.is_symlink() or file_hash(log) != row['log_sha256']:
            raise ValueError('prior log changed/missing')
        if row['screenshots'] is not None and path_hashes(out/'screenshots'/path.stem) != row['screenshots']:
            raise ValueError('prior screenshots changed/missing')
        if history is not None:
            history.append((row, seal))
        previous[n] = last = row
    return previous, last, previous_seal


def run_gate(args, root, out, manifest):
    spec = contract(manifest)
    checks, generated = spec['checks'], spec['generated_outputs']
    release = digest(canonical(spec)) == CANONICAL_CONTRACT
    scope = 'canonical_105' if release else 'diagnostic_only'
    env = execution_env(root, release)
    source = snapshot(root, generated)
    if args.seal:
        if not args.sealed_output:
            raise ValueError('--sealed-output required')
        if release:
            environment(root, env, spec['requires_browser'], verify_record=True)
        write_new(args.sealed_output, {'schema':SCHEMA, 'source':source, **spec, 'scope':scope})
        print('SEALED', len(checks), scope)
        return 0
    if (manifest.get('schema') != SCHEMA or manifest.get('source') != source
            or manifest.get('scope') != scope):
        raise ValueError('manifest/source mismatch; no prior PASS may be reused')
    identity = {'source':source, 'contract':spec, 'scope':scope, 'checkout':str(root),
                'evidence_dir':str(out),
                'runner_sha256':file_hash(pathlib.Path(__file__)),
                'process_helper_sha256':file_hash(pathlib.Path(gate_process.__file__)),
                'manifest_sha256':file_hash(args.manifest)}
    out.mkdir(parents=True, exist_ok=True)
    lock = out / 'ACTIVE.lock'
    with lock.open('x',encoding='ascii') as stream:
        stream.write(str(os.getpid()))
    try:
        keyfile, bindfile = out / 'resume.key', out / 'binding.json'
        envfile = out / 'binding-env.json'
        if not args.resume:
            if any(p != lock for p in out.iterdir()):
                raise ValueError('existing evidence requires --resume or a new output directory')
            if any((root / name).exists() for name in generated):
                raise ValueError('fresh run requires absent generated output paths')
            identity['environment'] = environment(root, env, spec['requires_browser'], verify_record=release)
            fd = os.open(keyfile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(fd, 'wb') as stream:
                stream.write(secrets.token_bytes(32))
                stream.flush()
                os.fsync(stream.fileno())
        if not keyfile.is_file() or keyfile.is_symlink():
            raise ValueError('invalid or missing local resume key')
        key = keyfile.read_bytes()
        if len(key) != 32:
            raise ValueError('invalid local resume key')
        if args.resume:
            prior_binding = read(bindfile)
            env_before = read_resume_environment(envfile, key, prior_binding)
            changes = environment_key_changes(env_before, environment_key_macs(key, env))
            if any(changes.values()):
                # Changed variables can break interpreter/browser discovery; report their names
                # before executing any environment probes under that changed environment.
                identity['environment'] = {**prior_binding['environment'],
                                           'environment_sha256':digest(canonical(env))}
                raise ValueError(describe_resume_difference(prior_binding, identity, changes))
            identity['environment'] = environment(root, env, spec['requires_browser'], verify_record=release)
            if prior_binding != identity:
                raise ValueError(describe_resume_difference(prior_binding, identity, changes))
        else:
            write_new(bindfile, identity)
            write_resume_environment(envfile, key, identity, env)
        binding = digest(canonical(identity))
        previous, last, previous_seal = resume_records(out, key, binding, checks)
        sequence = last['sequence'] if last else 0
        if last:
            if generated_fingerprint(root, generated) != last['generated_sha256']:
                raise ValueError('generated state differs from last completed attempt')
        elif any((root / name).exists() for name in generated):
            raise ValueError('unsealed generated state; use a clean checkout and a fresh run')
        prior_attempt_count = sequence
        invocation_id = uuid.uuid4().hex
        reused_attempt_ids = []
        results = []
        for check in checks:
            old = previous.get(check['index'])
            if old and old['status'] == 'PASS' and old['exit'] == 0:
                reused_attempt_ids.append(old['attempt_id'])
                results.append(old)
                continue
            if snapshot(root, generated) != source:
                raise ValueError('source changed during gate')
            sequence += 1
            aid = f'attempt-{sequence:08d}-{uuid.uuid4().hex}'
            row = {**check, 'binding':binding, 'attempt_id':aid, 'sequence':sequence,
                   'previous_mac':previous_seal, 'invocation_id':invocation_id,
                   **execute(check, root, out, env, aid, bool(spec['artifact_env']))}
            try:
                if snapshot(root, generated) != source:
                    raise ValueError('source differs from the bound input')
                row['generated_sha256'] = generated_fingerprint(root, generated)
            except (ValueError, OSError, subprocess.CalledProcessError) as error:
                row.update(status='SOURCE_CHANGED', exit=125, source_error=str(error),
                           generated_sha256=None)
            previous_seal = mac(key,row)
            write_new(out/(aid+'.json'), {**row, 'mac':previous_seal})
            results.append(row)
            print(f"{check['index']}/{len(checks)} {row['status']}", flush=True)
            if row['status'] in ('SOURCE_CHANGED', 'EXECUTION_ERROR'):
                break
        passed = (len(results) == len(checks)
                  and all(r['status'] == 'PASS' and r['exit'] == 0 for r in results))
        if passed and (snapshot(root, generated) != source
                       or environment(root, env, spec['requires_browser']) != identity['environment']):
            raise ValueError('source or dependencies changed before completion')
        summary = {'binding':binding, 'scope':scope, 'expected_count':len(checks),
                   'observed_count':len(results), 'suite_passed':passed,
                   'complete':release and passed, 'attempt_head_mac':previous_seal, 'rows':results}
        # Keep signed completion order even after a backward wall-clock adjustment.
        latest = max((int(p.stem.removeprefix('summary-')) for p in out.glob('summary-*.json')),
                     default=0)
        summary_id = f'summary-{max(time.time_ns(), latest + 1)}'
        summary['invocation'] = {'id':invocation_id, 'summary_id':summary_id,
                                 'requested_resume':args.resume,
                                 'prior_attempt_count':prior_attempt_count,
                                 'reused_attempt_ids':reused_attempt_ids}
        write_new(out/(summary_id+'.json'), {**summary,'mac':mac(key,summary)})
        return 0 if passed else 1
    finally:
        lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repo', type=pathlib.Path)
    parser.add_argument('out', type=pathlib.Path)
    parser.add_argument('manifest', type=pathlib.Path)
    parser.add_argument('--seal', action='store_true')
    parser.add_argument('--sealed-output', type=pathlib.Path)
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    root, out = args.repo.resolve(), args.out.resolve()
    if out.is_relative_to(root):
        raise ValueError('evidence must be outside checkout')
    if args.seal and args.sealed_output and args.sealed_output.resolve().is_relative_to(root):
        raise ValueError('sealed manifest must be outside checkout')
    return run_gate(args, root, out, read(args.manifest))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print('GATE REFUSED:', str(error), file=sys.stderr)
        sys.exit(2)
