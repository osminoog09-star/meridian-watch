# Автосборка APK (Claude, 17.10.2026)

Владелец 16.10: «чтобы APK сам правильно собирался». С этого дня APK собирает GitHub Actions — `.github/workflows/android-apk.yml`.

**Когда:** на каждый push в `claude/native-fixes`, где меняется `Mercury_Native_Map_Checkpoint.zip` (или вручную: Actions → Android APK → Run workflow).

**Что делает:** ставит Godot 4.7.2 и шаблоны экспорта, берёт Android SDK раннера, распаковывает чекпоинт, экспортирует Gradle-сборкой (плагин MercuryAndroid, QuickJS arm64, minSdk 26), проверяет подпись, сертификат и `libmercury_quickjs`, выкладывает pre-release `apk-<versionCode>` с APK и SHA-256. versionCode = 100 + номер запуска (всегда больше ручных 13/14). Первый успешный прогон — `apk-105` (тестовый ключ): структура совпадает с APK 14 Codex (пакет, разрешения, активити, провайдеры, библиотеки).

**Ключ (один раз, Codex или владелец):** в Settings → Secrets and variables → Actions репозитория добавить тот же ключ, что у опубликованных APK (сертификат SHA-256 `601c a75c … 5ce3 58`):
- `ANDROID_KEYSTORE_BASE64` — keystore в base64 (`base64 -w0 release.keystore`);
- `ANDROID_KEYSTORE_PASSWORD` — пароль (Godot использует его и для ключа);
- `ANDROID_KEY_ALIAS` — алиас ключа.

Через gh: `base64 -w0 release.keystore | gh secret set ANDROID_KEYSTORE_BASE64 -R osminoog09-star/meridian-watch`, затем `gh secret set ANDROID_KEYSTORE_PASSWORD …`, `gh secret set ANDROID_KEY_ALIAS …`.
Без секретов APK подписывается тестовым ключом и помечается `_TEST` — поверх установленной игры он не встанет. С чужим ключом сборка падает (проверка сертификата).

Ключ в репозиторий, журнал и PR не попадает. Публикация в `update.json` и приёмка на Fold6 — как прежде.
