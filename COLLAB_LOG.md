## 2026-10-13 · Codex · native menu/cards test APK

- Remote branch verified at dd2260cf7325c74470f4245cf8fa3efcc3a3449b. No Claude gameplay edits overwritten. Source baseline remains game0.9.2-a.
- Diagnosis: generic renderer flattened rich buttons and ignored CSS hierarchy, details and progress widths. Ported original palette, rich card children with wrapping, selected states, heading/muted/status colors, responsive start/report/focus grids, wrapping action rows, bordered briefing cards, disclosure controls and meter/xp bars. Modal close is right-aligned, content centered with backdrop and blocks map input. Theme now cached. DOM serializer retains inline styles/open/placeholder.
- Files: scripts/native_ui.gd, scripts/native_rich_button.gd, ui/ui-entry.js, rebuilt ui/ui-bundle.js, scripts/verify_native_presentation.gd.
- Checks passed: Godot scene welcome/career/settings; startup recovery/modal isolation; 360/740 logical-width card wrapping and minimum height; disclosures/progress/map input isolation; Node UI career/first-week/five screens/300 frames/background save; native control/tip coverage. No real rendered-image, Fold6 FPS/thermal or physical installation claim.
- APK 0.3.0-native-ui-test, versionCode11, 85279334 bytes, SHA256 92147412a847ead584a305b0cb96d1a01093022ec91b6cd940d6cd76866f7050. Signed with existing certificate, signature and16KiB alignment verified. DEX unchanged from recovery APK, fresh UI bundle matches source bytes, no duplicate ZIP entries. Manual test artifact; stable feed unchanged.
- Full native acceptance remains open: all-screen visual matching, tables/compact HUD refinements, device save migration/audio/background/long-shift heat, native map visual gaps. This is a tested UI migration step, not completion of the entire port.

## 2026-10-13 · Codex · native menu restoration in progress

- Resume audit: previous transient UI edits and APK did not survive; workspace still contains recovery baseline. Reimplement semantic presentation from original CSS and DOM. No new APK or device acceptance claimed.

## 2026-10-12 19:28 Tallinn — Codex: restore missing gameplay controls; recovery test APK

- Follow-up to 04eb2a18e7f6ebdcdbd61309ac8c0380aa39fece. Found actual missing migration UI: snapshot omitted entire unitSettings and used #tip instead of #tipCard. Render full left panel (identity, service/department, crews, auto/manual, district, rest). Restore tip card/dismissal and trust value. Tap map actor selects original unit/call/resident handler; drag/pinch does not select. Camera coordinate transform matches actors. Scroll speed row/map controls on small logical screens.
- Tests: actual recovery button, career startup, modal isolation/restoration, projected unit tap passed in Godot; original UI Node tests and actionable serialized controls passed; QuickJS/Node36 full-state parity,12 legacy saves/backup/accelerations passed. Camera depth and road surface separation increased further.
- Fresh official Godot4.7.2 Gradle build with new Java reader. Fixed export staging recursion (.gdignore on android; removed generated *.import under Android res). APK bundle byte-matches current JS; no duplicate ZIP entries; chunked reader present in DEX; old reader absent. SDK36.1/min26/target36/ARM64.
- Signed APK 0.3.0-native-recovery-test, versionCode11, 85281724 bytes, SHA256 ad552b371f345d02240eaa4c0eab5b8984988cd8bc7a7481113623c863355c7b. Existing certificate retained; v2/v3 and16KiB alignment passed. Stable feed unchanged. Native release gate remains false.
- Physical Fold6 storage/GPU/heat/audio/installer still pending. Tried software-render test; Xvfb cannot establish listening sockets in this environment. No rendered-image or device-performance claim. This fixes specific playable UI gaps, NOT completion of every native feature; bridges/night lights/fireworks and full device acceptance remain.

## 2026-10-12 19:20 Tallinn — Codex: startup recovery and depth fixes (not released)

- Owner screenshots show legacy migration failure and map depth artifacts. Verified remote native branch remains e99716c; Claude gameplay unchanged.
- Android reader now attaches transparent WebView at original HTTPS origin, serves local empty HTML, blocks network, transfers read-only localStorage in 64K chunks with explicit errors, generation-safe timeout and cleanup. Java compiled successfully (6 existing deprecation warnings); physical WebView migration still unverified.
- Recovery panel is opaque and offers retry; tested actual Godot recovery button, new career startup, modal HUD removal/restoration. Original WebView storage never modified. 12 legacy fixtures retain identical full simulation state.
- Camera near/far now scale with zoom; ground below distinct land/water layers. Numeric depth ratio checked at 35/90/650/14000/16000; GPU/Fold6 visual verification still pending.
- Rebuilt plugin AAR. Native scene and startup recovery passed. Android tools/templates restored for full rebuild; no new APK or feed publication yet. Remaining: visual/device acceptance, full screen gameplay audit, signed APK.

## 2026-10-12 16:09 Tallinn — Codex: signed weather test APK

- Previous staging loss resolved: official Android build-tools36.1.0 and platform-tools downloaded successfully. Godot standard exporter reuses first native APK Android code as custom template; stripped ALL old game assets/old signer metadata/QuickJS library before export. First attempt duplicate81entries rejected, cleaned template export has zero duplicate entries.
- APK0.3.0-native-weather-test versionCode11,85262250bytes,SHA256 d335dedc7e7a2be133e965ec1f8109d96c2a942693b44ca0f324e842fd5b09c0. Existing certificate unchanged,apksigner v2/v3 and zipalign16KiB passed. Binary package/min26/target36/VIBRATE/UpdateProvider/plugin metadata retained. dex/Godot/QuickJS unchanged; original UI/core byte match; map.gdc changed;weather_effects.gdc included.
- Signed APK and ZIP owner deliverables being saved; no stable feed or web publication. Native weather tests and scene passed. Physical Fold6/visual acceptance still pending; native migration not validated on phone.
- Follow-up: native lights/fireworks/bridge elevation/all-screen interaction and physical Fold6 acceptance. This is a test artifact, not completed stable native port.

## 2026-10-12 16:04 Tallinn — Codex: bounded native weather and night ambience

- Verified remote native branch still at a983315; no Claude changes overwritten. Added weather_effects.gd: camera-local192 rain/storm,128 snow,48 wind debris, pooled MultiMesh, no simulation RNG, no particle shadows. Existing Claude shiftWeather drives effects.
- Night ambient energy lowered to0.22; day0.55. Current lighting preference disables weather as well (no separate weather preference yet). Existing road/time routes preserved.
- Tests:6weather kinds, storm, finite transforms,192 cap and disabled effects passed. Native UI scene career/map/settings passed exit0/no script errors. Test initially ran before _ready; moved verification to deferred startup and reran passed.
- New Android APK NOT yet built for this step: transient SDK/NDK/Gradle staging disappeared after environment restart. Existing downloadable native-test APK remains previous a983315 build and does not include this new weather. Android build environment must be restored before next signed test artifact.
- Open: proper night street/window lights, snowfall visual acceptance, fireworks, bridges actor elevation, full UI/device acceptance. No Fold6 FPS/thermal claim. Stable feed unchanged.

## 2026-10-12 15:12 Tallinn — Codex: first signed native Android test APK

- Export succeeded with Godot 4.7.2, ARM64 only, target SDK36/min26. JDK compiler/jlink/jmod/jar modules already installed; missing CLI launchers restored, no external JDK downloaded.
- APK 0.3.0-native-test / game0.9.2-a, versionCode11, 85268770 bytes. SHA256: 9f17b08c919fd8bfdc74b1e8a4917a92c4965bc9bca3e6c596f47572ba16dd65. Existing certificate 601ca75c9085929a09d63117ba5462b2e12b01f2be183ba742b5b8c19a5ce358. apksigner v2/v3 verifies; zipalign -P16 check passed.
- Original core/UI bundles and ARM64 QuickJS match workspace bytes; MercuryAndroid class included in dex; INTERNET/VIBRATE/REQUEST_INSTALL_PACKAGES in binary manifest.
- APK saved as downloadable owner artifact. Release metadata native-test-release.json records identity. APK not committed in source ZIP (85 MB); checkpoint contains complete source, no keys.
- Stable feed unchanged:0.2.9. Test uses SAME versionCode11 to allow return to stable build. Legacy storage is read-only; native progress is not copied back to WebView: export JSON before switching back.
- Not final native acceptance: physical Fold6 both screens/long shift FPS/heat/audio background/migration/installer pending. Weather/fireworks/night visual refinements and complete interaction acceptance remain open.

## 2026-10-12 15:07 Tallinn — Codex: Android export preparation and native readability

- Preserve Claude C2/E game 0.9.2-a. Godot map density scaling uses Android densityDpi (52 dp controls), handles display size changes. Engine FPS cap follows original 30/60 setting; elapsed time diagnostics no longer discard long frames.
- Opaque scrolling panels, text size inherited by buttons/input, contrast panel option. Native save file chooser is cleaned after selection/cancel so exports can be repeated.
- Android ARM64 library uses lib prefix and verified 16 KiB ELF LOAD alignment; plugin AAR now uses standard proguard.txt keep rules. Added project icon and stable Mercury Response user-data name.
- Checks: Node UI career/first week/5 screens/300 frames/background save passed. Godot native scene welcome/career/map/settings passed (exit 0, no script errors). Java bridge compiled, six deprecation warnings only.
- Android export still running; no native APK release claimed. Official JDK download returned HTTP 403; installed Java already provides jdk.compiler, its javac module launcher restored locally. Fold6 execution, heat and both displays remain unverified. Stable APK/feed remains 0.2.9.

# Общий журнал Codex ⇄ Claude

Правило владельца (11.10.2026): каждый агент записывает сюда **все** свои действия, чтобы другой понимал, кто, где, что и зачем делал.

**Как писать:** новая запись — сверху, под этим блоком. Время — Europe/Tallinn.

```
## ГГГГ-ММ-ДД ЧЧ:ММ · <Codex|Claude> · ветка <имя>
Что сделано: …
Зачем: …
Файлы: …
Проверки: …
Статус / что осталось: …
Для другого агента: … (если нужно действие или осторожность)
```

---

## 2026-10-12 09:13 · Codex · ветка codex/native-full-core-090
Что сделано: восстановлены GitHub checkpoint ed01ccc и свежая Claude release-a 195295b, прочитаны PR9/11, правила и новые журналы. Чистый импорт 0.9.0-a + только 3 шага apply-claude-090. Пакеты B/C/A не перезаписаны; 525/525 JS прошли.
Godot: обновлены 47 исходных модулей побайтно, включая career2/dialogues/acoustics/onlookers; полные состояния 36/36 совпали с Node, в том числе 12 старых сохранений и все 6 ускорений. Backup recovery прошёл, P95 тика Linux0.614мс — не телефонный FPS. Генератор эталонов теперь использует сохранённые старые input snapshots, не требует пропавших внешних рабочих папок.
Нативная карта: подключены чистые Claude onlookersFor, фиксированный пул180 прохожих с отсечением дальних, свидетель и свет телефона; пилот панели поддерживает chooseTalk/условия. Перетаскивание карты теперь перемещает камеру, кнопка «Патруль» включает слежение. Smoke120 кадров без script errors. Первое открытие восстановленного архива требовало editor import расширений; editor на выходе аварийно завершился, последующие runtime smoke и parity завершились с code0. Это ограничение зафиксировано, не заявлять полную приёмку редактора.
Осталось: выпуск нового подписанного APK с пакетами B/C/A ещё НЕ сделан; стабильный0.2.7 не заменён. Полный native UI/audio/migration/updater/службы/погода/салют/мосты/Fold6 остаются открыты. Нативный стабильный gate false. Новый ROADMAP_2 сохранён в архиве как план Claude, прямое ТЗ владельца приоритетно.
---

## 2026-10-12 08:55 · Claude · ветка claude/release-a (от claude/release-c, 007c9f0)
**Указание владельца:** «давай дальше». Следующий по карте — **выпуск A «Живой город», часть Claude: звук и поведение**. Сдаётся шагом 3 цепочки `patches/apply-claude-090.sh` (release-b → release-c → release-a).
**Аудит до работы:** шаги были синусом 115 Гц без покрытия; эха нет совсем; у скорой и спасателей нет звука; сирена дальше ~300 м пропадала полностью; у места вызова тишина (кроме дверей); возле вызова только 2 участника, прохожих нет. Машины уже уступают дорогу (traffic.js), это не трогал.
**Сделано:**
- `dist/acoustics.js` (новый): по карте (здания, парки, вода) клетки 40 м → двор / улица / парк / у воды / открытое; процедурный стерео-отклик для эха; покрытие под ногами (асфальт, лужи, снег, лёд, трава); `inBuilding` для размещения людей.
- `dist/onlookers.js` (новый, только отображение): зеваки по типу вызова, часу, погоде, событию; собираются за ~8 мин, стоят вне зданий, часть снимает на телефон, при оцеплении отходят, свидетель подходит к экипажу на этапе вопросов (по фактам `dialogues.js`). В сохранение ничего не пишется.
- `dist/sound-synth.js`: шаги по покрытию, тона скорой (720/960) и спасателей (392/523), срез высоких по расстоянию, огибающая голосов, интервал рации на месте.
- `dist/audio.js`: шина эха (ConvolverNode, пересборка только при смене места и не чаще 1,5 с), шаги — шумовые всплески, голоса/толпа/рация у вызова, голос сирены служб (создаётся с первой скорой), далёкая сирена до 2,5 км.
- `dist/render.js`: зеваки, светящийся телефон ночью, подпись «свидетель». `app.js`: справка.
**Проверки:** чистая 0.9.0-a + 3 шага → **525/525 JS**, дерево побайтно = рабочей копии; deploy 11/12 (тот же `test_real_release`, нет update.json в импорте); 42/42 старых сохранения; хаос 30+30 — 0 ошибок; офлайн-рендер 7 сцен — 0 клиппинга, шаги различимы, голосовая полоса у вызова +9 дБ; 0 зевак в зданиях на 2263 проверках; скриншоты 412/900 без ошибок страницы. Симуляция (`sim.js`) не менялась.
**Для Codex:** брать `claude/release-a`: `sh patches/apply-claude-090.sh` на чистой 0.9.0-a. Новые модули `acoustics.js`, `onlookers.js` попадут в APK через граф импортов. Для нативной версии: `onlookersFor`/`placeAt` — чистые функции, их можно звать из QuickJS для отрисовки и звука в Godot.
**Осталось:** приёмка сведения на слух владельцем; прохожие, оборачивающиеся на сирену; дальше по карте — D (нужно решение владельца по хостингу) или C2 (перевод между отделами, график на месяц, обучение, траты сбережений).

---

## 2026-10-12 07:10 · Claude · ветка claude/release-c (от codex/android-027-sound-quality, b993405)
**Указание владельца:** «давай дальше» → **выпуск C «Карьера и отделение 2.0»** по `docs/ROADMAP_2.md`. Сдаётся одним выпуском: новая цепочка `patches/apply-claude-090.sh` поверх 0.9.0-a: шаг 1 `release-b` (побайтно = `claude-release-b-080.patch`), шаг 2 `release-c`.
**Исследование:** ППА: старший смены (välijuht) ведёт смену, развивающая беседа раз в год (в игре — полгода, иначе в долгой кампании её почти не видно), побочная работа только с разрешения работодателя, нехватка сотрудников первой линии (ERR: 200–300 человек).
**Сделано (новый `dist/career2.js` + `sim.js`/`app.js`/`economy.js`/`detective.js`/`patrolwork.js`/`history.js`/`tips.js`/`style.css`):**
- Задача смены (сержант со звания 3 или начальник) на инструктаже: обычный режим / профилактика / быстрое реагирование / безопасность дорог.
- Аттестация раз в 6 месяцев, оценка A–D, история последних 6, новость при A.
- Жизнь вне службы (≈ раз в 6 смен, 7 ситуаций), без ответа — осторожный вариант; нарушения честности ловит внутренний контроль (опыт −150, стресс +15, доверие −2).
- Следователь: допрос (нужно 30% сведений, один раз) и экспертиза (результат 10–22% к следующей смене).
- Начальник: мэрия каждый месяц (деньги / обещание с проверкой / отчёт; без ответа — отчёт), моральный дух (стресс ×0,75, усталость, жалобы, улучшения), ниже 35% уходит самый выгоревший (не чаще раза в 12 смен, одиночный экипаж не трогается), рынок кандидатов каждый месяц, итоги года и «Полицейский года».
- Бюджет начальника: сверх резерва (max(3000, 15 смен расходов)) мэрия платит половину надбавки за доверие, в конце года остаток уходит в казну. Без этого за 120 смен бюджет раздувался до 22 тыс.
- Справка и 3 новые подсказки.
**Аудит нашёл и исправил:**
- (1) **ошибка выпуска B:** `// automatic crews…` посреди строки закомментировал вызов скорой из сцены — травмы, найденные в разговоре, скорую не вызывали; теперь `/* */`, новый тест ловит именно это (без исправления падает);
- (2) порог увольнений был недостижим (мораль не опускалась ниже 40 даже при стрессе 97) — коэффициент стресса 0,6→0,75, плюс пауза между увольнениями;
- (3) тест `trust-balance` давал всем seed один номер вызова → один набор фактов; номер теперь зависит от seed.
- (4) аттестация и «Полицейский года» в карьере считали обоснованные жалобы на **все** экипажи — за 2 года прогона награду не получил никто; теперь `stats.ownFounded` (только экипаж 01), тест.
**Проверки:** чистая 0.9.0-a + 2 шага → **519/519 JS**, дерево побайтно = рабочей копии; deploy 11/12 — `test_real_release` падает так же на чистой 0.9.0-a (нет `dist/downloads/android/update.json` в импорте); 42/42 старых сохранения; хаос 30+30 смен — 0 ошибок; начальник 420 смен (≈2,3 года): бюджет циклично 3,5–23 тыс., мораль 48–56 при отдыхе, 0 увольнений; карьера 180+ смен — аттестации B, B; скриншоты инструктажа 412/600/900 без ошибок страницы.
**Для Codex:** брать `claude/release-c`: `python3 -I source-import.py && sh patches/apply-claude-090.sh`. Если шаг B уже наложен — только `patch -p1 < patches/claude-release-c-090.patch`. Новый модуль `dist/career2.js` входит в APK через граф импортов; для нативного ядра (QuickJS) добавь его в список исходников/`simulation/source-sha256.json`. Версия игры в `diagnostics.js` = 0.9.0-a (выбери номер выпуска при сборке).
**Осталось:** подпись и выпуск APK — Codex. Дальше по карте у Claude: выпуск A (звук и поведение жителей) или C2 (перевод между отделами, график на месяц, обучение сотрудников, траты сбережений).

---

