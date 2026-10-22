"""Pack the reviewed native source, retaining the checkpoint's original allow-list."""
from pathlib import Path
import sys,zipfile,json
original,project,out=map(Path,sys.argv[1:4])
with zipfile.ZipFile(original) as archive:
 names={n for n in archive.namelist() if not n.endswith('/')}
for directory in ['simulation/source','ui/source']:
 names.update('native-map/'+str(p.relative_to(project)) for p in (project/directory).glob('*.js'))
names.update(['native-map/assets/actor-frame-fixture.json','native-map/tools/verify_city_v2_country.gd'])
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
 for name in sorted(names):
  relative=Path(name).relative_to('native-map')
  if any(x in relative.parts for x in ['node_modules','.godot','.git']):raise ValueError('Unexpected checkpoint path')
  file=project/relative
  if not file.is_file():raise FileNotFoundError(file)
  archive.write(file,name)
print(out,out.stat().st_size)
