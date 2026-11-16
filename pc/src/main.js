// Mercury Response 2.0 (ПК): главный цикл, управление мышью и клавиатурой, интерфейс, режимы, отделение, газета, сохранения.
import {CALLS, RANKS, VEHICLES, ROLES, GEAR, POLICY, UPGRADES, TRAITS, SEVERITY, TIPS, PERKS, CHALLENGES, DIFFICULTY} from './content.js';
import {METRES, STATION, DISTRICTS, districtNodes, callNodes, nearestNode, route, ATTRIBUTION} from './world.js';
import * as sim from './sim.js';
import {createRenderer} from './render3d.js';
import {createAudio} from './audio.js';

const $ = id => document.getElementById(id), SAVE_KEY = 'mercury-dispatch-pc-v3', RATE = 20; // 1 реальная секунда = 20 секунд города
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const STATUS = {patrol: 'Патруль', hold: 'Ждёт приказа', enroute: 'Едет на вызов', onscene: 'На месте', pursuit: 'Погоня', transport: 'Везёт задержанного', booking: 'Оформляет', returning: 'В участок', resting: 'Отдых', injured: 'Ранен'};
const STATUS_COLOR = {patrol: '#5fd3c4', hold: '#9fb3bf', enroute: '#ffb347', onscene: '#ffe08a', pursuit: '#ff4d5e', transport: '#c59bff', booking: '#c59bff', returning: '#8fa4b0', resting: '#6f8792', injured: '#ff8a94'};
const SEV_COLOR = ['', '#ffd166', '#ff9f43', '#ff4d5e'];
const WEATHER = {clear: ['☀', 'Ясно'], cloudy: ['☁', 'Облачно'], rain: ['☂', 'Дождь']};
const REACTION = {surrender: ['сдался', '#6ee7b0'], fight: ['сопротивление', '#ff4d5e'], flee: ['сбежал', '#ff9f43'], calm: ['спокойно', '#9fb3bf']};
const GEAR_ICON = {weapon: {pistol: '', taser: 'ϟ', shotgun: '▮', rifle: '▮▮'}, armor: {none: '', vest: '◈', heavy: '◆'}, kit: {none: '', radar: '◉', medkit: '✚', forensics: '⌕', ram: '▣'}};
const money = v => Math.round(v).toLocaleString('ru-RU') + ' €';
const minutes = seconds => Math.max(1, Math.round(seconds / 60)) + ' мин';
const roleChip = u => { const r = ROLES[VEHICLES[u.type].role]; return `<span class="role" style="--c:${r.color}">${r.name}</span>`; };

const audio = createAudio(), renderer = createRenderer($('map'), $('minimap'));
let state = null, demo = makeDemo(), speed = 1, paused = false, overlay = null, last = performance.now(), uiAt = 0, saveAt = 0, hintAt = 0, pointerDown = false;
const view = {unit: null, call: null, heat: false, spike: false, tab: 'units', setup: {difficulty: 'normal', crime: 1, money: 6000, waves: true}, traffic: createTraffic(140), decides: c => !!state && sim.playerDecides(state, c)};

// ---------- фоновое движение ----------
function createTraffic(count) {
  const colors = ['#9aa7ad', '#b9b2a2', '#7d8f9b', '#a38f86', '#8b9a8c', '#c2c7ca', '#6f7d88'];
  const cars = Array.from({length: count}, (_, k) => { const node = callNodes[Math.floor(Math.random() * callNodes.length)]; return {x: node.x, y: node.y, heading: 0, node, path: [], speed: 0, color: colors[k % colors.length]}; });
  cars.step = dt => { for (const c of cars) { if (!c.path.length) { for (let k = 0; k < 6 && !c.path.length; k++) { const n = callNodes[Math.floor(Math.random() * callNodes.length)]; if (Math.hypot(n.x - c.x, n.y - c.y) < 0.9) c.path = route(c.node, n); } continue; } sim.advance(c, dt, 0.92); } };
  return cars;
}
function makeDemo() { const d = sim.createGame(20261114, 'Демо', {mode: 'sandbox'}); d.auto = true; d.t = 21.5 * 3600; d.shiftEnd = d.t + 1e9; return d; }

// ---------- сохранения ----------
let saveWarned = false;
function save() { if (!state) return; try { localStorage.setItem(SAVE_KEY, sim.serialize(state)); saveWarned = false; } catch { if (!saveWarned) { saveWarned = true; toast('Не удалось сохранить игру: нет доступа к хранилищу', 'bad'); } } }
function loadSaved() { try { const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem('mercury-dispatch-pc-v2'); return raw ? sim.deserialize(raw) : null; } catch { return null; } }
function startGame(saved = null, opts = {}) {
  state = saved ?? sim.createGame(undefined, opts.name ?? '', opts); view.rankSeen = state.rank; speed = 1; paused = false; view.unit = sim.playerUnit(state)?.id ?? state.units[0]?.id ?? null; view.call = null; view.spike = false;
  document.body.classList.remove('title'); closeOverlay(); renderer.focus(STATION, 1300); audio.unlock(); save(); refresh(true);
  if (state.phase === 'summary') showSummary(); else if (state.phase === 'over') showOver(); else if (state.phase === 'won') showWon();
}

// ---------- всплывающие сообщения ----------
function toast(text, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = text; $('toasts').append(el); setTimeout(() => el.remove(), 3700); while ($('toasts').children.length > 4) $('toasts').firstChild.remove(); }
function result(r) { if (r && !r.ok && r.message) { toast(r.message, 'bad'); audio.bad(); } return r?.ok; }

