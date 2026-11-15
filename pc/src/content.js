// Игровое наполнение Mercury Response 2.0: звания, подразделения, снаряжение, политика, вызовы, испытания.
export const TRAITS = {talk: 'Переговорщик', drive: 'Водитель', invest: 'Следователь', force: 'Боец'};

// Карьера: от стажёра после академии до комиссара. Каждое звание открывает новые полномочия.
export const RANKS = [
  {title: 'Стажёр', xp: 0, units: 3, perk: 'Вы в экипаже с наставником и управляете только своей машиной. Остальных ведёт диспетчер.'},
  {title: 'Патрульный', xp: 300, units: 3, perk: 'Сами выбираете район и маршрут патрулирования. Выдают шипы для остановки беглецов.'},
  {title: 'Старший патрульный', xp: 750, units: 4, perk: 'Вызываете подкрепление на свой вызов, ведёте расследования, вербуете информатора. В смену приходят детективы.'},
  {title: 'Сержант', xp: 1400, units: 5, perk: 'Командуете всеми экипажами смены, районами и маршрутами. Доступны автодиспетчер и агент под прикрытием. В смену приходит ДПС.'},
  {title: 'Лейтенант', xp: 2300, units: 6, perk: 'Управляете отделением: бюджет, экипажи всех подразделений, снаряжение, улучшения и политика отделения.'},
  {title: 'Капитан', xp: 3600, units: 7, perk: 'Открыты спецназ и вертолёт, второй агент под прикрытием.'},
  {title: 'Комиссар', xp: 5500, units: 8, perk: 'Весь город под вашей ответственностью.'},
];
export const PERKS = {
  talk: {name: 'Переговоры', desc: '+6% к успеху переговоров вашего экипажа за уровень.'},
  invest: {name: 'Расследование', desc: '+6% к успеху расследований вашего экипажа за уровень.'},
  force: {name: 'Тактика', desc: '+6% к успеху силовых действий вашего экипажа за уровень.'},
  drive: {name: 'Вождение', desc: '+6% к успеху за рулём и +5% к скорости вашего экипажа за уровень.'},
};

// Подразделения. role определяет, где экипаж силён; вертолёт летает напрямую и работает только сверху.
export const ROLES = {
  patrol: {name: 'Патруль', color: '#5fd3c4', desc: 'Универсальные экипажи: любые вызовы, присутствие на улицах.'},
  traffic: {name: 'ДПС', color: '#ffb347', desc: 'Нарушения на дорогах, ДТП, пьяные водители и погони. Чаще замечают превышение скорости.'},
  detective: {name: 'Детективы', color: '#c59bff', desc: 'Улики, расследования и убийства. Без детектива дело движется медленнее.'},
  swat: {name: 'Спецназ', color: '#ff6b6b', desc: 'Вооружённые преступники, заложники, беспорядки. На мелкий вызов — перебор, жители недовольны.'},
  heli: {name: 'Авиаотряд', color: '#7fb8ff', desc: 'Вертолёт: замечает скрытые преступления издалека и не даёт беглецу уйти в погоне.'},
};
export const VEHICLES = {
  sedan: {name: 'Патрульный седан', short: 'Патруль', role: 'patrol', cost: 900, rank: 4, speed: 1, color: '#e8eef2', stripe: '#1d4fa3', desc: 'Универсальная машина для любых вызовов.'},
  k9: {name: 'Кинологический экипаж', short: 'K-9', role: 'patrol', cost: 1700, rank: 4, speed: 0.96, bonus: {invest: 0.12}, color: '#3d5a4c', stripe: '#e8d36a', desc: 'Служебная собака: +12% к поиску и следам, легче находит скрывшихся.'},
  interceptor: {name: 'Перехватчик ДПС', short: 'ДПС', role: 'traffic', cost: 1500, rank: 4, speed: 1.18, chase: 1.6, bonus: {drive: 0.1}, color: '#2f3b46', stripe: '#ffb347', desc: 'Быстрее на вызовах, в погонях ловит в 1,6 раза быстрее. Радар в комплекте.'},
  unmarked: {name: 'Машина детективов', short: 'Детективы', role: 'detective', cost: 1400, rank: 4, speed: 1.02, bonus: {invest: 0.15, talk: 0.05}, color: '#4a4f57', stripe: '#4a4f57', desc: '+15% к расследованиям, вдвое быстрее собирает улики в зоне поиска.'},
  van: {name: 'Фургон спецназа', short: 'Спецназ', role: 'swat', cost: 2300, rank: 5, speed: 0.9, bonus: {force: 0.15}, color: '#1f2a44', stripe: '#9fb3bf', desc: '+15% к силовым действиям, вдвое реже ранения, подозреваемые чаще сдаются.'},
  heli: {name: 'Полицейский вертолёт', short: 'Вертолёт', role: 'heli', cost: 4200, rank: 5, speed: 3, chase: 1.3, color: '#2b3a4f', desc: 'Летит напрямую, видит скрытые преступления в радиусе 700 м, держит беглеца в погоне. Не работает на земле.'},
};

