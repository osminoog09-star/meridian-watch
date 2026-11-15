// Mercury Response (ПК): главный цикл, управление мышью и клавиатурой, интерфейс, меню и сохранения.
import {CALLS, RANKS, VEHICLES, UPGRADES, TRAITS, SEVERITY, TIPS, PERKS, POLICIES} from './content.js';
import {METRES, STATION, DISTRICTS, districtNodes, callNodes, nearestNode, route, ATTRIBUTION} from './world.js';
import * as sim from './sim.js';
import {createRenderer} from './render.js';
import {createAudio} from './audio.js';

const $ = id => document.getElementById(id), SAVE_KEY = 'mercury-dispatch-pc-v2', RATE = 20; // 1 реальная секунда = 20 секунд города
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const STATUS = {patrol: 'Патруль', hold: 'Ждёт приказа', enroute: 'Едет на вызов', onscene: 'На месте', pursuit: 'Погоня', transport: 'Везёт задержанного', booking: 'Оформляет', returning: 'В участок', resting: 'Отдых'};
const STATUS_COLOR = {patrol: '#5fd3c4', hold: '#9fb3bf', enroute: '#ffb347', onscene: '#ffe08a', pursuit: '#ff4d5e', transport: '#c59bff', booking: '#c59bff', returning: '#8fa4b0', resting: '#6f8792'};
const SEV_COLOR = ['', '#ffd166', '#ff9f43', '#ff4d5e'];
const money = v => Math.round(v).toLocaleString('ru-RU') + ' €';
const minutes = seconds => Math.max(1, Math.round(seconds / 60)) + ' мин';

const audio = createAudio(), renderer = createRenderer($('map'), $('minimap'));
let state = null, demo = makeDemo(), speed = 1, paused = false, overlay = null, last = performance.now(), uiAt = 0, saveAt = 0, pointerDown = false;
const view = {unit: null, call: null, heat: false, traffic: createTraffic(90)};

// ---------- фоновое движение ----------
function createTraffic(count) {
  const colors = ['#9aa7ad', '#b9b2a2', '#7d8f9b', '#a38f86', '#8b9a8c', '#c2c7ca', '#6f7d88'];
  const cars = Array.from({length: count}, (_, k) => { const node = callNodes[Math.floor(Math.random() * callNodes.length)]; return {x: node.x, y: node.y, heading: 0, node, path: [], speed: 0, color: colors[k % colors.length]}; });
  cars.step = dt => { for (const c of cars) { if (!c.path.length) { for (let k = 0; k < 6 && !c.path.length; k++) { const n = callNodes[Math.floor(Math.random() * callNodes.length)]; if (Math.hypot(n.x - c.x, n.y - c.y) < 0.9) c.path = route(c.node, n); } continue; } sim.advance(c, dt, 0.92); } };
  return cars;
}
function makeDemo() { const d = sim.createGame(20261114); d.rank = 3; d.auto = true; d.t = 21.5 * 3600; d.shiftEnd = d.t + 1e9; d.tutorial = 2; return d; }

// ---------- сохранения ----------
function save() { if (!state) return; try { localStorage.setItem(SAVE_KEY, sim.serialize(state)); } catch {} }
function loadSaved() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? sim.deserialize(raw) : null; } catch { return null; } }
function startGame(saved = null, name = '') {
  state = saved ?? sim.createGame(undefined, name); speed = 1; paused = false; view.unit = sim.playerUnit(state)?.id ?? state.units[0]?.id ?? null; view.call = null;
  document.body.classList.remove('title'); closeOverlay(); renderer.focus(STATION, 1300); audio.unlock(); save(); refresh(true);
  if (state.phase === 'summary') showSummary(); else if (state.phase === 'over') showOver();
}

