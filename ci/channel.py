"""Claude 17.10: write the public update channel (android/update.json + README) for ApkUpdater."""
import hashlib,json,sys
from pathlib import Path
root,apk,code,name=Path(sys.argv[1]),Path(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
sha=hashlib.sha256(apk.read_bytes()).hexdigest();base='https://raw.githubusercontent.com/osminoog09-star/meridian-watch-apk/main/android/'
(root/'android').mkdir(parents=True,exist_ok=True)
(root/'android/update.json').write_text(json.dumps({'versionCode':code,'versionName':name,'url':base+apk.name,'bytes':apk.stat().st_size,'sha256':sha})+'\n')
(root/'README.md').write_text(f'# Mercury Response — APK\n\nПоследняя версия: [{name}](android/{apk.name}) (versionCode {code}).\n\nSHA-256: `{sha}`\n\nУстановленная игра обновляется сама: проверяет `android/update.json`.\n')
print(sha)
