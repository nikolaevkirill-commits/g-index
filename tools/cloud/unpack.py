"""Decrypt authenticated, hash-checked inputs into a temporary runner directory."""
from pathlib import Path
import base64, hashlib, io, json, os, sys, zipfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def unpack(destination):
    data=Path(__file__).with_name('sources.enc').read_bytes()
    if data[:4]!=b'NRB1':raise ValueError('Unknown bundle')
    key=base64.b64decode(os.environ.pop('NR_SOURCE_BUNDLE_KEY'),validate=True)
    raw=AESGCM(key).decrypt(data[4:16],data[16:],b'neborhythm-private-sources-v1')
    destination=Path(destination).resolve();destination.mkdir(parents=True,exist_ok=False)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        names=z.namelist()
        if len(names)!=len(set(names)):raise ValueError('Duplicate bundle entry')
        for n in names:
            target=(destination/n).resolve()
            if not target.is_relative_to(destination) or '\\' in n:raise ValueError('Unsafe bundle path')
        z.extractall(destination)
    manifest=json.loads((destination/'PRIVATE_MANIFEST.json').read_text())
    for n,digest in manifest.items():
        if hashlib.sha256((destination/n).read_bytes()).hexdigest()!=digest:raise ValueError('Bundle integrity')
    print('Authenticated private bundle extracted and verified')

if __name__=='__main__':unpack(sys.argv[1])