// ---------- всплывающие сообщения ----------
function toast(text, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = text; $('toasts').append(el); setTimeout(() => el.remove(), 3700); while ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
function result(r) { if (r && !r.ok && r.message) { toast(r.message, 'bad'); audio.bad(); } return r?.ok; }

// ---------- интерфейс ----------
const TRAIT_NAME = {...TRAITS, you: 'вы'};
const cacheHtml = new Map();
function setHtml(id, html) { if (cacheHtml.get(id) !== html) { cacheHtml.set(id, html); $(id).innerHTML = html; } }
const crimeColor = v => `hsl(${Math.round(130 - Math.min(100, v) * 1.3)} 70% 58%)`;
function refresh(force = false) {
  if (!state || (pointerDown && !force) || (!force && document.activeElement?.tagName === 'SELECT')) return;
  const s = state, rank = RANKS[s.rank], next = RANKS[s.rank + 1], manage = sim.canManage(s), crime = sim.cityCrime(s);
  $('clock').textContent = sim.clockText(s.t); $('shiftNo').textContent = s.shift;
  $('shiftBar').style.width = (100 - Math.max(0, s.shiftEnd - s.t) / sim.SHIFT_SECONDS * 100) + '%';
  $('trust').textContent = Math.round(s.trust) + '%'; $('trustBar').style.width = s.trust + '%';
  $('trust').style.color = s.trust < 25 ? 'var(--bad)' : s.trust < 45 ? 'var(--warn)' : '';
  $('crime').textContent = Math.round(crime) + '%'; $('crimeBar').style.width = crime + '%'; $('crimeBar').style.background = crimeColor(crime);
  $('moneyBox').hidden = !manage; $('money').textContent = money(s.money); $('income').textContent = s.stats.income ? '+' + s.stats.income : '';
  $('rankTitle').textContent = (rank.title + ' ' + s.player.name).toUpperCase();
  $('xpText').textContent = next ? `${s.xp} / ${next.xp}` : `${s.xp} · максимум`;
  $('xpBar').style.width = (next ? (s.xp - rank.xp) / (next.xp - rank.xp) * 100 : 100) + '%';
  $('pauseBtn').textContent = paused ? '▶' : '❚❚'; $('pauseBtn').classList.toggle('on', paused);
  document.querySelectorAll('.speed [data-v]').forEach(b => b.classList.toggle('on', !paused && +b.dataset.v === speed));
  $('autoBtn').hidden = s.rank < 3; $('autoBtn').textContent = 'Автодиспетчер: ' + (s.auto ? 'вкл' : 'выкл'); $('autoBtn').classList.toggle('on', s.auto);
  $('shopBtn').textContent = (manage ? 'Отделение' : 'Личное дело') + (s.player.points ? ' ●' : '');
  $('heatBtn').classList.toggle('on', view.heat);
  $('pausedBanner').hidden = !paused || !!overlay;

  $('unitCount').textContent = s.units.length + ' / ' + sim.unitCap(s);
  const zones = DISTRICTS.map((d, k) => districtNodes[k].length ? `<option value="${k}">${d.name}</option>` : '').join('');
  setHtml('units', s.units.map(u => {
    const v = VEHICLES[u.type], selected = u.id === view.unit, fat = Math.round(u.fatigue), mine = sim.canCommand(s, u);
    return `<div class="unit ${selected ? 'sel' : ''} ${u.player ? 'me' : ''} ${mine ? '' : 'ai'}" data-act="selUnit" data-id="${u.id}">
      <div class="row"><b>${esc(u.callsign)}${u.player ? ' <i class="you">ВЫ</i>' : ''}</b><span class="chip" style="--c:${STATUS_COLOR[u.status]}">${STATUS[u.status]}</span></div>
      <small>${v.short} · ${u.crew.map(o => esc(o.name) + (o.trait === 'you' ? '' : ' — ' + TRAIT_NAME[o.trait].toLowerCase())).join(', ')}</small>
      <div class="meters"><span>Усталость ${fat}%</span><div class="bar fat ${fat > 65 ? 'high' : ''}"><i style="width:${fat}%"></i></div><span>Навык ${Math.round(u.skill * 100)}%</span></div>
      ${!mine ? `<small class="lock">${u.zone >= 0 ? 'Район: ' + DISTRICTS[u.zone].name + ' · ' : ''}ведёт диспетчер</small>` : ''}
      ${selected && mine ? `<div class="acts"><button data-act="follow">${renderer.following() === u.id ? '● Слежу' : 'Следить'} <kbd>F</kbd></button><button data-act="patrol" ${['hold', 'returning', 'resting', 'enroute'].includes(u.status) ? '' : 'disabled'}>Патруль <kbd>P</kbd></button><button data-act="rest" ${['patrol', 'hold', 'enroute'].includes(u.status) ? '' : 'disabled'}>Отдых <kbd>R</kbd></button></div>` : ''}
      ${selected && sim.canZone(s, u) ? `<label class="zone">Район патруля<select data-zone="${u.id}"><option value="-1">Весь город</option>${zones.replace(`value="${u.zone}"`, `value="${u.zone}" selected`)}</select></label>` : ''}
    </div>`; }).join(''));

  const live = sim.liveCalls(s).sort((a, b) => CALLS[b.type].sev - CALLS[a.type].sev || a.deadline - b.deadline);
  if (view.call && !live.some(c => c.id === view.call)) view.call = null;
  if (!view.call && live.length) view.call = live[0].id;
  $('callCount').textContent = live.length;
  setHtml('calls', live.length ? live.map(c => {
    const t = CALLS[c.type], waiting = c.state === 'pending' || c.state === 'assigned', on = sim.unitsFor(s, c).length, decide = c.state === 'choice' && sim.playerDecides(s, c);
    const part = c.state === 'active' ? c.progress / Math.max(1, c.work) * 100 : Math.max(0, (c.deadline - s.t) / c.wait * 100);
    const text = c.suspectId ? `Погоня · осталось ${minutes(c.deadline - s.t)}` : c.state === 'pending' ? `Ждёт экипаж · ${minutes(c.deadline - s.t)}` : c.state === 'assigned' ? `Экипаж в пути · ${minutes(c.deadline - s.t)}` : decide ? 'Нужно ваше решение' : 'Экипаж работает';
    return `<div class="call ${c.id === view.call ? 'sel' : ''} ${decide ? 'choice' : ''}" style="--c:${c.state === 'active' ? '#6ee7d8' : SEV_COLOR[t.sev]}" data-act="selCall" data-id="${c.id}">
      <div class="ico">${t.icon}</div><div><div class="row"><b>${t.name}</b><span>${c.caseId ? '<span class="chip" style="--c:#c59bff">дело</span> ' : ''}${c.own ? '<span class="chip" style="--c:#ffd166">ваш</span> ' : ''}${on ? `<span class="chip" style="--c:#9fb3bf">${on} эк.</span>` : ''}</span></div><small>${esc(c.place)} · ${text}</small><div class="bar"><i style="width:${waiting || c.state === 'active' ? part : 100}%"></i></div></div></div>`; }).join('')
    : '<div class="empty">В городе спокойно.<br>Новые вызовы придут по рации.</div>');
  setHtml('callDetail', callDetail(live.find(c => c.id === view.call)));

  setHtml('radio', s.log.slice(0, 4).map(l => `<div class="k-${l.kind}"><time>${sim.clockText(l.t)}</time>${esc(l.text)}</div>`).join(''));
  const tip = coach(); $('coach').hidden = !tip || !!overlay; if (tip) setHtml('coach', tip);
}
function callDetail(c) {
  if (!c) return '';
  const s = state, t = CALLS[c.type], assigned = sim.unitsFor(s, c), on = sim.unitsOn(s, c), node = nearestNode(c.x, c.y), me = sim.playerUnit(s);
  let html = `<h3>${t.name}</h3><span class="tag" style="--c:${SEV_COLOR[t.sev]}">${SEVERITY[t.sev]}</span>${t.needs === 2 || c.suspectId ? '<span class="tag" style="--c:#9fb3bf">лучше 2 экипажа</span>' : ''}${c.caseId ? `<span class="tag" style="--c:#c59bff">дело №${c.caseId}</span>` : ''}<p>${t.brief}</p>`;
  if (assigned.length) html += `<p class="hint">Назначены: ${assigned.map(u => esc(u.callsign) + (u.player ? ' (вы)' : '') + ' — ' + STATUS[u.status].toLowerCase()).join(', ')}</p>`;
  if (c.state === 'choice') {
    html += sim.playerDecides(s, c) ? '<p><b>Вы на месте. Ваше решение:</b></p>' + t.approaches.map((a, k) => `<button data-act="approach" data-i="${k}"><span>${a.label} <span class="hint">· ${TRAITS[a.trait].toLowerCase()}${a.hint ? ' · ' + a.hint : ''}</span></span><em>${Math.round(sim.successChance(s, c, k, on) * 100)}%</em></button>`).join('') + '<p class="hint">Клавиши <kbd>Q</kbd> и <kbd>E</kbd>. Процент — шанс успеха с учётом навыков, специализации и усталости.</p>'
      : '<p class="hint">Экипаж на месте сам выбирает, как действовать.</p>';
  } else if (c.state === 'active') {
    html += `<p>Действие: <b>${t.approaches[c.approach].label}</b> · шанс ${Math.round(sim.successChance(s, c, c.approach, on) * 100)}% · готово на ${Math.round(c.progress / Math.max(1, c.work) * 100)}%</p>`;
  }
  if (c.state !== 'active' || c.suspectId) {
    const backup = sim.canBackup(s) && me?.callId === c.id, target = c.suspectId ? (s.suspects.find(x => x.id === c.suspectId)?.node ?? node) : node;
    const free = s.units.filter(u => u.callId !== c.id && (sim.isFree(u) || u.status === 'enroute') && (sim.canCommand(s, u) || backup)).map(u => ({u, eta: sim.eta(s, u, target)})).sort((a, b) => a.eta - b.eta);
    const own = free.find(x => x.u.player);
    if (s.rank < 3 && own) html += `<button class="primary" data-act="dispatchBest">Принять вызов своим экипажем · ${minutes(own.eta)} &nbsp;<kbd>G</kbd></button>`;
    else if (s.rank >= 3 && free.length) html += `<button class="primary" data-act="dispatchBest">Направить ближайший экипаж &nbsp;<kbd>G</kbd></button>`;
    html += free.filter(x => s.rank >= 3 || !x.u.player).map(({u, eta}) => `<button data-act="dispatchUnit" data-id="${u.id}"><span>${s.rank < 3 ? 'Подкрепление: ' : ''}${esc(u.callsign)} <span class="hint">· ${STATUS[u.status].toLowerCase()} · усталость ${Math.round(u.fatigue)}%</span></span><em>${minutes(eta)}</em></button>`).join('');
    if (s.rank < 3 && !assigned.length) html += `<p class="hint">Если вы не возьмёте вызов, диспетчер отправит на него другой экипаж — но опыта вы не получите.</p>`;
    if (s.rank < 2 && me?.callId === c.id && (t.needs === 2 || c.suspectId)) html += '<p class="hint">Вызывать подкрепление вы сможете со звания «Старший патрульный».</p>';
  }
  return html;
}
function coach() {
  const s = state;
  if (!s || s.shift > 1 || s.career.own >= 4 || s.phase !== 'shift') return '';
  const live = sim.liveCalls(s), me = sim.playerUnit(s);
  if (live.some(c => c.state === 'choice' && sim.playerDecides(s, c))) return 'Морозов: «Мы на месте. Решай, как действуем» — выберите вариант в карточке вызова справа. <b>Процент — шанс успеха.</b>';
  if (live.some(c => c.state === 'pending') && me && sim.isFree(me)) return 'Новый вызов! Нажмите <b>«Принять вызов своим экипажем»</b> (клавиша <kbd>G</kbd>) — или кликните <b>правой кнопкой</b> по значку вызова на карте.';
  if (!s.career.own && !live.length) return 'Вы — стажёр в <b>' + esc(me?.callsign ?? '') + '</b>, наставник Морозов рядом. Пока патрулируем. Карта: тяните мышью, колесо — масштаб.';
  if (s.career.own >= 1) return 'Так держать. Опыт идёт за вызовы вашего экипажа. <kbd>Пробел</kbd> — пауза, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> — скорость, <kbd>B</kbd> — личное дело.';
  return '';
}

// ---------- окна ----------
function openOverlay(name, html) { overlay = name; $('card').innerHTML = html; $('overlay').hidden = false; $('card').scrollTop = 0; audio.siren(false); if (state) save(); refresh(true); }
function closeOverlay() { overlay = null; $('overlay').hidden = true; last = performance.now(); if (state) refresh(true); }
const helpHtml = `<h3>Как играть</h3><p>Вы начинаете стажёром сразу после академии: один экипаж, наставник рядом. Берите вызовы, решайте, как действовать на месте, и набирайте опыт. Каждое звание открывает новые полномочия — от выбора района патруля до командования сменой и управления всем отделением.</p><p>Успехи повышают доверие города, провалы и пропущенные вызовы роняют его. Патрули снижают преступность в районах. Упадёт доверие до нуля — вас отстранят.</p>
<div class="keys"><kbd>ЛКМ</kbd><span>выбрать экипаж или вызов; тянуть — двигать карту</span><kbd>ПКМ</kbd><span>отправить выбранный экипаж на вызов или в точку карты</span><kbd>Колесо</kbd><span>масштаб</span><kbd>W A S D</kbd><span>двигать карту</span>
<kbd>Пробел</kbd><span>пауза</span><kbd>1 2 3</kbd><span>скорость ×1 ×2 ×4</span><kbd>G</kbd><span>принять выбранный вызов (с сержанта — направить ближайший экипаж)</span><kbd>Q E</kbd><span>выбрать действие на месте</span>
<kbd>Tab</kbd><span>следующий экипаж</span><kbd>C</kbd><span>следующий вызов</span><kbd>F</kbd><span>следить за экипажем</span><kbd>R / P</kbd><span>на отдых / в патруль</span><kbd>V</kbd><span>карта преступности по районам</span><kbd>B</kbd><span>личное дело / отделение</span><kbd>Home</kbd><span>весь город</span><kbd>M</kbd><span>звук</span></div>`;
function showTitle() {
  document.body.classList.add('title'); state = null; audio.siren(false);
  const saved = loadSaved();
  openOverlay('title', `<span class="eyebrow">ПОЛИЦЕЙСКАЯ КАРЬЕРА · ПК-ВЕРСИЯ 1.1</span><h1><b>MERCURY</b> RESPONSE</h1>
  <p>Вчера — академия. Сегодня — первая смена в патруле. Дослужитесь от стажёра до комиссара.</p>
  <div class="menu">${saved ? `<button class="primary" data-act="continue">Продолжить · ${RANKS[saved.rank].title.toLowerCase()} ${esc(saved.player.name)}, смена ${saved.shift}</button>` : ''}
  <label class="name">Имя офицера<input id="playerName" maxlength="24" placeholder="Например: Денис" autocomplete="off"></label>
  <button class="${saved ? '' : 'primary'}" data-act="newGame">Новая карьера</button><button data-act="help">Как играть</button><button data-act="quit">Выйти</button></div>
  <p class="fine">Совет: ${TIPS[Math.floor(Math.random() * TIPS.length)]}</p><p class="fine">Карта: ${esc(ATTRIBUTION)} (ODbL). Происшествия и персонажи вымышлены.</p>`);
}
function showMenu() {
  openOverlay('menu', `<span class="eyebrow">ПАУЗА</span><h2>Меню</h2><div class="menu"><button class="primary" data-act="close">Вернуться в игру</button><button data-act="shop">${sim.canManage(state) ? 'Отделение' : 'Личное дело'}</button><button data-act="help">Как играть</button><button data-act="toTitle">Сохранить и выйти в главное меню</button></div>
  <h3>Громкость</h3><input type="range" id="volume" min="0" max="100" value="${Math.round(audio.volume * 100)}"><p class="fine">Игра сохраняется автоматически.</p>`);
  $('volume').oninput = e => { audio.setVolume(e.target.value / 100); audio.click(); };
}
function showHelp() { openOverlay('help', `<span class="eyebrow">ИНСТРУКТАЖ</span><h2>Добро пожаловать на службу</h2>${helpHtml}<h3>Советы</h3>${TIPS.map(t => `<p>• ${t}</p>`).join('')}<div class="menu"><button class="primary" data-act="${state ? 'close' : 'title'}">Понятно</button></div>`); }
function profileHtml() {
  const s = state, c = s.career, next = RANKS[s.rank + 1];
  return `<h3>Карьера</h3><div class="ladder">${RANKS.map((r, k) => `<div class="${k === s.rank ? 'now' : k < s.rank ? 'done' : ''}"><b>${k < s.rank ? '✓' : k === s.rank ? '●' : '○'} ${r.title}</b><small>${r.perk}${k > s.rank ? ' · ' + r.xp + ' опыта' : ''}</small></div>`).join('')}</div>
  <p class="fine">${next ? `До звания «${next.title}» осталось ${next.xp - s.xp} опыта.` : 'Вы достигли высшего звания.'} ${s.rank < 3 ? 'Опыт идёт за вызовы, в которых участвовал ваш экипаж.' : 'Вы получаете опыт и за вызовы подчинённых экипажей.'}</p>
  <h3>Личные навыки · свободных очков: ${s.player.points}</h3><div class="grid">${Object.entries(PERKS).map(([key, p]) => `<div class="item"><b>${p.name} ${'●'.repeat(s.player.perks[key])}${'○'.repeat(3 - s.player.perks[key])}</b><small>${p.desc}</small><button data-act="perk" data-id="${key}" ${s.player.points < 1 || s.player.perks[key] >= 3 ? 'disabled' : ''}>${s.player.perks[key] >= 3 ? 'Максимум' : 'Улучшить · 1 очко'}</button></div>`).join('')}</div>
  <p class="fine">Очко навыка даётся за каждое новое звание и за смену с оценкой A или B, если ваш экипаж закрыл хотя бы 3 вызова.</p>
  <h3>Послужной список</h3><div class="statgrid"><div><strong>${c.shifts}</strong>смен</div><div><strong>${c.own}</strong>ваших вызовов</div><div><strong>${c.arrests}</strong>задержаний отдела</div><div><strong>${c.solved}</strong>дел раскрыто</div></div>
  ${s.cases.length ? `<h3>Дела</h3>${s.cases.slice().reverse().map(k => `<div class="fin"><span>№${k.id} · ${esc(k.title)} · ${DISTRICTS[k.district].name}</span><b>${k.state === 'solved' ? 'раскрыто' : k.state === 'cold' ? 'в архиве' : 'зацепки: ' + Math.min(2, k.stage) + ' из 2'}</b></div>`).join('')}` : ''}`;
}
function showShop() {
  const s = state; if (!s) return;
  const back = `<div class="menu"><button class="primary" data-act="${s.phase === 'summary' ? 'summary' : 'close'}">${s.phase === 'summary' ? 'Назад к итогам смены' : 'Вернуться в город'}</button></div>`;
  if (!sim.canManage(s)) { openOverlay('shop', `<span class="eyebrow">ЛИЧНОЕ ДЕЛО</span><h2>${RANKS[s.rank].title} ${esc(s.player.name)}</h2><p>${RANKS[s.rank].perk}</p>${profileHtml()}${back}`); return; }
  const cap = s.units.length >= sim.unitCap(s);
  openOverlay('shop', `<span class="eyebrow">ОТДЕЛЕНИЕ</span><h2>${RANKS[s.rank].title} ${esc(s.player.name)}</h2><p>Бюджет: <b>${money(s.money)}</b> · экипажей ${s.units.length} из ${sim.unitCap(s)} (лимит растёт со званием) · за смену каждый экипаж стоит 280 €.</p>
  <h3>Новый экипаж</h3><div class="grid">${Object.entries(VEHICLES).map(([key, v]) => { const locked = s.rank < v.rank; return `<div class="item ${locked ? 'locked' : ''}"><b>${v.name}</b><small>${v.desc}</small><button data-act="buyUnit" data-id="${key}" ${locked || cap || s.money < v.cost ? 'disabled' : ''}>${locked ? 'Нужно звание: ' + RANKS[v.rank].title : cap ? 'Лимит экипажей' : 'Купить · ' + money(v.cost)}</button></div>`; }).join('')}</div>
  <h3>Улучшения</h3><div class="grid">${UPGRADES.map(u => { const owned = s.upgrades[u.id], locked = s.rank < u.rank; return `<div class="item ${owned ? 'owned' : locked ? 'locked' : ''}"><b>${u.name}</b><small>${u.desc}</small><button data-act="buyUpgrade" data-id="${u.id}" ${owned || locked || s.money < u.cost ? 'disabled' : ''}>${owned ? '✓ Установлено' : locked ? 'Нужно звание: ' + RANKS[u.rank].title : 'Купить · ' + money(u.cost)}</button></div>`; }).join('')}</div>
  <h3>Политика отделения${sim.canPolicy(s) ? '' : ' · со звания «Капитан»'}</h3><div class="grid">${POLICIES.map(p => `<div class="item ${s.policies[p.id] ? 'owned' : sim.canPolicy(s) ? '' : 'locked'}"><b>${p.name}</b><small>${p.desc}</small><button data-act="policy" data-id="${p.id}" ${sim.canPolicy(s) ? '' : 'disabled'}>${s.policies[p.id] ? '✓ Действует — отменить' : 'Ввести'}</button></div>`).join('')}</div>
  <h3>Обучение экипажей</h3><div class="grid">${s.units.map(u => `<div class="item"><b>${esc(u.callsign)}${u.player ? ' (вы)' : ''}</b><small>${VEHICLES[u.type].short} · навык ${Math.round(u.skill * 100)}% · вызовов: ${u.handled}</small><button data-act="train" data-id="${u.id}" ${u.skill >= 0.95 || s.money < sim.trainCost(u) ? 'disabled' : ''}>${u.skill >= 0.95 ? 'Максимум' : 'Курс +6% · ' + money(sim.trainCost(u))}</button></div>`).join('')}</div>
  ${profileHtml()}${back}`);
}
function showSummary() {
  const s = state, x = s.summary, g = x.grade, manage = sim.canManage(s);
  openOverlay('summary', `<span class="eyebrow">СМЕНА ${x.shift} ОКОНЧЕНА</span><div class="grade ${g.grade}"><b>${g.grade}</b><div><h2>${g.title}</h2><p>${RANKS[s.rank].title} ${esc(s.player.name)} · доверие города ${Math.round(s.trust)}%</p></div></div>
  <div class="statgrid"><div><strong>${x.stats.own}</strong>ваших вызовов</div><div><strong>+${x.stats.xp}</strong>опыта</div><div><strong>${x.stats.resolved}</strong>решено отделом</div><div><strong>${x.stats.failed + x.stats.missed}</strong>неудач и пропусков</div><div><strong>${x.stats.arrests}</strong>задержаний</div><div><strong>${x.stats.solved}</strong>дел раскрыто</div><div><strong>${x.response ? minutes(x.response) : '—'}</strong>среднее прибытие</div><div><strong>${Math.round(x.crime)}%</strong>преступность</div></div>
  <p>${x.mood > 0 ? `Город чувствует себя безопаснее: доверие +${x.mood}.` : x.mood < 0 ? `Преступность высока, жители недовольны: доверие ${x.mood}.` : 'Обстановка в городе без перемен.'}${x.point ? ' <b>Вы получили очко навыка.</b>' : ''}${s.player.points ? ` Свободных очков: ${s.player.points} — потратьте их в личном деле.` : ''}</p>
  ${manage ? `<div class="fin"><span>Бюджет на конец смены</span><b>${money(x.before)}</b></div><div class="fin"><span>Финансирование города (зависит от доверия)</span><b>+${money(x.grant)}</b></div>${x.bonus ? `<div class="fin"><span>Премия за оценку ${g.grade}</span><b>+${money(x.bonus)}</b></div>` : ''}
  <div class="fin"><span>Зарплаты экипажей</span><b>−${money(x.salaries)}</b></div><div class="fin"><span>Обслуживание машин</span><b>−${money(x.upkeep)}</b></div><div class="fin"><span><b>Итого в бюджете</b></span><b>${money(x.after)}</b></div>` : ''}
  <div class="menu"><button class="primary" data-act="nextShift">Начать смену ${x.shift + 1}</button><button data-act="shop">${manage ? 'Отделение: экипажи, улучшения, навыки' : 'Личное дело: навыки и карьера'}</button></div>`);
}
function showOver() {
  const c = state.career;
  openOverlay('over', `<span class="eyebrow">ОТСТРАНЕНИЕ</span><h2>Город потерял доверие к полиции</h2><p>Слишком много вызовов осталось без помощи. ${RANKS[state.rank].title} ${esc(state.player.name)} отстранён от службы.</p>
  <div class="statgrid"><div><strong>${c.shifts}</strong>смен отработано</div><div><strong>${c.own}</strong>ваших вызовов</div><div><strong>${c.arrests}</strong>задержаний</div><div><strong>${c.solved}</strong>дел раскрыто</div></div>
  <div class="menu"><button class="primary" data-act="toTitle">Главное меню</button></div>`);
}

// ---------- действия ----------
const selectedUnit = () => state?.units.find(u => u.id === view.unit) ?? null;
const selectedCall = () => state?.calls.find(c => c.id === view.call && c.state !== 'done') ?? null;
function dispatchBest() { const c = selectedCall(); if (!c) return; const u = sim.bestUnitFor(state, c, x => sim.canCommand(state, x)); if (!u) { toast(state.rank < 3 ? 'Ваш экипаж сейчас занят' : 'Нет свободных экипажей', 'bad'); audio.bad(); return; } if (result(sim.dispatch(state, u.id, c.id))) view.unit = u.id; refresh(true); }
function setSpeed(v) { speed = v; paused = false; refresh(true); }
function cycle(list, current, dir = 1) { if (!list.length) return null; const k = list.findIndex(x => x.id === current); return list[(k + dir + list.length) % list.length].id; }
const actions = {
  pause() { paused = !paused; refresh(true); }, speed(d) { setSpeed(+d.v); },
  auto() { state.auto = !state.auto; toast(state.auto ? 'Автодиспетчер включён: экипажи назначаются сами' : 'Автодиспетчер выключен: решения за вами'); refresh(true); },
  shop: showShop, menu: showMenu, help: showHelp, close: closeOverlay, title: showTitle, summary: showSummary,
  toTitle() { save(); showTitle(); }, quit() { window.close(); },
  continue() { const saved = loadSaved(); if (saved) startGame(saved); else showTitle(); },
  newGame() { startGame(null, $('playerName')?.value ?? ''); },
  perk(d) { if (result(sim.spendPoint(state, d.id))) { audio.good(); showShop(); } },
  policy(d) { if (result(sim.setPolicy(state, d.id, !state.policies[d.id]))) showShop(); },
  heat() { view.heat = !view.heat; refresh(true); },
  nextShift() { sim.startNextShift(state); closeOverlay(); renderer.focus(STATION, 1300); save(); },
  selUnit(d) { const id = +d.id; if (view.unit === id) renderer.focus(selectedUnit()); view.unit = id; refresh(true); },
  selCall(d) { const id = +d.id; const c = state.calls.find(c => c.id === id); if (view.call === id && c) { const sus = state.suspects.find(x => x.id === c.suspectId); renderer.focus(sus ?? c); } view.call = id; refresh(true); },
  follow() { const u = selectedUnit(); if (u) renderer.follow(renderer.following() === u.id ? null : u.id); refresh(true); },
  patrol() { const u = selectedUnit(); if (u) sim.setPatrol(state, u.id); refresh(true); },
  rest() { const u = selectedUnit(); if (u) result(sim.sendRest(state, u.id)); refresh(true); },
  dispatchBest, dispatchUnit(d) { const c = selectedCall(); if (c && result(sim.dispatch(state, +d.id, c.id))) view.unit = +d.id; refresh(true); },
  approach(d) { const c = selectedCall(); if (c && c.state === 'choice') result(sim.chooseApproach(state, c.id, +d.i)); refresh(true); },
  buyUnit(d) { if (result(sim.buyUnit(state, d.id))) { audio.good(); showShop(); } }, buyUpgrade(d) { if (result(sim.buyUpgrade(state, d.id))) { audio.good(); showShop(); } },
  train(d) { if (result(sim.trainUnit(state, +d.id))) { audio.good(); showShop(); } },
};
document.addEventListener('click', e => { if (e.target.closest('.zone, input')) return; const el = e.target.closest('[data-act]'); if (!el) return; audio.unlock(); audio.click(); actions[el.dataset.act]?.(el.dataset); });
document.addEventListener('change', e => { const id = e.target.dataset?.zone; if (id && state) { result(sim.setZone(state, +id, +e.target.value)); e.target.blur(); refresh(true); } });
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; }, true);

