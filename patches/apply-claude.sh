#!/bin/sh
# Apply Claude's patches on top of a freshly imported 0.6.0-b source (codex/android-023-claude-integration).
# Usage: python3 source-import.py && sh patches/apply-claude.sh [last]
#   last = perf | review | live-calls | consequences | weather | custody | debrief | city-budget | apk-assets | device-test | scene-choice | ambulance | case-files (default: case-files)
# Each step is verified with `patch --dry-run` before applying; stops at the first failure.
set -e
cd "$(dirname "$0")/.."
last="${1:-case-files}"
for step in perf:claude-perf-060b review:claude-review-fixes-060b live-calls:claude-live-calls consequences:claude-consequences weather:claude-weather custody:claude-custody debrief:claude-debrief city-budget:claude-city-budget apk-assets:claude-apk-runtime-assets device-test:claude-device-test scene-choice:claude-scene-choice ambulance:claude-ambulance case-files:claude-case-files; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test 2>&1 | grep -E '^# (tests|pass|fail)'
