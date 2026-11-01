import pathlib,subprocess,tempfile,unittest
from release_scope import classify

class ReleaseScope(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)
        self.git('init','-q');self.git('config','user.email','test@example.invalid');self.git('config','user.name','scope test')
        self.commit('index.html','baseline');self.base=self.git('rev-parse','HEAD').strip()
    def tearDown(self):self.temp.cleanup()
    def git(self,*args):return subprocess.check_output(['git',*args],cwd=self.root,stderr=subprocess.DEVNULL,text=True)
    def commit(self,name,body):
        p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(body,encoding='utf-8');self.git('add','.');self.git('commit','-qm','fixture')
    def test_forecast_and_noaa_only(self):
        self.commit('consumer_cloud/forecast.json','{}');self.commit('consumer_cloud/noaa/body.json','{}')
        self.assertEqual(classify(self.base,self.root),'data')
    def test_registry_requires_full(self):
        self.commit('consumer_cloud/final_score_decisions.json','{}');self.assertEqual(classify(self.base,self.root),'full')
    def test_unknown_cloud_file_requires_full(self):
        self.commit('consumer_cloud/new.js','x');self.assertEqual(classify(self.base,self.root),'full')
    def test_failed_runtime_then_data_does_not_hide_runtime(self):
        self.commit('index.html','changed');self.commit('consumer_cloud/forecast.json','{}')
        self.assertEqual(classify(self.base,self.root),'full')
    def test_missing_api_result_and_unknown_commit(self):
        for b in ['', 'null', 'bad', '0'*40]:self.assertEqual(classify(b,self.root),'full')
    def test_same_revision_rerun_requires_full(self):self.assertEqual(classify(self.base,self.root),'full')
    def test_nonancestor_requires_full(self):
        self.commit('unrelated','x');other=self.git('rev-parse','HEAD').strip();self.git('checkout','-q',self.base)
        self.commit('consumer_cloud/forecast.json','{}');self.assertEqual(classify(other,self.root),'full')

if __name__=='__main__':unittest.main(verbosity=2)
