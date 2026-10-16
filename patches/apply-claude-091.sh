#!/bin/sh
# Claude's releases on top of the released 0.9.1-a / APK 0.2.8 source (codex/android-028-claude-abc, 7808cb0).
# 0.9.1-a already contains everything up to Release A: do not run apply-claude-090.sh or older chains.
# Usage: python3 -I source-import.py && sh patches/apply-claude-091.sh [last]
#   last = release-c2 | release-e | release-f | release-g | release-h | release-i | release-j | release-j1 | release-j2 | release-j3 | release-j4 | release-j5 | release-j6 | release-k | release-k2 | release-l | release-l1 | release-l2 | release-m | release-m1 | release-o (default: the last step)
#   release-c2 — «Служба 2.1»: duty plan, staff courses, workshop, transfers, road police, personal goals
#   release-e  — Release E, Claude's part: guided first week, accessibility
#   release-f  — «Истории города»: multi-shift city stories with chapters, lookouts, press and aftermath
#   release-g  — the chief's first week; pedestrians wait at the kerb for sirens
#   release-h  — «Спасатели»: a separate rescue service with its own career, chief mode, fire model and calls
#   release-i  — «Скорая»: the ambulance service (patients, resuscitation, hospital), agency profiles in agency.js
#   release-j  — «Диспетчер 112»: the 112 desk career (calls, questions, phone instructions, routing) with the city crews of all services
#   release-j1 — rescue and ambulance crews drive with lights; 112 calls by priority A/B
#   release-j2 — every service names its own mentor in the career card (not the police mentor)
#   release-j3 — rescuers and ambulance crews wear their own uniform (dark grey with hi-vis, green), not the police one
#   release-j4 — rescue/ambulance wording and department: no police custody orders, «часть»/«подстанция», «расчёт»/«экипаж», own rank ladder in the personal file
#   release-j5 — the garage preview shows fire engines and ambulances as themselves (was a police sedan)
#   release-j6 — trust shown as a whole percent (the header showed 90.52977267860129 %)
#   release-k  — «Совместные происшествия»: crashes with a trapped driver and house fires with casualties — police, rescuers and an ambulance on one scene, dependencies and a common debrief
#   release-k2 — joint calls on the 112 desk: ask about trapped people, notify the other services; not notified — the lead crew calls them from the scene
#   release-l  — «Руководитель центра 112»: chief mode for 112 — operators (hire, train, dismiss), seats, centre upgrades, non-emergency calls, the shift's numbers
#   release-l1 — career and chief are separate scenarios chosen on the start screen: no in-game switch; «Новая игра» goes back to the start screen
#   release-l2 — a resolved call pays by service (rescuers ×3, ambulance ×1.6): every chief can afford equipment
#   release-m  — «Полиция как в ППА»: ГБР is a prefecture unit sent by the command centre to armed and violent calls; K-Komando at a barricade; the ГБР career role takes only its calls
#   release-m1 — ГБР works on its own like the real kiirreageerijad: a barricade is its job, K-Komando only for a hostage (the team acts first when a life is in danger), backs up patrols and takes calls nobody reached as an extra patrol
#   release-o  — «Мой персонаж»: a new career starts in the character creator (name, surname, age, look); the chief campaign opens only after the hero reached the top rank
# Checked by Claude on a clean 0.9.1-a import: 568/568 JS. tests/deploy test_real_release fails until
# the new APK is built (0.2.8 has no service2.js / firstweek.js / accessibility.js / arcs.js / rescue.js / rescue-scenes.js / agency.js / ems.js / ems-scenes.js / dispatch.js).
set -e
cd "$(dirname "$0")/.."
steps="release-c2:claude-release-c2-090 release-e:claude-release-e-090 release-f:claude-release-f-090 release-g:claude-release-g-090 release-h:claude-release-h-090 release-i:claude-release-i-090 release-j:claude-release-j-090 release-j1:claude-release-j1-090 release-j2:claude-release-j2-090 release-j3:claude-release-j3-090 release-j4:claude-release-j4-090 release-j5:claude-release-j5-090 release-j6:claude-release-j6-090 release-k:claude-release-k-090 release-k2:claude-release-k2-090 release-l:claude-release-l-090 release-l1:claude-release-l1-090 release-l2:claude-release-l2-090 release-m:claude-release-m-090 release-m1:claude-release-m1-090 release-o:claude-release-o-090"
last="${1:-release-o}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
