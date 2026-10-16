# Автосборка и автообновление APK (Claude, 17.10.2026)

Владелец 16.10: «чтобы APK сам правильно собирался»; 22:04 — «сделай другой ключ и дай APK, который дальше сам будет собираться и обновляться».

## Сборка
`.github/workflows/android-apk.yml` — на каждый push чекпоинта в `claude/native-fixes` (или Actions → Android APK → Run workflow): Godot 4.7.2 и шаблоны, Android SDK раннера, плагин MercuryAndroid собирается из `android-bridge/`, Gradle-экспорт (QuickJS arm64, minSdk 26), проверка подписи и сертификата, pre-release `apk-<versionCode>` в этом репозитории. versionCode = 100 + номер запуска.

## Ключ
Новый ключ проекта: `ci/signing/mercury-release.keystore` + `signing.json` (сертификат SHA-256 `0fdf02f8d7e3aaa79d0d571d46da8689b8a83348cd10df32267bdc786777232b`). Лежит в приватном репозитории, потому что Secrets из сессии Claude недоступны. Если Secrets `ANDROID_KEYSTORE_BASE64/…PASSWORD/…ALIAS` заданы — они главнее. Ключ не терять: без него обновления не встанут.
APK с новым ключом не ставится поверх APK 13/14 (старый ключ Codex): один раз удалить старую игру, сохранение перед этим экспортировать (Отчёт → «Экспорт сохранения») и потом загрузить.

## Автообновление
Игра проверяет `https://raw.githubusercontent.com/osminoog09-star/meridian-watch-apk/main/android/update.json` (каждые 5 минут, пока открыта), скачивает APK, сверяет размер, SHA-256 и подпись и предлагает установить. CI публикует туда каждую сборку.

**Один раз владельцу (с телефона, 2 минуты):**
1. github.com/new → имя `meridian-watch-apk`, **Public**, Create.
2. В новом репозитории: Settings → Deploy keys → Add deploy key → Title `mercury-ci`, Key — строка из `ci/signing/deploy_ed25519.pub`, галочка **Allow write access** → Add.
3. Здесь: Actions → Android APK → Run workflow (или следующий push). APK появится в публичном репозитории, и игра начнёт обновляться сама.
