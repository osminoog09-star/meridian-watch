"""Claude 17.10: write export_presets.cfg and the editor settings for the automatic Android build (GitHub Actions).
Gradle export: the MercuryAndroid v2 plugin manifest is merged by Gradle. Signing comes from the GODOT_ANDROID_KEYSTORE_*
environment variables (the keystore never enters the repository)."""
import argparse,os
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('project',type=Path);p.add_argument('--version-code',type=int,required=True);p.add_argument('--version-name',required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--config',type=Path,required=True)
a=p.parse_args()
(a.project/'export_presets.cfg').write_text(f'''[preset.0]
name="Android"
platform="Android"
runnable=true
export_filter="all_resources"
include_filter="*.js,*.json"
exclude_filter="runtime-source/*,android-bridge/*,tools/*,audit/*,ui/source/*,ui/index.html,ui/package*,ui/test*,ui/*traces.json,ui/*fixtures.json,ui/manual-call-trace.json,simulation/source/*,simulation/*fixtures.json,scripts/verify*,scripts/render_*,ci/*"
export_path="{a.out}"
[preset.0.options]
gradle_build/use_gradle_build=true
gradle_build/export_format=0
architectures/armeabi-v7a=false
architectures/arm64-v8a=true
architectures/x86=false
architectures/x86_64=false
version/code={a.version_code}
version/name="{a.version_name}"
package/unique_name="com.mercurypolice.response"
package/name="Mercury Response"
package/signed=true
permissions/internet=true
permissions/vibrate=true
permissions/request_install_packages=true
screen/immersive_mode=true
''')
cfg=a.config/'godot';cfg.mkdir(parents=True,exist_ok=True)
(cfg/'editor_settings-4.7.tres').write_text('[gd_resource type="EditorSettings" format=3]\n[resource]\nexport/android/android_sdk_path = "'+os.environ['ANDROID_HOME']+'"\nexport/android/java_sdk_path = "'+os.environ['JAVA_HOME']+'"\n')
print('presets written')
