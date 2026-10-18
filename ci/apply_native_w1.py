"""Apply the reviewable W1 native sources to the packed baseline, refusing stale bases."""
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]);source=Path(__file__).parent/'native-w1'
manifest=json.loads((source/'manifest.json').read_text())
for name,base in manifest.items():
    target=root/name;new=(source/name).read_bytes()
    if target.exists() and target.read_bytes()==new:continue
    actual=hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
    if actual!=base:raise SystemExit(f'W1 baseline changed: {name}. Merge the checkpoint changes first.')
for name in manifest:
    target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes((source/name).read_bytes())
print('W1 sources applied; rebuild ui/ui-bundle.js before export')
