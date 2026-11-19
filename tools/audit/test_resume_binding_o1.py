"""Score-free O1 tests for names-only resume diagnostics and refusal paths."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
import run_gate as runner


class ResumeDiagnostics(unittest.TestCase):
    def test_external_key_lifecycle(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            keyfile = base/'run.key'
            key = runner.create_private_key(keyfile)
            self.assertTrue(key == runner.read_private_key(keyfile))
            with self.assertRaises(FileExistsError):
                runner.create_private_key(keyfile)
            self.assertTrue(key == runner.read_private_key(keyfile))
            alias = base/'alias'
            os.link(keyfile,alias)
            with self.assertRaisesRegex(ValueError,'invalid external resume key'):
                runner.read_private_key(alias)
            alias.unlink()
            if os.name != 'nt':
                keyfile.chmod(0o644)
                with self.assertRaisesRegex(ValueError,'owner-only'):
                    runner.read_private_key(keyfile)

    def test_actual_runner_reports_env_keys_without_values(self):
        with tempfile.TemporaryDirectory(prefix='fp575-o1-') as directory:
            base = Path(directory)
            repo, out = base/'repo', base/'evidence'
            repo.mkdir()
            for name in runner.PROTECTED:
                f = repo/name
                f.parent.mkdir(exist_ok=True)
                f.write_text('{}', encoding='utf-8')
            for args in [('init','-q'),('config','user.name','fixture'),
                         ('config','user.email','fixture@example.invalid'),
                         ('add','.'),('commit','-qm','synthetic')]:
                subprocess.run(['git','-C',str(repo),*args],check=True,capture_output=True)
            spec, sealed = base/'contract.json', base/'sealed.json'
            spec.write_text(json.dumps({'expected_count':1,'checks':[
                {'index':1,'argv':['{python}','-c','pass'],'timeout':30}]}))
            original = {**os.environ, 'SHLVL':'fixture-level-original',
                        'OLDPWD':'fixture-old-cwd', 'CUSTOM_CHANGED':'fixture-custom-old',
                        'CUSTOM_REMOVED':'fixture-custom-removed'}
            for name in ('CUSTOM_ADDED','O1_SECRET'):
                original.pop(name,None)
            keyfile = base/'private.key'
            args = [sys.executable, '-B', str(Path(runner.__file__).resolve()), str(repo), str(out),
                    '--key-file',str(keyfile)]

            def run(tail, env=original):
                return subprocess.run([*args,*map(str,tail)],env=env,capture_output=True,
                                      text=True,timeout=120)

            result = run([spec,'--seal','--sealed-output',sealed])
            self.assertEqual(result.returncode,0,result.stderr)
            result = run([sealed])
            self.assertEqual(result.returncode,0,result.stderr)
            receipt = out/'binding-env.json'
            original_receipt = receipt.read_bytes()
            before = sorted(out.glob('attempt-*.json'))
            self.assertFalse((out/'resume.key').exists())
            self.assertEqual(keyfile.stat().st_size,32)
            key_bytes = keyfile.read_bytes()
            for evidence_file in out.iterdir():
                if evidence_file.is_file():
                    content = evidence_file.read_bytes()
                    self.assertFalse(key_bytes in content or key_bytes.hex().encode() in content)
            for location in (out/'inside.key',repo/'inside.key',base/'missing.key'):
                rejected = run([sealed,'--resume','--key-file',location])
                self.assertEqual(rejected.returncode,2)
                self.assertFalse(location.exists())
            wrong = base/'different.key'
            runner.create_private_key(wrong)
            rejected = run([sealed,'--resume','--key-file',wrong])
            self.assertEqual(rejected.returncode,2)
            self.assertIn('authentication',rejected.stderr)
            legacy = out/'resume.key'
            legacy.touch()
            rejected = run([sealed,'--resume'])
            self.assertEqual(rejected.returncode,2)
            self.assertIn('legacy evidence',rejected.stderr)
            legacy.unlink()
            result = run([sealed,'--resume'])
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(before, sorted(out.glob('attempt-*.json')))
            edited = {**original,'SHLVL':'fixture-level-new','CUSTOM_CHANGED':'fixture-custom-new',
                      'CUSTOM_ADDED':'fixture-custom-added'}
            del edited['OLDPWD']
            del edited['CUSTOM_REMOVED']
            result = run([sealed,'--resume'],edited)
            self.assertEqual(result.returncode,2)
            diagnostic = json.loads(result.stderr.split('resume binding changed: ',1)[1])
            self.assertEqual(diagnostic, {'components':['environment.env'], 'env_keys':{
                'added':['CUSTOM_ADDED'], 'changed':['CUSTOM_CHANGED','SHLVL'],
                'removed':['CUSTOM_REMOVED','OLDPWD']}})
            persisted = (out/'binding.json').read_text() + original_receipt.decode()
            for secret in list(original.values()) + list(edited.values()):
                if secret.startswith('fixture-'):
                    self.assertNotIn(secret, result.stdout + result.stderr + persisted)
            self.assertEqual(before, sorted(out.glob('attempt-*.json')))
            tampered = json.loads(original_receipt)
            tampered['keys']['fixture-untrusted-name'] = '0'*64
            receipt.write_text(json.dumps(tampered))
            result = run([sealed,'--resume'])
            self.assertEqual(result.returncode,2)
            self.assertIn('component=binding_environment_authentication',result.stderr)
            self.assertNotIn('fixture-untrusted-name',result.stderr)
            receipt.unlink()
            result = run([sealed,'--resume'])
            self.assertEqual(result.returncode,2)
            self.assertIn('component=legacy_environment',result.stderr)
            self.assertIn('exact env keys unavailable',result.stderr)

    def test_other_component_names_and_override_guard(self):
        changes = {'added':[], 'changed':[], 'removed':[]}
        before = {'contract':1,'environment':{'environment_sha256':'same','browser':{'version':1}}}
        after = {'contract':2,'environment':{'environment_sha256':'same','browser':{'version':2}}}
        message = runner.describe_resume_difference(before,after,changes)
        self.assertEqual(json.loads(message.split(': ',1)[1]), {'components':['contract','environment.browser'],
                                                               'env_keys':changes})
        with patch.dict(os.environ,{'SKY_MUTATION':'fixture-guard-secret'},clear=True):
            with self.assertRaisesRegex(ValueError, 'unset overrides: SKY_MUTATION') as error:
                runner.execution_env(Path('.'), True)
            self.assertNotIn('fixture-guard-secret',str(error.exception))


if __name__ == '__main__':
    unittest.main(verbosity=2)