// Снаряжение экипажа: три слота. Влияет на шансы, ранения и реакцию жителей.
export const GEAR = {
  weapon: {
    pistol: {name: 'Пистолет', cost: 0, desc: 'Стандартное оружие.'},
    taser: {name: 'Электрошокер', cost: 250, force: 0.06, desc: '+6% к силовым действиям, жалоб на силу меньше.', soft: true},
    shotgun: {name: 'Помповое ружьё', cost: 450, force: 0.08, fight: 0.12, desc: '+12% в перестрелке, но на мелких вызовах жители недовольны.', heavy: true},
    rifle: {name: 'Штурмовая винтовка', cost: 800, force: 0.1, fight: 0.2, desc: '+20% в перестрелке. Только для серьёзных угроз.', heavy: true},
  },
  armor: {
    none: {name: 'Без защиты', cost: 0, injury: 1, desc: 'Риск ранения полный.'},
    vest: {name: 'Бронежилет', cost: 300, injury: 0.6, desc: 'Ранения на 40% реже.'},
    heavy: {name: 'Тяжёлая броня', cost: 700, injury: 0.3, speed: 0.95, desc: 'Ранения на 70% реже, экипаж на 5% медленнее.'},
  },
  kit: {
    none: {name: 'Ничего', cost: 0, desc: 'Пустой слот.'},
    radar: {name: 'Радар', cost: 350, desc: 'Замечает превышение скорости вдвое дальше, штрафы вдвое выше, +15% на дорожных вызовах.'},
    medkit: {name: 'Аптечка и турникеты', cost: 300, desc: '+15% на ДТП с пострадавшими и после перестрелок.'},
    forensics: {name: 'Криминалистический чемодан', cost: 450, desc: '+15% к расследованиям, улик вдвое больше.'},
    ram: {name: 'Таран и щит', cost: 400, desc: '+12% при штурме и задержании в помещении.'},
  },
};
export const DEFAULT_GEAR = {weapon: 'pistol', armor: 'vest', kit: 'none'};

// Политика отделения (с лейтенанта): четыре оси, как таблица директив.
export const POLICY = {
  force: {name: 'Применение силы', options: {soft: 'Мягкое', standard: 'По уставу', hard: 'Жёсткое'}, desc: {soft: '+8% к переговорам, подозреваемые реже стреляют, но чаще убегают.', standard: 'Без особенностей.', hard: '+8% к силовым действиям, чаще сдаются, но на мелких вызовах — жалобы.'}},
  enforcement: {name: 'Строгость', options: {warn: 'Предупреждения', fine: 'Штрафы', arrest: 'Задержания'}, desc: {warn: 'Жители довольнее, но преступность падает медленнее, штрафов нет.', fine: 'Штрафы приносят бюджет на мелких и дорожных вызовах.', arrest: 'Задерживаем всех, кого можно: преступность падает быстрее, но мелкие задержания раздражают жителей.'}},
  pursuit: {name: 'Погони', options: {cautious: 'Осторожно', standard: 'По уставу', aggressive: 'До конца'}, desc: {cautious: 'Нет аварий в погоне, но беглецы чаще уходят.', standard: 'Без особенностей.', aggressive: 'Догоняем на 30% быстрее, но бывают аварии с гражданскими.'}},
  patrol: {name: 'Патрулирование', options: {normal: 'Обычное', intensive: 'Усиленное'}, desc: {normal: 'Без особенностей.', intensive: 'Патрули снижают преступность на 40% быстрее, но устают на 25% быстрее.'}},
};
export const DEFAULT_POLICY = {force: 'standard', enforcement: 'fine', pursuit: 'standard', patrol: 'normal'};

