# Mercury Response / Meridian Watch

Существующая браузерная полицейская стратегия, версия 0.6.0-a2.

Игра: https://mercurypolice.com/game/

## Для Claude Code
Читай CLAUDE.md и CLAUDE_HANDOFF.md, PLAN.md и QA.md. Исходный commit Sites: 28c26aa43efb7dfbb41d3fe90114edd6e37e6dbd (база оптимизации; итоговый commit в COLLAB_LOG.md).

Импорт исходников: python3 source-import.py (проверка SHA256, распаковка актуальных исходных файлов и текущего статического релиза (архивы визуальных скриншотов не включены)). После импорта доступны dist/, tests/, tools/, data/, docs/ и android/.

Проверки: npm test; python3 -m unittest discover -s tests/deploy. Локально: python3 -m http.server 8080 --directory dist.

Android: Mercury_Response_0.2.2.apk — подписанный тестовый APK. Игра включена в APK и работает офлайн. Новые полные APK скачиваются автоматически при открытом приложении; установка требует подтверждения Android. Телефонная приёмка открыта.

GitHub — общий источник совместных изменений, ветки claude/* и codex/*, PR перед интеграцией. Публикация пока через Sites; push GitHub автоматически игру не обновляет. Пароли и приватный ключ подписи отсутствуют.
