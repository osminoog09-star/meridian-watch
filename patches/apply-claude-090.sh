#!/bin/sh
# Claude's releases on top of the released 0.9.0-a / APK 0.2.7 source (codex/android-027-sound-quality, b993405).
# Usage: python3 -I source-import.py && sh patches/apply-claude-090.sh [last]
#   last = release-b | release-c | release-a | release-c2 | release-e | release-f | release-g | release-h | release-i | release-j | release-j1 | release-j2 | release-j3 | release-j4 | release-j5 | release-j6 | release-k | release-k2 | release-l | release-l1 | release-l2 | release-m | release-m1 (default: the last step)
# Steps 1–8 of patches/apply-claude-080.sh are already inside 0.9.0-a: do not run that script again.
# release-b-090 is byte-identical to claude-release-b-080.patch (step 9 of apply-claude-080.sh); if it is
# already applied, apply the next ones by hand: patch -p1 < patches/claude-release-c-090.patch, then
# patch -p1 < patches/claude-release-a-090.patch (Release A, Claude's part: sound of the place, people at calls),
# patch -p1 < patches/claude-release-c2-090.patch (Release C2: duty plan, staff courses, transfers, personal goals),
# patch -p1 < patches/claude-release-e-090.patch (Release E, Claude's part: guided first week, accessibility), npm test
set -e
cd "$(dirname "$0")/.."
steps="release-b:claude-release-b-090 release-c:claude-release-c-090 release-a:claude-release-a-090 release-c2:claude-release-c2-090 release-e:claude-release-e-090 release-f:claude-release-f-090 release-g:claude-release-g-090 release-h:claude-release-h-090 release-i:claude-release-i-090 release-j:claude-release-j-090 release-j1:claude-release-j1-090 release-j2:claude-release-j2-090 release-j3:claude-release-j3-090 release-j4:claude-release-j4-090 release-j5:claude-release-j5-090 release-j6:claude-release-j6-090 release-k:claude-release-k-090 release-k2:claude-release-k2-090 release-l:claude-release-l-090 release-l1:claude-release-l1-090 release-l2:claude-release-l2-090 release-m:claude-release-m-090 release-m1:claude-release-m1-090"
last="${1:-release-m1}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