// ---------- мышь на карте ----------
const map = $('map'); let drag = null;
map.addEventListener('contextmenu', e => e.preventDefault());
map.addEventListener('pointerdown', e => { map.setPointerCapture(e.pointerId); drag = {x: e.clientX, y: e.clientY, moved: false, button: e.button}; });
map.addEventListener('pointermove', e => {
  if (drag && drag.button === 0) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (drag.moved || Math.hypot(dx, dy) > 4) { drag.moved = true; renderer.pan(dx, dy); drag.x = e.clientX; drag.y = e.clientY; map.classList.add('drag'); } }
  else if (!drag) map.classList.toggle('pick', !!state && !!renderer.pick(e.clientX, e.clientY));
});
map.addEventListener('pointerup', e => {
  const d = drag; drag = null; map.classList.remove('drag');
  if (!d || d.moved || !state || overlay) return;
  const hit = renderer.pick(e.clientX, e.clientY);
  if (d.button === 0) { if (hit?.kind === 'unit') { view.unit = hit.id; audio.click(); } else if (hit?.kind === 'call') { view.call = hit.id; audio.click(); } refresh(true); }
  else if (d.button === 2) {
    const u = selectedUnit(); if (!u) { toast('Сначала выберите экипаж'); return; }
    if (hit?.kind === 'call') { if (result(sim.dispatch(state, u.id, hit.id))) view.call = hit.id; }
    else { const p = renderer.worldAt(e.clientX, e.clientY), node = nearestNode(p.x, p.y); if (result(sim.moveUnit(state, u.id, node))) { renderer.popup(node.x, node.y, u.callsign + ' → сюда', true); audio.ack(); } }
    refresh(true);
  }
});
map.addEventListener('dblclick', e => { const hit = state && renderer.pick(e.clientX, e.clientY); if (hit?.kind === 'unit') { renderer.follow(hit.id); refresh(true); } });
map.addEventListener('wheel', e => { e.preventDefault(); renderer.zoom(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, {passive: false});
const mini = $('minimap'); let miniDrag = false;
const miniJump = e => { const r = mini.getBoundingClientRect(); renderer.minimapJump(e.clientX - r.left, e.clientY - r.top); };
mini.addEventListener('pointerdown', e => { miniDrag = true; mini.setPointerCapture(e.pointerId); miniJump(e); });
mini.addEventListener('pointermove', e => { if (miniDrag) miniJump(e); });
mini.addEventListener('pointerup', () => { miniDrag = false; });

// ---------- клавиатура ----------
const held = new Set(), PAN = {KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [1, 0], ArrowLeft: [1, 0], KeyD: [-1, 0], ArrowRight: [-1, 0]};
const keys = {
  Space: () => actions.pause(), Digit1: () => setSpeed(1), Digit2: () => setSpeed(2), Digit3: () => setSpeed(4), Numpad1: () => setSpeed(1), Numpad2: () => setSpeed(2), Numpad3: () => setSpeed(4),
  KeyG: dispatchBest, KeyF: () => actions.follow(), KeyR: () => actions.rest(), KeyP: () => actions.patrol(), KeyB: showShop, KeyH: showHelp,
  KeyQ: () => actions.approach({i: 0}), KeyE: () => actions.approach({i: 1}),
  Tab: e => { view.unit = cycle(state.units, view.unit, e.shiftKey ? -1 : 1); const u = selectedUnit(); if (u) renderer.focus(u); refresh(true); },
  KeyC: () => { const live = sim.liveCalls(state); view.call = cycle(live, view.call); const c = selectedCall(); if (c) renderer.focus(state.suspects.find(x => x.id === c.suspectId) ?? c); refresh(true); },
  Home: () => renderer.overview(), KeyV: () => actions.heat(), KeyM: () => toast(audio.toggleMute() ? 'Звук выключен' : 'Звук включён'),
  Equal: () => renderer.zoom(1.35), NumpadAdd: () => renderer.zoom(1.35), Minus: () => renderer.zoom(1 / 1.35), NumpadSubtract: () => renderer.zoom(1 / 1.35),
};
document.addEventListener('keyup', e => held.delete(e.code)); window.addEventListener('blur', () => held.clear());
document.addEventListener('keydown', e => {
  audio.unlock();
  if (e.code === 'Escape') { e.preventDefault(); if (overlay === 'title' || overlay === 'over') return; if (overlay === 'summary') return; if (overlay) { if (state?.phase === 'summary') showSummary(); else if (state) closeOverlay(); else showTitle(); } else if (state) showMenu(); return; }
  if (overlay || !state || e.ctrlKey || e.altKey || e.metaKey || ['INPUT', 'SELECT'].includes(e.target.tagName)) return;
  if (PAN[e.code]) { held.add(e.code); e.preventDefault(); return; }
  const action = keys[e.code]; if (!action) return;
  e.preventDefault(); if (e.repeat && !['Equal', 'Minus'].includes(e.code)) return;
  document.activeElement?.blur?.(); action(e);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); audio.siren(false); } last = performance.now(); });