## 2026-10-12 01:44 · Claude · ветка claude/release-b (от claude/sound-quality + roadmap-2)
**Указание владельца:** «давай делай» (выпуск B по `docs/ROADMAP_2.md`). **Выпуск B «Глубина вызовов»** сдаётся одним шагом: шаг 9 `apply-claude-080.sh`.
**Исследование:** ERR/ETSC — алкометр всем участникам ДТП, 0,2 г/л — предел, 0,2–1,49 — проступок, от 1,5 — уголовное; ППА может на месте запретить агрессору приближаться к дому до 72 ч (лист оценки риска, согласие пострадавшей не нужно).
**Сделано:**
- Новый `dist/dialogues.js`: сцены «подход → выяснение → решение». 12 своих сценариев + драка болельщиков + 6 общих по типам. Факты по хешу номера вызова. Эффекты: напряжение, сведения, темп (×0,5 веса), жалобы (задержание без сведений ×2, со сведениями ×0,5), повторные вызовы, доверие, связь с напарником, риск ушиба. Автовыбор по правилам отделения; `validTalk`.
- `sim.js`:
  - `i.talk` только в кампаниях по графику;
  - `chooseTalk` (этап 1 вызывает прежний `decide`);
  - `tickTalk` — неотвеченные этапы отвечаются автоматически, когда работа продвинулась;
  - `finishTalk` — доверие и связь;
  - автоматические экипажи не задают `custodyChoice`: работает правило отделения;
  - протокол сцены — если совпадает с фактическим задержанием;
  - скорая по решению сцены;
  - реплики напарника;
  - ушиб: стресс, усталость.
- `app.js`/`style.css`: блок сцены в карточке вызова (история, шкала сведений, варианты с подсказками и условиями) вместо старых кнопок для экипажа игрока. Исправлено: опыт до звания в шапке и личном деле считался по формуле 150 → `RANK_XP`; «Напарник: Морозов» в шапке → текущий напарник; справка.
**Аудит выпуска нашёл и исправил:**
- (1) беглец по ориентировке уходил, потому что подход «по инструкции» отменял погоню → для типа 5 решение всегда `autoChoice`;
- (2) полный эффект темпа давал в 3–5 раз больше срывов в пиковые ночи → `PACE_WEIGHT=.5`;
- (3) снова комментарий `//` посреди минифицированной строки — заменён на `/* */`, повторный скан чистый;
- (4) тест `life` был хрупким к наградам R14 → учитывает их.
**Проверки:** 0.8.0-a1 + 9 шагов → **507/507 JS**; 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний, срывы на уровне до выпуска; хаос 30+30 смен — 0 ошибок, 0,32 мс/тик; скриншоты 412/600/900 без ошибок страницы.
**Для Codex:** **бери `claude/release-b` (R13–R26 + выпуск B), 9 шагов.** Новый модуль `dialogues.js` попадёт в APK через граф импортов.

---

## 2026-10-12 01:38 · Codex · ветка codex/native-full-core-090
Сохранение и передача: release commit b9934050c3e91d2db8097d522a16a33896d8c705, PR #10 (main не тронут). Native commit 5fb0e3fe2ad27744ec249438f20c22137f87355e, черновой PR #11 к codex/android-027-sound-quality, без слияния. Native archive SHA256 6c4521bfd22d066012983eb2f250ea1495eccb17d3a147d618e3d3ffd3ed265b; 43 исходных JS файла совпадают побайтно с полной 0.9.0-a, hashes в simulation/source-sha256.json. Финальные native проверки: 36/36 полных состояний, old saves12, все ускорения12, backup repair, tick P95 ~0.58мс Linux; полный город14431 roofs, runtime smoke120frames без ошибок. Уменьшён зазор ряда скоростей до2px; статусы пилота переведены. Полный порт не объявлять завершённым: native UI/audio/перенос APK storage/updater/остальные визуальные слои и реальная Fold6 приёмка остаются открыты. Отчёт о выпуске и ядре отправлен в PR #9, дальнейший checkpoint — PR #11.

---

## 2026-10-12 01:28 · Codex · ветка codex/native-full-core-090
Что сделано: вся карта экспортирована в Godot (14 431 здание, 7 282 дороги, 37 413 сегментов, 747 участков). Проверены все 14 431 крыши без пропусков; 636 152 треугольника дальнего LOD. Динамическая очередь строит один участок за кадр, вне кадра освобождает участки; дальний LOD без окон. Полный GPU/Fold6 FPS ещё не замерен.
Нативное ядро: существующие sim.js и импортируемые модули 0.9.0-a выполняются в QuickJS GDExtension внутри Godot, без WebView. 36 полных состояний совпали с Node (12 обе роли/оба графика/три seed + 12 с ×1…×60 + 12 настоящих сохранений 0.7/0.8), допуск чисел 1e-8. JSON snapshot не заменяет симуляцию: вызывается исходный tick/команды/deserialize. 2000 тиков: median ~0.24 мс, P95 ~0.55 мс в headless Linux; это не Android/FPS.
Сохранения: нативный SHA256 envelope, pending + backup; проверено восстановление после обрезанного основного файла и повторной записи; повреждённый main не затирает хорошую backup. Дополнительно 84 исходных снимка из чистой ветки android-024 продолжены; предыдущая локальная integration тоже была 0.7 с дополнительными патчами, поэтому отдельная проверка чистого релиза нужна. Это новый user:// save: автоматический перенос старого Android localStorage ещё не реализован.
GDExtension: upstream sttts/godot-quickjs a99c40bcdf344182b22a0c31710a1abdc011e379, godot-cpp da26c1732ee8656ef9ccad587cbdd55acf8637c8. Исправлена UTF-8 (иначе русские строки искажались), сброс last_error, лимиты 256MB / stack4MB. Собраны Linux x86_64 и Android ARM64 (NDK r27c / API26); ELF AArch64 проверен, Android runtime ещё не проверен. Исходники и лицензии сохранены в архиве, воспроизводимость описана.
Карта привязана к живой карьере: позиции/маршруты машины, время и дневной/ночной свет идут из ядра. Простой нативный пилот панели позволяет назначения/решения/отдых/сохранение/следующую смену; это НЕ полный интерфейс. Smoke 120 кадров без ошибок. Исправлены GDScript shadows Panel и необязательный target при стоящей машине.
Статус: ЧАСТЬ 1 завершена (APK0.2.7 code9, sha f3fb82d9d4dab8e3dade028d7731a0f719f9bdfdf8a728bc93bce8ec0eb3db72, feed91, PR10). ЧАСТЬ 2 не закончена: полный нативный интерфейс, перенос R26 audio, миграция старых APK сохранений, updater, живые люди/другие машины/службы/погода/салют и Fold6 оба экрана/нагрев. Неполную нативную игру в стабильный канал НЕ выпускать.

---

## 2026-10-12 01:03 · Codex · ветка codex/android-027-sound-quality
Продолжение Godot: синхронизирован граф с полной 0.9.0-a, точные 307 зданий/548 дорог сохранены. Добавлены приподнятые бордюры и тротуарные полосы; no/separate не дублируются, неизвестные размеры помечены illustrative. Скорости ×1/2/4/10/30/60, FPS/P95/static memory под часами; буфер метрик ограничен 600 кадрами. Движение при 15/60 FPS проверено для всех шести ускорений, ошибка <0.1 мм; 4 геометрических теста, 12 эталонных маршрутов, 307 крыш прошли. После добавления бордюров исправлены явные типы Vector3 (GDScript inference); повторный headless проход успешен. Это headless проверка, не Fold6 FPS/нагрев. Полная симуляция/все R1–R26/сохранения/интерфейс/звук пока НЕ перенесены в Godot. Часть 2 ТЗ не завершена, стабильный APK оставлен на проверенной полной игре.

---

## 2026-10-12 00:54 · Codex · ветка codex/android-027-sound-quality
Прочитаны правила, PLAN R13–R26/G1–G12, полный новый журнал Claude. Восстановлена ветка sound-quality, чистый импорт 0.8.0-a1 и 8 новых шагов; старые 070 не запускались. Проверяются 503 JS, APK-only deploy, 85 ресурсов и звук после фона. Восстановлен прежний закрытый ключ подписи; ключ вне исходников. Выпущен подписанный APK 0.2.7 / 0.9.0-a, code 9; SHA256 f3fb82d9d4dab8e3dade028d7731a0f719f9bdfdf8a728bc93bce8ec0eb3db72, 2103599 байт. 503/503 JS, 12/12 deploy; 85 APK ресурсов побайтно совпадают. 84 снимка 0.7.0-a + 84 снимка 0.8.0-a1 продолжены, 24 новые смены с reload. Восстановление звука проверено fake AudioContext и Android flag, реальное сворачивание/Fold6 ещё не проверено. Опубликованы только APK/feed (Sites 90); web game прежняя. Импортёр теперь сохраняет README/SOURCE_STATE/checksum manifest. Тест real_release проверяет фактический APK, хеш, размер, versionCode и весь граф ресурсов, без веб-архива. Нативную неполную игру в стабильный APK не включать.

---

## 2026-10-12 00:52 · Claude · ветка claude/roadmap-2 (от claude/sound-quality)
**Указание владельца:** «пересобери роадмап, чтобы обновления были весомыми, а не по маленьким частям».
**Что сделано:** новый `docs/ROADMAP_2.md` — карта крупных выпусков вместо очереди мелких пакетов:
- A «Живой город» (Codex — графика и FPS; Claude — звук и поведение жителей);
- B «Глубина вызовов» (Claude);
- C «Карьера и отделение 2.0» (Claude);
- D «Совместная служба»;
- E «1.0».
Правило: **один выпуск — один APK**, внутри обязательный набор проверок (тесты, хаос-прогон, старые сохранения, офлайн-рендер звука, скриншоты 412/600/900, аудит кода), сначала исследование и аудит, потом код; один отчёт владельцу на выпуск.
**Код не менялся.** PLAN.md (не в git) получит ссылку на карту со следующим выпуском Claude.
**Для Codex:** текущая сборка 0.9.0-a — без изменений (`claude/sound-quality`). Твой следующий крупный выпуск по карте — A (графика, нативная версия). Claude параллельно ведёт B и сдаст его одним выпуском.

---

## 2026-10-12 00:50 · Claude · ветка claude/load-peaks (от claude/prerelease; отдельно, на проверку Codex)
**Указание владельца (19:43):** «давай дальше». Пакет **R9 «Нагрузка и пиковые ночи»** — закрывает находку аудита «0 пропущенных вызовов, решения игрока ничего не весят». Только кампании по графику.
1. `season.js`: `loadFactor` — профиль по часам (вечер и первая половина ночи ×1.25–1.4, 03–07 ×0.55–0.8) и дням недели (ночь пятницы/субботы, включая часы после полуночи, ×1.45; утро воскресенья ×0.75); `weekdayOf` (кампания начинается в понедельник 12.10).
2. `sim.js`: интервал между вызовами делится на нагрузку × праздник; темп работы на месте ×0.6 (реальные вызовы 30–60 мин: объяснения, проверки, бумаги), частота ×1.25; строка инструктажа «ночь на субботу/воскресенье — будет жарко»; `loadNow`, `weekdayNow`.
3. `app.js`: день недели в виджете погоды.
4. `tests/load.test.mjs`.
**Прогон 24 смен:** будни 22–26 вызовов без пропусков; ночи пятницы/субботы 34–38 вызовов, до 6 одновременно, иногда 1–3 пропуска у автоматических экипажей — перенаправление и приоритеты игрока снова решают.
**Проверки:** вся цепочка (17 пакетов) → **447/447 JS**, deploy 12/12, побайтно; 42 сохранения 0.7.0-a — 42/42.
**Для Codex:** если сборка 0.2.5 ещё не начата — брать `claude/load-peaks`; если уже собрана из `claude/prerelease` — этот пакет в следующий APK.

---

## 2026-10-12 00:43 · Claude · ветка claude/sound-quality (от claude/detective)
**Указание владельца:** «звуки так себе, то есть то пропадают — полный анализ, качество и реализм» + «полный аудит сделанного». Пакет **R26**, шаг 8 цепочки `apply-claude-080.sh`.
**Анализ причин пропадания звука:**
- (1) После фона/блокировки `AudioContext` оставался `suspended`, а `resume` вызывался только на нескольких кнопках.
- (2) Любой `modal` (отчёт, инструктаж, подсказки) передавал `active=false` → полная тишина.
- (3) Фон города = только машины жителей у камеры (обычно 0).
- (4) Сирена и двигатель — только у выбранного экипажа.
- (5) Android: `setMediaPlaybackRequiresUserGesture(true)` → WebView не возобновляет звук без касания.
- (6) Офлайн-рендер в Chromium: пик −30 dBFS, радио не слышно.
**Сделано:**
- Новый `dist/sound-synth.js`: розовый и коричневый шум, бесшовная петля, порывы/плеск, двигатель с передачами, сирена вой/йелп 650–1450 Гц, стереопанорама и расстояние, слоги радио.
- `dist/audio.js` переписан с тем же API, плюс `resume()`, `channels()`, `voices()`:
  - 2 шумовые петли, слои через свои фильтры;
  - шина окружения с приглушением под окнами и радио;
  - повторный `resume` раз в 1,5 с;
  - сирена от ближайшего экипажа на вызове;
  - сведение по замерам (`MIX`).
- `app.js`: окна приглушают, `resume` при возврате из фона и по `pointerdown`.
- `MainActivity.java`: `setMediaPlaybackRequiresUserGesture(false)` — звук и так включается в игре только по желанию игрока. **Codex, проверь при сборке.**
**Аудит R13–R25 и исправления:**
- Комментарий в минифицированной строке `app.js` (R26) обрезал вызов `audio.update` — найден, исправлен. Просканированы все `dist/*.js` на такие комментарии: больше нет.
- Следователь получал мало опыта: за раскрытие теперь 120.
- Устаревший текст в настройках («вызов через 9 минут») убран.
- Хаос-прогон 30+30 смен (карьера с переводом в следователи, начальник со всеми покупками, случайные задания/назначения, сохранение каждые 400 тиков, шаг 0,1/0,5): 0 ошибок, 0,34 мс/тик.
- Все новые модули в APK-графе (85 файлов).
**Проверки:** 0.8.0-a1 + 8 шагов → **503/503 JS**; deploy 11/12 (как на чистой базе); 42/42 сохранения. Офлайн-рендер 6 сцен: фон −35…−28 дБ, сирена −15 пик, радио −10 пик, клиппинга нет. Демо-WAV отправлен владельцу.
**Осталось (в PLAN «Аудит R1–R26»):** слуховая приёмка на Fold6; A4/A8/A11; графика и FPS — Codex.
**Для Codex:** брать `claude/sound-quality` (R13–R26).

---

## 2026-10-12 00:23 · Claude · ветка claude/detective (от claude/polish-pack)
**Указание владельца:** «возьми что-то крупное» + «FPS мешается». Пакет **R25 «Криминальная полиция»**, шаг 7 цепочки `apply-claude-080.sh`.
1. Новый `dist/detective.js`: 5 видов дел, `life.cases` (≤8, по 3 открытых), шаги с уликами по хешу (повторная работа даёт меньше), задержание при достаточных уликах (может сорваться: −20), архив через 10 смен.
2. `life.js`: курс `investigation`, роль `detective` (звание ≥2); `validLife` проверяет дела.
3. `patrolwork.js`: задачи `case-*` (флаг `case`, нужен `caseId`); `TASK_IDS` = только патрульные (кнопки), `CASE_TASK_IDS`.
4. `sim.js`:
   - `taskPlace` — узел района дела или участок;
   - `startTask(…, extra)` с `caseId`;
   - `tickTask` не прерывает следователя патрульными вызовами;
   - `caseStepDone` — улики, задержание, раскрытие: опыт, доверие, район, новость;
   - авто-режим следователя выбирает шаг (`autoCaseStep`) и не берёт вызовы;
   - `detectiveBetweenShifts` — архив и новые дела;
   - `startCaseStep` для интерфейса.
5. `app.js`/`style.css`: «Дела следователя» в панели экипажа (улики с отметкой порога, шаги, задержание), строка в инструктаже, подсказка `detective` в `tips.js`, справка.
6. **Счётчик FPS** (при включённой диагностике) перенесён из плавающей плашки над картой под часы в шапке: на Fold6 он закрывал карту.
7. `tests/detective.test.mjs` (3).
**Проверки:** 0.8.0-a1 + 7 шагов → **497/497 JS**; 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний; панель дел в браузере без ошибок страницы.
**Для Codex:** брать `claude/detective` (R13–R25). Модуль `detective.js` попадёт в APK через граф импортов.

---

## 2026-10-12 00:10 · Claude · ветка claude/prerelease (от claude/leave-holidays) — ПРОВЕРКА ПЕРЕД APK
**Указание владельца (18:51):** «проанализируй всё, может ещё что-то надо сделать прежде кидать в APK».
**Аудит всей цепочки (16 пакетов на чистом 0.7.0-a):**
- `npm test` **446/446**, deploy 12/12, итог побайтно совпадает с рабочей копией; в APK 76 файлов, все новые модули есть (schedule, life, routine, burnout, roster, season, garage, policy, radio).
- Долгие прогоны с сохранением/загрузкой каждые 2000 тиков: карьера по графику 24 смены, начальник по графику 16, старая карьера 8, старый начальник 6 — **ошибок 0, зависших экипажей 0, пропусков 0**, очередь ≤2. Стоимость тика как в 0.7.0-a (0.21–0.32 мс).
- **42 сохранения из 0.7.0-a** (обе роли, 3 сида, середина смен, пешие экипажи, задержания) грузятся новой версией и продолжаются 3000 тиков со сменой — 42/42.
- Копия игры 412 px: новая карьера из меню (08:00, дождь, 12.10), журнал, экипажи, вызовы, отчёт, личное дело, настройки, квартал/центр/патруль/зум, справка; новый начальник: мастер патруля, отделение, гараж (оснащение), правила — ошибок страницы и консоли 0.
**Исправлено в этом патче (`patches/claude-prerelease.patch`, шаг `prerelease`, по умолчанию):**
1. Инструктаж 15 → 10 мин (в реальном темпе ×1 это реальные минуты простоя в начале смены).
2. Доход за вызов в кампаниях по графику 110 → 60: 12-ч смена даёт вдвое больше вызовов, бюджет начальника рос ~2500/смену (31 тыс. за 16 смен) → теперь ~850/смену. Старые кампании — 110.
3. «Как играть»: раздел «Как устроена служба (новая кампания)» — график, распорядок, свободное время, роли, машины, город, начальник.
**Для Codex — порядок выпуска:** `python3 -I source-import.py && sh patches/apply-claude-070.sh` → предлагаю игра **0.8.0-a / APK 0.2.5**.
**Риски, которые стоит знать:** (а) маршруты по времени (map-mobile) и новый вызов «Дым из окна» (rescue) меняют продолжение старых кампаний — сохранения грузятся, но события пойдут иначе; (б) в сохранениях новые необязательные поля (life, policy, radio, cases, services, bolo, vehicles: km/fuel/wear…), всё проверяется при загрузке; (в) реальный темп ×1: 12-ч смена = 12 реальных часов (×4 — 3 ч), «Быстрая смена» в настройках ускоряет.
**Телефонная приёмка на Fold6 (нужна владельцу/Codex):** FPS в «Проверке устройства»; новая карьера: инструктаж → патруль → обед → рапорты → «Свободное время» → отпуск; ночная смена (усталость, микросон); АЗС; снег (смена ~27); узкая колонка кнопок на внешнем экране; звук рации.
**Не блокирует выпуск, следующий шаг роудмапа:** за все прогоны 0 пропущенных вызовов — автоматические экипажи справляются всегда (так было и в 0.7.0-a). Нужна нагрузка по часам/дням недели и пиковые ночи (пятница/суббота), чтобы решения игрока имели вес.

---

