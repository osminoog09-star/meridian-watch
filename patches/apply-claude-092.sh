#!/bin/sh
# Claude's releases on top of the released 0.9.2-a / APK 0.2.9 source (codex/android-029-claude-c2-e, 162d3a9).
# 0.9.2-a already contains everything up to Release E (C2 and E included): do not run apply-claude-091.sh
# or older chains on it.
# Usage: python3 -I source-import.py && sh patches/apply-claude-092.sh [last]
#   last = release-f | release-g | release-h (default: the last step)
#   release-f  — «Истории города»: multi-shift city stories with chapters, lookouts, press and aftermath
#   release-g  — the chief's first week; pedestrians wait at the kerb for sirens
#   release-h  — «Спасатели»: a separate rescue service with its own career, chief mode, fire model and calls
# Checked by Claude on a clean 0.9.2-a import: 554/554 JS; dist/tests byte-identical to claude/release-h
# except Codex's version strings. tests/deploy test_real_release fails until the new APK is built.
set -e
cd "$(dirname "$0")/.."
steps="release-f:claude-release-f-090 release-g:claude-release-g-090 release-h:claude-release-h-090"
last="${1:-release-h}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