window.addEventListener('beforeunload', save);

// ---------- события симуляции ----------
function handleEvents(s) {
  for (const e of s.events.splice(0)) {
    if (s !== state) continue;
    if (e.type === 'call') { audio.call(e.sev); if (!view.call) view.call = e.id; }
    else if (e.type === 'dispatch') audio.ack();
    else if (e.type === 'arrived') { const c = s.calls.find(c => c.id === e.id); if (c && sim.playerDecides(s, c)) { audio.click(); view.call = e.id; toast('Экипаж на месте — выберите действие', ''); } }
    else if (e.type === 'resolved') { if (e.own || s.rank >= 3) audio.good(); renderer.popup(e.x, e.y, e.text, true); }
    else if (e.type === 'failed') { if (e.own || s.rank >= 3) audio.bad(); renderer.popup(e.x, e.y, e.text, false); }
    else if (e.type === 'case') toast('Открыто новое дело — ждите зацепок', '');
    else if (e.type === 'solved') { audio.rank(); toast('Дело раскрыто!', 'good'); }
    else if (e.type === 'pursuit') { audio.alert(); view.call = e.id; toast('Подозреваемый уходит! Погоня', 'bad'); }
    else if (e.type === 'rank') { audio.rank(); toast('Повышение: ' + RANKS[s.rank].title + '! Откройте личное дело (B)', 'good'); }
    else if (e.type === 'shiftEnd') { audio.rank(); save(); showSummary(); }
    else if (e.type === 'over') { audio.bad(); save(); showOver(); }
  }
}