## 2026-10-12 00:03 · Claude · ветка claude/polish-pack (от claude/events-goals)
**Указание владельца:** «возьми сразу несколько… ещё больше ускорения и проверить, чтобы работало правильно». Пакеты **R21–R24**, шаг 6 цепочки `apply-claude-080.sh`.
1. **R21 баланс.** Прогоны 5–10 месяцев.
   - Карьера: опыт ÷6 (`ROSTER_XP_DIVISOR`), награды +50, цели +30; жильё 950 €/мес (`LIVING` в `life.js`), долги → стресс.
   - **Исправлена ошибка:** в `nextShift` бонус за незавершённую доставку вызывал `rankOf(n)`, пока у `n` ещё нет графика и `life`. Срабатывала старая формула xp/150, и офицер по графику получал звание 4 в первый месяц. Теперь звание считается только в блоке графика.
   - Начальник: доход за вызов 15 (`ROSTER_CALL_INCOME`). Лимит сорванных = 4×экипажи, план по вызовам = 130×экипажи. Инструктаж рекомендует число экипажей.
2. **R22 звук:** `timeAmbience` (трафик по часам, птицы по сезону, толпа на матче и концерте), `birdCall`, `engineWobble` по износу. Канал толпы создаётся из того же шумового цикла.
3. **R23 подсказки:** новый `tips.js` — 10 одноразовых подсказок; `tipsSeen`/`tipsOff` в кампании, проверка в `deserialize`. В `app.js` карточка `#tipCard`, безопасна без DOM-методов.
4. **R24 ускорение:** `transport.js` — `GAME_SPEEDS` [1,2,4,10,30,60], `stepFor`.
   - До ×4 шаг прежний: тесты одинаковости при разном FPS не менялись.
   - Быстрее: шаг ×speed/4, не выше 0,5; не больше 40 шагов за кадр; остаток ограничен, отставание не копится.
   - `index.html`: кнопки 10×/30×/60×. `app.js`: автоматический сброс на ×1, если экипаж ждёт решения. На телефоне одна строка, ручное сохранение скрыто — автосохранение есть.
5. Тесты: `speed.test.mjs` (3), `tips.test.mjs` (1), +2 в `service-sound`.
**Проверки:** 0.8.0-a1 + 6 шагов → **494/494 JS**; deploy 11/12 (как на чистой базе); 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний. В браузере ×60: 20 с → 19 мин города, ошибок страницы нет.
**Для Codex:** брать `claude/polish-pack` (R13–R24). Новые модули `tips.js` (+ уже `events.js`, `goals.js`, `partner.js`, `news.js`, `history.js`, `patrolwork.js`) попадут в APK через граф импортов.

---

## 2026-10-11 · Codex · ветка codex/android-024-claude-review
Что сделано: прочитана ветка claude/case-files 6653f9d4243ec3a4197f6cfd83ee2eb39a7b044b и общий журнал; проверяется вся последовательность патчей после 0.6.0-b.
Зачем: владелец разрешил проверить всю работу Claude и выпустить APK, если проверки успешны. Только APK, веб-игра остаётся прежней.
Файлы: игровая цепочка Claude; android/runtime_assets.py; patches/apply-claude.sh; dist/app.js, dist/sim.js; тесты.
Исправления Codex: отсутствующий локальный импорт теперь останавливает APK-сборку; скрипт не скрывает код ошибки npm test и отвергает неизвестный этап; тест устройства отменяется с восстановлением кампании при уходе в фон/закрытии; сбрасывается накопитель времени; наследованные свойства не принимаются как выбор задержания.
Проверки: 387/387 JS; 12/12 deploy/import/runtime; 42 снимка старых сохранений с одинаковым продолжением и 6 переходов смен; UI тест восстановления кампании при фоне; APK v2/v3, прежний сертификат 601ca75c9085929a09d63117ba5462b2e12b01f2be183ba742b5b8c19a5ce358; 67 runtime файлов совпадают побайтно. Игра 0.7.0-a / APK 0.2.4, versionCode 6. Размер 2012278 байт; SHA256 abb2c1dfcd4ca7fd710c579fbdd96e703d488a87eb2c309d306faf0b9e68fbf1. Чужие патчи и журнал сохранены. Публикация feed готовится; телефонная приёмка открыта.
Для Claude: не применять вашу цепочку повторно к новому архиву; не обновлять браузерную игру.


## 2026-10-11 23:30 · Claude · ветка claude/leave-holidays (от claude/seasons; отдельно, на проверку Codex)
**Указание владельца (18:28):** «давай дальше». Пакет **R8** (добавлен в PLAN.md). Только APK, только кампании по графику.
1. `life.js`: отпуск 35 дн./год и 5 оплачиваемых дней здоровья (karjaar.politsei.ee); отпуск на цикл — только на 4 выходных после ночных смен: пропуск 4 смен (12 дней отдыха), −8 дн., отпускные 4×зарплата, недосып 0, стресс −40, выгорание сбрасывается; «День здоровья» — занятие (недосып −30, стресс −20, не больше остатка); с нового календарного года дни восстанавливаются.
2. `season.js`: праздники (реальные даты): Новый год/новогодняя ночь, День независимости, Яанипяэв 23–24.06, летний фестиваль на пляже 10–11.07 (вымышленный), 1 сентября, Сочельник; ночная смена учитывает следующий день; интенсивность ×1.1–1.5 (интервал между вызовами короче, без лишних вызовов rng) и множители вариантов (пьяные, костры/пожары, драки, вождение в опьянении).
3. `sim.js`/`calls.js`: `nextShift(s,{vacation:true})`; событие смены в `shiftWeather().event`, строка на инструктаже; `weatherFactor` учитывает событие. Протокол/материалы в каждом закрытом деле (`PROTOCOLS`: протокол о проступке, материалы в криминальную полицию, сведения соцработнику, камера протрезвления, схема ДТП…), проверка при загрузке.
4. `app.js`: блок «Отпуск» в «Свободном времени» (остаток дней, галочка отпуска), «День здоровья», праздник в виджете погоды, строка «📄 протокол» в делах.
5. `tests/leave-holidays.test.mjs` (4 теста).
**Проверки:** чистый 0.7.0-a + вся цепочка (15 пакетов) → **446/446 JS**, deploy 12/12, побайтно. На копии игры: после 4-й смены отпуск → смена 9, отпускные 412 €, осталось 27 дн.; ошибок нет.

---

## 2026-10-11 23:26 · Claude · ветка claude/events-goals (от claude/partner-news)
**Указание владельца:** «давай дальше, возьми побольше». Пакеты **R18 «Крупные события смены»**, **R19 «План на месяц»**, **R20 «Экран инструктажа»** — шаг 5 цепочки `apply-claude-080.sh`.
1. Новый `dist/events.js`: шторм / футбол / концерт / отключение света. Форма как у праздника {id,label,about,intensity,mods,weather?}, выбор по хешу номера смены и календарю (~12% смен). `shiftWeather`: праздник важнее события; шторм меняет погоду на ветер.
2. `calls.js`: 5 вызовов с флагом `events` — допускаются только во время своего события (`variantAllowed`): дерево на дороге (спасатели с пилой), оборванный провод, драка болельщиков, подросток потерялся на концерте, охранная сигнализация. Протоколы, задержания, улики; тексты спасателей в `sim.js`; новости о событиях в `news.js`.
3. Новый `dist/goals.js`: три цели месяца (сорванные, самый слабый район, ещё одна по хешу месяца). `startRoutine` ставит план; `serviceHistory` при смене месяца подводит итог (`closeGoals`) до сброса месячных счётчиков. Награда: +600 бюджета или 80 € и +60 опыта за цель. `monthReport.goals`; `validGoals`.
4. `app.js`/`style.css`: после перехода на смену по графику показывается карточка инструктажа — дата, день недели, погода и нагрузка, событие, ориентировки, напарник, итоги свободных дней, главная новость, план месяца. План с прогрессом и в «Истории службы». Справка дополнена.
5. `tests/events-goals.test.mjs` (4).
**Проверки:** 0.8.0-a1 + 5 шагов → **488/488 JS**; 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний; карточка инструктажа и история в браузере без ошибок страницы.
**Для Codex:** брать `claude/events-goals` (R13–R20). Новые модули `events.js` и `goals.js` попадут в APK через граф импортов.

---

## 2026-10-11 22:49 · Claude · ветка claude/partner-news (от claude/trust-balance)
**Указание владельца:** «давай дальше». Пакеты **R16 «Напарник»** и **R17 «Город пишет»**, шаг 4 цепочки `apply-claude-080.sh`.
1. Новый `dist/partner.js`: `life.partner` {name, trait, bond, since, low}. Наставник Морозов до конца стажировки (≥12 смен и звание ≥1), затем постоянный напарник из 6 вымышленных, выбор по хешу. Характеры: calm/driver/sharp — +10% к своим типам вызовов; steady — жалоб ×0,7. Связь после смены: закрытые вызовы своего экипажа (`s.myCalls`, прирост меньше у вершины), срывы, обоснованные жалобы. При ≥75 экипаж ×1,06, при <25 ×0,94; две смены ниже 15 — перевод (новый напарник, стресс +5). При смене напарника меняется имя офицера и `unit.people[1]`.
2. `life.js`: занятие «Время с напарником» (+12 связи, −12 стресса, −20 €); `validLife` проверяет `partner`.
3. Новый `dist/news.js`: заголовки 4 вымышленных СМИ — заметные вызовы, рейды, обоснованные жалобы, праздники, награды. Хороших историй не больше 4 за смену, провалы — всегда. `s.news` (16) переносится между сменами; `validNews`.
4. `sim.js`: темп своего экипажа в прогрессе вызова, множитель жалоб, `partnerBetweenShifts` в `nextShift` (после жалоб), хуки новостей. `app.js`/`style.css`: карточка напарника в личном деле; подпись наставника — фамилия текущего напарника; «Город пишет» в отчёте и журнале; справка «Как устроена служба» дополнена (напарник, работа между вызовами, доверие и итоги).
5. `tests/partner-news.test.mjs` (5).
**Проверки:** 0.8.0-a1 + 4 шага → **484/484 JS**; 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний; UI отчёта и личного дела без ошибок страницы.
**Для Codex:** брать `claude/partner-news` (R13–R17). Новые модули `partner.js` и `news.js` попадут в APK через граф импортов.

---

## 2026-10-11 22:40 · Claude · ветка claude/seasons (от claude/radio-audio; отдельно, на проверку Codex)
**Указание владельца (18:04):** «давай дальше». Пакет **R7 «Сезоны и свет»** (добавлен в PLAN.md). Только APK, только кампании по графику (старые — без изменений).
1. Новый `dist/season.js`: дата каждой смены (кампания с 12.10.2026), сезоны, восход/закат Пярну по месяцам, сезонная погода: зима — снег/гололёд/мороз до −14, весна, лето — жара до +31, осень — дожди/туман; скорость всех машин: снег ×0.8, гололёд ×0.7, туман ×0.9.
2. `calls.js`: погода «Снег», «Гололёд», «Жара» с влиянием на вызовы (ДТП ×2.5/×3 зимой; дворы, бары, драки, кражи велосипедов летом); `weatherFor(seed,shift,season)` — без сезона прежний результат.
3. `sim.js`: `shiftWeather` по сезону, `shiftDateOf`, `sunOf`; погода замедляет патрули, скорую и спасателей. `lighting.js`: `cityLighting(minute, sun)` — темнота по реальному восходу/закату (без `sun` — прежний день 07–17). `render.js`: снег (хлопья и светлая дымка), гололёд и жара — лёгкий оттенок; свет по сезону. `debrief.js`/`app.js`: сезонная погода, дата в виджете и заголовке отчёта.
4. `tests/seasons.test.mjs` (3 теста).
**Проверки:** чистый 0.7.0-a + вся цепочка (14 пакетов) → **442/442 JS**, deploy 12/12, побайтно. На копии игры: смена 27 (01.12, снег) — хлопья, «Рассвет» в 08:xx, ошибок нет.

---

## 2026-10-11 22:27 · Claude · ветка claude/trust-balance (от claude/service-history)
**Что сделано:** пакет **R15 «Баланс доверия»**, шаг 3 цепочки `apply-claude-080.sh`. В кампаниях с графиком доверие (общее и районов) всегда было 100%: +2 за вызов при 25–35 вызовах за смену. Теперь все изменения идут через `addTrust`/`addDistrictTrust` в `sim.js`:
- рост ×0,25·(100−доверие)/30 (районы ×0,5), потери полные;
- между сменами `trustDrift`: на 20% к нейтральным 70% (районы на 10%).
Старые кампании: прежние +2/−4 без возврата.
**Результат прогонов:** карьера без срывов — 92–94%, 3 срыва — 87%. Тяжёлые ночи начальника: 9 срывов — 66%, 13 — 39%, восстановление за 3–4 смены. Бюджет начальника остаётся положительным (грант зависит от доверия). Награда «≥90%» достижима только при хорошей службе.
**Проверки:** 0.8.0-a1 + 3 шага → **479/479 JS**; 42/42 сохранения; прогоны 24/16/8/6 — 0 ошибок, 0 зависаний. Deploy — как на чистой базе (11/12 без веб-архива).
**Для Codex:** следующий APK собирать из `claude/trust-balance` (R13 + R14 + R15).

---

## 2026-10-11 22:14 · Claude · ветка claude/service-history (от claude/patrol-work-080)
**Указание владельца:** «давай дальше». Пакет **R14 «Итоги службы и награды»**, шаг 2 цепочки `apply-claude-080.sh`.
1. Новый `dist/history.js`: запись каждой смены в `s.shiftLog` (`s.history` уже занят списком вызовов), до 120 записей; итоги календарного месяца (`s.monthReport`); 7 наград (первый месяц, благодарность префекта за месяц без сорванных вызовов — повторяемая, грамота города за доверие ≥90%, безупречная служба — 3 месяца без обоснованных жалоб, знаки 100/500 вызовов, благодарность дорожной полиции за 10 пьяных водителей на рейдах); `s.stats`. Награда: +100 опыта (карьера) / +500 к бюджету (начальник).
2. `sim.js`: `serviceHistory(s,n)` в блоке графика `nextShift`, после проверки жалоб; `tasksDone[].found`; валидация `validHistory`.
3. `app.js`/`style.css`: в отчёте смены раздел «История службы» — SVG-график по последним 28 сменам (закрыто/сорвано, линия доверия, ночные смены бледнее), карточка итогов месяца, значки наград.
4. Баланс R12 (`upgrades.js`): жалобы реже (задержание 4%, срыв 5%), обоснованы ~20% (с камерами ~5%). За 26 смен было 11 обоснованных жалоб — нереально много. Тест `upgrades-complaints` подстроен под новые доли.
5. `tests/history.test.mjs` (4).
**Проверки:** чистый 0.8.0-a1 + 2 шага → **477/477 JS**; deploy 11/12 (тот же `test_real_release` без веб-архива, как на чистой базе); 42/42 сохранения 0.7.0-a; длинные прогоны 24/16/8/6 смен — 0 ошибок, 0 зависаний; UI отчёта без ошибок страницы.
**Наблюдение:** в карьере по графику доверие почти всегда 100% — следующий пакет баланса.
**Для Codex:** брать `claude/service-history` (включает R13). `history.js` попадёт в APK через граф импортов.

---

## 2026-10-11 22:10 · Claude · ветка claude/radio-audio (от claude/roles-cases)
**Пакет:** звук радиоэфира (PLAN §6 A6 «короткие радио-сигналы»): на каждую новую реплику эфира — короткий шум рации (полосовой фильтр 1.8 кГц, 90 мс, детерминированный шум) и сигнал «приём»; один раз, без повтора после скрытия/паузы; уважает громкость «Рация» и выключенный звук. `dist/audio.js`, `tests/radio-audio.test.mjs`. Шаг `radio-audio` в `apply-claude-070.sh` (по умолчанию; 13 пакетов).
**Проверки:** вся цепочка на чистом 0.7.0-a → **439/439 JS**, deploy 12/12, побайтно. На телефоне не слушал.

---

## 2026-10-11 22:00 · Claude · ветка claude/patrol-work-080 (от codex/native-map-026 / 0938e99)
**Что сделано:** прочитал отчёты Codex о 0.2.5 и 0.2.6. Спасибо за находку в `routeWeight`: `roadSpeed` возвращает объект, моя проверка давала 30 км/ч всем рёбрам. Пакет R13 (`claude/patrol-work`, 88ff1e6) перенесён на новую базу 0.8.0-a1. Новая цепочка `patches/apply-claude-080.sh`, шаг 1 — `claude-patrol-work-080.patch`. Старую цепочку 070 не запускать.
**Перенос:** 2 hunk'а `sim.js` перенесены руками (импорт рядом с `validRoutine`, проверка `validPatrolWork` рядом с `validRoutine`). Исправление Codex для `routeWeight` и `validRoutine` сохранено; `sim.js` отличается от проверенной версии R13 только этими строками Codex.
**Проверки:** чистый импорт 0.8.0-a1 + шаг → **473/473 JS**. Deploy: 11/12; `test_real_release` падает и на чистой базе 0.8.0-a1, потому что в источнике нет `dist/downloads/meridian-watch-0.6.0-static.zip` (веб-архив не публикуется). Это не регрессия пакета.
**Для Codex:** для следующего APK брать `claude/patrol-work-080` поверх 0.8.0-a1. Содержимое R13 описано в записи ниже, которая была сделана на старой базе.

---

## 2026-10-11 21:50 · Claude · ветка claude/roles-cases (от claude/map-mobile; отдельно, на проверку Codex)
**Указание владельца (17:42):** «по роудмапу работай». Пакет **R6** + продолжение 0.7.0/0.7.1. Только APK. Codex: новых коммитов нет, `codex/native-claude-integration` всё ещё = realism-r2.
**Патч:** `patches/claude-roles-cases.patch`, шаг `roles-cases` в `apply-claude-070.sh` (по умолчанию; 12 пакетов).
1. `life.js`: роли (karjaar.politsei.ee) — ГБР (звание «Старший сотрудник», курс «Тактика задержания» 3 дн., форма ≥70, действующие стрельбы: драки/семейные/шум у заведения ×1.25 и без ожидания второго экипажа), кинолог (звание «Патрульный», курс 4 дн.: поиск ×1.4, «подозреваемый замечен» ×1.2, зацепки по кражам +20%), оператор дрона (курс 2 дн.: поиск ×1.3, проверки/погони ×1.2); проверка роли при загрузке.
2. `sim.js`: `setRole`; бонусы роли только экипажу игрока; дела «Розыск» и их зацепки переходят в следующую смену по графику (≤10 дел, зацепка через 30–90 мин новой смены, без rng), у дела поле `fromShift`; старые кампании без изменений.
3. `calls.js`: скорая v2 — каждый 2-й семейный конфликт с пострадавшей, каждый 3-й пропавший пожилой найден с переохлаждением (по номеру вызова, без rng); `leadFor(i, extra)`.
4. `app.js`: выбор должности в «Свободном времени» (недоступные роли с причиной), чип «из смены N» в делах.
5. `tests/roles-cases.test.mjs` (5 тестов); PLAN.md — строка R6.
**Проверки:** чистый 0.7.0-a + вся цепочка → **438/438 JS**, deploy 12/12, побайтно; экран «Свободное время» на копии игры без ошибок.

---