export const UPGRADES = [
  {id: 'nav', name: 'Навигаторы', cost: 600, rank: 4, desc: 'Экипажи едут на вызов на 10% быстрее.'},
  {id: 'rest', name: 'Комната отдыха', cost: 500, rank: 4, desc: 'Усталость копится на 30% медленнее.'},
  {id: 'talk', name: 'Курсы переговоров', cost: 700, rank: 4, desc: '+10% к успеху переговоров.'},
  {id: 'invest', name: 'Криминалистическая лаборатория', cost: 800, rank: 4, desc: '+10% к успеху расследований.'},
  {id: 'force', name: 'Тактическая подготовка', cost: 900, rank: 4, desc: '+10% к успеху силовых действий.'},
  {id: 'cam', name: 'Нагрудные камеры', cost: 800, rank: 4, desc: 'Успешные вызовы дают больше доверия, жалоб на силу меньше.'},
  {id: 'radio', name: 'Цифровая связь', cost: 1000, rank: 5, desc: 'Заявители ждут экипаж на 25% дольше.'},
  {id: 'spikes', name: 'Склад шипов', cost: 900, rank: 4, desc: '+2 комплекта шипов за смену, погони заканчиваются в 1,5 раза быстрее.'},
  {id: 'cctv', name: 'Городские камеры', cost: 1600, rank: 5, desc: 'Скрытые преступления замечаются по всему городу на 30% чаще.'},
  {id: 'hospital', name: 'Договор с больницей', cost: 700, rank: 4, desc: 'Раненые сотрудники возвращаются в строй через 2 часа, а не в конце смены.'},
];