// ---------- интерфейс ----------
const TRAIT_NAME = {...TRAITS, you: 'вы'};
const cacheHtml = new Map();
function setHtml(id, html) { if (cacheHtml.get(id) !== html) { cacheHtml.set(id, html); $(id).innerHTML = html; } }
const crimeColor = v => `hsl(${Math.round(130 - Math.min(100, v) * 1.3)} 70% 58%)`;
const SKILL_SHORT = {talk: 'Пер', drive: 'Вжд', invest: 'Рсл', force: 'Сил', fitness: 'Физ'};
function officerMini(o) {
  const top = Object.entries(o.skills).sort((a, b) => b[1] - a[1])[0];
  return `<div class="om ${o.injured ? 'hurt' : ''}"><b>${esc(o.name)}</b><span>${o.player ? 'вы' : 'ур.' + o.level}${o.spec ? ' · ' + sim.SPECS[o.spec].toLowerCase() : ''} · ${sim.SKILLS[top[0]].toLowerCase()} ${top[1].toFixed(1)}</span>
    <div class="mm"><i title="Стресс" style="--w:${Math.round(o.stress)}%;--c:#ff8a5c"></i><i title="Мораль" style="--w:${Math.round(o.morale)}%;--c:#6ee7b0"></i></div></div>`;
}
function gearLine(u) { if (VEHICLES[u.type].role === 'heli') return ''; const g = u.gear; return [GEAR_ICON.weapon[g.weapon], GEAR_ICON.armor[g.armor], GEAR_ICON.kit[g.kit]].filter(Boolean).map(x => `<i class="gi">${x}</i>`).join(''); }
function refresh(force = false) {
  if (!state || (pointerDown && !force) || (!force && document.activeElement?.tagName === 'SELECT')) return;
  const s = state, rank = RANKS[s.rank], next = RANKS[s.rank + 1], manage = sim.canManage(s), crime = sim.cityCrime(s);
  $('clock').textContent = sim.clockText(s.t); $('shiftNo').textContent = s.shift;
  $('weather').textContent = WEATHER[s.weather][0]; $('weather').title = WEATHER[s.weather][1];
  $('shiftBar').style.width = (100 - Math.max(0, s.shiftEnd - s.t) / sim.SHIFT_SECONDS * 100) + '%';
  $('trust').textContent = Math.round(s.trust) + '%'; $('trustBar').style.width = s.trust + '%';
  $('trust').style.color = s.trust < 25 ? 'var(--bad)' : s.trust < 45 ? 'var(--warn)' : '';
  $('crime').textContent = Math.round(crime) + '%'; $('crimeBar').style.width = crime + '%'; $('crimeBar').style.background = crimeColor(crime);
  $('moneyBox').hidden = !manage; $('money').textContent = money(s.money); $('income').textContent = s.stats.income ? '+' + s.stats.income : '';
  $('rankTitle').textContent = (s.mode === 'career' ? rank.title + ' ' + s.player.name : s.challenge ? 'ИСПЫТАНИЕ · ' + CHALLENGES[s.challenge.id].name : 'ПЕСОЧНИЦА · ' + rank.title).toUpperCase();
  $('xpText').textContent = s.challenge ? CHALLENGES[s.challenge.id].progress(s) : next ? `${s.xp} / ${next.xp}` : `${s.xp} · максимум`;
  $('xpBar').style.width = (next ? (s.xp - rank.xp) / (next.xp - rank.xp) * 100 : 100) + '%';
  $('pauseBtn').textContent = paused ? '▶' : '❚❚'; $('pauseBtn').classList.toggle('on', paused);
  document.querySelectorAll('.speed [data-v]').forEach(b => b.classList.toggle('on', !paused && +b.dataset.v === speed));
  $('autoBtn').hidden = s.rank < 3; $('autoBtn').textContent = 'Авто ' + (s.auto ? 'вкл' : 'выкл'); $('autoBtn').classList.toggle('on', s.auto);
  $('shopBtn').textContent = (manage ? 'Отделение' : 'Личное дело') + (s.player.points ? ' ●' : '');
  $('heatBtn').classList.toggle('on', view.heat);
  $('spikeBtn').hidden = s.mode === 'career' && s.rank < 1; $('spikeBtn').textContent = `▲ Шипы ${s.spikesLeft}`; $('spikeBtn').classList.toggle('on', view.spike);
  $('wave').hidden = !s.wave; if (s.wave) $('wave').textContent = '⚠ Волна: ' + DISTRICTS[s.wave.district].name;
  $('crisis').hidden = !s.crisis; if (s.crisis) { const k = sim.CRISES[s.crisis.kind]; $('crisis').textContent = `☠ ${k.name}: ${s.crisis.progress}/${k.need} · ${DISTRICTS[s.crisis.district].name}`; $('crisis').title = `${k.goal}. Осталось смен: ${s.crisis.shiftsLeft}.`; }
  $('pausedBanner').hidden = !paused || !!overlay;
  document.body.classList.toggle('spike-mode', view.spike);

  $('unitCount').textContent = s.units.length + ' / ' + sim.unitCap(s);
  const zones = DISTRICTS.map((d, k) => districtNodes[k].length ? `<option value="${k}">${d.name}</option>` : '').join('');
  setHtml('units', s.units.map(u => {
    const selected = u.id === view.unit, fat = Math.round(u.fatigue), mine = sim.canCommand(s, u);
    return `<div class="unit ${selected ? 'sel' : ''} ${u.player ? 'me' : ''} ${mine ? '' : 'ai'} ${u.status === 'injured' ? 'hurt' : ''}" data-act="selUnit" data-id="${u.id}">
      <div class="row"><b>${esc(u.callsign)}${u.player ? ' <i class="you">ВЫ</i>' : ''}</b><span class="chip" style="--c:${STATUS_COLOR[u.status]}">${STATUS[u.status]}</span></div>
      <small>${roleChip(u)} ${gearLine(u)} ${u.crew.map(o => esc(o.name) + (o.player ? '' : ` <span class="lv">ур.${o.level}</span>`) + (o.injured ? ' ✚' : '')).join(', ')}</small>
      ${selected ? `<div class="crew">${u.crew.map(officerMini).join('')}</div>` : ''}
      <div class="meters"><span>Усталость ${fat}%</span><div class="bar fat ${fat > 65 ? 'high' : ''}"><i style="width:${fat}%"></i></div><span>Навык ${Math.round(u.skill * 100)}%</span></div>
      ${!mine ? `<small class="lock">${u.zone >= 0 ? 'Район: ' + DISTRICTS[u.zone].name + ' · ' : ''}ведёт диспетчер</small>` : ''}
      ${selected && mine ? `<div class="acts"><button data-act="follow">${renderer.following() === u.id ? '● Слежу' : 'Следить'} <kbd>F</kbd></button><button data-act="patrol" ${['hold', 'returning', 'resting', 'enroute'].includes(u.status) ? '' : 'disabled'}>Патруль <kbd>P</kbd></button><button data-act="rest" ${['patrol', 'hold', 'enroute'].includes(u.status) ? '' : 'disabled'}>Отдых <kbd>R</kbd></button></div>` : ''}
      ${selected && sim.canZone(s, u) ? `<label class="zone">Район патруля<select data-zone="${u.id}"><option value="-1">Весь город</option>${zones.replace(`value="${u.zone}"`, `value="${u.zone}" selected`)}</select></label>
        ${sim.roleOf(u) !== 'heli' ? `<div class="focus">${Object.entries(sim.PATROL_FOCUS).map(([k, f]) => `<button data-act="focus" data-id="${u.id}" data-f="${k}" class="${u.focus === k ? 'on' : ''}" title="${f.desc}">${f.name}</button>`).join('')}</div>` : ''}
        <div class="route">${u.waypoints.length ? `Маршрут: ${u.waypoints.length} точ. <button data-act="clearRoute">Сбросить</button>` : '<span>Свой маршрут: <kbd>Shift</kbd>+ПКМ по карте</span>'}</div>` : ''}
    </div>`; }).join(''));

  const live = sim.liveCalls(s).sort((a, b) => CALLS[b.type].sev - CALLS[a.type].sev || a.deadline - b.deadline);
  if (view.call && !live.some(c => c.id === view.call)) view.call = null;
  if (!view.call && live.length) view.call = live[0].id;
  $('callCount').textContent = live.length;
  setHtml('calls', live.length ? live.map(c => {
    const t = CALLS[c.type], waiting = c.state === 'pending' || c.state === 'assigned', on = sim.unitsFor(s, c).length, decide = (c.state === 'choice' || (c.state === 'standoff' && c.standoff.stability < 40)) && sim.playerDecides(s, c);
    const part = c.state === 'active' ? c.progress / Math.max(1, c.work) * 100 : Math.max(0, (c.deadline - s.t) / c.wait * 100);
    const text = c.state === 'standoff' ? `Переговоры · стабильность ${Math.round(c.standoff.stability)}%` : c.suspectId ? `Погоня · осталось ${minutes(c.deadline - s.t)}` : c.state === 'pending' ? `Ждёт экипаж · ${minutes(c.deadline - s.t)}` : c.state === 'assigned' ? `Экипаж в пути · ${minutes(c.deadline - s.t)}` : decide ? 'Нужно ваше решение' : 'Экипаж работает';
    const badges = (c.onView ? '<span class="chip" style="--c:#7fb8ff">замечено</span> ' : '') + (c.late ? '<span class="chip" style="--c:#8fa3af">поздний звонок</span> ' : '') + (c.caseId ? '<span class="chip" style="--c:#c59bff">дело</span> ' : '') + (c.own ? '<span class="chip" style="--c:#ffd166">ваш</span> ' : '') + (on ? `<span class="chip" style="--c:#9fb3bf">${on} эк.</span>` : '');
    return `<div class="call ${c.id === view.call ? 'sel' : ''} ${decide ? 'choice' : ''}" style="--c:${c.state === 'active' ? '#6ee7d8' : SEV_COLOR[t.sev]}" data-act="selCall" data-id="${c.id}">
      <div class="ico">${t.icon}</div><div><div class="row"><b>${t.name}</b><span>${badges}</span></div><small>${esc(c.place)} · ${text}</small><div class="bar"><i style="width:${waiting || c.state === 'active' ? part : 100}%"></i></div></div></div>`; }).join('')
    : '<div class="empty">В городе спокойно.<br>Новые вызовы придут по рации — а что-то патрули заметят сами.</div>');
  setHtml('callDetail', callDetail(live.find(c => c.id === view.call)));

  const open = s.cases.filter(k => k.state === 'open');
  $('casesBox').hidden = !open.length;
  setHtml('cases', open.map(k => {
    const risk = Math.round(Math.max(0, (100 - k.evidence) / 100 * 0.7) * 100), busy = s.calls.some(c => c.caseId === k.id && c.state !== 'done');
    return `<div class="case" data-act="focusCase" data-id="${k.id}"><div class="row"><b>№${k.id} · ${esc(k.title)}</b><small>${DISTRICTS[k.district].name}</small></div>
      <div class="meters"><span>Улики ${Math.round(k.evidence)}%</span><div class="bar ev"><i style="width:${k.evidence}%"></i></div><span>${busy ? 'выезд' : ''}</span></div>
      ${s.rank >= 2 && k.evidence >= 50 && k.evidence < 100 && !busy ? `<button data-act="warrant" data-id="${k.id}">Ордер на арест · риск ошибки ${risk}%</button>` : ''}</div>`; }).join(''));

  setHtml('radio', s.log.slice(0, 4).map(l => `<div class="k-${l.kind}"><time>${sim.clockText(l.t)}</time>${esc(l.text)}</div>`).join(''));
  const tip = coach(); $('coach').hidden = !tip || !!overlay; if (tip) setHtml('coach', tip);
}
const etaCache = new Map();
function etaOf(s, u, target) {
  const key = u.id + ':' + (u.path[0]?.id ?? u.node.id) + ':' + target.id + ':' + Math.round(u.x * 500) + ':' + Math.round(u.y * 500), hit = etaCache.get(key);
  if (hit && performance.now() - hit.at < 1500) return hit.v;
  if (etaCache.size > 300) etaCache.clear();
  const v = sim.eta(s, u, target); etaCache.set(key, {v, at: performance.now()}); return v;
}
function callDetail(c) {
  if (!c) return '';
  const s = state, t = CALLS[c.type], assigned = sim.unitsFor(s, c), on = sim.unitsOn(s, c), node = nearestNode(c.x, c.y), me = sim.playerUnit(s);
  const profile = (t.roles ?? []).filter(r => ROLES[r]).map(r => ROLES[r].name).join(', ');
  let html = `<h3>${t.name}</h3><span class="tag" style="--c:${SEV_COLOR[t.sev]}">${SEVERITY[t.sev]}</span>${(t.needs ?? 1) > 1 ? `<span class="tag" style="--c:#9fb3bf">нужно ${t.needs} экипажа</span>` : c.suspectId ? '<span class="tag" style="--c:#9fb3bf">лучше 2 экипажа</span>' : ''}${c.caseId ? `<span class="tag" style="--c:#c59bff">дело №${c.caseId}</span>` : ''}${t.armed ? '<span class="tag" style="--c:#ff6b6b">вооружён</span>' : ''}${c.reaction ? `<span class="tag" style="--c:${REACTION[c.reaction][1]}">${REACTION[c.reaction][0]}</span>` : ''}<p>${t.brief}</p>`;
  if (profile) html += `<p class="hint">Профиль: ${profile}${t.minor ? ' · спецназ и тяжёлое оружие здесь — перебор' : ''}${c.innocentRisk ? ` · риск задержать невиновного ${Math.round(c.innocentRisk * 100)}%` : ''}</p>`;
  if (assigned.length) html += `<p class="hint">Назначены: ${assigned.map(u => esc(u.callsign) + (u.player ? ' (вы)' : '') + ' — ' + STATUS[u.status].toLowerCase()).join(', ')}</p>`;
  if (c.state === 'standoff') {
    const so = c.standoff, neg = on.reduce((b, u) => (!b || sim.negotiationSkill(s, u) > sim.negotiationSkill(s, b) ? u : b), null), mine = sim.playerDecides(s, c);
    html += `<div class="standoff"><div class="sbar"><span>Послушание</span><div class="bar comp"><i style="width:${so.compliance}%"></i></div><b>${Math.round(so.compliance)}%</b></div>
      <div class="sbar"><span>Стабильность</span><div class="bar stab" style="--h:${Math.round(so.stability * 1.2)}"><i style="width:${so.stability}%"></i></div><b>${Math.round(so.stability)}%</b></div>
      <p class="hint">Воля подозреваемого <b>${so.willpower.toFixed(1)}</b> · возбуждение <b>${so.agitation + (so.angry ? 1 : 0)}</b>${so.angry ? ' (зол)' : ''}${t.armed ? ' · вооружён' : ''} · переговорщик ${neg ? esc(neg.callsign) + ' — навык <b>' + sim.negotiationSkill(s, neg).toFixed(1) + '</b>' : '—'}</p>
      ${mine ? Object.entries(sim.STRATEGIES).map(([k, st]) => `<button data-act="strategy" data-id="${k}" class="${so.strategy === k ? 'on' : ''}"><span>${st.name} <span class="hint">· ${st.desc}</span></span>${so.strategy === k ? '<em>●</em>' : ''}</button>`).join('') + `<button data-act="forceEntry" class="danger"><span>Силовое задержание <span class="hint">· ${so.stability < 45 || t.armed ? 'с риском перестрелки' : 'пока подозреваемый спокоен'}</span></span><em>${Math.round(sim.standoffForceChance(s, c) * 100)}%</em></button>
        <p class="hint">Любой разговор сбивает возбуждение. Если переговорщик слабее воли подозреваемого — тяните время и налаживайте контакт или вызовите опытного переговорщика. Больше экипажей вокруг — подозреваемому некуда бежать.</p>` : `<p class="hint">Экипажи ведут переговоры сами: ${sim.STRATEGIES[so.strategy]?.name.toLowerCase() ?? 'силовой вариант'}.</p>`}</div>`;
  } else if (c.state === 'choice') {
    html += sim.playerDecides(s, c) ? '<p><b>Экипаж на месте. Ваше решение:</b></p>' + t.approaches.map((a, k) => `<button data-act="approach" data-i="${k}"><span>${a.label} <span class="hint">· ${TRAITS[a.trait].toLowerCase()}${a.hint ? ' · ' + a.hint : ''}</span></span><em>${Math.round(sim.successChance(s, c, k, on) * 100)}%</em></button>`).join('') + '<p class="hint">Клавиши <kbd>Q</kbd> и <kbd>E</kbd>. Процент учитывает навыки, подразделение, снаряжение, политику, погоду и усталость.</p>'
      : '<p class="hint">Экипаж на месте сам выбирает, как действовать.</p>';
  } else if (c.state === 'active') {
    html += `<p>Действие: <b>${t.approaches[c.approach].label}</b> · шанс ${Math.round(sim.successChance(s, c, c.approach, on) * 100)}% · готово на ${Math.round(c.progress / Math.max(1, c.work) * 100)}%</p>`;
  }
  if (c.state !== 'active' || c.suspectId) {
    const backup = sim.canBackup(s) && me?.callId === c.id, target = c.suspectId ? (s.suspects.find(x => x.id === c.suspectId)?.node ?? node) : node;
    const free = s.units.filter(u => u.callId !== c.id && (sim.isFree(u) || u.status === 'enroute') && (sim.canCommand(s, u) || backup) && (VEHICLES[u.type].role !== 'heli' || c.suspectId)).map(u => ({u, eta: etaOf(s, u, target)})).sort((a, b) => a.eta - b.eta);
    const own = free.find(x => x.u.player);
    if (s.rank < 3 && own) html += `<button class="primary" data-act="dispatchBest">Принять вызов своим экипажем · ${minutes(own.eta)} &nbsp;<kbd>G</kbd></button>`;
    else if (s.rank >= 3 && free.length) html += `<button class="primary" data-act="dispatchBest">Направить подходящий экипаж &nbsp;<kbd>G</kbd></button>`;
    html += free.filter(x => s.rank >= 3 || !x.u.player).map(({u, eta}) => `<button data-act="dispatchUnit" data-id="${u.id}"><span>${s.rank < 3 ? 'Подкрепление: ' : ''}${t.roles?.includes(VEHICLES[u.type].role) ? '★ ' : ''}${esc(u.callsign)} ${roleChip(u)} <span class="hint">· ${STATUS[u.status].toLowerCase()} · ${Math.round(u.fatigue)}%</span></span><em>${minutes(eta)}</em></button>`).join('');
    if (s.rank < 3 && !assigned.length && s.mode === 'career') html += `<p class="hint">Если вы не возьмёте вызов, диспетчер отправит другой экипаж — но опыта вы не получите.</p>`;
    if (c.suspectId && s.spikesLeft && (s.rank >= 1 || s.mode !== 'career')) html += `<p class="hint">Поставьте шипы на пути беглеца: <kbd>K</kbd>, затем клик по дороге впереди него.</p>`;
  }
  return html;
}
function coach() {
  const s = state;
  if (!s || s.mode !== 'career' || s.shift > 1 || s.career.own >= 4 || s.phase !== 'shift' || s.rank >= 3) return '';
  const live = sim.liveCalls(s), me = sim.playerUnit(s);
  if (live.some(c => c.state === 'choice' && sim.playerDecides(s, c))) return 'Морозов: «Мы на месте. Решай, как действуем» — выберите вариант в карточке вызова справа. <b>Процент — шанс успеха.</b>';
  if (live.some(c => c.state === 'pending') && me && sim.isFree(me)) return 'Новый вызов! Нажмите <b>«Принять вызов своим экипажем»</b> (клавиша <kbd>G</kbd>) — или кликните <b>правой кнопкой</b> по значку вызова на карте.';
  if (!s.career.own && !live.length) return 'Вы — стажёр в <b>' + esc(me?.callsign ?? '') + '</b>, наставник Морозов рядом. Патрулируем: часть нарушений вы заметите сами. Карта: тяните мышью, колесо — масштаб, средняя кнопка — поворот.';
  if (me?.status === 'hold' && !me.path.length) return 'Экипаж ждёт приказа на месте. Нажмите <kbd>P</kbd>, чтобы вернуться в патруль.';
  if (s.career.own >= 1) return 'Так держать. Опыт идёт за вызовы вашего экипажа. <kbd>Пробел</kbd> — пауза, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> — скорость, <kbd>B</kbd> — личное дело.';
  return '';
}

