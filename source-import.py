"""Reconstruct the verified source tree while preserving Git's collaboration documents."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json

root=Path(__file__).resolve().parent
protected={'README.md','SOURCE_STATE.json','source-import-sha256.json','AGENTS.md','CLAUDE.md','COLLAB_LOG.md','CLAUDE_HANDOFF.md','docs/ROADMAP_REVIEW_CLAUDE_20261011.md','patches/apply-claude.sh','patches/claude-motion-lag-and-stalls.patch'}
manifest=json.loads((root/'source-import-sha256.json').read_text())
for name,expected in manifest.items():
    archive=root/name
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:
        raise ValueError('Source archive checksum mismatch: '+name)
    with ZipFile(archive) as source:
        if source.testzip() is not None:
            raise ValueError('Damaged source archive: '+name)
        members=[]
        for item in source.infolist():
            path=Path(item.filename)
            if path.is_absolute() or '..' in path.parts or {'.git','node_modules'}.intersection(path.parts):
                raise ValueError('Unsafe archive path: '+item.filename)
            if path.suffix in {'.keystore','.pem','.key'} or path.name.startswith('.env'):
                raise ValueError('Secret file in archive: '+item.filename)
            # Applies even to old archives. Git's current rules and complete journal win.
            if path.as_posix() in protected:
                continue
            members.append(item)
        source.extractall(root,members=members)
print('Verified source imported; Git collaboration documents preserved.')
