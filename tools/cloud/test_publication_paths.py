from pathlib import Path
import subprocess,tempfile,unittest
from validate_publication import validate_paths
class Paths(unittest.TestCase):
 def test_artifact_boundary(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);r=p/'consumer_cloud/final_score_decisions.json';r.parent.mkdir();r.write_text('{"decisions": []}\n')
   subprocess.run(['git','init','-q',d],check=True)
   subprocess.run(['git','-C',d,'add','.'],check=True)
   subprocess.run(['git','-C',d,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],check=True)
   validate_paths(p)
   r.write_text('{"decisions": [1]}\n')
   with self.assertRaisesRegex(ValueError,'must not change'):validate_paths(p)
   r.unlink()
   with self.assertRaisesRegex(ValueError,'must not change'):validate_paths(p)
   r.write_text('{"decisions": []}\n');x=r.parent/'unapproved.json';x.write_text('{}')
   with self.assertRaisesRegex(ValueError,'Unexpected'):validate_paths(p)
if __name__=='__main__':unittest.main()
