# Передача Codex — 18.10.2026 (Claude)

Ты (Codex) откатился. Здесь всё, чтобы продолжить вместе с Claude, ничего не сломав. Сначала прочитай этот файл и верхние
записи `COLLAB_LOG.md` в обеих ветках ниже.

## Решения владельца (действуют)
- Разрабатываем и выпускаем **только нативный APK** (Godot). Веб-игру не развивать и не публиковать.
- Любое игровое изменение доходит до игрока только **новым подписанным APK в канале обновлений**. Простого push мало.
- Каждое действие — запись **сверху** в `COLLAB_LOG.md`: кто, когда, ветка, что, зачем, проверки, что осталось.
- Не перезаписывать чужие изменения. Ветки `codex/*` и `claude/*`.
- Город вымышленный (Меридиан). Сетевые блокировки не обходить.

## Репозитории и ветки
- `osminoog09-star/meridian-watch` (приватный):
  - **`claude/release-m`** — исходники игры (JS-симуляция и интерфейс, `dist/` + `tests/`) как **цепочка патчей** поверх
    импорта 0.9.2-a: `patches/apply-claude-092.sh` (последний шаг `release-t1`). `dist/` и `tests/` в git игнорируются —
    в git живут патчи, журнал, `docs/`.
  - **`claude/native-fixes`** — нативная игра: `Mercury_Native_Map_Checkpoint.zip` (весь Godot-проект), `ci/`,
    `.github/workflows/android-apk.yml`, `COLLAB_LOG.md`. **Каждый push в эту ветку = сборка APK в CI.**
- `osminoog09-star/meridian-watch-apk` (публичный) — **канал автообновления**: `android/update.json` + один APK.

## Как собирается и обновляется APK (автоматически)
1. Push в `claude/native-fixes` → GitHub Actions «Android APK»: Godot 4.7.2, Gradle-экспорт, плагин `android-bridge/`,
   versionCode = 100 + номер запуска, pre-release `apk-<versionCode>` с APK и `.sha256`.
2. **Подпись**: ключ проекта уже есть — `ci/signing/mercury-release.keystore` + `ci/signing/signing.json` в ветке
   `claude/native-fixes` (сертификат SHA-256 `0fdf02f8d7e3aaa79d0d571d46da8689b8a83348cd10df32267bdc786777232b`).
   Secrets `ANDROID_KEYSTORE_*`, если заданы, главнее. **Новый ключ не создавать**: APK с другим ключом не обновит
   установленную игру. CI сам проверяет, что подпись — ключом опубликованных APK.
3. **Канал**: игра каждые 5 минут читает
   `https://raw.githubusercontent.com/osminoog09-star/meridian-watch-apk/main/android/update.json`, качает APK,
   сверяет размер, SHA-256 и подпись и предлагает установить. Deploy-ключ из CI в канал не заработал (через API не
   добавить), поэтому **публикация сейчас вручную**:
   ```
   gh api -H "Accept: application/octet-stream" repos/osminoog09-star/meridian-watch/releases/assets/<ID> > Mercury_Response_<N>.apk
   # в клоне meridian-watch-apk:
   git checkout --orphan c<N> && git rm -rq --cached . && rm -f android/*.apk
   cp Mercury_Response_<N>.apk android/
   python3 -I <native-fixes>/ci/channel.py . android/Mercury_Response_<N>.apk <N> 0.3.<N-100>-native
   git add -A && git commit -m "APK <N>" && git push -f origin c<N>:main
   curl -s https://raw.githubusercontent.com/osminoog09-star/meridian-watch-apk/main/android/update.json
   ```
   (история канала намеренно одна — orphan-коммит, чтобы репозиторий не рос).

## Как вносить изменения
- **JS (симуляция/интерфейс)**: чистый импорт 0.9.2-a (`python3 source-import.py`) → `patches/apply-claude-092.sh` → правка
  в `dist/`/`tests/` → `npm test` (сейчас **630/630**) → новый патч `diff -ruN` от предыдущего чистого состояния →
  шаг в `apply-claude-092.sh`. Затем те же файлы — в нативный проект: `simulation/source/` и `ui/source/` (у
  `ui/source/app.js` нативные отличия — сливать, не копировать поверх), `esbuild` ядра, `cd ui && npm run build`,
  обновить `simulation/source-sha256.json`, `node simulation/make-parity-fixtures.mjs`.
- **Натив**: распаковать `Mercury_Native_Map_Checkpoint.zip`, править `scripts/*.gd`, `shaders/`, `ui/*.js`.
  Проверка: `python3 tools/audit_migration.py --godot <Godot 4.7.2>` (**51/51**, любая строка `ERROR:` = провал) и
  `godot --headless --path . --script tools/audit_service_long_shift.gd -- --native-ui` (**7/7**). После новых ресурсов —
  `godot --headless --path . --import`. Упаковать: `python3 tools/checkpoint.py <клон native-fixes>`, commit, push → CI.
- Рендеры для глаз: `xvfb-run godot --path . --rendering-driver opengl3 --resolution 411x914 --script
  scripts/render_screens.gd -- --native-ui --out DIR [--call|--endshift]`, `scripts/render_camera.gd` (`--storage`,
  `--world`, `--places`).

## Состояние на 18.10 04:10 (обновлено)
- Опубликован **APK 129** (0.3.29). После 00:20 добавлены: J1 такси (работа через «Сменить профессию»), G1 итоги года с людьми, W2 погода на поверхностях (снег, слякоть, мокрый асфальт). JS 634/634, натив 51/51, цепочка патчей до `release-g1`.
- **Следующий шаг: W1** — гуще машины в часы пик, автобусы по маршрутам (натив `ui/map-view.js streetPlan`, `scripts/live_actors.gd`), затем W3 (вывески/входы у мест), U3 (лента рации с фильтром), Q2 (слоты сохранений). У Claude закончился недельный лимит — W1 свободен, бери.

## Состояние на 18.10 00:20
- Опубликован **APK 125** (0.3.25), в сборке 126–128: U2/U4, карточка своего экипажа, позывные, поворот экрана.
- Сделано Claude 16–18.10 (подробно в журналах): звания как в жизни, первая неделя, дом и дорога, профессии
  (смена службы), мечта, люди отдела (наставник, однокурсник, 9 сцен), базы у реальных зданий, графика G1–G5 (крыши,
  дороги, вода, фонари, машины во дворах, пригород с посёлками), интерфейс V/U1/U2/U4, звук, поворот экрана, автосборка.
- Дорожная карта: `docs/ROADMAP_4.md` — дальше J1 такси, G1 итоги года, P1 решения на месте, W1/W2 мир.

## Как работать вдвоём
- Перед работой: `git fetch`, прочитать верх `COLLAB_LOG.md` в `claude/release-m` и `claude/native-fixes`.
- Codex берёт отдельную ветку `codex/<тема>` от `claude/native-fixes` (натив) или от `claude/release-m` (патчи) и
  открывает PR в ту же ветку; Claude делает так же. Не пушить чужую ветку без PR.
- Номер APK = номер запуска CI: кто публикует в канал, пишет в журнал номер и SHA-256.
- Ключ, `ci/signing/*` и deploy-ключ не трогать и никуда не копировать.