// ---------- окна ----------
function openOverlay(name, html) { overlay = name; $('card').innerHTML = html; $('overlay').hidden = false; $('card').scrollTop = 0; audio.siren(false); if (state) save(); refresh(true); }
function closeOverlay() { overlay = null; $('overlay').hidden = true; last = performance.now(); if (state) refresh(true); }
const helpHtml = `<h3>Как играть</h3><p>Вы начинаете стажёром сразу после академии: один экипаж, наставник рядом. Берите вызовы, решайте, как действовать на месте, и набирайте опыт. Каждое звание открывает новые полномочия — от своего маршрута и шипов до командования сменой, расследований, агентуры и управления всем отделением с политикой, снаряжением и бюджетом.</p>
<p>Город живёт сам: часть преступлений никто не видит. Их замечают патрули, ДПС с радаром, вертолёт, информаторы и агенты под прикрытием. Подозреваемые сдаются, бегут или отстреливаются — бронежилет и спецназ спасают людей. Успехи повышают доверие, провалы, ранения, аварии в погонях и ошибочные аресты — роняют. Упадёт доверие до нуля — вас отстранят.</p>
<div class="keys"><kbd>ЛКМ</kbd><span>выбрать экипаж или вызов; тянуть — двигать карту</span><kbd>ПКМ</kbd><span>отправить выбранный экипаж на вызов или в точку карты</span><kbd>Shift+ПКМ</kbd><span>добавить точку маршрута патрулирования</span><kbd>Колесо</kbd><span>масштаб к курсору</span><kbd>Средняя кнопка</kbd><span>поворот и наклон камеры</span>
<kbd>W A S D</kbd><span>двигать карту</span><kbd>Z X</kbd><span>повернуть камеру</span><kbd>Пробел</kbd><span>пауза</span><kbd>1 2 3</kbd><span>скорость ×1 ×2 ×4</span><kbd>G</kbd><span>направить подходящий экипаж на выбранный вызов</span><kbd>Q E</kbd><span>выбрать действие на месте</span>
<kbd>K</kbd><span>поставить шипы (клик по дороге во время погони)</span><kbd>Tab</kbd><span>следующий экипаж</span><kbd>C</kbd><span>следующий вызов</span><kbd>F</kbd><span>следить за экипажем</span><kbd>R / P</kbd><span>на отдых / в патруль</span><kbd>V</kbd><span>карта преступности по районам</span><kbd>B</kbd><span>личное дело / отделение</span><kbd>Home</kbd><span>весь город</span><kbd>M</kbd><span>звук</span></div>`;
function showTitle() {
  document.body.classList.add('title'); state = null; audio.siren(false);
  const saved = loadSaved();
  const label = saved ? (saved.mode === 'career' ? `${RANKS[saved.rank].title.toLowerCase()} ${esc(saved.player.name)}` : saved.challenge ? 'испытание «' + CHALLENGES[saved.challenge.id].name + '»' : 'песочница') + `, смена ${saved.shift}` : '';
  openOverlay('title', `<span class="eyebrow">ПОЛИЦЕЙСКАЯ СТРАТЕГИЯ · ПК-ВЕРСИЯ 2.0</span><h1><b>MERCURY</b> RESPONSE</h1>
  <p>Вчера — академия. Сегодня — первая смена в патруле. Дослужитесь от стажёра до комиссара — или сразу возглавьте отделение.</p>
  <div class="menu">${saved && !['over', 'won'].includes(saved.phase) ? `<button class="primary" data-act="continue">Продолжить · ${label}</button>` : ''}
  <label class="name">Имя офицера<input id="playerName" maxlength="24" placeholder="Например: Денис" autocomplete="off"></label>
  <button class="${saved ? '' : 'primary'}" data-act="newGame">Новая карьера · от стажёра</button>
  <div class="split"><button data-act="sandbox">Песочница · сразу начальник</button><button data-act="challenges">Испытания</button></div>
  <button data-act="help">Как играть</button><button data-act="quit">Выйти</button></div>
  <p class="fine">Совет: ${TIPS[Math.floor(Math.random() * TIPS.length)]}</p><p class="fine">Карта: ${esc(ATTRIBUTION)} (ODbL). Происшествия и персонажи вымышлены.</p>`);
}
function seg(group, options, current) { return `<div class="seg">${options.map(([v, n]) => `<button data-act="setup" data-g="${group}" data-v="${v}" class="${String(current) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`; }
function showSandbox() {
  const o = view.setup;
  openOverlay('sandbox', `<span class="eyebrow">ПЕСОЧНИЦА</span><h2>Настройки города</h2><p>Вы начинаете лейтенантом — начальником отделения: пять экипажей (патруль, детективы, ДПС), бюджет и полная свобода.</p>
  <h3>Сложность</h3>${seg('difficulty', Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name]), o.difficulty)}
  <h3>Преступная активность</h3>${seg('crime', [[0.75, 'Низкая'], [1, 'Обычная'], [1.35, 'Высокая']], o.crime)}
  <h3>Стартовый бюджет</h3>${seg('money', [[3000, '3 000 €'], [6000, '6 000 €'], [12000, '12 000 €']], o.money)}
  <h3>Волны преступности</h3>${seg('waves', [[true, 'Включены'], [false, 'Выключены']], o.waves)}
  <div class="menu"><button class="primary" data-act="startSandbox">Начать</button><button data-act="title">Назад</button></div>`);
}
function showChallenges() {
  openOverlay('challenges', `<span class="eyebrow">ИСПЫТАНИЯ</span><h2>Сценарии с целью</h2><div class="grid">${Object.entries(CHALLENGES).map(([k, c]) => `<div class="item"><b>${c.name}</b><small>${c.goal}<br><br>Смен: ${c.shifts} · звание: ${RANKS[c.rank].title} · экипажей: ${c.units.length}</small><button class="primary" data-act="startChallenge" data-id="${k}">Начать</button></div>`).join('')}</div><div class="menu"><button data-act="title">Назад</button></div>`);
}
const UNLOCKS = {
  1: ['Свой район и маршрут патруля: выбор в карточке экипажа, точки — Shift+ПКМ', 'Шипы для остановки беглецов: клавиша K во время погони', 'Начались волны преступности — следите за сводками'],
  2: ['Подкрепление на свой вызов из других экипажей', 'Расследования: зона поиска, улики и ордер на арест в панели справа', 'Информатор в одном районе — вкладка «Агентура» (B)', 'В смену пришёл экипаж детективов'],
  3: ['Командование всеми экипажами смены, их районами и маршрутами', 'Автодиспетчер (кнопка сверху) — включён, отключите, чтобы командовать самому', 'Агент под прикрытием — вкладка «Агентура»', 'В смену пришёл перехватчик ДПС'],
  4: ['Бюджет отделения и найм экипажей всех подразделений', 'Снаряжение экипажей и директивы политики', 'Улучшения отделения, обучение в академии'],
  5: ['Спецназ и полицейский вертолёт', 'Второй агент под прикрытием, дорогие улучшения'],
  6: ['Высшее звание. Город целиком под вашей ответственностью'],
};
function showRankUp() {
  const s = state, r = RANKS[s.rank];
  openOverlay('rankup', `<div class="rankup"><span class="eyebrow">ПОВЫШЕНИЕ</span><div class="stars">${'★'.repeat(s.rank)}</div><h2>${r.title} ${esc(s.player.name)}</h2><p>${r.perk}</p>
  <h3>Что открылось</h3><div class="unlocks">${Array.from({length: s.rank - (view.rankSeen ?? s.rank - 1)}, (_, i) => (view.rankSeen ?? s.rank - 1) + 1 + i).flatMap(k => UNLOCKS[k] ?? []).map(x => `<div>${x}</div>`).join('')}</div>
  <p class="fine">Получено очко навыка — потратьте его в личном деле (B).</p>${(view.rankSeen = s.rank, '')}<div class="menu"><button class="primary" data-act="close">К службе</button><button data-act="shop">Открыть ${sim.canManage(s) ? 'отделение' : 'личное дело'}</button></div></div>`);
}
function showMenu() {
  openOverlay('menu', `<span class="eyebrow">ПАУЗА</span><h2>Меню</h2><div class="menu"><button class="primary" data-act="close">Вернуться в игру</button><button data-act="shop">${sim.canManage(state) ? 'Отделение' : 'Личное дело'}</button><button data-act="help">Как играть</button><button data-act="toTitle">Сохранить и выйти в главное меню</button></div>
  <h3>Графика</h3><div class="seg">${[['auto', 'Авто'], ['high', 'Высокая'], ['medium', 'Средняя'], ['low', 'Низкая']].map(([k, n]) => `<button data-act="gfx" data-id="${k}" class="${renderer.quality() === k ? 'on' : ''}">${n}</button>`).join('')}</div><p class="fine">Сейчас: ${({high: 'высокая', medium: 'средняя', low: 'низкая'})[renderer.stats().effective]} · внутреннее разрешение ${Math.round(renderer.stats().renderScale * 100)}%. «Авто» подбирает качество по видеокарте, а разрешение игра подстраивает сама, чтобы держать плавность.</p>
  <h3>Громкость</h3><input type="range" id="volume" min="0" max="100" value="${Math.round(audio.volume * 100)}"><p class="fine">Игра сохраняется автоматически.</p>`);
  $('volume').oninput = e => { audio.setVolume(e.target.value / 100); audio.click(); };
}
function showHelp() { openOverlay('help', `<span class="eyebrow">ИНСТРУКТАЖ</span><h2>Добро пожаловать на службу</h2>${helpHtml}<h3>Подразделения</h3>${Object.values(ROLES).map(r => `<p><b style="color:${r.color}">${r.name}</b> — ${r.desc}</p>`).join('')}<h3>Советы</h3>${TIPS.map(t => `<p>• ${t}</p>`).join('')}<div class="menu"><button class="primary" data-act="${state ? 'close' : 'title'}">Понятно</button></div>`); }
function careerHtml() {
  const s = state, c = s.career, next = RANKS[s.rank + 1];
  return `${s.mode === 'career' ? `<h3>Карьера</h3><div class="ladder">${RANKS.map((r, k) => `<div class="${k === s.rank ? 'now' : k < s.rank ? 'done' : ''}"><b>${k < s.rank ? '✓' : k === s.rank ? '●' : '○'} ${r.title}</b><small>${r.perk}${k > s.rank ? ' · ' + r.xp + ' опыта' : ''}</small></div>`).join('')}</div>
  <p class="fine">${next ? `До звания «${next.title}» осталось ${next.xp - s.xp} опыта.` : 'Вы достигли высшего звания.'} ${s.rank < 3 ? 'Опыт идёт за вызовы, в которых участвовал ваш экипаж.' : 'Вы получаете опыт и за вызовы подчинённых экипажей.'}</p>` : ''}
  <h3>Личные навыки · свободных очков: ${s.player.points}</h3><div class="grid">${Object.entries(PERKS).map(([key, p]) => `<div class="item"><b>${p.name} ${'●'.repeat(s.player.perks[key])}${'○'.repeat(3 - s.player.perks[key])}</b><small>${p.desc}</small><button data-act="perk" data-id="${key}" ${s.player.points < 1 || s.player.perks[key] >= 3 ? 'disabled' : ''}>${s.player.perks[key] >= 3 ? 'Максимум' : 'Улучшить · 1 очко'}</button></div>`).join('')}</div>
  <p class="fine">Очко навыка даётся за каждое новое звание и за смену с оценкой A или B, если ваш экипаж закрыл хотя бы 3 вызова.</p>
  <h3>Послужной список</h3><div class="statgrid"><div><strong>${c.shifts}</strong>смен</div><div><strong>${c.own}</strong>ваших вызовов</div><div><strong>${c.arrests}</strong>задержаний отдела</div><div><strong>${c.solved}</strong>дел раскрыто</div></div>
  ${s.cases.length ? `<h3>Дела</h3>${s.cases.slice().reverse().map(k => `<div class="fin"><span>№${k.id} · ${esc(k.title)} · ${DISTRICTS[k.district].name}</span><b>${k.state === 'solved' ? 'раскрыто' : k.state === 'cold' ? 'в архиве' : 'улики ' + Math.round(k.evidence) + '%'}</b></div>`).join('')}` : ''}`;
}
function skillCells(o) { return Object.keys(sim.SKILLS).map(k => `<td><div class="sk"><i style="width:${o.skills[k] / 5 * 100}%"></i></div><small>${o.skills[k].toFixed(1)}</small></td>`).join(''); }
function staffHtml() {
  const s = state, manage = sim.canManage(s), slots = s.units.flatMap(u => u.crew.map((o, i) => o.player ? null : [u, i, o])).filter(Boolean);
  const row = (o, where, extra = '') => `<tr class="${o.injured ? 'hurt' : ''}"><td><b>${esc(o.name)}</b><br><small>${where}</small></td><td>${o.player ? 'вы' : o.level}</td><td>${o.spec ? sim.SPECS[o.spec] : '—'}</td>${skillCells(o)}<td><div class="sk st"><i style="width:${o.stress}%"></i></div><small>${Math.round(o.stress)}</small></td><td><div class="sk mo"><i style="width:${o.morale}%"></i></div><small>${Math.round(o.morale)}</small></td><td>${extra}</td></tr>`;
  const academy = o => manage && !o.player ? `<select data-academy="${o.id}">${Object.entries(sim.SKILLS).map(([k, n]) => `<option value="${k}">${n} · ${sim.academyCost(o, k)} €</option>`).join('')}</select><button data-act="academy" data-id="${o.id}">Курс</button>` : '';
  const head = `<tr><th>Сотрудник</th><th>Ур.</th><th>Специализация</th>${Object.values(sim.SKILLS).map(n => `<th>${n}</th>`).join('')}<th>Стресс</th><th>Мораль</th><th>${manage ? 'Академия' : ''}</th></tr>`;
  let html = `<p>Каждый сотрудник — отдельный человек: навыки растут в деле, младший рядом со старшим учится в полтора раза быстрее. С 3-го уровня — специализация. Перестрелки и тяжёлые вызовы копят стресс, отдых в участке его снимает. При морали ниже 25% сотрудник может уволиться в конце смены.${manage ? ` Зарплаты: ${Math.round(sim.allOfficers(s).filter(o => !o.player).reduce((n, o) => n + sim.officerSalary(o), 0))} € за смену.` : ''}</p>
    <table class="staff">${head}${s.units.map(u => u.crew.map(o => row(o, esc(u.callsign) + ' · ' + ROLES[VEHICLES[u.type].role].name, academy(o))).join('')).join('')}</table>`;
  if (manage) {
    html += `<h3>Резерв · ${s.reserve.length} из 6</h3>${s.reserve.length ? `<table class="staff">${head}${s.reserve.map(o => row(o, 'резерв', `<select data-swap="${o.id}"><option value="">Поставить вместо…</option>${slots.map(([u, i, x]) => `<option value="${u.id}:${i}">${esc(u.callsign)} — ${esc(x.name)}</option>`).join('')}</select>${academy(o)}`)).join('')}</table>` : '<p class="fine">Резерв пуст. Нанятые сотрудники попадают сюда, а отсюда — в экипажи вместо уставших или раненых.</p>'}
      <h3>Кандидаты</h3><div class="grid">${s.candidates.map(o => `<div class="item"><b>${esc(o.name)} · ур.${o.level}</b><small>${Object.entries(sim.SKILLS).map(([k, n]) => `${n}: ${o.skills[k].toFixed(1)}`).join(' · ')}<br>Зарплата ${sim.officerSalary(o)} € за смену</small><button data-act="hire" data-id="${o.id}" ${s.money < o.fee || s.reserve.length >= 6 ? 'disabled' : ''}>Нанять · ${money(o.fee)}</button></div>`).join('')}</div><p class="fine">Список кандидатов обновляется каждую смену.</p>`;
  }
  return html;
}
function cityHtml() {
  const s = state, c = s.city, policy = sim.canPolicy(s), dname = k => DISTRICTS[k].name;
  const mood = c.mayor >= 80 ? 'доволен — финансирование +15%' : c.mayor >= 50 ? 'спокоен' : c.mayor >= 30 ? 'недоволен' : 'в ярости';
  const open = c.complaints.filter(k => k.state === 'open'), past = c.complaints.filter(k => k.state !== 'open').slice(-6).reverse();
  const label = {sustained: 'подтвердилась', dismissed: 'не подтвердилась'};
  let html = `<div class="mayor"><div><span class="eyebrow">МЭР</span><b>${Math.round(c.mayor)}%</b><small>${mood}${c.cut ? ` · бюджет урезан ещё на ${c.cut} смен${c.cut === 1 ? 'у' : 'ы'}` : ''}</small><div class="sk mo wide"><i style="width:${c.mayor}%"></i></div></div>
    <div><span class="eyebrow">ПОРУЧЕНИЕ НА СМЕНУ</span><p>${c.demand ? esc(sim.demandText(s)) : 'Мэрия пока присматривается к новому отделению.'}</p>${c.demand ? `<small>${sim.demandMet(s) ? '✔ сейчас выполняется' : '… пока не выполнено'} · выполнено: мэр +10 и 250 € премии, провал: мэр −12</small>` : ''}</div></div>`;
  if (s.crisis) { const k = sim.CRISES[s.crisis.kind]; html += `<div class="crisisbox"><b>☠ ${k.name} — ${dname(s.crisis.district)}</b><p>${k.goal}. Прогресс ${s.crisis.progress} из ${k.need}, осталось смен: ${s.crisis.shiftsLeft}. Провал ударит по доверию и отношениям с мэром.</p></div>`; }
  html += `<h3>Жалобы и служебные проверки</h3><p class="fine">Силовые действия и перестрелки рождают жалобы. В конце смены служебная проверка решает, подтвердилась ли жалоба; подтверждённая бьёт по доверию и морали сотрудника и может закончиться иском. Жёсткая политика силы — больше жалоб.</p>
    ${open.length ? `<div class="complaints">${open.map(k => `<div class="item"><b>${esc(k.officer)}</b><small>${esc(k.call)} · смена ${k.shift} · проверка идёт</small></div>`).join('')}</div>` : '<p class="fine">Открытых жалоб нет.</p>'}
    ${past.length ? `<div class="complaints">${past.map(k => `<div class="item ${k.state}"><b>${esc(k.officer)}</b><small>${esc(k.call)} · ${label[k.state]}${k.lawsuit ? ` · иск ${money(k.lawsuit)}` : ''}</small></div>`).join('')}</div>` : ''}`;
  const districts = DISTRICTS.map((d, k) => districtNodes[k].length ? k : -1).filter(k => k >= 0);
  html += `<h3>Соседский дозор · ${sim.PROGRAM_COST} € за смену на район</h3><p class="fine">Жители сами сообщают о подозрительном: в районе чаще замечают скрытые преступления, преступность медленно снижается.${policy ? '' : ' Программы запускает начальник отделения.'}</p>
    <div class="intel">${districts.map(k => `<div class="item"><b>${dname(k)}</b><small>Преступность ${Math.round(s.districts[k].crime)}%</small><button data-act="program" data-id="${k}" class="${s.programs[k] ? 'on' : ''}" ${policy ? '' : 'disabled'}>${s.programs[k] ? 'Дозор работает' : 'Запустить дозор'}</button></div>`).join('')}</div>`;
  html += `<h3>Операция на смену</h3>${s.op ? `<p><b>Идёт: ${sim.OPERATIONS[s.op.kind].name} — ${dname(s.op.district)}.</b> Одна операция за смену.</p>` : ''}
    <div class="grid">${Object.entries(sim.OPERATIONS).map(([k, o]) => `<div class="item"><b>${o.name} · ${money(o.cost)}</b><small>${o.desc}</small><div class="oprow"><select data-opdist="${k}">${districts.map(d => `<option value="${d}">${dname(d)}</option>`).join('')}</select><button data-act="operation" data-k="${k}" ${!policy || s.op || s.phase !== 'shift' || s.money < o.cost ? 'disabled' : ''}>Начать</button></div></div>`).join('')}</div>`;
  return html;
}
function intelHtml() {
  const s = state, inf = sim.informantSlots(s), und = sim.undercoverSlots(s), used = o => Object.keys(o).length;
  if (!inf && !und) return '<p class="fine">Информаторов вербуют со звания «Старший патрульный», агентов внедряют с «Сержанта».</p>';
  return `<p>Информатор приносит сведения о скрытых преступлениях и уликах по делам в своём районе и сдерживает там рост преступности. Агент под прикрытием замечает скрытые преступления вдвое чаще.${sim.canManage(s) ? ' Содержание: информатор 150 €, агент 250 € за смену.' : ''}</p>
  <p class="fine">Информаторы: ${used(s.informants)} из ${inf} · агенты: ${used(s.undercover)} из ${und}</p>
  <div class="intel">${DISTRICTS.map((d, k) => districtNodes[k].length ? `<div class="item"><b>${d.name}</b><small>Преступность ${Math.round(s.districts[k].crime)}%</small><div class="seg"><button data-act="informant" data-id="${k}" class="${s.informants[k] ? 'on' : ''}" ${inf ? '' : 'disabled'}>Информатор</button><button data-act="undercover" data-id="${k}" class="${s.undercover[k] ? 'on' : ''}" ${und ? '' : 'disabled'}>Агент</button></div></div>` : '').join('')}</div>`;
}
function showShop(tab = view.tab) {
  const s = state; if (!s) return;
  const manage = sim.canManage(s), tabs = [['city', 'Город'], ['staff', 'Кадры'], ...(manage ? [['units', 'Экипажи'], ['gear', 'Снаряжение'], ['policy', 'Политика'], ['upgrades', 'Улучшения']] : []), ...(sim.informantSlots(s) ? [['intel', 'Агентура']] : []), ['career', manage ? 'Навыки и дела' : 'Личное дело']];
  if (!tabs.some(([k]) => k === tab)) tab = tabs[0][0];
  view.tab = tab;
  const cap = s.units.length >= sim.unitCap(s);
  let body = '';
  if (tab === 'units') body = `<p>Экипажей ${s.units.length} из ${sim.unitCap(s)} (лимит растёт со званием) · за смену каждый стоит 280 €, вертолёт ещё 400 €.</p><div class="grid">${Object.entries(VEHICLES).map(([key, v]) => { const locked = s.rank < v.rank; return `<div class="item ${locked ? 'locked' : ''}"><b>${v.name}</b><span class="role" style="--c:${ROLES[v.role].color}">${ROLES[v.role].name}</span><small>${v.desc}</small><button data-act="buyUnit" data-id="${key}" ${locked || cap || s.money < v.cost ? 'disabled' : ''}>${locked ? 'Нужно звание: ' + RANKS[v.rank].title : cap ? 'Лимит экипажей' : 'Нанять · ' + money(v.cost)}</button></div>`; }).join('')}</div>
    <h3>Слаженность экипажей</h3><div class="grid">${s.units.map(u => `<div class="item"><b>${esc(u.callsign)}${u.player ? ' (вы)' : ''}</b>${roleChip(u)}<small>навык ${Math.round(u.skill * 100)}% · вызовов: ${u.handled}</small><button data-act="train" data-id="${u.id}" ${u.skill >= 0.95 || s.money < sim.trainCost(u) ? 'disabled' : ''}>${u.skill >= 0.95 ? 'Максимум' : 'Академия +6% · ' + money(sim.trainCost(u))}</button></div>`).join('')}</div>`;
  if (tab === 'gear') body = `<p>Снаряжение выдаётся экипажу со склада; более дорогое списывает бюджет. Тяжёлое оружие и спецназ на мелких вызовах раздражают жителей.</p><table class="gear"><tr><th>Экипаж</th><th>Оружие</th><th>Защита</th><th>Спецсредства</th></tr>${s.units.filter(u => VEHICLES[u.type].role !== 'heli').map(u => `<tr><td><b>${esc(u.callsign)}</b><br>${roleChip(u)}</td>${['weapon', 'armor', 'kit'].map(slot => `<td><select data-gear="${u.id}" data-slot="${slot}">${Object.entries(GEAR[slot]).map(([k, g]) => `<option value="${k}" ${u.gear[slot] === k ? 'selected' : ''}>${g.name}${g.cost ? ' · ' + g.cost + ' €' : ''}</option>`).join('')}</select><small>${GEAR[slot][u.gear[slot]].desc}</small></td>`).join('')}</tr>`).join('')}</table>`;
  if (tab === 'policy') body = `<p>Директивы отделения определяют, как экипажи действуют без вас.</p>${Object.entries(POLICY).map(([axis, p]) => `<h3>${p.name}</h3><div class="seg">${Object.entries(p.options).map(([k, n]) => `<button data-act="policy" data-id="${axis}" data-v="${k}" class="${s.policy[axis] === k ? 'on' : ''}">${n}</button>`).join('')}</div><p class="fine">${p.desc[s.policy[axis]]}</p>`).join('')}`;
  if (tab === 'upgrades') body = `<div class="grid">${UPGRADES.map(u => { const owned = s.upgrades[u.id], locked = s.rank < u.rank; return `<div class="item ${owned ? 'owned' : locked ? 'locked' : ''}"><b>${u.name}</b><small>${u.desc}</small><button data-act="buyUpgrade" data-id="${u.id}" ${owned || locked || s.money < u.cost ? 'disabled' : ''}>${owned ? '✓ Установлено' : locked ? 'Нужно звание: ' + RANKS[u.rank].title : 'Купить · ' + money(u.cost)}</button></div>`; }).join('')}</div>`;
  if (tab === 'intel') body = intelHtml();
  if (tab === 'staff') body = staffHtml();
  if (tab === 'city') body = cityHtml();
  if (tab === 'career') body = careerHtml();
  openOverlay('shop', `<span class="eyebrow">${manage ? 'ОТДЕЛЕНИЕ' : 'ЛИЧНОЕ ДЕЛО'}</span><h2>${RANKS[s.rank].title} ${esc(s.player.name)}${manage ? ` · бюджет ${money(s.money)}` : ''}</h2>
  <div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-id="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>${body}
  <div class="menu"><button class="primary" data-act="${s.phase === 'summary' ? 'summary' : 'close'}">${s.phase === 'summary' ? 'Назад к итогам смены' : 'Вернуться в город'}</button></div>`);
}
function paperHtml(x) {
  const p = x.paper; if (!p) return '';
  return `<div class="paper"><div class="mast">${esc(p.name)}<small>смена ${x.shift} · ${WEATHER[x.weather]?.[1] ?? ''}</small></div><h4>${esc(p.headline)}</h4><p class="sub">${esc(p.sub)}</p>
    <div class="cols">${p.stories.map(([h, t]) => `<div><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('') || '<div><b>Будни полиции</b><p>Смена прошла без громких происшествий.</p></div>'}</div>
    <div class="poll"><span>Одобряют работу полиции <b>${p.poll.approve}%</b></span><span>Главная тревога: <b>${esc(p.poll.concern)}</b></span><span>Среднее прибытие: <b>${p.poll.response ? p.poll.response + ' мин' : '—'}</b></span><span>Преступность: <b>${p.poll.crime}%</b></span></div></div>`;
}
function cityLine(c) {
  const parts = [];
  if (c.demand) parts.push(`Поручение мэра «${esc(c.demand)}» — ${c.met ? '<b>выполнено</b>' : 'не выполнено'}.`);
  if (c.sustained || c.dismissed) parts.push(`Служебные проверки: подтверждено ${c.sustained}, снято ${c.dismissed}.`);
  if (c.lawsuits) parts.push(`Иски: ${c.lawsuits}, выплачено ${money(c.paid)}.`);
  if (c.programs) parts.push(`Соседский дозор: −${money(c.programs)}.`);
  if (c.crisis?.failed) parts.push(`Кризис «${esc(c.crisis.name)}» провален.`);
  parts.push(`Отношение мэра: ${c.mayor}%.`);
  return `<p class="${c.met === false || c.lawsuits || c.crisis ? 'notice-bad' : 'citynote'}">${parts.join(' ')}</p>`;
}
function showSummary() {
  const s = state, x = s.summary, g = x.grade, manage = sim.canManage(s);
  openOverlay('summary', `<span class="eyebrow">СМЕНА ${x.shift} ОКОНЧЕНА</span><div class="grade ${g.grade}"><b>${g.grade}</b><div><h2>${g.title}</h2><p>${RANKS[s.rank].title} ${esc(s.player.name)} · доверие города ${Math.round(s.trust)}%</p></div></div>
  ${paperHtml(x)}
  <div class="statgrid"><div><strong>${x.stats.own}</strong>ваших вызовов</div><div><strong>+${x.stats.xp}</strong>опыта</div><div><strong>${x.stats.resolved}</strong>решено отделом</div><div><strong>${x.stats.failed + x.stats.missed}</strong>неудач и пропусков</div><div><strong>${x.stats.arrests}</strong>задержаний</div><div><strong>${x.stats.spotted}</strong>замечено патрулями</div><div><strong>${x.stats.unseen}</strong>прошло незамеченным</div><div><strong>${x.stats.injuries}</strong>ранено сотрудников</div></div>
  ${x.city ? cityLine(x.city) : ''}
  ${x.quits?.length ? `<p class="notice-bad">Уволились: ${x.quits.map(esc).join(', ')} — их заменили новичками. Следите за моралью во вкладке «Кадры».</p>` : ''}
  <p>${x.mood > 0 ? `Город чувствует себя безопаснее: доверие +${x.mood}.` : x.mood < 0 ? `Преступность высока, жители недовольны: доверие ${x.mood}.` : 'Обстановка в городе без перемен.'}${x.point ? ' <b>Вы получили очко навыка.</b>' : ''}${s.player.points ? ` Свободных очков: ${s.player.points}.` : ''}</p>
  ${manage ? `<div class="fin"><span>Бюджет на конец смены</span><b>${money(x.before)}</b></div><div class="fin"><span>Финансирование города (зависит от доверия)</span><b>+${money(x.grant)}</b></div>${x.bonus ? `<div class="fin"><span>Премия за оценку ${g.grade}</span><b>+${money(x.bonus)}</b></div>` : ''}${x.stats.fines ? `<div class="fin"><span>в том числе штрафы за смену</span><b>${money(x.stats.fines)}</b></div>` : ''}
  <div class="fin"><span>Зарплаты экипажей</span><b>−${money(x.salaries)}</b></div><div class="fin"><span>Обслуживание техники</span><b>−${money(x.upkeep)}</b></div>${x.agents ? `<div class="fin"><span>Информаторы и агенты</span><b>−${money(x.agents)}</b></div>` : ''}<div class="fin"><span><b>Итого в бюджете</b></span><b>${money(x.after)}</b></div>` : ''}
  <div class="menu"><button class="primary" data-act="nextShift">Начать смену ${x.shift + 1}</button><button data-act="shop">${manage ? 'Отделение: экипажи, снаряжение, политика' : 'Личное дело: навыки и карьера'}</button></div>`);
}
function showOver() {
  const s = state, c = s.career, ch = s.challenge && CHALLENGES[s.challenge.id];
  openOverlay('over', `<span class="eyebrow">${ch ? 'ИСПЫТАНИЕ ПРОВАЛЕНО' : 'ОТСТРАНЕНИЕ'}</span><h2>${ch && s.overReason === 'challenge' ? `«${ch.name}» не пройдено` : 'Город потерял доверие к полиции'}</h2><p>${ch && s.overReason === 'challenge' ? esc(ch.goal) + ' ' + esc(ch.progress(s)) + '.' : `Слишком много вызовов осталось без помощи. ${RANKS[s.rank].title} ${esc(s.player.name)} отстранён от службы.`}</p>
  ${s.summary ? paperHtml(s.summary) : ''}
  <div class="statgrid"><div><strong>${c.shifts}</strong>смен отработано</div><div><strong>${c.resolved}</strong>вызовов решено</div><div><strong>${c.arrests}</strong>задержаний</div><div><strong>${c.solved}</strong>дел раскрыто</div></div>
  <div class="menu"><button class="primary" data-act="toTitle">Главное меню</button></div>`);
}
function showWon() {
  const s = state, ch = CHALLENGES[s.challenge.id];
  openOverlay('won', `<span class="eyebrow">ИСПЫТАНИЕ ПРОЙДЕНО</span><h2>«${ch.name}»</h2><p>${esc(ch.goal)}</p><p><b>${esc(ch.progress(s))}</b> · доверие ${Math.round(s.trust)}%</p>${s.summary ? paperHtml(s.summary) : ''}<div class="menu"><button class="primary" data-act="toTitle">Главное меню</button><button data-act="challenges">Другие испытания</button></div>`);
}

// ---------- действия ----------
const selectedUnit = () => state?.units.find(u => u.id === view.unit) ?? null;
const selectedCall = () => state?.calls.find(c => c.id === view.call && c.state !== 'done' && c.state !== 'hidden') ?? null;
function dispatchBest() { const c = selectedCall(); if (!c) return; const u = sim.bestUnitFor(state, c, x => sim.canCommand(state, x)); if (!u) { toast(state.rank < 3 ? 'Ваш экипаж сейчас занят' : 'Нет подходящих свободных экипажей', 'bad'); audio.bad(); return; } if (result(sim.dispatch(state, u.id, c.id))) view.unit = u.id; refresh(true); }
function setSpeed(v) { speed = v; paused = false; refresh(true); }
function cycle(list, current, dir = 1) { if (!list.length) return null; const k = list.findIndex(x => x.id === current); return list[(k + dir + list.length) % list.length].id; }
function toggleSpike() { if (!state) return; if (!view.spike && !state.suspects.length) { toast('Шипы ставят только во время погони', 'bad'); return; } view.spike = !view.spike; if (view.spike) toast('Кликните по дороге впереди беглеца — там встанут шипы'); refresh(true); }
const actions = {
  pause() { paused = !paused; refresh(true); }, speed(d) { setSpeed(+d.v); },
  auto() { state.auto = !state.auto; toast(state.auto ? 'Автодиспетчер включён: подчинённые экипажи назначаются сами' : 'Автодиспетчер выключен: решения за вами'); refresh(true); },
  shop: () => showShop(), menu: showMenu, help: showHelp, close: closeOverlay, title: showTitle, summary: showSummary, sandbox: showSandbox, challenges: showChallenges,
  tab(d) { showShop(d.id); }, spike: toggleSpike,
  toTitle() { save(); showTitle(); }, quit() { window.close(); },
  continue() { const saved = loadSaved(); if (saved) startGame(saved); else showTitle(); },
  newGame() { startGame(null, {mode: 'career', name: $('playerName')?.value ?? ''}); },
  setup(d) { view.setup[d.g] = d.g === 'waves' ? d.v === 'true' : d.g === 'difficulty' ? d.v : +d.v; showSandbox(); },
  startSandbox() { startGame(null, {mode: 'sandbox', ...view.setup}); },
  startChallenge(d) { startGame(null, {mode: 'challenge', challenge: d.id}); },
  perk(d) { if (result(sim.spendPoint(state, d.id))) { audio.good(); showShop('career'); } },
  policy(d) { if (result(sim.setPolicy(state, d.id, d.v))) showShop('policy'); },
  informant(d) { if (result(sim.toggleInformant(state, +d.id))) showShop('intel'); },
  undercover(d) { if (result(sim.toggleUndercover(state, +d.id))) showShop('intel'); },
  heat() { view.heat = !view.heat; refresh(true); },
  gfx(d) { renderer.quality(d.id); showMenu(); },
  nextShift() { sim.startNextShift(state); closeOverlay(); renderer.focus(STATION, 1300); save(); },
  selUnit(d) { const id = +d.id; if (view.unit === id) renderer.focus(selectedUnit()); view.unit = id; refresh(true); },
  selCall(d) { const id = +d.id; const c = state.calls.find(c => c.id === id); if (view.call === id && c) { const sus = state.suspects.find(x => x.id === c.suspectId); renderer.focus(sus ?? c); } view.call = id; refresh(true); },
  focusCase(d) { const k = state.cases.find(k => k.id === +d.id); if (k) renderer.focus(k.search, 900); },
  warrant(d) { if (result(sim.arrestNow(state, +d.id))) { toast('Ордер подписан: выезд на задержание', 'good'); audio.alert(); } refresh(true); },
  clearRoute() { const u = selectedUnit(); if (u) sim.clearWaypoints(state, u.id); refresh(true); },
  follow() { const u = selectedUnit(); if (u) renderer.follow(renderer.following() === u.id ? null : u.id); refresh(true); },
  patrol() { const u = selectedUnit(); if (u) sim.setPatrol(state, u.id); refresh(true); },
  rest() { const u = selectedUnit(); if (u) result(sim.sendRest(state, u.id)); refresh(true); },
  dispatchBest, dispatchUnit(d) { const c = selectedCall(); if (c && result(sim.dispatch(state, +d.id, c.id))) view.unit = +d.id; refresh(true); },
  approach(d) { const c = selectedCall(); if (c && c.state === 'choice') result(sim.chooseApproach(state, c.id, +d.i)); refresh(true); },
  strategy(d) { const c = selectedCall(); if (c) result(sim.setStrategy(state, c.id, d.id)); refresh(true); },
  forceEntry() { const c = selectedCall(); if (c && result(sim.forceEntry(state, c.id))) audio.alert(); refresh(true); },
  buyUnit(d) { if (result(sim.buyUnit(state, d.id))) { audio.good(); showShop('units'); } }, buyUpgrade(d) { if (result(sim.buyUpgrade(state, d.id))) { audio.good(); showShop('upgrades'); } },
  train(d) { if (result(sim.trainUnit(state, +d.id))) { audio.good(); showShop('units'); } },
  program(d) { if (result(sim.toggleProgram(state, +d.id))) showShop('city'); },
  operation(d) { const sel = document.querySelector(`select[data-opdist="${d.k}"]`); if (sel && result(sim.launchOperation(state, d.k, +sel.value))) { audio.good(); showShop('city'); } },
  focus(d) { if (result(sim.setFocus(state, +d.id, d.f))) refresh(true); },
  hire(d) { if (result(sim.hireOfficer(state, +d.id))) { audio.good(); showShop('staff'); } },
  academy(d) { const sel = document.querySelector(`select[data-academy="${d.id}"]`); if (sel && result(sim.trainOfficer(state, +d.id, sel.value))) { audio.good(); showShop('staff'); } },
};
document.addEventListener('click', e => { if (e.target.closest('.zone, input, select')) return; const el = e.target.closest('[data-act]'); if (!el) return; audio.unlock(); audio.click(); actions[el.dataset.act]?.(el.dataset); });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset?.zone && state) { result(sim.setZone(state, +t.dataset.zone, +t.value)); t.blur(); refresh(true); }
  if (t.dataset?.swap && state && t.value) { const [uid, slot] = t.value.split(':').map(Number); if (result(sim.swapOfficer(state, uid, slot, +t.dataset.swap))) audio.good(); showShop('staff'); }
  if (t.dataset?.gear && state) { if (result(sim.setGear(state, +t.dataset.gear, t.dataset.slot, t.value))) audio.good(); showShop('gear'); }
});
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => { pointerDown = false; }, true);
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);

// ---------- мышь на карте ----------
const map = $('map'); let drag = null;
window.addEventListener('blur', () => { pointerDown = false; drag = null; miniDrag = false; map.classList.remove('drag'); });
map.addEventListener('contextmenu', e => e.preventDefault());
map.addEventListener('pointerdown', e => { if (e.button === 1) e.preventDefault(); map.setPointerCapture(e.pointerId); drag = {x: e.clientX, y: e.clientY, moved: false, button: e.button, shift: e.shiftKey}; });
map.addEventListener('pointermove', e => {
  if (drag && drag.button === 1) { renderer.rotate((e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.004); drag.x = e.clientX; drag.y = e.clientY; drag.moved = true; }
  else if (drag && drag.button === 0) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (drag.moved || Math.hypot(dx, dy) > 4) { drag.moved = true; renderer.pan(dx, dy, drag.x, drag.y); drag.x = e.clientX; drag.y = e.clientY; map.classList.add('drag'); } }
  else if (!drag) map.classList.toggle('pick', !!state && !!renderer.pick(e.clientX, e.clientY));
});
map.addEventListener('pointerup', e => {
  const d = drag; drag = null; map.classList.remove('drag');
  if (!d || d.moved || !state || overlay) return;
  const hit = renderer.pick(e.clientX, e.clientY), at = () => { const p = renderer.worldAt(e.clientX, e.clientY); return nearestNode(p.x, p.y); };
  if (view.spike && d.button === 0) { const node = at(); if (result(sim.placeSpike(state, node))) { renderer.popup(node.x, node.y, 'Шипы выставлены', true); audio.ack(); view.spike = false; } refresh(true); return; }
  if (d.button === 0) { if (hit?.kind === 'unit') { view.unit = hit.id; audio.click(); } else if (hit?.kind === 'call') { view.call = hit.id; audio.click(); } refresh(true); }
  else if (d.button === 2) {
    const u = selectedUnit(); if (!u) { toast('Сначала выберите экипаж'); return; }
    if (d.shift || e.shiftKey) { const node = at(); if (result(sim.addWaypoint(state, u.id, node))) { renderer.popup(node.x, node.y, 'Точка маршрута ' + u.waypoints.length, true); audio.ack(); } }
    else if (hit?.kind === 'call') { if (result(sim.dispatch(state, u.id, hit.id))) view.call = hit.id; }
    else { const node = at(); if (result(sim.moveUnit(state, u.id, node))) { renderer.popup(node.x, node.y, u.callsign + ' → сюда', true); audio.ack(); } }
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
  KeyG: dispatchBest, KeyF: () => actions.follow(), KeyR: () => actions.rest(), KeyP: () => actions.patrol(), KeyB: () => showShop(), KeyH: showHelp, KeyK: toggleSpike,
  KeyQ: () => actions.approach({i: 0}), KeyE: () => actions.approach({i: 1}),
  Tab: e => { view.unit = cycle(state.units, view.unit, e.shiftKey ? -1 : 1); const u = selectedUnit(); if (u) renderer.focus(u); refresh(true); },
  KeyC: () => { const live = sim.liveCalls(state); view.call = cycle(live, view.call); const c = selectedCall(); if (c) renderer.focus(state.suspects.find(x => x.id === c.suspectId) ?? c); refresh(true); },
  KeyZ: () => renderer.rotate(-Math.PI / 8), KeyX: () => renderer.rotate(Math.PI / 8),
  Home: () => renderer.overview(), KeyV: () => actions.heat(), KeyM: () => toast(audio.toggleMute() ? 'Звук выключен' : 'Звук включён'),
  Equal: () => renderer.zoom(1.35), NumpadAdd: () => renderer.zoom(1.35), Minus: () => renderer.zoom(1 / 1.35), NumpadSubtract: () => renderer.zoom(1 / 1.35),
};
document.addEventListener('keyup', e => held.delete(e.code)); window.addEventListener('blur', () => held.clear());
document.addEventListener('keydown', e => {
  audio.unlock();
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && overlay === 'title') { e.preventDefault(); (document.querySelector('#card .menu button.primary'))?.click(); return; }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (view.spike) { view.spike = false; refresh(true); return; }
    if (['title', 'over', 'won', 'summary'].includes(overlay)) return;
    if (overlay) { if (state?.phase === 'summary') showSummary(); else if (state) closeOverlay(); else showTitle(); } else if (state) showMenu();
    return;
  }
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
    else if (e.type === 'arrived') { const c = s.calls.find(c => c.id === e.id); if (c && sim.playerDecides(s, c)) { audio.click(); view.call = e.id; toast(e.standoff ? 'Подозреваемый не подчиняется — идут переговоры' : 'Экипаж на месте — выберите действие', e.standoff ? 'bad' : ''); } }
    else if (e.type === 'surrender') { audio.good(); toast('Подозреваемый сдался!', 'good'); }
    else if (e.type === 'spotted') { view.call = e.id; toast('Ваш экипаж заметил нарушение!', 'good'); }
    else if (e.type === 'resolved') { if (e.own || s.rank >= 3) audio.good(); renderer.popup(e.x, e.y, e.text, true); }
    else if (e.type === 'failed') { if (e.own || s.rank >= 3) audio.bad(); renderer.popup(e.x, e.y, e.text, false); }
    else if (e.type === 'case') toast('Открыто новое дело — зона поиска на карте', '');
    else if (e.type === 'solved') { audio.rank(); toast('Дело раскрыто!', 'good'); }
    else if (e.type === 'wrongful') { audio.bad(); toast('Суд оправдал задержанного — улик не хватило', 'bad'); }
    else if (e.type === 'fight') { audio.alert(); toast('Вооружённое сопротивление!', 'bad'); }
    else if (e.type === 'injured') { audio.alert(); renderer.popup(e.x, e.y, 'Сотрудник ранен', false); }
    else if (e.type === 'crash') { audio.bad(); renderer.popup(e.x, e.y, 'Авария в погоне', false); }
    else if (e.type === 'wave') { audio.alert(); toast('Оперативная сводка: волна преступности', 'bad'); }
    else if (e.type === 'crisis') { audio.alert(); toast('Кризис в городе — подробности во вкладке «Город»', 'bad'); }
    else if (e.type === 'crisisWon') { audio.rank(); toast('Кризис преодолён!', 'good'); }
    else if (e.type === 'complaint') { audio.bad(); toast('На полицию подана жалоба', 'bad'); }
    else if (e.type === 'pursuit') { audio.alert(); view.call = e.id; toast('Подозреваемый уходит! Погоня' + (s.spikesLeft && (s.rank >= 1 || s.mode !== 'career') ? ' — шипы: K' : ''), 'bad'); }
    else if (e.type === 'arrest' && e.spike) toast('Беглец налетел на шипы!', 'good');
    else if (e.type === 'rank') { audio.rank(); if (s.mode === 'career' && !overlay) showRankUp(); else toast('Повышение: ' + RANKS[s.rank].title + '!', 'good'); }
    else if (e.type === 'shiftEnd') { audio.rank(); save(); showSummary(); }
    else if (e.type === 'won') { audio.rank(); save(); showWon(); }
    else if (e.type === 'over') { audio.bad(); save(); showOver(); }
  }
}
// звук подсказывает о скрытом преступлении рядом с камерой
function hiddenHint(now) {
  if (now - hintAt < 3500 || !state || overlay || paused) return; hintAt = now;
  const cam = renderer.camera(); if (cam.dist > 1600) return;
  const near = state.calls.find(c => c.state === 'hidden' && Math.hypot(c.x * METRES - cam.tx, c.y * METRES - cam.tz) < cam.dist * 0.6);
  if (near) audio.hint();
}

// ---------- главный цикл ----------
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  if (!document.hidden) {
    const world = state ?? demo, running = state ? state.phase === 'shift' && !paused && !overlay : true, dt = real * RATE * (state ? speed : 1);
    if (running) sim.tick(world, dt);
    if (!overlay || !state) view.traffic.step(real * 1.6);
    handleEvents(world);
    if (!state) { const t = now / 1000; renderer.focus({x: STATION.x + Math.cos(t / 40) * 0.12, y: STATION.y + Math.sin(t / 40) * 0.09}); renderer.rotate(real * 0.05); }
    else if (held.size && !overlay) { let dx = 0, dy = 0; for (const k of held) { dx += PAN[k][0]; dy += PAN[k][1]; } renderer.pan(dx * 900 * real, dy * 900 * real); }
    renderer.draw(world, state ? view : {unit: null, call: null, traffic: view.traffic, decides: () => false}, real);
    if (state) {
      const loud = x => x && (x.status === 'enroute' || x.status === 'pursuit'), followed = state.units.find(x => x.id === renderer.following());
      audio.siren(running && (loud(sim.playerUnit(state)) || loud(followed)));
      if (now - uiAt > 200) { uiAt = now; refresh(); }
      if (now - saveAt > 20000) { saveAt = now; if (state.phase === 'shift') save(); }
      hiddenHint(now);
    }
  }
  requestAnimationFrame(frame);
}
renderer.focus(STATION, 1500);
showTitle();
document.body.classList.add('ready');
requestAnimationFrame(frame);
window.__game = {get state() { return state; }, sim, renderer, METRES};