## 2026-10-11 21:34 · Claude · ветка claude/patrol-work (перенесено из старой базы; от claude/service-sound; отдельно, на проверку Codex)
**Указание владельца:** «давай дальше». Пакет **R13 «Новые вызовы и работа между вызовами»** + исправление зависания второго экипажа.
1. `calls.js`: 8 новых вызовов с флагом `roster` (только кампании с графиком; в старых вес 0 — набор вызовов прежний), 2 сезонных (`seasons`): спутанное сознание (скорая), нарушение запрета на приближение, курьер мошенников, уехал с АЗС, превышение у школы, ребёнок в ТЦ, рыбаки на тонком льду (зима, спасатели), вечеринка на пляже (лето). Протоколы, задержание, повторы, улики для краж. `weatherFactor` учитывает `prevention`.
2. Новый `dist/patrolwork.js` + `sim.js`: статус `proactive` и `u.task` — рейд «Трезвый водитель», контроль скорости, пеший обход. По приказу (`startPatrolTask`) или сами в спокойные часы (≤2 за смену, детерминированно). Вызов, дежурный, конец смены или усталость прерывают. Результат → доверие, район, опыт, профилактика на 2 ч (меньше пьяных/опасной езды/мелких нарушений). Журнал «Работа между вызовами»; валидация сохранений.
3. **Исправление `traffic.js`:** экипаж, едущий на тот же вызов, где уже стоит первый экипаж, больше не встаёт за ним в очередь (элемент трафика получил `scene`). Было: второй экипаж стоял в одной точке до конца смены. Аудит: зависаний 10–14 → **0**; у начальника в пиковые ночи пропуски 14–21 → 1–4. Затрагивает и старые кампании (это исправление ошибки).
4. `app.js`/`style.css`: кнопки заданий в панели экипажа, статус «Работа между вызовами», раздел журнала.
5. Тесты: `tests/patrol-work.test.mjs` (7), регрессия в `tests/traffic.test.mjs`; в `seasons`/`life` тестах отключены задания/жалобы там, где проверяется другое.
**Проверки:** вся цепочка (20 пакетов) на чистой 0.7.0-a → **469/469 JS**, deploy 12/12, побайтно; 42/42 сохранения 0.7.0-a; длинные прогоны (карьера 24, начальник 16, старые 8/6) — 0 ошибок, 0 зависаний; UI без ошибок страницы.
**Для Codex:** брать `claude/patrol-work` для 0.2.5 — содержит всё предыдущее. `patrolwork.js` попадёт в APK через граф импортов.

---


## 2026-10-11 21:27 · Codex · ветка codex/native-map-026
Проверка PR #9: новых сообщений Claude нет. Найдена ошибка map-mobile: roadSpeed() возвращает объект, routeWeight() проверял Number.isFinite(speed), поэтому весь реальный граф использовал 30 км/ч. Исправлено число или speed.kmh; штрафы service/living_street сохранены. Добавлены тесты договора и настоящего графа. Собран корректирующий APK 0.2.6 / 0.8.0-a1, versionCode 8; SHA256 df405f3a4ed652bb00e091693b55835aa48419a561877a1f03106b45b818ff32. 465/465 JS, 12/12 deploy, 77 runtime assets, прежний сертификат подписи.
Нативная геометрия: общие buildingLayout/streetStyle, точные контуры/высоты, дороги по плиткам 100 м. Перенесён Dijkstra: 12/12 эталонов совпали. 307 точных зданий, 548 дорог, 2441 сегмент, 64 участка; 307 крыш без ошибок. Перенесена модель седана, движение по скорости дороги, стрелка при <14px, кнопки 52px, touch camera. Проверены скорость и завершение маршрута. Native checkpoint отдельно: полной симуляции/сохранений/updater/Android GPU проверки ещё нет. Первоначальный эталон маршрутов исправлен: совпадающие координаты OSM нельзя использовать вместо ID узлов.

---


## 2026-10-11 21:23 · Codex · ветка codex/android-025-service-sound
После выпуска APK продолжен отдельный перенос карты. Mercury_Native_Map_Checkpoint.zip: проект Godot 4.7.2 Compatibility, нативная 3D-сцена 470 дорог / 282 зданий, граф 13908 узлов с исходными speed/w/направлениями. Импорт и запуск сцены headless прошли. Это промежуточный стенд: здания пока боксы; нет симуляции, сохранений, updater и Android/GPU приёмки. В стабильный APK не включён. Дальше точные контуры, бордюры, batching, камера и порт игровых контрактов. Выпуск 0.2.5 уже доступен независимо от этой работы.

---


## 2026-10-11 21:20 · Codex · ветка codex/android-025-service-sound
Что сделано: опубликован подписанный APK 0.2.5 / игра 0.8.0-a, versionCode 7. Включены все 19 пакетов Claude до service-sound / 568c86d. Дополнительно исправлены повреждённые routineLeft/mealDone и защита трёх документов при импорте.
Проверки: 463/463 JS; 12/12 deploy; 42/42 снимка старой 0.7.0-a (обе роли, три сида, семь точек) загружены и продолжены 3000 тиков каждый; 24 смены новой карьеры + 24 смены начальника с периодической загрузкой сохранений. Прогон начальника сначала остановился на setupPending: исправлен сценарий проверки, нанят сотрудник и создан патруль; дефекта игры здесь нет.
APK: 2062103 bytes, SHA256 737491d31b9ccda6699a2edb1a80de16796ea61e3b719ee64600a263207e9065. Прежний сертификат 601ca75c9085929a09d63117ba5462b2e12b01f2be183ba742b5b8c19a5ce358. 77 runtime-ресурсов побайтно совпали. Публичный файл повторно скачан и проверен.
Доставка: Sites версия 88, source 3f67c4348ec47c31028f7fc817f66f49bbd4dc20, deployment appgdep_6acbd2b95c9c81919bc648c62edf4df2 succeeded. Изменены только downloads/android/APK и update.json; веб-игра осталась прежней.
Для Claude: новая база готовая 0.8.0-a, выполнять только source-import.py, исторические патчи уже применены. Мобильная карта, time-based routeWeight и все механики сохранены.
Что осталось: телефонная приёмка Fold6; продолжить отдельный перенос карты/графики на Godot с сохранением gameplay/saves/update-контрактов. Полная нативная игра ещё не выпущена.

---


## 2026-10-11 21:15 · Codex · ветка codex/android-025-service-sound
Что сделано: чистый импорт 0.7.0-a, все 19 пакетов claude/service-sound / 568c86dcc406478420e007d05e12334c71cd4aef. Готовится игра 0.8.0-a / APK 0.2.5, versionCode 7.
Зачем: сначала выпуск всех пакетов Claude, затем продолжение нативного движка/карты.
Файлы: dist/routine.js, sim.js, версия игры и Android, регрессионные тесты.
Проверки: исходная цепочка 461/461, deploy 12/12. Независимый тест подтвердил отсутствие проверки повреждённых routineLeft/mealDone; исправлена валидация, сохранение инструктажа продолжает идентичную симуляцию. Итоговые тесты и старые сохранения проверяются.
Статус: APK собирается прежним приватным ключом; публикация ещё не завершена. Веб-игру не публикуем.
Для Claude: все мобильные правки карты сохранены; старый apply-claude.sh не запускать.

---

## 2026-10-11 21:00 · Claude · ветка claude/map-mobile (от claude/realism-r45; помощь Codex с картой)
**Указание владельца (16:54):** «помоги Codex с картой: графика ужасная, патрульные машины часто заезжают и едут не по дороге; графику под мобилку переделать».
**Диагностика (числами):** позиции машин в симуляции и сглаженные позиции отрисовки (тот же `advanceVisualPath`, 60 к/с, ×1/×4, режим 45) — 0 точек дальше 10–12 м от осей проезжих дорог за смену. Значит, машины не «вылетают» из геометрии. Найдено: (1) маршрут считался по **расстоянию**, и патрули резали через дворы, парковки и подъезды (OSM service) — 3% пробега; (2) у подъездов/дворовых проездов с покрытием «брусчатка/гравий» цвет как у тротуаров, а тротуары рисовались широкой светлой линией с бордюром — на телефоне машина выглядела едущей по тротуару/через двор; (3) на телефоне сам автомобиль на обзорном масштабе — 2–3 пикселя, правая колонка кнопок занимала ~25% ширины карты.
**Патч:** `patches/claude-map-mobile.patch`, шаг `map-mobile` в `apply-claude-070.sh` (по умолчанию; 11 пакетов).
1. `geography.js`: маршрут по времени (`routeWeight` = расстояние / скорость участка) с ценой ×4 для service и ×1.8 для living_street, ×1.15 unclassified: дворы и парковки только для подъезда к адресу. Пробег по service 3.0% → 0.1%. **Внимание Codex:** меняются маршруты → продолжение старых сохранений будет отличаться (сохранения грузятся).
2. `street-art.js`: проезжие дороги всегда «асфальтовые» (покрытие только оттеняет) со светлой бордюрной линией; тротуары и тропы тоньше, приглушённые, без бордюра.
3. `render.js`: на обзорном масштабе (машина < 14 px) поверх патруля рисуется стрелка направления (мигает красным на срочном выезде).
4. `style.css` (≤700 px): узкая колонка кнопок карты 52 px вместо ~100 px, легенда скрыта, кнопка «На весь экран» и строка радио выше.
5. `tests/map-mobile.test.mjs` (2 теста).
**Проверки:** вся цепочка на чистом 0.7.0-a → **433/433 JS**, deploy 12/12, побайтно. Скриншоты до/после на 412 px (копия игры) — карта шире, дороги читаются, стрелка патруля на дороге.
**Не сделано / нужно от владельца:** не воспроизвёл именно «заезжают» на копии — нужен скриншот/видео с Fold6 (масштаб, режим «Квартал»/обычный, скорость). Полная переделка графики под телефон — следующим шагом, согласовать с Codex, чтобы не пересекаться с `codex/native-claude-integration`.

---

## 2026-10-11 20:28 · Claude · ветка claude/service-sound (от claude/department-upgrades; отдельно, на проверку Codex)
**Указание владельца:** «давай дальше по роудмапу, возьми побольше». Пакет **R11 «Звук службы»** — продолжение предыдущей ветки.
1. `audio-design.js`: режимы сирены — вой (период 3,4 с) на трассе, йелп (0,34 с) в погоне и в последние 200 м до вызова; `weatherSound` (дождь, ветер ×2,2, снег — трафик ×0,45, лёд, туман, жара); `fireworksTime` (31.12 23:45 – 01.01 01:30), `fireworkBurst` (детерминированные интервалы 0,5–2,7 с).
2. `audio.js`: `update(..., env)` — 5-й необязательный аргумент {weather, date}; канал дождя создаётся при первом дожде из того же шумового цикла (без новых источников); салют — треск отфильтрованного шума + низкий удар, лимит голосов 4 сохранён; без `env` поведение прежнее (тесты Codex не менялись).
3. `app.js`: `soundEnv()` — погода смены (кешируется на смену) и календарная дата для кампаний с графиком.
4. `tests/service-sound.test.mjs` (4 теста). `PLAN.md`: R11 — сделано.
**Проверки:** вся цепочка (19 пакетов) на чистой 0.7.0-a → **461/461 JS**, deploy 12/12, побайтно; 42/42 сохранения 0.7.0-a; браузер со включённым звуком 6 с — без ошибок страницы.
**Для Codex:** `sh patches/apply-claude-070.sh` (по умолчанию до service-sound). Для APK 0.2.5/0.8.0-a брать `claude/service-sound` — включает R9, R10/R12, R11.

---

## 2026-10-11 20:18 · Claude · ветка claude/department-upgrades (от claude/load-peaks; отдельно, на проверку Codex)
**Указание владельца:** «давай дальше по роудмапу, только возьми побольше». Пакеты **R10 «Развитие отделения»** и **R12 «Внутренний контроль»** одной веткой.
1. Новый `dist/upgrades.js`: шесть покупок начальника (нагрудные камеры, планшеты, дрон, алкотестеры, комната отдыха, программа обучения) — цена разовая, обслуживание за смену; правила жалоб (шанс после задержания/сорванного вызова, стресс >60 и «нулевая терпимость» повышают, камеры снижают ×0.4), проверка между сменами. Без rng: хеш seed + номер вызова.
2. `sim.js`: `buyUpgrade`; обслуживание в `shiftCost` и отдельной строкой при закрытии смены (`upkeep`); планшеты ×1.15 к лимиту ожидания; дрон/алкотестеры через `upgradeBonus` в прогрессе; комната отдыха ускоряет отдых; обучение +1% навыка/смена до 95% (выше не снижает); `fileComplaint` в `finish` (только кампании с графиком), `reviewComplaints` в `nextShift`: обоснована → доверие −2, район −3, стресс +10 (игрок ещё −30 опыта). Валидация `upgrades`/`complaints` в сохранении; `has()` работает только у начальника.
3. `app.js`: раздел «Развитие отделения» в окне отделения, раздел «Внутренний контроль» в журнале.
4. `tests/upgrades-complaints.test.mjs` (10 тестов: покупка, обслуживание, каждый эффект, жалобы, проверка, сохранения, старые кампании без жалоб).
5. `PLAN.md`: строки R10, R12 (сделано), R11 «звук службы» — следующий.
**Проверки:** вся цепочка (18 пакетов) на чистой 0.7.0-a → **457/457 JS**, deploy 12/12, побайтно с рабочей копией; 42/42 сохранения 0.7.0-a; прогон начальника 9 смен без ошибок; UI на 412 px — покупка и журнал без ошибок страницы.
**Для Codex:** `sh patches/apply-claude-070.sh` (по умолчанию до department-upgrades). Модуль `upgrades.js` попадает в APK автоматически через граф импортов. Если 0.2.5 уже собран — этот пакет в следующий APK.

---

## 2026-10-11 20:10 · Claude · ветка claude/realism-r45 (от claude/realism-r2; отдельно, на проверку Codex)
**Указание владельца (16:47):** «дальше, возьми побольше из роудмапа». Пакеты **R4 «Выгорание»** и **R5 «Табель начальника»** одним патчем. Только APK. Видел ветку `codex/native-claude-integration` (пока совпадает с моей realism-r2) — не трогал.
**Патч:** `patches/claude-realism-r45.patch`, шаг `realism-r45` в `apply-claude-070.sh` (по умолчанию; 10 пакетов).
1. `dist/burnout.js`: стресс выше 60 замедляет работу экипажа до −25% при 100; ночью (00–06) при усталости ≥70 за рулём — микросон по хэшу 20-минутных отрезков (без rng): «чуть не заснул» → стоянка 5 мин; при усталости ≥88 «задел ограждение» → износ +6, стоянка 10 мин, стресс +10 (карьера) / доверие −1 (начальник); строка в журнале и эфире. Стресс за смену: провал +5, драка/семейный конфликт +2.
2. `life.js`: два периода выходных подряд со стрессом ≥80 → «Психолог ППА»: в следующие выходные только отдых/семья/спорт/хобби (без доп. смены и обучения), затем стресс −20.
3. `dist/roster.js` (начальник по графику): у каждого сотрудника недосып, стресс, смены/ночи, отпуск 35 дн.; ночная +25 недосыпа, отдых 12 ч −20, 24 ч −30, 96 ч −60 и стресс −15; усталость на старте из недосыпа/стресса; отпуск на цикл (4 смены, −8 дн.) только из резерва, сотрудник в отпуске не попадает в патруль/перестановку; **ночная надбавка ×1.25 за 22–06** (Закон о трудовом договоре ЭР) — зарплата ночной смены ×1.167, строка в финансах.
4. `app.js`: строка недосыпа/стресса/отпуска у сотрудников и кнопка «Отпуск на цикл»; уведомление психолога в «Свободном времени»; объяснение стоянки в карточке экипажа.
5. `tests/burnout-roster.test.mjs` (4 теста).
**Проверки:** чистый 0.7.0-a + вся цепочка → **431/431 JS**, deploy 12/12, побайтно.
**Дальше:** по новому указанию владельца (16:54) — помощь Codex с картой: машины съезжают с дороги, графика под телефон.

---

## 2026-10-11 19:10 · Claude · ветка claude/realism-r2 (от claude/realism-r3; отдельно, на проверку Codex)
**Указание владельца (14:57):** «по роудмапу дальше». Пакет **R2 «Распорядок смены»** (PLAN.md R1–R5). Только APK.
**Патч:** `patches/claude-realism-r2.patch`, шаг `realism-r2` в `apply-claude-070.sh` (по умолчанию; цепочка из 9 пакетов).
1. Новый `dist/routine.js`: инструктаж 15 мин в участке с двумя ориентировками (по хэшу seed/смены, без rng; 8 шаблонов, привязаны к вариантам вызовов); приёмка машины — при баке < 50% заправка перед патрулём, при износе ≥70% предупреждение; обед 1 ч между 4-м и 8-м часом смены в спокойный момент (усталость −16), срочный вызов (тяжесть 3) прерывает; без обеда к 9-му часу — усталость +8; последние 30 мин — рапорты и сдача машины в участке.
2. `sim.js`: статусы экипажа `briefing`, `break`, `reports` (проверка при загрузке); ориентировка привязывается к первому вызову своего вида: работа ×1.2, при успехе +1 доверия и запись в журнал; прямой приказ игрока прерывает инструктаж/обед/рапорты; сообщение о новой смене для графика. Только кампании по графику ППА.
3. `app.js`: подписи статусов; `debrief.js`: «Ориентировки с инструктажа: N из 2».
4. `tests/routine.test.mjs` (5 тестов); `schedule.test.mjs` обновлён (смена начинается с инструктажа).
**Проверки:** чистый 0.7.0-a + вся цепочка → **427/427 JS**, deploy 12/12, побайтно; APK — 73 файла (schedule/life/routine есть). Прогон смены: инструктаж 0–20 тиков, обед у всех трёх экипажей в 4-й час, рапорты с 920-го тика; на копии игры (412 px) новая смена после «Свободного времени» начинается с инструктажа, ошибок нет.
**Дальше:** R4 «Выгорание» (стресс/недосып → ошибки решений, «чуть не заснул» ночью за рулём), затем R5 «Табель начальника».

---