// Вызовы. wait — минут ждёт заявитель; work — минут работы; d/n — вес днём и ночью.
// roles — профильные подразделения; hidden — доля случаев, о которых никто не звонит; vanish — незамеченное «растворяется» без звонка;
// suspect — на месте есть подозреваемый (сдаётся, бежит или стреляет); armed — вооружён; minor — спецназ и тяжёлое оружие здесь лишние;
// fx — дым, огонь или искры на месте; rain — множитель частоты в дождь.
export const CALLS = {
  noise: {name: 'Шум в ночное время', icon: '♪', sev: 1, wait: 45, work: 8, rank: 0, d: 0.2, n: 1.4, minor: true, roles: ['patrol'],
    brief: 'Соседи жалуются на громкую музыку и крики из квартиры.',
    approaches: [{label: 'Поговорить с жильцами', trait: 'talk', p: 0.84}, {label: 'Составить протокол', trait: 'invest', p: 0.9, time: 1.6, hint: 'дольше, но надёжнее', fine: true}]},
  dog: {name: 'Лающая собака', icon: '♠', sev: 1, wait: 50, work: 6, rank: 0, d: 0.6, n: 0.8, minor: true, roles: ['patrol'],
    brief: 'Собака во дворе лает третий час, хозяева не открывают.',
    approaches: [{label: 'Найти хозяев', trait: 'talk', p: 0.86}, {label: 'Выписать предписание', trait: 'invest', p: 0.9, time: 1.3, fine: true}]},
  party: {name: 'Шумная вечеринка', icon: '♫', sev: 1, wait: 40, work: 10, rank: 0, d: 0.1, n: 1.2, minor: true, roles: ['patrol'],
    brief: 'В частном доме вечеринка на сотню гостей, на улице мусор и машины поперёк дороги.',
    approaches: [{label: 'Попросить разойтись', trait: 'talk', p: 0.78}, {label: 'Оштрафовать организатора', trait: 'invest', p: 0.85, time: 1.4, fine: true}]},
  alarm: {name: 'Сработала сигнализация', icon: '◈', sev: 1, wait: 35, work: 7, rank: 0, d: 1, n: 1.2, roles: ['patrol'],
    brief: 'Охранная система передала тревогу. Владелец на звонки не отвечает.',
    approaches: [{label: 'Осмотреть объект', trait: 'invest', p: 0.9}, {label: 'Проверить периметр с машины', trait: 'drive', p: 0.72, time: 0.6, hint: 'быстро, но можно пропустить следы'}]},
  shoplift: {name: 'Кража в магазине', icon: '▣', sev: 1, wait: 32, work: 12, rank: 0, d: 1.5, n: 0.3, suspect: true, roles: ['patrol'],
    brief: 'Охрана удерживает человека, который вынес товар мимо кассы.',
    approaches: [{label: 'Опросить и задержать', trait: 'invest', p: 0.76, arrest: true}, {label: 'Уладить на месте', trait: 'talk', p: 0.82, hint: 'без задержания', fine: true}]},
  vandalism: {name: 'Вандализм', icon: '✎', sev: 1, wait: 40, work: 9, rank: 0, d: 0.4, n: 1.2, hidden: 0.7, roles: ['patrol'],
    brief: 'Подростки разрисовывают стены и бьют стёкла остановки.',
    approaches: [{label: 'Задержать на месте', trait: 'drive', p: 0.7, arrest: true}, {label: 'Установить личности по камерам', trait: 'invest', p: 0.82, time: 1.4}]},
  speeding: {name: 'Превышение скорости', icon: '»', sev: 1, wait: 6, work: 4, rank: 0, d: 1.2, n: 0.8, hidden: 0.95, vanish: true, minor: true, roles: ['traffic'],
    brief: 'Машина несётся по городу на 90 км/ч.',
    approaches: [{label: 'Остановить и выписать штраф', trait: 'drive', p: 0.86, fine: true}, {label: 'Сделать предупреждение', trait: 'talk', p: 0.95, time: 0.6}]},
  accident: {name: 'ДТП без пострадавших', icon: '◇', sev: 1, wait: 38, work: 14, rank: 0, d: 1.4, n: 0.6, rain: 1.8, roles: ['traffic', 'patrol'], fx: 'smoke',
    brief: 'Две машины столкнулись на перекрёстке. Водители спорят, движение затруднено.',
    approaches: [{label: 'Оформить и освободить дорогу', trait: 'drive', p: 0.88, fine: true}, {label: 'Успокоить водителей', trait: 'talk', p: 0.8, time: 0.8}]},
  domestic: {name: 'Семейный конфликт', icon: '⌂', sev: 2, wait: 24, work: 16, rank: 0, d: 0.7, n: 1.3, suspect: true, roles: ['patrol'],
    brief: 'Из квартиры слышны крики и звон посуды. Звонит сосед.',
    approaches: [{label: 'Деэскалация', trait: 'talk', p: 0.78}, {label: 'Задержать агрессора', trait: 'force', p: 0.7, arrest: true}]},
  suspicious: {name: 'Подозрительный автомобиль', icon: '◎', sev: 2, wait: 26, work: 8, rank: 0, d: 0.9, n: 1.2, suspect: true, roles: ['patrol', 'traffic'],
    brief: 'Машина без света третий час стоит у закрытого склада. Внутри двое.',
    approaches: [{label: 'Проверить документы', trait: 'invest', p: 0.7, flee: true}, {label: 'Заблокировать выезд', trait: 'drive', p: 0.74, arrest: true, flee: true}]},
  fight: {name: 'Драка у бара', icon: '✶', sev: 2, wait: 18, work: 14, rank: 0, needs: 2, d: 0.2, n: 1.7, suspect: true, roles: ['patrol'],
    brief: 'Несколько человек дерутся у входа. Есть риск травм.',
    approaches: [{label: 'Разнять и задержать зачинщиков', trait: 'force', p: 0.7, arrest: true}, {label: 'Уговорить разойтись', trait: 'talk', p: 0.62}]},
  missing: {name: 'Пропал человек', icon: '?', sev: 2, wait: 45, work: 30, rank: 0, d: 1, n: 0.8, roles: ['patrol', 'detective'],
    brief: 'Пожилой мужчина ушёл из дома утром и не вернулся. Родные волнуются.',
    approaches: [{label: 'Прочесать район', trait: 'invest', p: 0.74}, {label: 'Опросить близких и соседей', trait: 'talk', p: 0.7, time: 0.8}]},
  drugs: {name: 'Торговля наркотиками', icon: '⁂', sev: 2, wait: 20, work: 10, rank: 1, d: 0.4, n: 1.3, hidden: 0.9, vanish: true, suspect: true, roles: ['detective', 'patrol'],
    brief: 'У подъезда идёт торговля: двое, рюкзак, постоянный поток «клиентов».',
    approaches: [{label: 'Задержать с поличным', trait: 'force', p: 0.68, arrest: true, flee: true}, {label: 'Проследить до поставщика', trait: 'invest', p: 0.6, time: 1.5, lead: true, hint: 'открывает дело'}]},
  dui: {name: 'Пьяный водитель', icon: '≋', sev: 2, wait: 16, work: 9, rank: 1, d: 0.3, n: 1.5, hidden: 0.5, suspect: true, roles: ['traffic'],
    brief: 'Автомобиль виляет по полосам и едва не сбил пешехода.',
    approaches: [{label: 'Остановить сигналами', trait: 'drive', p: 0.66, arrest: true, flee: true}, {label: 'Перекрыть дорогу', trait: 'force', p: 0.72, arrest: true, flee: true}]},
  assault: {name: 'Нападение на прохожего', icon: '✊', sev: 2, wait: 16, work: 14, rank: 1, d: 0.5, n: 1.3, suspect: true, roles: ['patrol', 'detective'],
    brief: 'Мужчину избили и отобрали телефон. Нападавший ещё рядом.',
    approaches: [{label: 'Догнать нападавшего', trait: 'drive', p: 0.66, arrest: true, flee: true}, {label: 'Опросить свидетелей', trait: 'invest', p: 0.72, time: 1.3, lead: true}]},
  injury: {name: 'ДТП с пострадавшими', icon: '✚', sev: 3, wait: 14, work: 22, rank: 1, needs: 2, d: 1.1, n: 0.9, rain: 1.6, roles: ['traffic', 'patrol'], fx: 'fire',
    brief: 'Серьёзное столкновение, есть раненые, машина дымится. Скорая в пути.',
    approaches: [{label: 'Первая помощь и оцепление', trait: 'force', p: 0.76, med: true}, {label: 'Регулировать движение', trait: 'drive', p: 0.8, time: 0.8}]},
  burglary: {name: 'Проникновение в дом', icon: '⚑', sev: 3, wait: 14, work: 18, rank: 1, needs: 2, d: 0.6, n: 1.4, hidden: 0.3, suspect: true, roles: ['patrol'],
    brief: 'Хозяева видят по камере чужих людей в доме. Они ещё внутри.',
    approaches: [{label: 'Окружить и войти', trait: 'force', p: 0.7, arrest: true, flee: true, breach: true}, {label: 'Идти по следам', trait: 'invest', p: 0.64, arrest: true}]},
  carjack: {name: 'Угон автомобиля', icon: '➤', sev: 3, wait: 16, work: 0, rank: 1, pursuit: true, d: 0.8, n: 1.1, roles: ['traffic', 'heli'],
    brief: 'Автомобиль угнан минуту назад. Угонщик уходит по городу — нужна погоня.', approaches: []},
  race: {name: 'Уличные гонки', icon: '⚐', sev: 2, wait: 10, work: 0, rank: 2, pursuit: true, d: 0.1, n: 1.2, hidden: 0.6, vanish: true, roles: ['traffic', 'heli'],
    brief: 'Две машины гоняют по проспекту. Одна уже уходит от патруля.', approaches: []},
  homicide: {name: 'Убийство', icon: '✝', sev: 3, wait: 30, work: 20, rank: 2, d: 0.25, n: 0.45, roles: ['detective'], opensCase: true,
    brief: 'Найдено тело. Нужно оцепить место, собрать улики и начать расследование.',
    approaches: [{label: 'Осмотр места и сбор улик', trait: 'invest', p: 0.85}, {label: 'Поквартирный обход', trait: 'talk', p: 0.78, time: 1.2}]},
  shooting: {name: 'Стрельба на улице', icon: '✸', sev: 3, wait: 10, work: 16, rank: 2, needs: 2, d: 0.2, n: 0.7, suspect: true, armed: true, roles: ['swat', 'patrol'], fx: 'spark',
    brief: 'Слышны выстрелы, люди разбегаются. Стрелок вооружён.',
    approaches: [{label: 'Нейтрализовать стрелка', trait: 'force', p: 0.62, arrest: true, flee: true}, {label: 'Оцепить и вести переговоры', trait: 'talk', p: 0.55, time: 1.4, arrest: true}]},
  robbery: {name: 'Вооружённое ограбление', icon: '☠', sev: 3, wait: 11, work: 20, rank: 2, needs: 2, d: 0.7, n: 1.1, suspect: true, armed: true, roles: ['swat', 'patrol'],
    brief: 'В магазине человек с оружием требует деньги. Внутри заложники.',
    approaches: [{label: 'Штурм', trait: 'force', p: 0.6, arrest: true, flee: true, breach: true}, {label: 'Переговоры', trait: 'talk', p: 0.62, arrest: true, time: 1.5, flee: true}]},
  hostage: {name: 'Захват заложников', icon: '⛓', sev: 3, wait: 22, work: 30, rank: 3, needs: 2, d: 0.15, n: 0.25, suspect: true, armed: true, roles: ['swat'],
    brief: 'Вооружённый человек забаррикадировался в квартире с семьёй. Требует машину.',
    approaches: [{label: 'Штурм спецназа', trait: 'force', p: 0.6, arrest: true, breach: true}, {label: 'Долгие переговоры', trait: 'talk', p: 0.66, time: 1.8, arrest: true}]},
  gang: {name: 'Разборка банд', icon: '⚔', sev: 3, wait: 12, work: 20, rank: 3, needs: 3, d: 0.15, n: 0.5, suspect: true, armed: true, roles: ['swat'], fx: 'spark',
    brief: 'Две группировки сошлись во дворе, у некоторых оружие.',
    approaches: [{label: 'Жёстко разогнать и задержать', trait: 'force', p: 0.6, arrest: true}, {label: 'Изолировать лидеров', trait: 'invest', p: 0.55, time: 1.3, lead: true}]},
  riot: {name: 'Массовые беспорядки', icon: '⚠', sev: 3, wait: 14, work: 24, rank: 4, needs: 3, d: 0.25, n: 0.6, roles: ['swat', 'patrol'], fx: 'fire',
    brief: 'После матча у стадиона толпа громит витрины. Одному экипажу не справиться — нужны минимум три.',
    approaches: [{label: 'Оцепить и рассеять толпу', trait: 'force', p: 0.66, arrest: true}, {label: 'Вычислить зачинщиков и вести переговоры', trait: 'talk', p: 0.6, time: 1.3}]},
};
// Расследования: зацепки и задержание появляются только по ходу дела.
CALLS.lead = {name: 'Проверка зацепки', icon: '⌕', sev: 1, wait: 120, work: 12, rank: 99, d: 0, n: 0, special: true, roles: ['detective'],
  brief: 'По делу появилась зацепка: адрес, где видели подозреваемого. Нужно опросить людей и собрать улики.',
  approaches: [{label: 'Собрать улики', trait: 'invest', p: 0.78, evidence: true}, {label: 'Опросить свидетелей', trait: 'talk', p: 0.74, evidence: true}]};
