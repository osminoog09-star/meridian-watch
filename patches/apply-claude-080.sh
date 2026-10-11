#!/bin/sh
# Claude's packages on top of the released 0.8.0-a1 / APK 0.2.6 source (codex/native-map-026, 0938e99).
# Usage: python3 -I source-import.py && sh patches/apply-claude-080.sh [last]
#   last = patrol-work | service-history | trust-balance | partner-news | events-goals | polish-pack (default: the last step)
# Steps 1–19 of patches/apply-claude-070.sh are already inside 0.8.0-a1: do not run that script again.
set -e
cd "$(dirname "$0")/.."
steps="patrol-work:claude-patrol-work-080 service-history:claude-service-history-080 trust-balance:claude-trust-balance-080 partner-news:claude-partner-news-080 events-goals:claude-events-goals-080 polish-pack:claude-polish-pack-080"
last="${1:-polish-pack}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
