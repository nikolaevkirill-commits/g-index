#!/usr/bin/env python3
"""Restore a new exact Git checkout; protected contents are never printed."""
import argparse, hashlib, json, pathlib, shutil, subprocess

def require(condition, message):
    if not condition:
        raise SystemExit(message)


def blobs(root,commit):
    cmd=['git','-C',str(root)]
    rows=subprocess.check_output(cmd+['ls-tree','-rz','--full-tree',commit]).split(b'\0')
    entries=[]
    for row in rows:
        if not row:continue
        meta,path=row.split(b'\t',1);mode,kind,oid=meta.split()
        require(kind==b'blob' and mode in (b'100644',b'100755'), "Restore verification failed: kind==b'blob' and mode in (b'100644',b'100755')")
        entries.append((path.decode(),oid))
    raw=subprocess.check_output(cmd+['cat-file','--batch'],input=b''.join(oid+b'\n' for _,oid in entries))
    pos=0;out={}
    for path,oid in entries:
        end=raw.index(b'\n',pos);actual,kind,size=raw[pos:end].split();require(actual==oid and kind==b'blob', "Restore verification failed: actual==oid and kind==b'blob'")
        pos=end+1;size=int(size);out[path]=raw[pos:pos+size];pos+=size;require(raw[pos:pos+1]==b'\n', "Restore verification failed: raw[pos:pos+1]==b'\\n'");pos+=1
    require(pos==len(raw), 'Restore verification failed: pos==len(raw)')
    return out


def git(root, *args):
    return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.PIPE)

def restore(dest,m):
    subprocess.run(['git','init','--quiet',str(dest)],check=True,stdout=subprocess.DEVNULL)
    git(dest,'remote','add','origin',m['public_git_url'])
    git(dest,'-c','credential.interactive=never','fetch','--quiet','origin',m['commit'])
    require(git(dest,'rev-parse','FETCH_HEAD').decode().strip()==m['commit'], "Restore verification failed: fetched commit differs from manifest")
    require(git(dest,'rev-parse','FETCH_HEAD^{tree}').decode().strip()==m['tree'], "Restore verification failed: fetched tree differs from manifest")
    git(dest,'rev-parse','--verify','FETCH_HEAD^1')
    # Verify every blob before anything is written to the working tree.
    content=blobs(dest,'FETCH_HEAD')
    actual={rel:hashlib.sha256(b).hexdigest() for rel,b in content.items()}
    require(set(actual)==set(git(dest,'ls-tree','-r','--name-only','FETCH_HEAD').decode().splitlines()), 'Git archive omitted tracked files')
    require(actual==m['files'], 'Restored Git blobs differ from exact source manifest')
    git(dest,'-c','core.autocrlf=false','-c','core.eol=lf','checkout','--quiet','--detach','FETCH_HEAD')
    require(git(dest,'rev-parse','HEAD').decode().strip()==m['commit'], "Restore verification failed: HEAD differs from manifest")
    for rel,b in content.items():(dest/rel).write_bytes(b)
    for rel, expected in m['files'].items():
        require(hashlib.sha256((dest/rel).read_bytes()).hexdigest()==expected, 'Restored checkout byte hash mismatch')
    require(not git(dest,'status','--porcelain').strip(), "Restore verification failed: checkout is not clean")


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('destination',type=pathlib.Path)
    p.add_argument('--manifest',type=pathlib.Path,default=pathlib.Path(__file__).with_name('SOURCE_MANIFEST.json'))
    a=p.parse_args(); m=json.loads(a.manifest.read_text(encoding='utf-8'))
    try:
        a.destination.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        raise SystemExit('Destination must not exist')
    try:
        restore(a.destination,m)
    except BaseException:
        # A refused or interrupted restore must not leave a usable checkout behind.
        shutil.rmtree(a.destination,ignore_errors=True)
        raise
    print(json.dumps({'status':'PASS','commit':m['commit'],'tree':m['tree'],'tracked_files':len(m['files']),'protected_files_restored':len(m['omitted']),'public_https_git_fetch':m['public_git_url'].startswith('https://'),'parent_history_available':True}))

if __name__=='__main__': main()