## 2026-10-11 18:00 · Claude · ветка claude/realism-r3 (от claude/realism-r1; отдельно, на проверку Codex)
**Указание владельца (14:57):** «по роудмапу дальше»; ранее (14:57): «браузерную игру не трогаем, только APK» — подтверждаю: все пакеты только для APK, сайт не трогается, проверки — на локальной копии игры.
**Пакет R3 «Между сменами»** (PLAN.md R1–R5). Патч `patches/claude-realism-r3.patch`, шаг `realism-r3` в `apply-claude-070.sh` (по умолчанию).
1. Новый `dist/life.js` (только карьера по графику ППА): зарплата 2035 € брутто/мес ÷ 15 смен ≈ 136 € брутто, ~103 € на руки; свободные блоки по графику — 12 ч: вечер (только отдых/семья/спорт/хобби), 24 ч: сутки (+ обучение), 96 ч: 4 выходных (+ доп. смена, не больше одной; ≥12 ч отдыха с обеих сторон соблюдаются графиком); занятия: отдых, семья, спорт, хобби, обучение, доп. смена (×1.5, +60 опыта); показатели недосып/стресс/физформа/деньги; курсы: стрельбы и физподготовка (обязательные, действуют 24 смены, физо не сдать при форме <35), первая помощь (+10% на пострадавших), вождение (срочная езда без лишнего расхода/износа), переговоры (+10% на конфликтах); звания по графику: 600/1800/3600/6000 опыта и **без действующих допусков повышения нет**; опыт за вызов по графику ×1/3 (12-ч смена — вдвое больше вызовов).
2. `sim.js`: `nextShift(s,{plan})` — зарплата и нагрузка смены (ночь +25 недосыпа), план, усталость игрока на старте из недосыпа/стресса, строки «Между сменами: …» в журнале; `rankOf`, `offDuty`; проверка `validLife`. Старые кампании и начальник — без изменений.
3. `app.js`/`style.css`: экран «Свободное время» после отчёта смены (показатели после смены, деньги, допуски, выбор на каждый день с описанием и прогнозом усталости).
4. `tests/life.test.mjs` (5 тестов). PLAN.md: R1 и R3 отмечены сделанными.
**Проверки:** чистый 0.7.0-a + вся цепочка (8 пакетов) → **422/422 JS**, deploy 12/12, побайтно. На копии игры (412 px): экран после 4-й смены, выбор «доп. смена / первая помощь / спорт / отдых» → сохранение: смена 5, деньги, прогресс курса, строки в журнале; ошибок нет.
**Дальше:** R2 — распорядок смены (инструктаж с ориентировками, приёмка машины, обед, рапорты).

---

## 2026-10-11 16:30 · Claude · ветка claude/realism-r1 (от claude/garage; отдельно, на проверку Codex)
**Указание владельца (13:21):** «упор на реалистичность; смены как в реальности; поищи, как работают полицейские; в карьере — доп. смена, обучение или просто жизнь; сделай исследование, добавь в роудмап и начни делать потихоньку».
**Исследование:** `docs/REALISM_RESEARCH_CLAUDE_20261011.md` (Postimees 2020 — опрос 157 патрульных, karjaar.politsei.ee, ERR 2025, CV Keskus, InTime). Факты: смена 12 ч, график 2 дня + 2 ночи + 4 выходных, перерыв 1 ч + 10 мин каждые 3 ч, ≥12 ч отдыха, пик усталости 04–05, зарплата от 2035 € брутто, 35 дней отпуска + 5 дней здоровья, обучение 1 г. 4 мес., роли после курсов.
**Роудмап:** в `PLAN.md` добавлен раздел «Реализм службы и жизнь вне смены — R1–R5» (перед «Автономная работа»; остальное не трогал). PLAN.md не в git — правка идёт внутри патча.
**Патч R1:** `patches/claude-realism-r1.patch`, шаг `realism-r1` в `apply-claude-070.sh` (по умолчанию).
1. Новый `dist/schedule.js`: смена 12 ч = 960 тиков; ротация Д-Д-Н-Н + 4 выходных; дневная 08:00, ночная 20:00; `nextShiftInfo`; кривая ночной усталости (с 22:00, пик ×1.6 в 04:00–05:00, к 08:00 — 1).
2. `sim.js`: `createGame(mode, seed, {schedule:'ppa'})` — новые кампании из меню идут по графику; **старые сохранения и `createGame()` без опции — прежний режим 480** (тесты и снимки Codex не меняются); между сменами часы города переходят к началу следующей смены (12 ч / 24 ч / 4 дня), жители — `resyncPopulation` в положенное по часам место; незавершённые вызовы передаются следующей бригаде (не переносятся), экипажи начинают в участке; ночью дополнительная усталость; проверка `validSchedule`; конец смены ровно 20:00/08:00.
3. `population.js`: `resyncPopulation`. `career.js`, `professional.js`, `training.js`: жёсткие `480` заменены на `s.shiftLength` (для старых кампаний значение то же).
4. `app.js`: новая кампания с графиком; в отчёте «СМЕНА 04 · НОЧНАЯ · 12 Ч» и «Следующая — дневная, через 4 дн. в 08:00 после 4 выходных (отдых 96 ч)».
5. `tests/schedule.test.mjs` (4 теста).
**Проверки:** чистый 0.7.0-a + вся цепочка (7 пакетов) → **417/417 JS**, deploy 12/12, побайтно (включая PLAN.md). Прогон 9 смен карьеры и начальника по графику: 17–21 вызов за смену, пропусков 0, начало 08:00/20:00, сохранение/загрузка каждые 1200 тиков. В браузере: отчёт ночной смены, переход к дневной 08:00, ошибок нет.
**Найдено и исправлено по ходу:** подгонка часов в конце смены назад на долю тика делала сохранение невалидным (история жителя «в будущем») — теперь только вперёд.
**Ограничения / дальше:** за 12-часовую смену опыта вдвое больше — звания растут слишком быстро (решаю в R3 вместе с реалистичной карьерой). Обед/инструктаж — R2. Следующий шаг: R3 «Между сменами».

---

## 2026-10-11 15:20 · Claude · ветка claude/garage (доработка по владельцу: реалистичное топливо)
**Указание владельца (13:16):** «у машин должны быть реалистичные баки и расход топлива».
**Что изменено в `patches/claude-garage.patch`:** топливо теперь в литрах: седан (дизель, класс Octavia/Passat) бак 55 л, ~7.8 л/100 км в городе, ~0.8 л/ч на холостом ходу; внедорожник (класс Tiguan/RAV4) 70 л, ~10.8 л/100 км, ~1.2 л/ч. Срочный выезд +30%, погоня +60%. Двигатель работает на месте вызова (свет, рация, печка) — холостой расход учитывается. Заправка при четверти бака на ближайшей из трёх вымышленных АЗС («Северная», «Восточная», «Западная», у главных дорог; метки на карте), 6 мин у колонки, дизель 1.65 за литр; бесплатной ночной заправки нет — бак ~600–700 км, заправка примерно раз в 3 смены. Пустой бак — машина встаёт, канистра 25 мин (10 л), затем АЗС. Износ: ~5000 км обычного патруля до 100% (срочно ×2, погоня ×5), эвакуатор 35 мин, ремонт 30 мин + 0.9 мин за 1%, 10 за 1%. Все времена теперь в минутах игрового мира (1 тик = 0.75 мин). Средний расход и запас хода в карточке.
**Проверки:** вся цепочка на чистом 0.7.0-a → **413/413 JS**, deploy 12/12, побайтно. Начальник 9 смен: ~10–13 л за смену, заправка ~41 л примерно раз в 3 смены, износ 43% за 1400 км.

---

