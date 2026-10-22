"""Reconstruct pinned release-g1 sources without replacing collaboration files."""
import hashlib,subprocess,sys,zipfile,io
from pathlib import Path
repo=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
release='c4f2d46869c08ea245e1ca0be87122334e6f1ad9'
base='162d3a96cf112a979e3b915ec9ced1c2b6b534be'
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
archive=git('show',base+':meridian-source-01.zip')
assert hashlib.sha256(archive).hexdigest()=='4dbb3316ffab2d2e1cb1d986c1cda3bebaa8f4c19b79425c7969d155359ea3ba'
with zipfile.ZipFile(io.BytesIO(archive)) as z:
 for item in z.infolist():
  p=Path(item.filename)
  if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe archive member')
  if p.parts[0] in ['dist','tests','tools','data'] or item.filename in ['package.json','PLAN.md','QA.md']:z.extract(item,out)
for filename in git('ls-tree','-r','--name-only',release,'patches').decode().splitlines():
 p=out/filename;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(git('show',release+':'+filename))
subprocess.run(['sh','patches/apply-claude-092.sh','release-g1'],cwd=out,check=True)