CALLS.raid = {name: 'Задержание по делу', icon: '⛨', sev: 3, wait: 60, work: 16, rank: 99, d: 0, n: 0, special: true, needs: 2, suspect: true, roles: ['swat', 'detective'],
  brief: 'Улик достаточно. Подозреваемый находится по этому адресу — пора брать.',
  approaches: [{label: 'Войти и задержать', trait: 'force', p: 0.7, arrest: true, flee: true, breach: true}, {label: 'Выманить и взять на выходе', trait: 'talk', p: 0.66, arrest: true, flee: true, time: 1.4}]};
export const CASE_TYPES = new Set(['shoplift', 'suspicious', 'burglary', 'carjack', 'robbery', 'dui', 'assault', 'drugs', 'shooting', 'race']);

// Режимы игры и испытания.
export const DIFFICULTY = {easy: {name: 'Лёгкая', calls: 0.8, loss: 0.7}, normal: {name: 'Обычная', calls: 1, loss: 1}, hard: {name: 'Тяжёлая', calls: 1.25, loss: 1.3}};
export const CHALLENGES = {
  carwave: {name: 'Волна угонов', shifts: 2, rank: 4, money: 4000, units: ['sedan', 'sedan', 'interceptor', 'interceptor', 'unmarked'], weights: {carjack: 4, race: 3}, start: 20,
    goal: 'Задержите 8 беглецов в погонях за две смены и удержите доверие не ниже 40%.', check: s => s.challengeStats.pursuitArrests >= 8 && s.trust >= 40,
    progress: s => `Задержано в погонях: ${s.challengeStats.pursuitArrests} из 8`},
  budget: {name: 'Урезанный бюджет', shifts: 3, rank: 4, money: 600, grant: 0.5, units: ['sedan', 'sedan', 'sedan'],
    goal: 'Город урезал финансирование вдвое. Продержитесь три смены и закончите с доверием не ниже 50%.', check: s => s.trust >= 50,
    progress: s => `Доверие: ${Math.round(s.trust)}% (нужно 50%)`},
  riotnight: {name: 'Ночь беспорядков', shifts: 1, rank: 5, money: 5000, units: ['sedan', 'sedan', 'sedan', 'van', 'van', 'interceptor'], weights: {riot: 4, gang: 4, fight: 3, shooting: 2}, start: 21,
    goal: 'Город бурлит после финала кубка. Переживите ночь: доверие не ниже 45% и не больше трёх раненых сотрудников.', check: s => s.trust >= 45 && s.challengeStats.injuries <= 3,
    progress: s => `Раненых: ${s.challengeStats.injuries} из 3 допустимых`},
};