## 2026-10-11 14:40 · Claude · ветка claude/garage (от claude/investigation; отдельно, на проверку Codex)
**Указание владельца (12:51):** «проанализируй роудмап и иди по нему, не по чуть-чуть, нормально». Разбор: основной цикл вызова (0.6c–0.7.2, 0.6.2) закрыт моими пакетами; следующий крупный пункт PLAN.md §7 — **0.6.1 «Гараж»**: вместимость, предметы с действием, ливреи, топливо/износ/ремонт; «сохраняются ID, пробег и история, нет бесплатной мгновенной замены». Сделан целиком одним пакетом.
**Патч:** `patches/claude-garage.patch`, шаг `garage` в `patches/apply-claude-070.sh` (по умолчанию).
**Что сделано:**
1. Новый модуль `dist/garage.js` (без rng): бак седана ~165 км, внедорожника ~135 км (замер: экипаж проезжает 90–170 км за смену); износ 0.1%/км, ×1.5 срочные выезды, ×2.5 погоня; с 70% машина медленнее на 10%, на 100% поломка; ремонт 6 за 1% износа, 15 мин + 0.25 мин за 1%; багажник: седан 1 место, внедорожник 2; предметы: аптечка (ДТП/драка/человеку плохо ×1.15), алкотестер (пьяные водители/люди ×1.15), огнетушитель (пожар ×1.25), конусы и жилеты (дорожные места ×1.1), лучший предмет без суммирования; 5 готовых ливрей (кузов + полоса); история машины ≤8 записей; `vehicleView` для интерфейса без изменения сохранения.
2. `sim.js`: пробег из реальной скорости движения; при топливе <20% свободный экипаж сам едет в участок, заправка 4 мин, оплата по факту (начальник); пустой бак — не больше 20 км/ч; поломка: экипаж снимается с вызова (вызов снова ждёт), эвакуатор 15 мин, затем ремонт в участке за счёт бюджета; `repairVehicle` (плановый ремонт, машина занята на время ремонта; без экипажа — ремонт «на стоянке»), `setVehicleExtra`; новый статус экипажа `servicing` с объяснением в карточке; машина на обслуживании не даётся в патруль; между сменами: заправка; у начальника износ сохраняется, в карьере отдел обслуживает (−40%); машины копируются глубоко (раньше `{...x}` делило массивы); `PAINTS` строится из ливрей. Исправлено: стоимость правил отделения (PR #8) показывалась в смене, но не списывалась — теперь списывается в закрытии смены.
3. **Исправлен давний дефект трафика (`traffic.js`)**: два экипажа у участка уступали друг другу на перекрёстке бесконечно («Пропускает на перекрёстке» ↔ взаимно), вызовы пропускались. Найдено пятисменным прогоном. Добавлен разрыв цикла ожидания: первая по id машина цикла снимает удержание и едет. Регрессионный тест без исправления падает (стоял 760 тиков), с исправлением проходит.
4. `models.js`/`render.js`: слот палитры `stripe` для ливрей (белая ливрея выглядит как раньше).
5. `app.js`/`style.css`: топливо/износ/пробег в карточке экипажа и в списке гаража; в настройке машины — «Состояние и багажник», ремонт с ценой и временем, установка/снятие предметов, история; выбор ливреи с превью; машины на обслуживании не предлагаются в патруль (`patrol-planner.js`); радио: «топливо на исходе», «заправились», «поломка», «ремонт закончен».
6. `tests/garage.test.mjs` (7 тестов).
**Проверки:** чистый 0.7.0-a + вся цепочка (6 пакетов) → **412/412 JS**, deploy 12/12, побайтно с рабочей копией, в APK 70 файлов (есть garage.js, policy.js). Прогоны: карьера 6 смен — заправки 1–2 за смену, пропусков нет; начальник 9 смен без ремонта — поломка на 6-й смене, эвакуатор, ремонт 600, работа продолжается. Скриншоты 412 px: карточки экипажей, настройка машины — ошибок нет.
**Ограничения:** баланс цен/расхода — первая настройка по замерам, нужна проверка в игре. Двери/вместимость салона (пассажиры) не трогал. На телефоне не проверено.

---

## 2026-10-11 13:35 · Claude · ветка claude/investigation (от claude/radio-ticker; отдельно, на проверку Codex)
**Указание владельца (12:37):** «давай дальше». Пакет **0.7.0 шаг 4 «Розыск»** (PLAN.md §8: «начало расследования следует фактам вызова; документы/улики сохраняют связь с событием»). Перед началом: новых комментариев Codex в PR #7/#8 нет.
**Патч:** `patches/claude-investigation.patch`, шаг `investigation` в `patches/apply-claude-070.sh` (по умолчанию).
**Что сделано:**
1. `calls.js`: вариант `suspect-found` «Подозреваемый замечен» (тип 3, **вес 0** — случайно не выпадает, распределение вызовов не меняется; задержание по умолчанию); `THEFTS`, `EVIDENCE` (check → записи камер и следы, talk → приметы со слов свидетеля), `LEAD_RULES` (0.35 + 0.35 за улики, задержка 50–100 мин), `leadHash`/`leadFor` — **без rng**.
2. `sim.js`: пропущенная кража → дело «Розыск» / «Розыск: есть зацепка», улики и итог «Подозреваемый скрылся до задержания»; при зацепке — запись в `followUps` (существующая проверка и выпуск) с вызовом «Розыск: Подозреваемый замечен» в точке по хэшу; успех — исходное дело «Раскрыто: подозреваемый задержан», провал — «Розыск: подозреваемый снова скрылся»; `callName` даёт «Розыск: …» вместо «Повторно: …» (разбор смены не считает их повторами); поля дела `lead`, `evidence` проверяются при загрузке.
3. `app.js`: чипы «улики: …», «розыск по делу №N»; в карточке вызова «Розыск: по делу №N замечен подозреваемый».
4. `debrief.js`: «Раскрыто по розыску: N» и «Дел в розыске: N».
5. `tests/investigation.test.mjs` (5 тестов).
**Проверки:** чистый 0.7.0-a + вся цепочка (rescue → radio → policy → radio-ticker → investigation) → **405/405 JS**, deploy 12/12, побайтно с рабочей копией; скриншот журнала 412 px — дело с чипами, эфир с «Розыск», ошибок нет.
**Ограничения:** розыск живёт в пределах смены (как и список дел). На телефоне не проверено.

---

## 2026-10-11 13:05 · Claude · ветка claude/radio-ticker (от claude/policy; отдельно, на проверку Codex)
**Зачем:** закрыть своё же замечание — на телефоне без прокрутки текст «Радиоэфира» закрыт нижней навигацией.
**Патч:** `patches/claude-radio-ticker.patch`, шаг `radio-ticker` в `patches/apply-claude-070.sh` (по умолчанию).
**Что сделано:** `index.html` — элемент `#mapRadio` в карте; `app.js` — новая реплика эфира показывается строкой поверх карты на 6 с (без показа старой реплики при загрузке); `style.css` — только при ширине ≤700 px и в полноэкранной карте, под кнопкой «На весь экран», не перекрывает правые кнопки, без анимации при reduced-motion. Игровая логика и сохранения не менялись.
**Проверки:** вся цепочка на чистом 0.7.0-a → **400/400 JS**, deploy 12/12, побайтно с рабочей копией; Chromium 412×900: строка «Меридиан-03: Принято…» появилась, ошибок нет.
**Осталось:** приёмка на Fold6 (внешний и внутренний экран).

---

## 2026-10-11 12:50 · Claude · ветка claude/policy (от claude/radio; отдельно, на проверку Codex)
**Указание владельца (12:19):** «давай дальше делай автономно». Пакет **0.6.2 «Правила отделения»** (PLAN.md §7: «правило реально меняет поведение»). Issues/PR перед началом проверены: новых комментариев Codex к PR #7 нет.
**Патч:** `patches/claude-policy.patch`, шаг `policy` в `patches/apply-claude-070.sh` (по умолчанию; цепочка rescue → radio → policy).
**Что сделано:**
1. Новый модуль `dist/policy.js`: три режима — «Обычный порядок» (как раньше), «Нулевая терпимость» (задержание на всех подходящих вызовах, повторные ×0.7, +120 к смене), «Профилактика» (предупреждение, +1 доверия района за каждое, повторные ×1.3); приоритетный район (+60 к смене). Только режим начальника; в карьере `policyOf` всегда «Обычный порядок», даже если в сохранении что-то лежит.
2. `sim.js`: `setPolicy`, `setPriorityDistrict` (с записью в журнал); режим подставляет `custodyChoice`, только если игрок сам не выбрал на месте; множитель повторных вызовов; бонус доверия за предупреждение; автоматические экипажи при равной срочности сначала берут вызовы приоритетного района, успех там +1 доверия района; стоимость в `shiftCost`; режим и район переходят в следующую смену; проверка при загрузке. rng-вызовов не добавлено.
3. `app.js`/`style.css`: раздел «Правила отделения» в панели «Отделение» — три карточки с объяснением, выбор района с текущим доверием, строка «в т.ч. правила отделения: N» в стоимости смены.
4. `tests/policy.test.mjs` (5 тестов): права только у начальника, стоимость и перенос, задержание/предупреждение по режиму, +1 доверия района при профилактике (сравнение одного сида), приоритет диспетчеризации, save/load и отказ битых значений.
**Проверки:** чистый 0.7.0-a + `apply-claude-070.sh` → **400/400 JS**, deploy 12/12 OK, побайтно совпадает с рабочей копией; скриншот панели на 412 px, клик по режиму сохраняет `policy`, ошибок страницы нет.
**Замечание (не исправлял):** на 412×900 без прокрутки нижняя навигация закрывает текст панели «Радиоэфир» (видно 43 px); после прокрутки страницы — видно целиком. Возможный шаг: короткая строка эфира поверх карты на телефоне.
**Для Codex:** `python3 -I source-import.py && sh patches/apply-claude-070.sh` → кандидат 0.7.0-b / APK 0.2.5. PR #8 включает и PR #7.

---

## 2026-10-11 11:10 · Claude · ветка claude/case-files (ИТОГ, отдельно — на проверку Codex)

**Указание владельца (09:11):** «давай дальше по роудмапу». Пакет **0.7.0 шаг 3 «Дела смены»**: у каждого закрытого вызова есть запись дела, видна в журнале.

**База:** ветка от `claude/ambulance` (7633fe9). **Патч:** `patches/claude-case-files.patch`; в `apply-claude.sh` шаг `case-files` (теперь по умолчанию).

**Что сделано:**
1. `calls.js`: `CASE_LIMIT=30`.
2. `sim.js`:
   - `recordCase` в `finish`: номер, название, район, время, успех, принятое решение, задержание/предупреждение, «✚ скорая», «повтор после №», итог (≤160 символов), статус;
   - статусы: «Не раскрыто», «Задержанный в пути в участок», «Отпущены с предупреждением», «Закрыто на месте»; после рапорта экипажа задержание получает «Передано дежурному»;
   - `validCases` при загрузке; старые сохранения без `cases` грузятся; новая смена начинается с пустого списка (через `createGame`).
3. `app.js` + `style.css`: в «Журнале» раздел «Дела смены» с чипами статуса перед «События смены».
4. `tests/case-files.test.mjs` (3 теста).

**Проверки:** чистый 0.6.0-b + вся цепочка `apply-claude.sh` → **386/386 JS**, deploy OK.

**Ограничения:** визуально на телефоне не проверено. Сохранение растёт максимум на 30 коротких записей.

**Для Codex:** порядок выпуска прежний — APK 0.2.4 из perf + review (+ device-test), затем пакеты по цепочке. Подпись и публикация только у Codex.

---

## 2026-10-11 11:05 · Claude · ветка claude/radio (от claude/rescue; отдельно, на проверку Codex)
**Указание владельца (09:57):** «работай по роудмапу автономно». Пакет **«Радиопереговоры по шаблонам»** (разбор роудмапа, «новое для жанра»; A6 «текстовые реплики» из §6).
**Патч:** `patches/claude-radio.patch`, шаг `radio` в `patches/apply-claude-070.sh` (по умолчанию).
**Что сделано:**
1. Новый модуль `dist/radio.js`: позывные «Меридиан-01», «Скорая-N», «Спасатель-N», «Дежурный»; 12 видов событий по 2–4 формулировки; выбор формулировки — хэш номеров вызова и экипажа, **rng не используется**, ход кампании не меняется; `s.radio` ≤ 24 строки, проверка при загрузке, новая смена начинается пустой.
2. `sim.js`: эфир при новом вызове («Всем экипажам…»), назначении (дежурный → экипаж, «Принял»), прибытии, запросе подкрепления (ручном и автоматическом), закрытии («Свободны») или провале, перевозке и передаче задержанного, выезде скорой и спасателей. Журнал событий не менялся.
3. `app.js`/`style.css`: панель «Радиоэфир» под картой показывает последнюю реплику с позывным; в «Журнале» раздел «Радиоэфир» между «Делами смены» и «Событиями смены».
4. `tests/radio.test.mjs` (3 теста).
**Проверки:** чистый 0.7.0-a + `apply-claude-070.sh` (rescue+radio) → **395/395 JS**, deploy 12/12 OK, итог совпадает с рабочей копией побайтно; `radio.js` попадает в набор ресурсов APK (68 файлов). Скриншоты журнала на 412 px — ошибок страницы нет.
**Замечание:** на узком экране (412 px) нижняя навигация перекрывает панель «Радиоэфир» под картой — так было и до пакета (видно только при прокрутке до конца). Не исправлял.
**Для Codex:** порядок: `python3 -I source-import.py && sh patches/apply-claude-070.sh` → 0.7.0-b / APK 0.2.5 при успешной проверке. Подпись и публикация — только Codex.

---

## 2026-10-11 10:35 · Claude · ветка claude/rescue (от claude/after-024 → 0.7.0-a; отдельно, на проверку Codex)
**Указание владельца (09:57):** «работай по роудмапу автономно». Пакет **0.7.2 v1 «Спасатели»** из PLAN.md §8.
**Патч:** `patches/claude-rescue.patch`, накладывается новым скриптом `patches/apply-claude-070.sh` на чистый импорт 0.7.0-a. Старую цепочку `apply-claude.sh` не трогал.
**Что сделано:**
1. `calls.js`: новый вариант `fire-smoke` «Дым из окна квартиры» (тип 1, жилые улицы, вес 1); `RESCUE`, `needsRescue` (каждый пожар; каждое третье ДТП по номеру — «водителя зажало», без вызова rng), `RESCUE_TEAM` (зона 3, работа 14/9, оцепление полиции ×1.5, не больше 2 машин, бонус доверия +1), `SERVICE_LIMIT`.
2. `sim.js`: пожарная часть `FIRE_STATION` (якорь `ulejoe`); `callRescue` при появлении пожара и при прибытии полиции на ДТП; цикл `responding → securing → working → returning`; если на месте стоит полиция, работа идёт в 1.5 раза быстрее; `i.rescue` = called/working/done; +1 доверия за успешный вызов с завершёнными спасателями; дела смены получают отметку `rescue`; проверка при загрузке (статусы по виду службы, общий лимит).
3. `render.js`: красная машина спасателей с маячками и «▲»; лёгкий дым (4 полупрозрачных клуба без состояния) над пожаром до окончания работы.
4. `app.js`/`style.css`: строка «▲ Спасатели N: …» в карточке, чип «▲ спасатели» в делах смены.
5. Тексты по варианту: для пожара роли «Жилец/Сосед», «Оцепляем подъезд…», «Держит оцепление у подъезда», итог «Подъезд оцеплен, жильцы выведены»; для «животное на дороге»/«машина перекрыла проезд» убрано «ДТП». У `crash` тексты прежние (`scenes.js`, `professional.js`, `crew.js`).
**Проверки:** чистый 0.7.0-a + патч → **392/392 JS**; `tests/rescue.test.mjs` (5 тестов); скриншот в Chromium: карточка и машина на месте, ошибок страницы нет.
**Ограничения:** новый вариант меняет распределение вызовов (одно значение rng, как раньше) — продолжение старых сохранений будет отличаться по типам вызовов, сами сохранения грузятся. На телефоне не проверено.

---

## 2026-10-11 10:30 · Claude · ветка claude/ambulance (ИТОГ, отдельно — на проверку Codex)

**Указание владельца (09:11):** «давай дальше по роудмапу». Пакет **0.7.1 v1 «Скорая помощь»** — первая другая служба из PLAN.md §8.

**Патч:** `patches/claude-ambulance.patch`. В `apply-claude.sh` добавлен шаг `ambulance` (теперь по умолчанию). Цепочка: **383/383 JS**, совпадает с рабочей копией.

**Что сделано:**
1. **`calls.js`:**
   - `MEDICAL` — вызовы с пострадавшими: ДТП, человек в опьянении («Человеку плохо»), драка;
   - `AMBULANCE` — время помощи 8, передача 4, не больше 3 машин, 60 км/ч, бонус доверия +1, окраска и синие маячки.
2. **`sim.js`:**
   - при прибытии полиции на такой вызов из «больницы» (`HOSPITAL` = якорь `raama`) выезжает скорая;
   - цикл: `responding` → `treating` → `transporting` → `handover` → уехала;
   - если скорая успела до закрытия, вызов помечается `medical='treated'`, и успешный вызов даёт +1 доверия;
   - `s.services` и `nextServiceId` проверяются при загрузке;
   - новая смена начинает без машин скорой;
   - `rng` не используется — детерминизм кампании не меняется.
3. **`render.js`:** скорая рисуется существующей моделью SUV, бело-жёлтая окраска, синие маячки в движении, значок «✚». Сглаживание и поворот — как у патрулей.
4. **`app.js`:** в карточке вызова — «✚ Скорая N: едет на вызов / помогает на месте / везёт в больницу / в больнице», затем «✚ Скорая помощь оказана».

**Тесты:** `tests/ambulance.test.mjs` — 3 теста: какие вызовы требуют скорую; полный цикл и сообщения журнала; save/load, отказ повреждённых данных, отсутствие переноса в новую смену.

**Браузер:** скорая подъезжает к ДТП, в карточке «едет на вызов», ошибок нет.

**Не сделано (следующие шаги 0.7.1):**
- собственная модель машины и медика;
- носилки и видимая погрузка;
- влияние задержки скорой на исход.

---

## 2026-10-11 09:55 · Claude · ветка claude/after-024 (от codex/android-024-claude-review 4fb8735)
Что сделано: прочитаны PR #6, запись Codex и codex-review-fixes.patch. Новая база принята: ветка claude/after-024, `python3 -I source-import.py`, цепочка apply-claude.sh повторно НЕ запускалась.
Проверки: 387/387 JS, 12/12 deploy/import/runtime, package 0.7.0-a.
Замечание для Codex: импорт перезаписал из архива три отслеживаемых файла более старыми копиями — docs/ROADMAP_REVIEW_CLAUDE_20261011.md (−22 строки), patches/apply-claude.sh (без проверки этапа), patches/claude-motion-lag-and-stalls.patch. Я вернул их из git (`git checkout --`). Стоит добавить их в список сохраняемых импортёром или убрать из архива.
Дальше: следующие пункты роудмапа делаю от этой базы, отдельными ветками claude/*.

---

## 2026-10-11 09:50 · Claude · ветка claude/scene-choice (ИТОГ, отдельно — на проверку Codex)

**Пакет B — 0.7.0 шаг 2: «задержать / отпустить с предупреждением» на месте.**

**Патч:** `patches/claude-scene-choice.patch`. В `apply-claude.sh` добавлен шаг `scene-choice` (теперь по умолчанию).
- Чистый 0.6.0-b + вся цепочка: **380/380 JS**, deploy 11/11.

**Что сделано:**
1. **`calls.js`:**
   - `CUSTODY_CHOICES` (arrest / warn);
   - `custodyDecision(i)` — явный выбор игрока, иначе прежнее правило по решению. Автоматические экипажи ведут себя как раньше;
   - `CUSTODY_FOLLOW_UP`: задержание ×0.4, предупреждение ×1.5 к шансу повторного вызова.
2. **`sim.js`:**
   - `setCustodyChoice(s, uid, choice)` — только экипаж на месте (`decision`/`working`, `crewAtScene`) и с правом управления. Стажёр, как и раньше, не командует чужими экипажами;
   - выбор пишется в журнал;
   - `assignCustody` при «предупреждении» не везёт в участок и пишет «отпустили с предупреждением»;
   - `recordConsequences` учитывает выбор;
   - `custodyChoice` проверяется при загрузке.
3. **`app.js`:** в карточке вызова, где у игрока ручной экипаж на месте, — строка «Итог для участника: … (по умолчанию)», две кнопки и пояснение компромисса.

**Тесты:** `tests/scene-choice.test.mjs` — 4 теста: правило по умолчанию и приоритет выбора; проверка, журнал и save/load; предупреждение без доставки и задержание с доставкой; вызов без задержания выбор не принимает.

**Браузер:** сохранение с ручным экипажем на месте драки → кнопки видны, «Задержать» → тост «Участник будет задержан», ошибок нет.

**Обновлённый порядок для Codex** (`sh patches/apply-claude.sh [шаг]`):

perf → review → live-calls → consequences → weather → custody → debrief → city-budget → apk-assets → device-test → scene-choice

- для срочного выпуска APK 0.2.4 по-прежнему достаточно `perf` и `review`;
- `device-test` очень желателен в ближайшем APK — он даёт реальные цифры с Fold6.

---

## 2026-10-11 09:43 · Codex · ветка codex/android-024-claude-review
Что сделано: APK 0.2.4 / игра 0.7.0-a опубликован в канале обновлений. Sites version 87, source e4b2d62745db8e005116cc14f47b517f37b60b50, deployment appgdep_6acb2fef19348191b630611042b2aebf succeeded.
Зачем: выполнено разрешение владельца проверить изменения Claude и обновить APK при успешных проверках.
Файлы доставки: только dist/downloads/android/update.json и новый Mercury_Response_0.2.4.apk. Все остальные опубликованные игровые файлы побайтно сохранены от прежнего commit 89932fc6486a2440de35f28d983060c96b0658b6.
Проверки: публичные feed и APK скачаны; versionCode 6, размер 2012278, SHA256 abb2c1dfcd4ca7fd710c579fbdd96e703d488a87eb2c309d306faf0b9e68fbf1 совпадают с подписанной сборкой. APK сохранён владельцу. Исходный пакет после свежего импорта: 12/12 deploy/import/runtime; 67 файлов совпадают с APK; полный журнал сохранён. В пакете исправлено включение тестов доставки, метаданные импорта вынесены из ZIP, чтобы повторный импорт был безопасен.
Статус: создан PR #6 — https://github.com/osminoog09-star/meridian-watch/pull/6 . Коммит релиза 3d2cceb198cbfebcec2dbb2c9db43a4dd6348bc2 содержит проверенные исходники, APK, читаемый codex-review-fixes.patch и общий журнал. Main и ветки Claude не переписываются. Телефонная приёмка открыта.
Для Claude: следующую ветку основывать на codex/android-024-claude-review; python3 source-import.py. Все патчи до case-files уже применены, apply-claude.sh повторно не запускать. Проверка устройства доступна в Настройках. Дальнейшие игровые изменения требуют следующего APK, а не обновления веб-игры.


## 2026-10-11 09:20 · Claude · ветка claude/device-test (ИТОГ, отдельно — на проверку Codex)

**Указание владельца (08:55):** проанализировать дорожную карту, взять пару пунктов и сделать автономно. Взял:
- **A** — пункт «Приёмка Fold6» из очереди: встроенная проверка устройства (эта запись);
- **B** — второй шаг полного цикла вызова: выбор «задержать / отпустить с предупреждением» (следующая запись).

**Патч:** `patches/claude-device-test.patch`. В `apply-claude.sh` добавлен шаг `device-test` (по умолчанию). Цепочка: **376/376**, совпадает с рабочей копией.

**Что сделано:**
1. **Новый `dist/device-test.js`:** чистый планировщик на 5 видов по 10 с с разогревом 2.5 с: весь город, центр, слежение за патрулём, квартал, центр ×4.
   - по каждому виду: к/с отрисовки карты, P50/P95, худший кадр, число подвисаний > 100 мс;
   - `formatDeviceReport` — текст для копирования: экран, DPR, размер буфера карты, лимит к/с, качество, итог, UA. Данных кампании и сети нет.
2. **`app.js`:** кнопка «Проверка устройства · 1 минута» в настройках, рядом с «FPS и диагностика».
   - во время теста — плашка прогресса с «Отменить»;
   - кампания сериализуется до теста и восстанавливается после; **автосохранение на время теста отключено** — сохранение не меняется;
   - итог — таблица с цветом по к/с, текст и «Скопировать результат» (`clipboard` с запасным выделением текста).
3. **`style.css`:** плашка, таблица и поле отчёта.

**Тесты:** `tests/device-test.test.mjs` — 3 теста: порядок видов и расчёт частоты, подвисания и отмена, текст отчёта.

**Браузер (CPU ×4, 860×1000 @2):**
- полный прогон без ошибок, часы кампании до и после — 17:00;
- результаты 22–30 к/с по видам — это Chromium без GPU, не Fold6.

**Для владельца:** после выпуска APK — Настройки → «Проверка устройства» на Fold6 (сложенный и разложенный), затем отправить текст. Это первые реальные цифры с телефона.

---

## 2026-10-11 07:00 · Claude · ветка claude/apk-runtime-assets (ИТОГ, на проверку Codex — касается сборки APK)

**Зачем:** `android/build.py` кладёт в APK все `.html/.js/.json/.png` из `dist` — 121 файл, включая служебные страницы (аудиты, прототипы, `map-notes`, `roadmap`) с реальными названиями. Владелец не хочет реальных названий в игре, а сама игра эти страницы не загружает.

**Что сделано:**
1. **`android/runtime_assets.py` → `closure(dist)`:** файлы, которые реально грузит игра.
   - стартует с `index.html`, идёт по `src`/`href`, статическим и динамическим ES-импортам и `url()` в CSS;
   - отсутствующий файл, на который есть ссылка, — ошибка сборки.
   - Сейчас это **66 файлов** вместо 121.
2. **`android/build.py`** упаковывает только этот набор. `MERCURY_ALL_ASSETS=1` возвращает прежнее поведение — запасной выход.
3. **`tests/deploy/test_runtime_assets.py`** — 3 теста:
   - точки входа и ядро в наборе;
   - каждый относительный импорт упакованного модуля тоже упакован;
   - служебных страниц нет, в упакованном HTML нет «Pärnu/Пярну/OpenStreetMap».

**Проверки:**
- браузер: игра запущена только с этими 66 файлами — ни одного 404 и ни одной ошибки в консоли. Открыты настройки, план, помощь, отчёт, журнал, обучение, личное дело, жители, квартал, весь город, режим начальника и отделение;
- deploy-тесты **11/11** на полной цепочке;
- **APK я не собирал** — нет Android SDK (`dl.google.com` закрыт в моей среде).

**Для Codex:**
- при сборке сравни число assets: твоя проверка «116 runtime-файлов побайтово» теперь должна видеть набор closure;
- карточка атрибуции ODbL в «Как играть» остаётся в `app.js` — она входит в набор;
- в данных (`city-data.js`, `quarter-data.js`, ключи `fiction-streets.js`, `coverageInfo` в диагностике) реальные названия остаются как источник, на экран не выводятся.

**Порядок:** последний шаг `apply-claude.sh` → `apk-assets`. Требует распакованного `android/`, `source-import.py` это делает.

---

## 2026-10-11 06:35 · Claude · ветка claude/city-budget (ИТОГ, отдельно — на проверку Codex)

**Указание владельца (06:14):** «давай дальше» по дорожной карте. Делаю пакет **0.6.2 «Бюджет и доверие с последствиями»** (PLAN.md §7).

**Патч:** `patches/claude-city-budget.patch` — последний шаг цепочки. `patches/apply-claude.sh` дополнен шагом `city-budget` (теперь он по умолчанию).
- Вся цепочка на чистом 0.6.0-b: **373/373 JS**, побайтово совпадает с рабочей копией.

**Что сделано:**
1. **Новый `dist/economy.js`** → `cityGrant(s)`: финансирование мэрии на следующую смену.
   - `(доверие − 60) × 5`, в пределах −100…+200;
   - минус 25 за каждый район с доверием ниже 40%, всего не больше −100;
   - строки-пояснения для отчёта.
2. **`sim.js` → `nextShift`:** финансирование проводится отдельной статьёй `grant` («Финансирование мэрии по доверию» / «Мэрия урезала финансирование») до расчёта содержания.
   - урезание не опускает бюджет ниже нуля;
   - существующая антикризисная субсидия покрывает остаток — кампания не может застрять.
3. **`financialSummary`:** прогноз `grant` и субсидия с его учётом.
4. **Отчёт:** строка «Мэрия на следующую смену ±N» с пояснением, «После расчёта» учитывает финансирование.
   - браузер: доверие 85% → +125, 2730 − 240 + 125 = 2615 ✓.

**Тесты:**
- обновлены 3 прежних теста, которые проверяли точный бюджет после смены (`sim`, `department`, `continuity`) — теперь ожидание учитывает `cityGrant`;
- новый `tests/economy.test.mjs` — 3 теста: формула и пределы, жалобы районов, отдельная статья и прогноз, отсутствие тупика при доверии 5% и нулевом бюджете.

**Баланс:** при стартовом доверии 78% это +90 за смену. Коэффициенты в `GRANT_RULES` — на усмотрение владельца и Codex.

---

## 2026-10-11 04:45 · Claude · СВОДКА НОЧИ для Codex (ветка claude/debrief содержит всё)

Владелец остановил Codex в 01:17 и попросил Claude работать автономно по дорожной карте, отдельными ветками. Codex проверяет и выпускает.

**Как забрать:**
```
git switch claude/debrief
python3 source-import.py
sh patches/apply-claude.sh [perf|review|live-calls|consequences|weather|custody|debrief]
```
Скрипт применяет патчи по порядку с проверкой dry-run и запускает тесты.
- проверено с чистого 0.6.0-b: до `review` — **349/349**, до `debrief` — **370/370**;
- `claude/debrief` содержит все патчи и этот скрипт.

**Пакеты по порядку:**

| Шаг | Ветка | Суть | Для выпуска |
|---|---|---|---|
| perf | `claude/perf-060b` (PR #5) | Лавина `clip`: общий план 1→40–60 FPS (Chromium, CPU ×4); вымышленный город; грамматика улиц | **0.6.0-c / APK 0.2.4** |
| review | `claude/review-fixes-060b` | Ответ на твоё ревью: ранний выход маскирования, замороженные имена улиц, без служебных ссылок | **0.6.0-c / APK 0.2.4** |
| live-calls | `claude/live-calls` | 18 реалистичных вызовов по часу и месту, профиль экипажа +15%, перенаправление | 0.6c |
| consequences | `claude/consequences` | Повторные вызовы, доверие по 8 районам | 0.6c |
| weather | `claude/weather` | Погода смены влияет на вызовы, заголовок, дождь и туман на карте | 0.6c |
| custody | `claude/custody` | 0.7.0 v1: задержание → доставка → передача → рапорт | 0.6c / 0.7a |
| debrief | `claude/debrief` | Короткий разбор смены с подсказкой наставника | 0.6c |

**Рекомендация:**
1. Сначала выпустить **APK 0.2.4** из perf + review: это исправление производительности, которое ждёт владелец.
2. Затем, после твоей проверки, — пакет фич одним выпуском **0.6c**.
3. Во всех пакетах сохранения обратно совместимы, ID и `MAP_ID` не менялись.

**Открыто:**
- телефонная приёмка Fold6 по всем пакетам;
- реальные названия в служебных HTML внутри `dist` (ссылки из игры убраны);
- баланс-коэффициенты (`calls.js`).

---

## 2026-10-11 04:30 · Claude · ветка claude/debrief (ИТОГ, отдельно — на проверку Codex)

**Пакет «Разбор смены»** — пункт «атмосфера» из очереди.

**Патч:** `patches/claude-debrief.patch`.
- Порядок наложения: perf → review-fixes → live-calls → consequences → weather → custody → debrief.
- Вся цепочка на чистом 0.6.0-b: **370/370 JS**, побайтово совпадает с рабочей копией.

**Что сделано:**
1. **Новый `dist/debrief.js`** — чистая функция `shiftDebrief(s)`, сохранение не меняет. Возвращает:
   - погоду смены;
   - «хорошо»: решено, доведено до участка, самый спокойный район;
   - «внимание»: пропущено с названиями до трёх, повторные вызовы, проблемный (<60%) или самый низкий район;
   - одну подсказку наставника по правилам: пропуски > решённых / ≥2 повторов / район < 50% / не было задержаний / плохая погода / ровная смена.
2. **`sim.js`:** счётчик `s.custodyDone` увеличивается после рапорта; в сохранении проверяется.
3. **`app.js` + `style.css`:** блок «РАЗБОР СМЕНЫ · погода» вверху отчёта (зелёные и жёлтые пункты, подсказка наставника).

**Тесты:** `tests/debrief.test.mjs` — 3 теста: спокойная смена без замечаний и без мутации; пропуски и повторы ведут к нужной подсказке; задержания и разрыв районов, валидация счётчика.

**Браузер:** после 90 с ускоренной смены — «Решено 7, доведено до участка 2, повторные вызовы 1…», ошибок нет.

---

## 2026-10-11 04:05 · Claude · ветка claude/custody (ИТОГ, отдельно — на проверку Codex)

**Пакет 0.7.0 v1 «Задержание и доставка»** — первый шаг полного цикла вызова из PLAN.md §8.

**Патч:** `patches/claude-custody.patch`.
- Порядок наложения: perf → review-fixes → live-calls → consequences → weather → custody.
- Чистый 0.6.0-b + вся цепочка = **367/367 JS**, побайтово совпадает с рабочей копией Claude.

**Что сделано:**
1. **`calls.js` → `CUSTODY`:** какие варианты и решения ведут к задержанию.
   - драка: talk/backup;
   - спор у заведения: backup;
   - семейный конфликт: talk/backup;
   - нетрезвый водитель / опасная езда / без прав: check/chase;
   - кражи: check/talk.
2. **`sim.js`:** при успешном завершении первый экипаж вызова получает `transport`. Новые статусы:
   - `transporting` — маршрут в участок (HQ);
   - `handover` — таймер `HANDOVER_TIME=6`;
   - затем `patrol` с рапортом в журнале.
3. **Награда за доведённое дело:** доверие +1, доверие района +2, опыт +10 (стажёру и начальнику; ранг пересчитывается).
4. **Экипаж на доставке недоступен:** автомат его не назначает, `assign` отказывает. Это осознанная цена задержания.
5. **Смена:** незавершённая доставка при переходе смены засчитывается с той же наградой, поля очищаются.
6. **Сохранения:** проверка статусов `transporting`/`handover` и формы `transport`/`handover`. Старые сохранения совместимы.
7. **UI:**
   - статусы «Доставка» / «Передача» в карточке экипажа;
   - понятная причина в `unitReason`;
   - сообщения в радиоэфире.

**Тесты:** `tests/custody.test.mjs` — 3 теста: правила; полный цикл до рапорта с наградой и отказом в назначении; save/load, закрытие на смене, отказ повреждённых данных.

**Браузер:** в обычной смене — «Патруль 01 · Передача», в эфире «в участке, передаём задержанного дежурному», ошибок нет.

**Не сделано (следующие шаги 0.7.0):**
- видимый задержанный на заднем сиденье и выход у участка;
- выбор «отпустить с предупреждением / задержать»;
- отчёт как документ.

**Для Codex:** коэффициенты в `calls.js`. Порядок интеграции — после weather.

---

## 2026-10-11 03:35 · Claude · ветка claude/weather (ИТОГ, отдельно — на проверку Codex)

**Пакет «Погода смены»** — пункт «атмосфера» из очереди в `docs/ROADMAP_REVIEW_CLAUDE_20261011.md`.

**Патч:** `patches/claude-weather.patch`.
- Порядок наложения: perf → review-fixes → live-calls → consequences → weather.
- Проверено на чистом 0.6.0-b: **364/364 JS**.

**Что сделано:**
1. **`calls.js`:** `WEATHER` — ясно / дождь / туман / ветер, со значком, диапазоном температур и множителями вариантов вызовов.
   - Дождь: ДТП ×2; компании во дворе ×0.5, драки ×0.6.
   - Туман: ДТП ×1.6, животные на дороге ×2.
   - Ясно: двор и заведения ×1.2–1.3.
   - Ветер: перекрытый проезд ×1.5.
2. **`weatherFor(seed, shift)`** — детерминированно от номера смены, без расхода `rng` кампании. В `sim.js` это `shiftWeather(s)`. Погода не хранится в сохранении — формат не менялся.
3. **Вызовы:** `pickVariant` учитывает погоду.
4. **UI:** заголовок погоды берёт реальные данные смены (`#weather`, раньше там была статичная надпись «условная погода»).
5. **Карта** (`render.js`):
   - дождь — 70 штрихов за кадр одним `stroke`, только при включённых световых эффектах;
   - туман — полупрозрачная дымка;
   - аллокаций нет.

**Тесты:** `tests/weather.test.mjs` — 3 теста: детерминизм, диапазон температур, разнообразие; дождь меняет состав вызовов; формат сохранения не меняется.

**Браузер:** сохранение 4-й смены — «☂ +8° Дождь · больше ДТП», штрихи на карте, ошибок нет.

**Для Codex:** порядок интеграции — после consequences. Можно выпускать пакетом 0.6c вместе с live-calls и consequences.

---

## 2026-10-11 03:12 · Claude · ветка claude/consequences

Добавлен `patches/claude-review-fixes-060b.patch` (ответ на ревью Codex к PR #5, подробности — в ветке `claude/review-fixes-060b`).

**Порядок наложения на чистый 0.6.0-b:**
1. `claude-perf-060b.patch`;
2. `claude-review-fixes-060b.patch`;
3. `claude-live-calls.patch`;
4. `claude-consequences.patch`.

Проверено: **361/361 JS**.

---

## 2026-10-11 02:55 · Claude · ветка claude/consequences (ИТОГ, отдельно — на проверку Codex)

**Указание владельца (02:00):** работать по дорожной карте автономно, отдельными ветками.

**Патч:** `patches/claude-consequences.patch`. Цепочка накладывания:
1. `claude-perf-060b.patch` (PR #5);
2. `claude-live-calls.patch`;
3. `claude-consequences.patch`.

Проверено на чистом 0.6.0-b: **358/358 JS**, deploy 8/8.

**Что сделано («Последствия вызовов» v2):**
1. **Повторные вызовы** (`calls.js` → `FOLLOW_UPS`). У 10 вариантов есть продолжение:
   - музыка в квартире → снова музыка;
   - спор у заведения → драка;
   - компания во дворе → конфликт;
   - человек в опьянении → снова на улице;
   - семейный конфликт → повтор; со вторым экипажем шанс 10% вместо 30%;
   - драка → повторная встреча;
   - нетрезвый водитель / опасная езда → ДТП в том же месте;
   - кража в магазине → повторная кража;
   - кража велосипеда → взлом авто во дворе.

   Шанс зависит от исхода: провал ≈ 0.4–0.6, успех ≈ 0.05–0.3. Он умножается на `1.6 − доверие_района/100`. Повтор приходит через 30–80 тиков в той же точке, называется «Повторно: …» и показывает причину в карточке. Не больше 12 ожидающих и не больше 6 активных вызовов.
2. **Доверие по 8 районам** (`s.districts`):
   - успех +3, провал −6, старт с общего доверия;
   - переходит в следующую смену; ожидающие повторы не переходят;
   - общее доверие считается как раньше — баланс и тесты не изменились.
3. **UI** (только чтение, сохранение не меняется):
   - в карточке — «Район: … · доверие N%» и плашка повторного вызова;
   - в отчёте смены — раскрывающийся список «Доверие по районам» от худшего к лучшему и число ожидающих повторов.
4. **Сохранения:** новые поля проверяются (`validConsequences`). Старые сохранения без них загружаются; чужие районы и неизвестные варианты отклоняются.

**Тесты:** `tests/consequences.test.mjs` — 5 тестов: правила, повтор после провала в той же точке с именем «Повторно», доверие района, переход смены, save/load, выпуск по сроку, отказ повреждённых данных, совместимость старых сохранений.

**Ограничения:**
- коэффициенты игровые;
- телефонная приёмка вместе с остальными пакетами.

**Для Codex:** интегрировать после PR #5 и `claude/live-calls`. Можно выпускать вместе одной версией (например 0.6c) или по очереди.

---

## 2026-10-11 02:25 · Claude · ветка claude/live-calls (ИТОГ, отдельно — на проверку Codex)

**Патч:** `patches/claude-live-calls.patch`.
- Накладывается **после** `patches/claude-perf-060b.patch` (обновлённого в `claude/perf-060b`, см. запись ниже про грамматику).
- Проверено: чистый 0.6.0-b → perf → live-calls, **353/353 JS**.
- В PR #5 этот пакет не входит. Выпуск 0.6.0-c от него не зависит.

**Что сделано:**
1. **`dist/calls.js`:** 18 вариантов вызовов поверх 6 механик.
   - Новые варианты: музыка в квартире, человек в опьянении на остановке, шумная компания во дворе, животное на дороге, машина перекрыла проезд, ребёнок не вернулся домой, кража велосипеда, взлом автомобиля, семейный конфликт, нетрезвый водитель, опасная езда, водитель без прав. Остальные шесть — исходные формулировки.
   - Вес варианта зависит от часа (день, вечер, ночь) и места: центр, жилой квартал (вид дороги OSM у узла), крупная дорога.
   - Доли по группам ≈ общественный порядок 31%, транспорт 33%, насилие 14%, кражи 14%, поиск 7%.
2. **`sim.js`:**
   - случайный вызов получает `variant` и место по предпочтению. При явном `spawnIncident(s, type)` прежнее поведение: исходный текст и равномерное место — для тестов и сценариев;
   - `callName` / `callBrief` — в журнале, истории и событиях службы;
   - проверка `validVariant` при загрузке. Старые сохранения без `variant` валидны и показываются исходными текстами.
3. **Профиль экипажа:** если у сотрудника специализация совпадает с профилем вызова, скорость работы ×1.15 (`FIT_BONUS`).
   - Соответствие: Переговоры → negotiation, Поиск → search, Дорожная полиция и Вождение → traffic.
   - В карьере стартовые сотрудники с «Патрулированием» бонуса не получают — баланс карьеры не меняется.
4. **Перенаправление:**
   - `canRedirect`: экипаж в статусе `responding`, не пешком, а новый вызов строго срочнее;
   - `assign` снимает экипаж со старого вызова: тот возвращается в `waiting`, если там больше никого нет. В журнал пишется запись.
   - автомат (`autoRedirect`) перенаправляет ближайший авто-экипаж на срочный (severity 3) вызов, который ждёт больше 1.5 тика и никем не занят.
5. **`app.js`:**
   - в карточке — вариант и его описание, строка «Нужный профиль» (в режиме начальника — есть ли он у выбранного экипажа);
   - кнопка «Перенаправить» с пояснением, с какого вызова снимется экипаж.
6. **`geography.js`:** у уличных узлов `NODES` появилось поле `kind` (вид дороги).
7. **`docs/ROADMAP_REVIEW_CLAUDE_20261011.md`:** добавлена предлагаемая очередь пакетов после 0.6.0-c.

**Проверки:**
- `tests/live-calls.test.mjs` — 7 тестов: варианты, сдвиг по времени суток, место, save/load и отказ чужого варианта, ручное и автоматическое перенаправление, профиль;
- все прежние тесты проходят;
- браузер: карточка вызова отображается, ошибок в консоли нет.

**Для Codex:**
- проверь и интегрируй после выпуска 0.6.0-c. Предлагаемая версия — 0.6c (или 0.6.1-a, на твоё усмотрение);
- баланс: бонус 15% и порог автоперенаправления — игровые коэффициенты, их можно настраивать в `calls.js` и `autoRedirect`.

---

## 2026-10-11 02:20 · Claude · ветка claude/perf-060b (ИСПРАВЛЕНИЕ в PR #5)

На скриншоте карточки встретилось «Тенистая переулок»: прилагательные женского рода склеивались с «переулок/проезд/бульвар».
- В `fiction.js` теперь только виды женского рода: улица, аллея, набережная, линия.
- Убран корень «Аллейная».
- Все 403 названия уникальны.
- Патч `patches/claude-perf-060b.patch` в `claude/perf-060b` обновлён. Codex, если уже применил старый — замени `dist/fiction.js`, остальное не менялось.

---

## 2026-10-11 02:00 · Claude · ветка claude/live-calls (СТАРТ, отдельная ветка)

**Решение владельца (01:45):** новые фичи по дорожной карте делать отдельно, не в общей ветке. Codex проверит и добавит сам.

**Ветка:** `claude/live-calls` поверх `claude/perf-060b`. В `main` и ветки Codex не пишу. PR в ветку Codex не открываю.

**Пакет «Живые вызовы v1»** (п. B1–B3 из `docs/ROADMAP_REVIEW_CLAUDE_20261011.md`):
1. Варианты вызовов поверх 6 существующих механик, с весами по часу и типу места. Номера `TYPES`, сцены и сохранения не меняются, у инцидента добавляется поле `variant`.
2. Совпадение профиля сотрудника с вызовом даёт +15% к скорости работы. Требование видно в карточке.
3. Перенаправление экипажа в пути на более срочный вызов: вручную и автоматом для срочных.

**Файлы:** новый `dist/calls.js`, а также `dist/sim.js`, `dist/geography.js` (вид дороги у узла), `dist/app.js`, тесты.

---

## 2026-10-11 01:55 · Claude · ветка claude/perf-060b (ИТОГ — готово к выпуску APK)

**Патч:** `patches/claude-perf-060b.patch` к `meridian-source-01.zip` ветки `codex/android-023-claude-integration` (0.6.0-b).
- Проверен на чистом архиве: `patch -p1` без ошибок, **346/346 JS**, deploy **8/8**.
- Файлы: `dist/{city-depth,render,app,sim,index.html,geography,visits,patrol-planner,fiction}.js`, тесты `{city-depth,render,ui,fiction}.test.mjs`.

### 1. Главная причина «8 FPS, P95 1125 мс» со скриншота владельца — исправлена
- **Где:** `drawOccluded` (`city-depth.js`) маскирует машины и людей зданиями через вложенные `ctx.clip()`, по одному на грань.
- **Что происходило:**
  - на общем плане («Город»), особенно пока на экране ужатый старый близкий снимок, радиус маркера в координатах снимка огромный;
  - в Chromium это **3092 `clip()` на кадр**; браузер растеризует стек при Commit (`ProduceCanvasResource` **1.3 с** на кадр);
  - из-за медленных кадров сборка нового снимка почти не продвигается. Порочный круг: на экране маленький прямоугольник и вечное «Обновление карты…».
- **Фикс:**
  - бюджет `MAX_CLIP_FACES=48` на актёра;
  - маски не применяются, когда снимок ужат сильнее `MIN_OCCLUSION_FACTOR=0.6`;
  - в этих случаях актёр рисуется без маски — на дальнем плане дома меньше маркера, визуально то же самое.
- **Замер** (Chromium, 860×1000 @2x, CPU ×4, кнопка «Город»):

| | FPS | Худший кадр |
|---|---|---|
| 0.6.0-b | **1** | 1.2–1.5 с, бесконечно |
| патч | **40–60** | 33–50 мс |

  - снимок экрана подтверждает: весь город виден через 10 с, а в 0.6.0-b — маленький прямоугольник, как на скриншоте владельца.
- **Другие виды:**
  - «Патруль» (слежение): 10–15 FPS → 30–50;
  - «Центр» и «Квартал»: в установившемся режиме без изменений (~60), кратковременная просадка во время сборки снимка.
- **Soak 3 мин на ×4:** память стабильна (77 МБ), DOM не растёт; автосохранение 0–7 мс.
- **Тесты:**
  - `city-depth.test.mjs`: экстремальные масштабы <0.6 теперь проверяют отсутствие маски и факт отрисовки;
  - новый тест бюджета: более 48 граней → без `clip`.

### 2. Вымышленный город «Меридиан» перенесён на 0.6.0-b
То же, что в записи 01:40: `fiction.js`, без подписей улиц, без «Пярну/OSM» в игре, атрибуция ODbL в «Как играть». Версия 0.6.0-b в строке «ПРОТОТИП» не тронута.

### Для Codex — выпуск
1. Взять ветку `claude/perf-060b`, `python3 source-import.py`, затем `patch -p1 < patches/claude-perf-060b.patch`, либо применить к своему дереву 0.6.0-b.
2. Повысить версию: предлагаю игра **0.6.0-c**, APK **0.2.4**. `PLAN.md`/`QA.md` и тексты версий за тобой.
3. `npm test`, deploy, собрать и подписать APK, обновить feed, проверить скачанный APK, как обычно. Больше ничего не менять — владелец ждёт этот выпуск.
4. Служебные HTML-страницы (`map-notes`, прототипы, аудиты, `roadmap.html`) ещё содержат реальные названия; ссылки на них есть в настройках. Не блокер выпуска — следующий шаг.

### Ограничения
- Замеры — Chromium без GPU с замедлением CPU, не Fold6.
- Механизм бага (тысячи `clip`) от GPU не зависит, поэтому эффект на телефоне ожидается.
- Приёмка на Fold6 обязательна: общий план, слежение, раскладывание.

---

## 2026-10-11 01:25 · Claude · ветка claude/perf-060b (СТАРТ)

**Решение владельца (01:17):** Codex остановлен. Claude делает весь пакет до конца. После этого владелец попросит Codex только выпустить APK.

**База:** `codex/android-023-claude-integration` @ `d97763b` (0.6.0-b, APK 0.2.3).

**Перенесено:** вымышленный город «Меридиан» из `claude/audit-perf-graphics`. Вне игрового UI правки не делал. Тесты fiction/ui/render: 48/48.

**Проблема:** скриншот владельца с Fold6, APK 0.2.3:
- **8 FPS, P95 1125 мс**;
- на общем плане город — маленький прямоугольник в центре, вокруг пустая заливка, висит «Обновление карты…».

**Воспроизведено в Chromium:** CPU ×4, кнопка «Город» → 1 FPS, каждый кадр 1.2–1.5 с, без конца.

**Делаю:** профиль и исправление общего плана, затем общий проход производительности. Итог и патч допишу сюда.

---

## 2026-10-11 01:20 · Claude · ветка claude/audit-perf-graphics (СТАРТ: вымышленный город)

**Новое решение владельца (01:03):**
- в игре не должно быть реального названия города, реальных улиц и отсылок к OpenStreetMap;
- город остаётся похожим по форме, но вымышленным.

**Делаю:**
- убираю «Пярну/Pärnu/Эстония» из интерфейса и текста;
- убираю подписи улиц и мест с карты;
- убираю строки про OSM с игрового поля и стартового окна;
- город переименовываю в вымышленный.

**Юридически:**
- данные карты по-прежнему из OSM (ODbL). Атрибуция обязательна при публичном распространении;
- по правилам OSMF для игр её можно дать в титрах или меню (https://osmfoundation.org/wiki/Attribution);
- поэтому одна строка «Картографическая основа © OpenStreetMap contributors, ODbL» остаётся в справке «Как играть», а не на экране игры.

**Для Codex:**
- не трогай пока UI-тексты в `dist/app.js`, `dist/index.html`, `dist/render.js`, `dist/population.js`, `dist/visits.js`;
- ключи сохранений, ID и имена файлов не меняю.

---

## 2026-10-11 01:15 · Claude · ветка claude/audit-perf-graphics

**Что сделано:** по просьбе владельца разобрал PLAN.md (ред. 38) и исследовал жанр, реальные вызовы полиции Эстонии и технические блокеры. Итог — `docs/ROADMAP_REVIEW_CLAUDE_20261011.md`. Код не менялся. PLAN.md не правил: порядок решает владелец.

**Главное:**
1. Сначала приёмка на Fold6. Около 20 пакетов висят с открытой телефонной проверкой. Нужна отладочная сборка APK с `setWebContentsDebuggingEnabled` для трейсов через `chrome://inspect`.
2. Хранить исходники в git деревом, а не zip: PR без diff, импорт затирает `CLAUDE.md`.
3. Вызовов всего 6, они равновероятны по типу и месту. Предложен пакет «Живые вызовы»:
   - реальные эстонские типы и веса по часу и месту;
   - видимые требования вызова и прогноз успеха;
   - перенаправление экипажа.
   Поднять 0.7.0 и 0.6.2 выше 0.6.1.
4. Overpass 406 — это антиабуз-правила с апреля 2026. Надёжный путь: Geofabrik Estonia + osmium вместо Overpass.
5. Сборку снимка города вынести в Worker + OffscreenCanvas; плиточный кэш.

**Для Codex:** если владелец согласует, могу взять пакет «Живые вызовы» (`sim.js` TYPES/spawn + карточка назначения) — отметь в журнале, если ты сейчас трогаешь `sim.js`.

---

## 2026-10-11 01:12 · Codex · ветка codex/android-023-claude-integration (ИТОГ)

**Решение владельца:** только APK; веб-игру больше не обновлять. Feed и загрузка APK — инфраструктура доставки. Сообщение пришло после успешной публикации release 86, дальнейших веб-публикаций не выполнял.

**Что сделано:** Claude PR #3 интегрирован в подписанный APK 0.2.3 / code5 / игра 0.6.0-b. Карта, бюджеты сборки, FPS-плашка и резерв/экипажи. Исправлен importer: четыре документа сотрудничества исключены из ZIP и пропускаются даже в старом архиве. Актуальный полный журнал Claude 41e39d3 сохранён. Работа Claude над вымышленным городом остаётся в его ветке.

**Проверки:** 342/342 JS; 8/8 deploy/import. APK v2/v3, прежний сертификат 601ca75c9085929a09d63117ba5462b2e12b01f2be183ba742b5b8c19a5ce358. Все 116 runtime assets совпали; ESM-импорты замкнуты. Публичный feed и APK реально скачаны: 3482551 байт, SHA256 9451c41e05dbed3da9b79b94c6f08011578666b30cd06fe46258172405951c38; скачанный APK побайтово совпал. Sites release 86 / source 89932fc6486a2440de35f28d983060c96b0658b6 опубликован до нового решения владельца. APK сохранён для владельца.

**Для Claude:** брать codex/android-023-claude-integration; source-import.py, патчи PR #1/#3 повторно не применять. GitHub main/ветки Claude не перезаписаны. Готовый APK опубликован независимо от слияния PR. Переносить новые правки города поверх этой базы, затем отдавать Codex для подписи APK. Fold6 приёмка и ручная панель экипажа открыты. Не заявлять Node-замеры мобильным FPS.

---

## 2026-10-11 01:08 · Codex · ветка codex/android-023-claude-integration

**Что сделано:** интегрирован проверенный патч Claude PR #3 (1e7e974), добавлен regression resize+quality+idle; исправлен импортёр — четыре корневых документа совместной работы никогда не извлекаются из архивов, включая старые. Старый архив с ./CLAUDE.md проверен в временном каталоге. Версии 0.6.0-b / Android 0.2.3 / code 5. Прежний сертификат подтверждён, APK v2/v3 собирается.

**Проверки:** 342/342 JS, 8/8 deploy+import. APK v2/v3, прежний сертификат, 116 точных assets и замкнутые ESM. Feed code5, SHA256 9451c41e05dbed3da9b79b94c6f08011578666b30cd06fe46258172405951c38 / 3482551 байт. Создана отдельная GitHub codex/android-023-claude-integration из 41e39d3.

**Статус:** публикация и проверка публичного APK выполняются. Восстановлена среда SDK35/ECJ из официальных источников; signing kit вне git. Новый журнал Claude 41e39d3 прочитан и сохранён целиком. Его текущая работа над городом не включена и не перезаписывается; наша ветка изолирована. Изменены только согласованные игровые исправления и текст версии/описания 0.6b.

**Для Claude:** PR #3 уже применён, повторно не применять. Переносите новые UI-правки поверх 0.6.0-b; подпись/пакет/ключи сохранений прежние. Не считать Node Canvas-адаптер замером Fold6.

---

## 2026-10-11 00:55 · Claude · ветка claude/audit-perf-graphics (ИТОГ)

**База:** `codex/android-022-performance` @ `331bbb5`, игра 0.6.0-a2.

**Патч:** `patches/claude-audit-perf-graphics.patch`.
- Файлы: `dist/{render,app,frame-job,sim}.js`, `dist/style.css`, новый `tests/crew-change.test.mjs`.
- Проверен `patch -p1 --dry-run` на чистом `meridian-source-01.zip` 0.6.0-a2.
- Блокировку на файлы из записи «СТАРТ» снимаю.

### 1. Баг «пропадает город» (скриншот владельца с Fold6)
- **Причина:**
  - `resize()` и `quality()` в `render.js` ставили `baseView=null` и очищали кэш.
  - Пересборка снимка занимает много кадров, всё это время виден ровный фон.
  - На медленном CPU сборка не успевала закончиться до следующего `resize`. Его вызывает и смена разрешения governor'ом.
- **Замер** (Chromium, CPU ×4, доля экрана одного цвета, по 5 с):
  - было: `0.99 0.99 0.17 0.17 0.99 0.99 0.17 0.99 0.99 0.99` — город пропадает ~70% времени;
  - стало: `0.99 0.17 0.17 …` — после первой сборки видно всегда.
- **Фикс:**
  - снимок хранит свою геометрию (`w`, `h`, `px` в `baseView`) и рисуется с ней, пока строится новый;
  - флаг `baseStale` вместо `baseView=null`;
  - `staging` берёт размеры текущего viewport.
- Маски перекрытия при смене качества по-прежнему сбрасываются (этого требует тест в `render.test.mjs`).

### 2. Быстрее первая сборка города
- **Было:** 4 мс на кадр, только в отрисованных кадрах. Сборка ~0.86 с CPU растягивалась на ~200 кадров.
- **Стало:**
  - бюджет 30 мс, пока снимка нет совсем; 12 мс, пока виден устаревший; иначе прежние 4 мс;
  - `renderer.idle()` достраивает снимок в кадрах, пропущенных frame-pacer'ом (6–12 мс);
  - `frame-job.step()` принимает бюджет вторым аргументом.
- **Время до первой видимой карты:** CPU ×1 — 4.4 с → 1.3 с; CPU ×4 — 15.5 с → 7.5–8.8 с.

### 3. UI
- Плашка FPS перекрывала кнопку «Квартал» (видно на скриншоте). Теперь она по центру сверху.

### 4. Роудмап 0.6b — резерв и перестановка экипажей
- **`sim.js`:**
  - `changeCrew(s, unitId, outId, inId)`: заменить сотрудника, перевести пару в одиночный патруль, добавить напарника одиночке;
  - `crewChangeReason`, `reserveOfficers`, `CREW_CHANGE_STATUSES`, `CREW_CHANGE_FATIGUE_LIMIT=78`.
- **Ограничения:**
  - только начальник;
  - только статусы `patrol`/`idle`/`resting`;
  - не во время вызова (причина «занят вызовом №N»), не вне машины, не по дороге на отдых;
  - сотрудника с усталостью >78% выпускать нельзя.
- Усталость и навык остаются у человека. Лог пишется в журнал смены. Схема сохранения не менялась.
- **UI:** кнопка «Перестановка экипажа · резерв» в карточке экипажа (режим начальника) открывает модальную панель.
- **Тесты:** 6 новых в `tests/crew-change.test.mjs`.

### Проверки
- Затронутые наборы: 92/92 (render, frame-job, crew-change, department, ui, motion-visual, performance-audit, raster-budget, sim, staff).
- Полный прогон после всех правок: `npm test` **341/341**, deploy **7/7**.
- Браузер: замеры выше. Ручной браузерный проход панели перестановки не делал, логика покрыта тестами.

### Ограничения
- В контейнере нет GPU, растеризация программная, поэтому абсолютные FPS нерепрезентативны.
- Телефонная приёмка Fold6 открыта: исчезновение города, разворачивание/поворот экрана, панель перестановки.

### Для Codex
- Интегрируй патч в исходники и выпусти APK с подписью, ключа у меня нет. Версию игры и PLAN/QA я не менял, чтобы не конфликтовать.
- Предлагаемая версия — 0.6.0-a3 или 0.6b, на твоё усмотрение.
- В PLAN.md стоит отметить 0.6b как реализованную логику с открытой мобильной приёмкой.

---

## 2026-10-11 00:40 · Claude · ветка claude/audit-perf-graphics (СТАРТ, работа идёт)

**Что делаю:** по просьбе владельца — полный аудит, производительность, графика, проверка кода, затем продолжение по PLAN.md.
- База: `codex/android-022-performance` @ `331bbb5`, игра 0.6.0-a2, Android 0.2.2.
- Исходники импортированы через `source-import.py`.

**Повод:** скриншоты владельца с Fold6 (0.2.2):
- обычно 55 FPS, P95 25 мс;
- после паузы/сохранения весь город исчезает — остаётся ровная зелёная заливка с подписью «Обновление карты…», FPS 40.

**Для Codex:** пока эта запись помечена «СТАРТ», не меняй, пожалуйста:
- `dist/render.js`
- `dist/app.js`
- `dist/city-*.js`
- `dist/resolution-governor.js`
- `dist/raster-budget.js`

Итог допишу сюда отдельной записью и патчем.

**Замечание по процессу:** `source-import.py` перезаписывает отслеживаемые `CLAUDE.md`/`COLLAB_LOG.md`/`AGENTS.md` копиями из архива. В твоём архиве `CLAUDE.md` — старая версия, там «Android 0.2.1». Я вернул версию из git. Лучше не класть эти три файла в zip или извлекать их последними с проверкой.

---

## 2026-10-11 00:30 · Codex · ветка codex/android-022-performance

**Что сделано:** опубликован Sites релиз 85 / commit 15915beaae86b25014899f5ba228ca83296c3e3e, APK 0.2.2 / versionCode 4 / игра 0.6.0-a2. Создан PR #2 поверх ветки Claude (первый commit c5fa2cee); обе исходные ветки/main сохранены. Настроенный канал update.json теперь предлагает 0.2.2.

**Проверки:** реально скачаны публичный манифест и APK; размер 3478455 байт, SHA256 3bd0212c7d50f6ef8eb3afefe821072d331ba4079683ce2975cc2e4680926fbe, побайтовое совпадение с релизом. Сертификат тот же: SHA256 601ca75c9085929a09d63117ba5462b2e12b01f2be183ba742b5b8c19a5ce358. 335/335 JS, 7/7 deploy.

**Статус / что осталось:** публикация завершена. APK 0.2.0+ автоматически проверяет и скачивает релиз при открытом приложении; установка требует подтверждения Android. Закрытое приложение не обновляется. Телефонная приёмка и повторный браузерный замер Claude остаются открыты.

**Для Claude:** брать codex/android-022-performance / PR #2, выполнить source-import.py. Патч из PR #1 уже включён; повторно не применять. После импорта COLLAB_LOG.md содержит эту запись. GitHub PR не слит по правилу владельца; опубликованный APK доступен независимо от слияния PR. Подпись/пакет/сохранения не менять.

---

## 2026-10-11 00:26 · Codex · ветка codex/android-022-performance

**Что сделано:** прочитан PR #1 / Claude 5670f4c; патч полностью применился поверх оптимизированного дерева (dry-run без конфликтов). Сохранены исходные AGENTS.md, журнал Claude и патч. Добавлены кеш людей, раннее отсечение вне экрана, Android-бюджет буфера 2 млн пикселей и проверка подписи APK вне UI. Релиз 0.2.1 (Sites source 28c26aa) сохранён, но не опубликован: итоговая версия повышена до 0.2.2 / игра 0.6.0-a2, включает изменения обоих агентов.

**Зачем:** оптимизация APK и исправление накопления визуального отставания после долгих кадров.

**Файлы:** dist/{render,app,diagnostics,motion-visual,resolution-governor,raster-budget}.js, dist/index.html, tests/{render,raster-budget,motion-visual,performance-audit}.test.mjs, android/, PLAN.md, QA.md, docs/ANDROID_021_HANDOFF.md и docs/android-performance-060a1.json.

**Проверки:** до интеграции 333/333 JS, deploy 7/7, APK 0.2.1 v2/v3 и побайтовый состав 116 runtime-файлов проверены. После интеграции: 335/335 JS, deploy 7/7, APK 0.2.2 v2/v3 проверен, 116 runtime-файлов побайтово совпали. Стенд кеша: 701280 → 174720 Canvas-вызовов; это не мобильный FPS. Браузерные замеры Claude приведены как его результаты, независимо не воспроизведены.

**Статус / что осталось:** 0.2.2 собран; update.json подготовлен. Публикация и проверка скачанного пакета выполняются. Телефонная приёмка Fold6 остаётся открыта. GitHub-изменения будут отдельной веткой/PR; main и ветка Claude не перезаписываются.

**Для Claude:** патч уже включён в новый архив исходников; повторно не применять. Не менять подпись, имя пакета или ключи сохранений. Повторный браузерный замер и сравнение на телефоне полезны.

---

## 2026-10-11 00:20 · Claude · ветка claude/motion-lag-and-stalls

**Что сделано:** аудит 0.6.0-a (commit Sites `af46c3e5…`) по исходникам из `meridian-source-01.zip`. Впервые замерил игру в настоящем Chromium (headless, Playwright), а не в Node. Нашёл и исправил две проблемы, оформил их патчем `patches/claude-motion-lag-and-stalls.patch`. Распакованное дерево в ветку не коммитил, только патч, правила и журнал. `main` не трогал.

**Зачем:** это две главные жалобы владельца — лаги на Fold6 и несогласованное движение машин.

### Находка 1. Машины визуально отстают от симуляции (баг)
- Рендер обрезал время кадра до 0.1 с: `app.js`, вызов `renderer.draw(... Math.min(.1,drawInterval/1000) ...)`, и `motion-visual.js`, `Math.min(.1,dt)`. Симуляция же принимает до 0.5 с (`createSimulationClock`).
- После каждого подвисания кадра отрисованная машина теряет часть пути и не догоняет. Снап происходит только при расхождении больше 1 единицы карты, то есть 1670 м (`render.js`, `smooth`).
- Модель отставания (машина 50 км/ч, реальное время, ×1):
  - 30 FPS ровно: 0 м;
  - 1 подвисание 250 мс в секунду: **123 м за 73 с**;
  - 5 FPS: **832 м за 2 мин**, затем телепорт.
- Это объясняет жалобы «машины то медленные, то слишком быстрые/прыгают».
- **Фикс:**
  - в `draw()` введён `frameDt = min(.5, dt)` для `advanceVisualPath`;
  - остальная косметика (камера, повороты, мигалки) сохраняет кап 0.1 с через `dt = min(.1, frameDt)`;
  - `app.js` передаёт `min(.5, …)`;
  - `motion-visual.js` использует кап 0.5.
- Контракт «визуал не гонится к снимку быстрее физических метров» сохранён, старый тест проходит. После фикса отставание 0 м во всех трёх сценариях.

### Находка 2. Подвисания на слабом CPU — из-за пикселей, а не логики
- Chromium, viewport 884×1104 при DPR 2.5 (≈ внутренний экран Fold6), CPU замедлен ×4, скорость ×4, трейс 8 с:
  - **Commit** (передача кадра canvas компоновщику) занимает ~50% главного потока, в среднем 13.5 мс на кадр;
  - JS рендера ~25%;
  - `tick`/транспорт ~2%;
  - 29 задач длиннее 50 мс, максимум 249 мс.
- Тот же сценарий при DPR 1: Commit 3.2 мс на кадр, 2 длинные задачи. Стоимость растёт с числом пикселей.
- Рендер держит 4 полноэкранных буфера: main, cache с полем 160 px, staging и lightCache. При DPR 2 на внутреннем экране Fold6 это порядка 100 МБ.
- `resolution-governor.js` снижал разрешение только при ≥18 медленных из 60 кадров. Редкие подвисания по 100–250 мс (~10% кадров) он не видел.
- **Фикс:** governor считает ещё и подвисания (`interval > 2.5 × period`). При ≥4 подвисаниях на 60 кадров разрешение снижается на 0.5. Повышение — только если окно было без подвисаний. Добавлен тест.
- Оговорка: в контейнере нет GPU, canvas растеризуется программно. На телефоне абсолютные цифры будут другими. Зависимость «пиксели → Commit» и малая доля логики показательны, но телефонная приёмка остаётся открытой.

### Проверки
- До правок: `npm test` 331/331, `tests/deploy` 7/7.
- После правок: `npm test` **333/333** (два новых теста), deploy 7/7.
- Патч проверен `patch -p1 --dry-run` на чистом `meridian-source-01.zip`.
- Без профайлера в браузере при обычном CPU игра держит свой лимит 30 FPS. Повторный браузерный замер после фикса не сделан: работа остановлена по просьбе владельца, пока работает Codex.

### Файлы патча
- `dist/render.js`
- `dist/app.js`
- `dist/motion-visual.js`
- `dist/resolution-governor.js`
- `tests/motion-visual.test.mjs`
- `tests/performance-audit.test.mjs`

### Для Codex
- Если ты сейчас меняешь эти файлы, наложи патч поверх своей версии (`patch -p1 < patches/claude-motion-lag-and-stalls.patch`) или перенеси правки вручную: они маленькие, 6 файлов, ~20 строк кода.
- Ветка перебазирована на твой `fa054bf` (APK 0.2.0). Конфликт в `CLAUDE.md` решён так: оставлены оба абзаца, твой про Android 0.2.0 и мой про журнал. `meridian-source-01.zip` в твоём коммите не менялся, патч к нему применим.
- Игра теперь встроена в APK. Поэтому после интеграции фикс должен попасть в новый подписанный APK и `update.json`. Подпись и выпуск за тобой, ключа у меня нет.
- В `main` ничего не сливал. Версию игры не менял, `PLAN.md`/`QA.md` не трогал, чтобы не конфликтовать. Если интегрируешь, отметь там и здесь.

### Следующие кандидаты (не сделаны, только предложения)
1. Стартовый кап DPR 1.5 на сенсорных устройствах с большим экраном. Слияние staging и cache в один буфер.
2. Расхождение визуала и симуляции больше ~50 м — плавное доведение вместо снапа на 1670 м.
3. Повторный браузерный замер после фикса на ×1/×4 и при панорамировании.