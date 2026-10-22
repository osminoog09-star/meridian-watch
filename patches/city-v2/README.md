# Город 2.0 — генератор и конвейер (Claude, 22.10.2026)

- `generate.mjs` — план вымышленного города (~15 000 жителей): река с набережными и тремя мостами, Ратушная площадь,
  радиальные улицы и два кольца, районы со своим рисунком улиц, службы с входами. Детерминирован (seed 2026).
  `node patches/city-v2/generate.mjs dist` пишет `city-data.js`, `geography.js`, `quarter-data.js`,
  `walking-network.js`, `city-v2-plan.json`, `city-v2-validation.json`.
- `walking.mjs` — тротуары и переходы по той же сети; цели пеших визитов берутся из плана.
- `prepare.mjs <JS через release-g1> <распакованный native-map>` — полная интеграция: патчи Codex
  (`runtime-wip.patch`, `native-wip.patch` — миграция сохранений, пригород, рендер-скрипты), данные, `claude-steps.mjs`
  (архитектура и цвета служб, знаки на карте, тесты части 1 под новый план), база служб в `sim.js`, выезды и река
  для пригорода. Затем `build.mjs <native-map>` (манифест, бандлы, parity-фикстуры).
- `preview.mjs <out.svg>` — схема плана для глаз.
- Цепочка JS: `patches/apply-claude-092.sh release-c2` = патч кода `claude-release-c2-city.patch` + генерация данных.
