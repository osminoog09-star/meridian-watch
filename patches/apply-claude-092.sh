#!/bin/sh
# Claude's releases on top of the released 0.9.2-a / APK 0.2.9 source (codex/android-029-claude-c2-e, 162d3a9).
# 0.9.2-a already contains everything up to Release E (C2 and E included): do not run apply-claude-091.sh
# or older chains on it.
# Usage: python3 -I source-import.py && sh patches/apply-claude-092.sh [last]
#   last = release-f | release-g | release-h | release-i | release-j | release-j1 | release-j2 | release-j3 | release-j4 | release-j5 | release-j6 | release-k | release-k2 | release-l | release-l1 | release-l2 | release-m | release-m1 | release-o | release-o2 | release-p1 (default: the last step)
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
#   release-m  — «Полиция как в ППА»: the rapid response team (ГБР) is a prefecture unit, not a patrol role — the command centre sends it to armed and violent calls; a patrol keeps distance until it arrives; a barricaded armed person waits for K-Komando; a career officer transferred to ГБР gets only its calls across the city
#   release-m1 — ГБР works on its own like the real kiirreageerijad: a barricade is its job, K-Komando only for a hostage (the team acts first when a life is in danger), backs up patrols and takes calls nobody reached as an extra patrol
#   release-o  — «Мой персонаж»: a new career starts in the character creator (name, surname, age, look); the chief campaign opens only after the hero reached the top rank
#   release-o2 — «Жители-личности»: every participant of a call is a person of the city (name, age, work, household, district, character, motive); dossier and «Люди города»; custody → court next shift → fine or prison, repeated arrests cost the job; repeat calls bring the same person back
#   release-s1 — «Мечта»: the hero's long goal (the top rank, an own flat, 10 000 € savings, a skill at 8, a clean year, the best fitness) with progress; when it comes true — relief, news, the next dream
#   release-q1 — «Профессии»: an application to another emergency service (police, rescue, ambulance, 112) with checks (fitness, stress, first aid, clean record); in two shifts — the new job from the bottom of its ladder, the life, home, money and skills stay; no empty «ориентировки» line for rescuers and medics
#   release-p2 — «Дом и дорога»: a home in a district (rent, bills, food each month; moving with a deposit), the way to the station before each shift (foot, bus, own car; less rest; late in snow or tired; three late arrivals a month — a reprimand), the hero's needs in the personal file
#   release-r3 — «Звания как в жизни»: the next rank is conferred at the attestation by time in rank, evaluation, admissions, special courses, an award and a clean record; experience grows six skills by the kind of call (faster work, up to +20%); the mentor leaves after the probation month
#   release-o3 — «Живой город»: every citizen lives a day by age, job, household and character (sleep, commute, work, school, shops, walks, friends, the bar); needs explain what they do; the dossier shows «now», needs and the day; native: people on the streets near the camera, tap → card
#   release-r1 — «Служба как в ППА»: real Estonian police ranks (младший констебль → комиссар); a young officer sees only the own patrol; the shift supervisor (välijuht) drives to armed, joint and heavy calls of the player's crew and leads them; every 8 shifts a talk with him (course, paid overtime, workload, the next rank)
#   release-p1 — «Вторая работа»: a side job (taxi with a service card, courier, club security) after a written notice to the head (ATS § 60) or at one's own risk; evenings in the off-duty planner; thanks from people the crew helped; the career path line
# Checked by Claude on a clean 0.9.2-a import: 630/630 JS; dist/tests byte-identical to claude/release-m (with j1–j6, k, k2, l, l1, l2, m, m1, o, o2, p1, r1, o3, r3, p2, q1, s1, s2, t1)
# except Codex's version strings. tests/deploy test_real_release fails until the new APK is built.
set -e
cd "$(dirname "$0")/.."
steps="release-f:claude-release-f-090 release-g:claude-release-g-090 release-h:claude-release-h-090 release-i:claude-release-i-090 release-j:claude-release-j-090 release-j1:claude-release-j1-090 release-j2:claude-release-j2-090 release-j3:claude-release-j3-090 release-j4:claude-release-j4-090 release-j5:claude-release-j5-090 release-j6:claude-release-j6-090 release-k:claude-release-k-090 release-k2:claude-release-k2-090 release-l:claude-release-l-090 release-l1:claude-release-l1-090 release-l2:claude-release-l2-090 release-m:claude-release-m-090 release-m1:claude-release-m1-090 release-o:claude-release-o-090 release-o2:claude-release-o2-090 release-p1:claude-release-p1-090 release-r1:claude-release-r1-090 release-o3:claude-release-o3-090 release-r3:claude-release-r3-090 release-p2:claude-release-p2-090 release-q1:claude-release-q1-090 release-s1:claude-release-s1-090 release-s2:claude-release-s2-090 release-t1:claude-release-t1-090"
last="${1:-release-t1}"
case " $(echo "$steps" | sed 's/:[^ ]*//g') " in *" $last "*) ;; *) echo "Unknown patch stage: $last" >&2; exit 2 ;; esac
for step in $steps; do
  name="${step%%:*}"; file="patches/${step#*:}.patch"
  patch -p1 --dry-run -s < "$file" >/dev/null
  patch -p1 -s < "$file"
  echo "applied $file"
  [ "$name" = "$last" ] && break
done
npm test
