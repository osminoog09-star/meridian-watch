#!/bin/sh
# Claude's packages on top of the released 0.7.0-a / APK 0.2.4 source (codex/android-024-claude-review).
# Usage: python3 -I source-import.py && sh patches/apply-claude-070.sh [last]
#   last = rescue | radio | policy | radio-ticker | investigation | garage | realism-r1 | realism-r3 (default: realism-r3)
# The old chain patches/apply-claude.sh is already inside 0.7.0-a: do not run it again.
set -e
cd "$(dirname "$0")/.."
steps="rescue:claude-rescue radio:claude-radio policy:claude-policy radio-ticker:claude-radio-ticker investigation:claude-investigation garage:claude-garage realism-r1:claude-realism-r1 realism-r3:claude-realism-r3"
last="${1:-realism-r3}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