export const SEVERITY = ['', 'Обычный', 'Срочный', 'Критический'];
export const SURNAMES = ['Тамм', 'Сепп', 'Мяги', 'Кукк', 'Ребане', 'Ильвес', 'Каськ', 'Морозов', 'Волкова', 'Левин', 'Орлов', 'Белова', 'Соколов', 'Крылова', 'Ветров', 'Миронова', 'Пярн', 'Лепик', 'Рауд', 'Кууск', 'Иванова', 'Петров', 'Оя', 'Кивимяэ'];
export const INITIALS = ['А.', 'М.', 'И.', 'Е.', 'К.', 'Т.', 'О.', 'Н.', 'Р.', 'С.', 'Л.', 'Д.'];
export const TIPS = [
  'Критические вызовы ждут недолго. Если не успеваете сами — диспетчер отправит свободный экипаж.',
  'Отправляйте профильное подразделение: ДПС на дороги, детективов на убийства, спецназ на вооружённых.',
  'Спецназ на лающую собаку — перебор: жители запомнят.',
  'Часть преступлений никто не видит. Патрули, вертолёт, информаторы и агенты под прикрытием замечают их на месте.',
  'Уставший экипаж ошибается чаще. Возвращайтесь в участок до 80% усталости.',
  'Бронежилет снижает шанс ранения в перестрелке на 40%.',
  'Шипы ставятся на дороге впереди беглеца: клавиша K и клик по карте во время погони.',
  'Раскрытое дело резко снижает преступность в районе. Ранний арест быстрее, но можно задержать невиновного.',
];
export const PAPER = 'Пярнуский вестник';
