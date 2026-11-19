#!/usr/bin/env python3
"""Restore a new exact Git checkout; protected contents are never printed."""
import argparse, hashlib, json, pathlib, subprocess

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

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('destination',type=pathlib.Path)
    p.add_argument('--manifest',type=pathlib.Path,default=pathlib.Path(__file__).with_name('SOURCE_MANIFEST.json'))
    a=p.parse_args(); m=json.loads(a.manifest.read_text(encoding='utf-8'))
    if a.destination.exists(): raise SystemExit('Destination must not exist')
    subprocess.run(['git','init','--quiet',str(a.destination)],check=True,stdout=subprocess.DEVNULL)
    git(a.destination,'remote','add','origin',m['public_git_url'])
    git(a.destination,'-c','credential.interactive=never','fetch','--quiet','origin',m['commit'])
    git(a.destination,'-c','core.autocrlf=false','-c','core.eol=lf','checkout','--quiet','--detach','FETCH_HEAD')
    require(git(a.destination,'rev-parse','HEAD').decode().strip()==m['commit'], "Restore verification failed: git(a.destination,'rev-parse','HEAD').decode().strip()==m['commit']")
    require(git(a.destination,'rev-parse','HEAD^{tree}').decode().strip()==m['tree'], "Restore verification failed: git(a.destination,'rev-parse','HEAD^{tree}').decode().strip()==m['tree']")
    git(a.destination,'rev-parse','--verify','HEAD^1')
    content=blobs(a.destination,'HEAD')
    actual={rel:hashlib.sha256(b).hexdigest() for rel,b in content.items()}
    require(set(actual)==set(git(a.destination,'ls-tree','-r','--name-only','HEAD').decode().splitlines()), 'Git archive omitted tracked files')
    require(actual==m['files'], 'Restored Git blobs differ from exact source manifest')
    for rel,b in content.items():(a.destination/rel).write_bytes(b)
    for rel, expected in m['files'].items():
        require(hashlib.sha256((a.destination/rel).read_bytes()).hexdigest()==expected, 'Restored checkout byte hash mismatch')
    require(not git(a.destination,'status','--porcelain').strip(), "Restore verification failed: not git(a.destination,'status','--porcelain').strip()")
    print(json.dumps({'status':'PASS','commit':m['commit'],'tree':m['tree'],'tracked_files':len(m['files']),'protected_files_restored':len(m['omitted']),'public_https_git_fetch':m['public_git_url'].startswith('https://'),'parent_history_available':True}))

if __name__=='__main__': main()
