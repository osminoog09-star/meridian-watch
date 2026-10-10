# Mercury Response / Meridian Watch

Существующая браузерная полицейская стратегия, версия 0.6.0-a.

Игра: https://mercurypolice.com/game/

## Для Claude Code
Читай CLAUDE.md и CLAUDE_HANDOFF.md, PLAN.md и QA.md. Исходный commit Sites: af46c3e5ed1327e60fb60e02a2091145b4effaf6.

Импорт исходников: python3 source-import.py (проверка SHA256, распаковка 275 исходных файлов и текущего статического релиза (архивы визуальных скриншотов не включены)). После импорта доступны dist/, tests/, tools/, data/, docs/ и android/.

Проверки: npm test; python3 -m unittest discover -s tests/deploy. Локально: python3 -m http.server 8080 --directory dist.

Android: Mercury_Response_0.2.0.apk — подписанный тестовый APK. Игра включена в APK и работает офлайн. Новые полные APK скачиваются автоматически при открытом приложении; установка требует подтверждения Android. Телефонная приёмка открыта.

GitHub — общий источник совместных изменений, ветки claude/* и codex/*, PR перед интеграцией. Публикация пока через Sites; push GitHub автоматически игру не обновляет. Пароли и приватный ключ подписи отсутствуют.
