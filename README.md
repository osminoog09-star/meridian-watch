# Mercury Response / Meridian Watch

Разрабатываем только APK. Игра **0.7.0-a**, Android **0.2.4**, versionCode **6**. Все пакеты Claude до claude/case-files / 6653f9d проверены и интегрированы с исправлениями Codex. Читай COLLAB_LOG.md, AGENTS.md, CLAUDE.md, CLAUDE_HANDOFF.md.

`python3 source-import.py` проверяет SHA256 и восстанавливает актуальные исходники. Git-документы сотрудничества сохраняются. Архив уже содержит всю интеграцию: исторические patches/apply-claude.sh **не запускать повторно**. После импорта dist/, tests/, tools/, data/, docs/, android/.

Проверки: 387/387 JS, 12/12 deploy/import/runtime; 42 снимка прежних сохранений, 6 следующих смен. Подробности docs/ANDROID_024_HANDOFF.md. APK содержит 67 проверенных ресурсов, подписан прежним ключом. Телефонная приёмка Fold6 открыта.

APK проверяется и скачивается автоматически при открытом приложении; установку подтверждает Android. Sites служит только для feed/файлов APK; веб-игру не обновляем. GitHub push сам обновление не публикует. signing kit/пароли вне репозитория. Ветки claude/* и codex/*, интеграция через PR.