// ---------- главный цикл ----------
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  if (!document.hidden) {
    const world = state ?? demo, running = state ? state.phase === 'shift' && !paused && !overlay : true, dt = real * RATE * (state ? speed : 1);
    if (running) { sim.tick(world, dt); view.traffic.step(dt); }
    handleEvents(world);
    if (!state) { const t = now / 1000; renderer.focus({x: STATION.x + Math.cos(t / 23) * 0.5, y: STATION.y + Math.sin(t / 31) * 0.35}); }
    else if (held.size && !overlay) { let dx = 0, dy = 0; for (const k of held) { dx += PAN[k][0]; dy += PAN[k][1]; } renderer.pan(dx * 1000 * real, dy * 1000 * real); }
    renderer.draw(world, state ? view : {unit: null, call: null, traffic: view.traffic}, real);
    if (state) {
      const u = selectedUnit(); audio.siren(running && (state.suspects.length > 0 || (u && u.status === 'enroute' && renderer.following() === u.id)));
      if (now - uiAt > 200) { uiAt = now; refresh(); }
      if (now - saveAt > 20000) { saveAt = now; if (state.phase === 'shift') save(); }
    }
  }
  requestAnimationFrame(frame);
}
renderer.focus(STATION, 1500);
showTitle();
requestAnimationFrame(frame);
window.__game = {get state() { return state; }, sim, renderer, METRES};
