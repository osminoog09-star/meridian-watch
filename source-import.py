"""Reconstruct the verified source tree; no credentials or executable downloads."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json
root=Path(__file__).resolve().parent
manifest=json.loads((root/'source-import-sha256.json').read_text())
for name,expected in manifest.items():
    archive=root/name
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected, name
    with ZipFile(archive) as source:
        assert source.testzip() is None
        for item in source.infolist():
            path=Path(item.filename)
            assert not path.is_absolute() and '..' not in path.parts
            assert not {'.git','node_modules'}.intersection(path.parts)
            assert path.suffix not in {'.keystore','.pem','.key'} and not path.name.startswith('.env')
        source.extractall(root)
print('Verified source imported: Mercury Response 0.6.0-a and Android 0.2.0')
