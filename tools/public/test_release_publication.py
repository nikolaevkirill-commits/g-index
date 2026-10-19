import importlib.util,io,tarfile,subprocess,threading,tempfile,os
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
spec=importlib.util.spec_from_file_location('verify',Path(__file__).with_name('verify_release_publication.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','-c','core.autocrlf=false','-c','core.eol=lf','archive','HEAD'],cwd=m.ROOT))) as t:
 blobs={x.name:t.extractfile(x).read() for x in t.getmembers() if x.isfile()}
class Handler(BaseHTTPRequestHandler):
 corrupt=False
 def log_message(self,*args):pass
 def do_GET(self):
  key=self.path.split('?')[0].lstrip('/');body=blobs.get(key)
  if self.corrupt and key=='forecast_journal_v1.js':body=b'wrong journal'
  self.send_response(200 if body is not None else 404);self.end_headers();self.wfile.write(body or b'')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
m.BASE=f'http://127.0.0.1:{server.server_port}/'
assert 'forecast_journal_v1.js' in m.FILES
try:
 with tempfile.TemporaryDirectory() as d:
  old=os.getcwd();os.chdir(d)
  try:
   ok=m.verify(timeout=0)
   if not ok:
    import json
    print([r for r in json.loads(Path('release-publication.json').read_text())['files'] if not r['ok']])
   assert ok,'Clean release rejected'
   Handler.corrupt=True
   assert not m.verify(timeout=0),'Corrupt journal accepted'
  finally:os.chdir(old)
finally:server.shutdown();server.server_close()
print(f'PASS all {len(m.FILES)} assets; clean accepted, modified journal rejected')
