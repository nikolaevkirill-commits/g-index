"""Classify a release against a successful gated ancestor; unknown evidence stays full."""
import argparse, pathlib, re, subprocess

def classify(baseline, root='.'):
    if not re.fullmatch(r'[0-9a-fA-F]{40}', baseline or ''):
        return 'full'
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.DEVNULL)
    try:
        git('merge-base', '--is-ancestor', baseline, 'HEAD')
        paths = git('diff', '--name-only', '-z', baseline, 'HEAD').decode('utf-8').split('\0')
    except (OSError, subprocess.CalledProcessError, UnicodeError):
        return 'full'
    paths = [p for p in paths if p]
    return 'data' if paths and all(p == 'consumer_cloud/forecast.json' or p.startswith('consumer_cloud/noaa/') for p in paths) else 'full'

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--baseline',default='');p.add_argument('--github-output',type=pathlib.Path)
    a=p.parse_args();mode=classify(a.baseline)
    print(f'baseline={a.baseline or "unknown"} mode={mode}')
    if a.github_output:
        with a.github_output.open('a',encoding='utf-8') as f:f.write(f'mode={mode}\n')
