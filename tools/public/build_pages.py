"""Build only approved public assets; no repository metadata or private tooling."""
from pathlib import Path
import subprocess,shutil,json
root=Path(__file__).resolve().parents[2]
out=root/'_site'
if out.exists():raise SystemExit('_site already exists: use a clean checkout')
out.mkdir()
files=subprocess.check_output(['git','-C',str(root),'ls-files'],text=True).splitlines()
for name in files:
 if name.startswith(('.github/','tools/','tests/')) or name in {'PUBLIC_ASSET_ALLOWLIST.json','.gitattributes','.gitignore','_config.yml'}:continue
 source=root/name
 if source.is_symlink():raise SystemExit('Symlink rejected: '+name)
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
(out/'.nojekyll').write_text('')
for n in ['index.html','design-v4.html','sw.js','consumer_cloud/final_score_decisions.json']:assert (out/n).is_file(),n
print('Public artifact ready; deployment is a separate dependent job')
