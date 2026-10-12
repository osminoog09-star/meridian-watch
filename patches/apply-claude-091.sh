#!/bin/sh
# Claude's releases on top of the released 0.9.1-a / APK 0.2.8 source (codex/android-028-claude-abc, 7808cb0).
# 0.9.1-a already contains everything up to Release A: do not run apply-claude-090.sh or older chains.
# Usage: python3 -I source-import.py && sh patches/apply-claude-091.sh [last]
#   last = release-c2 | release-e | release-f | release-g | release-h | release-i | release-j (default: the last step)
#   release-c2 — «Служба 2.1»: duty plan, staff courses, workshop, transfers, road police, personal goals
#   release-e  — Release E, Claude's part: guided first week, accessibility
#   release-f  — «Истории города»: multi-shift city stories with chapters, lookouts, press and aftermath
#   release-g  — the chief's first week; pedestrians wait at the kerb for sirens
#   release-h  — «Спасатели»: a separate rescue service with its own career, chief mode, fire model and calls
#   release-i  — «Скорая»: the ambulance service (patients, resuscitation, hospital), agency profiles in agency.js
#   release-j  — «Диспетчер 112»: the 112 desk career (calls, questions, phone instructions, routing) with the city crews of all services
# Checked by Claude on a clean 0.9.1-a import: 567/567 JS. tests/deploy test_real_release fails until
# the new APK is built (0.2.8 has no service2.js / firstweek.js / accessibility.js / arcs.js / rescue.js / rescue-scenes.js / agency.js / ems.js / ems-scenes.js / dispatch.js).
set -e
cd "$(dirname "$0")/.."
steps="release-c2:claude-release-c2-090 release-e:claude-release-e-090 release-f:claude-release-f-090 release-g:claude-release-g-090 release-h:claude-release-h-090 release-i:claude-release-i-090 release-j:claude-release-j-090"
last="${1:-release-j}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
