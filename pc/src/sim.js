// Симуляция: карьера игрока, экипажи, вызовы, погони, районы, расследования, экономика, смены.
// Без DOM — работает и в тестах.
import {CALLS, RANKS, VEHICLES, UPGRADES, POLICIES, PERKS, CASE_TYPES, SURNAMES, INITIALS} from './content.js';
import {METRES, STATION, DISTRICTS, callNodes, districtNodes, nodeById, nearestNode, route, routeSeconds, edgeBetween, placeName} from './world.js';

export const SAVE_VERSION = 2;
export const SHIFT_SECONDS = 8 * 3600;
const MIN = 60;

// ---------- случайность (сохраняется вместе с игрой) ----------
export function rnd(s) { s.seed = (s.seed + 0x6D2B79F5) | 0; let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (s, list) => list[Math.floor(rnd(s) * list.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- создание ----------
function makeCrew(s) {
  const traits = ['talk', 'drive', 'invest', 'force'];
  return [0, 1].map(() => ({name: pick(s, INITIALS) + ' ' + pick(s, SURNAMES), trait: pick(s, traits)}));
}
function makeUnit(s, type) {
  const number = 10 + s.nextUnit++;
  return {id: s.nextId++, callsign: 'Экипаж ' + number, type, crew: makeCrew(s), skill: 0.55 + rnd(s) * 0.2,
    x: STATION.x, y: STATION.y, heading: 0, node: STATION, path: [], dest: null, speed: 0,
    status: 'patrol', callId: null, suspectId: null, fatigue: 5, busyUntil: 0, handled: 0, zone: -1, player: false};
}
export function createGame(seed = (Date.now() & 0x7fffffff), name = 'Вы') {
  const s = {v: SAVE_VERSION, seed, t: 18 * 3600, shift: 1, shiftEnd: 18 * 3600 + SHIFT_SECONDS, phase: 'shift',
    money: 2500, trust: 55, xp: 0, rank: 0, auto: false, units: [], calls: [], suspects: [], log: [], upgrades: {}, policies: {},
    player: {name: String(name).trim().slice(0, 24) || 'Вы', points: 0, perks: {talk: 0, invest: 0, force: 0, drive: 0}},
    districts: DISTRICTS.map((_, k) => ({crime: districtNodes[k].length ? 0 : -1})), cases: [], nextCase: 1,
    nextId: 1, nextUnit: 1, nextCallAt: 0, tutorial: 0, events: [],
    stats: newStats(), career: {resolved: 0, failed: 0, arrests: 0, shifts: 0, solved: 0, own: 0}};
  for (const d of s.districts) if (d.crime === 0) d.crime = 24 + rnd(s) * 30;
  s.units.push(makeUnit(s, 'sedan'), makeUnit(s, 'sedan'), makeUnit(s, 'sedan'));
  Object.assign(s.units[0], {player: true, skill: 0.6, crew: [{name: s.player.name, trait: 'you'}, {name: 'А. Морозов', trait: 'talk'}]});
  s.nextCallAt = s.t + 90;
  say(s, `Диспетчер: ${s.units[0].callsign}, добро пожаловать на службу. Наставник Морозов с вами — выходите на маршрут.`, 'info');
  return s;
}
function newStats() { return {resolved: 0, failed: 0, missed: 0, arrests: 0, escaped: 0, income: 0, responseSum: 0, responseN: 0, own: 0, xp: 0, solved: 0}; }

export function say(s, text, kind = 'info') { s.log.unshift({t: s.t, text, kind}); if (s.log.length > 60) s.log.length = 60; }
const emit = (s, e) => s.events.push(e);
export const unitCap = s => RANKS[s.rank].units;
export const callType = c => CALLS[c.type];
export const liveCalls = s => s.calls.filter(c => c.state !== 'done');
export const isFree = u => ['patrol', 'hold', 'returning'].includes(u.status);
export const clockText = t => { const m = Math.floor(t / 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const isNight = t => { const h = (t / 3600) % 24; return h >= 21 || h < 6; };
export const playerUnit = s => s.units.find(u => u.player) ?? null;
export const cityCrime = s => { const live = s.districts.filter(d => d.crime >= 0); return live.reduce((n, d) => n + d.crime, 0) / Math.max(1, live.length); };

// ---------- полномочия по званию ----------
export const canCommand = (s, u) => !!u && (u.player || s.rank >= 3);
export const canBackup = s => s.rank >= 2;
export const canZone = (s, u) => !!u && (s.rank >= 3 || (u.player && s.rank >= 1));
export const canManage = s => s.rank >= 4;
export const canPolicy = s => s.rank >= 5;
const DENIED = 'Этим экипажем командует диспетчер. Командование сменой откроется со званием «Сержант».';

// ---------- движение по графу ----------
function setRoute(m, target) {
  m.dest = target;
  if (m.path.length) { const next = m.path[0]; m.path = [next, ...route(next, target)]; }
  else m.path = route(m.node, target);
}
export function advance(m, dt, factor) {
  let travelled = 0;
  while (dt > 1e-6 && m.path.length) {
    const next = m.path[0], edge = edgeBetween(m.node, next), limit = (edge ? edge.speed : 30) / 3.6 * factor;
    const dx = next.x - m.x, dy = next.y - m.y, dist = Math.hypot(dx, dy) * METRES;
    const stopping = m.path.length === 1 ? Math.sqrt(2 * 5 * dist + 4) : Infinity, target = Math.min(limit, stopping);
    m.speed += clamp(target - m.speed, -7 * dt, 3.2 * dt);
    if (m.speed < 1.5) m.speed = 1.5;
    if (dist < 0.05) { m.x = next.x; m.y = next.y; m.node = m.path.shift(); continue; }
    m.heading = Math.atan2(dy, dx);
    const step = m.speed * dt;
    if (step >= dist) { m.x = next.x; m.y = next.y; m.node = m.path.shift(); dt -= dist / m.speed; travelled += dist; }
    else { m.x += dx / dist * step; m.y += dy / dist * step; travelled += step; dt = 0; }
  }
  if (!m.path.length) m.speed = 0;
  return travelled;
}

// ---------- расчёты для интерфейса ----------
function emergencyFactor(s, u) { return 1.6 * VEHICLES[u.type].speed * (s.upgrades.nav ? 1.1 : 1) * (u.player ? 1 + 0.05 * s.player.perks.drive : 1); }
export function eta(s, u, target) {
  const start = u.path.length ? u.path[0] : u.node, path = route(start, target);
  return routeSeconds(start, path) / emergencyFactor(s, u) + (u.path.length ? Math.hypot(u.x - start.x, u.y - start.y) * METRES / 12 : 0);
}
export const unitsOn = (s, call) => s.units.filter(u => u.callId === call.id && u.status === 'onscene');
export const unitsFor = (s, call) => s.units.filter(u => u.callId === call.id);
export function successChance(s, call, index, units = unitsOn(s, call)) {
  const type = callType(call), a = type.approaches[index];
  if (!a) return 0;
  if (!units.length) return a.p;
  const lead = units.reduce((best, u) => (u.skill > best.skill ? u : best), units[0]);
  let p = a.p - 0.06 + (lead.skill - 0.62) * 0.5;
  if (units.some(u => u.crew.some(o => o.trait === a.trait))) p += 0.12;
  if (units.some(u => u.player)) p += 0.06 * (s.player.perks[a.trait] ?? 0);
  p += Math.max(0, ...units.map(u => VEHICLES[u.type].bonus?.[a.trait] ?? 0));
  if (s.upgrades[a.trait]) p += 0.1;
  if (a.trait === 'force' && s.policies.hard) p += 0.08;
  if (a.trait === 'talk' && s.policies.community) p += 0.08;
  const needs = type.needs ?? 1;
  if (units.length >= 2) p += 0.1;
  if (units.length < needs) p -= 0.15 * (needs - units.length);
  const tired = Math.max(...units.map(u => u.fatigue));
  if (tired > 65) p -= (tired - 65) / 100 * 0.6;
  return clamp(p, 0.08, 0.97);
}
export function bestUnitFor(s, call, filter = null) {
  const node = nodeById(call.node);
  let best = null, bestEta = Infinity;
  for (const u of s.units) { if (!isFree(u) || u.fatigue >= 92 || (filter && !filter(u))) continue; const e = eta(s, u, node); if (e < bestEta) { bestEta = e; best = u; } }
  return best;
}

// ---------- команды ----------
export function dispatch(s, unitId, callId, by = 'player') {
  const u = s.units.find(u => u.id === unitId), c = s.calls.find(c => c.id === callId);
  if (!u || !c || c.state === 'done' || s.phase !== 'shift') return {ok: false, message: 'Вызов уже закрыт.'};
  if (by === 'player' && !canCommand(s, u)) {
    const mine = playerUnit(s);
    if (!canBackup(s)) return {ok: false, message: DENIED};
    if (!mine || mine.callId !== c.id) return {ok: false, message: 'Подкрепление можно вызвать только на вызов, где работает ваш экипаж.'};
  }
  if (u.callId === c.id) return {ok: false, message: u.callsign + ' уже работает по этому вызову.'};
  if (!isFree(u) && u.status !== 'enroute') return {ok: false, message: u.callsign + ' сейчас занят.'};
  if (u.status === 'enroute') release(s, u, false);
  u.callId = c.id;
  if (c.suspectId) { u.status = 'pursuit'; u.suspectId = c.suspectId; u.nextChase = 0; }
  else { u.status = 'enroute'; setRoute(u, nodeById(c.node)); }
  if (c.state === 'pending') { c.state = 'assigned'; c.assignedAt = s.t; }
  if (u.player) c.own = true;
  if (by === 'ai') c.auto = true;
  say(s, `${u.callsign}: принял, выезжаю — ${callType(c).name.toLowerCase()}.`, 'unit');
  if (by === 'player') emit(s, {type: 'dispatch'});
  return {ok: true};
}
export function moveUnit(s, unitId, node) {
  const u = s.units.find(u => u.id === unitId);
  if (!u || !node) return {ok: false};
  if (!canCommand(s, u)) return {ok: false, message: DENIED};
  if (!['patrol', 'hold', 'returning', 'enroute'].includes(u.status)) return {ok: false, message: 'Экипаж занят и не может сменить маршрут.'};
  if (u.status === 'enroute') release(s, u, false);
  u.status = 'hold'; setRoute(u, node);
  return {ok: true};
}
export function setPatrol(s, unitId) {
  const u = s.units.find(u => u.id === unitId);
  if (!u || !canCommand(s, u) || !['hold', 'returning', 'resting', 'enroute'].includes(u.status)) return {ok: false};
  if (u.status === 'enroute') release(s, u, false);
  u.status = 'patrol'; u.path = u.path.slice(0, 1); return {ok: true};
}
export function sendRest(s, unitId) {
  const u = s.units.find(u => u.id === unitId);
  if (!u) return {ok: false};
  if (!canCommand(s, u)) return {ok: false, message: DENIED};
  if (!['patrol', 'hold', 'enroute'].includes(u.status)) return {ok: false, message: 'Экипаж занят.'};
  if (u.status === 'enroute') release(s, u, false);
  u.status = 'returning'; setRoute(u, STATION);
  say(s, `${u.callsign}: возвращаемся в участок на отдых.`, 'unit');
  return {ok: true};
}
export function setZone(s, unitId, zone) {
  const u = s.units.find(u => u.id === unitId);
  if (!u || !Number.isInteger(zone) || zone < -1 || zone >= DISTRICTS.length || (zone >= 0 && !districtNodes[zone].length)) return {ok: false};
  if (!canZone(s, u)) return {ok: false, message: u.player ? 'Район патрулирования можно выбирать со звания «Патрульный».' : DENIED};
  u.zone = zone; if (u.status === 'patrol') u.path = u.path.slice(0, 1);
  return {ok: true};
}
// Игрок выбирает действие, только если на месте есть экипаж под его командой.
export const playerDecides = (s, c) => { const on = unitsOn(s, c); return on.some(u => u.player) || (!s.auto && on.some(u => canCommand(s, u))); };
export function chooseApproach(s, callId, index, by = 'player') {
  const c = s.calls.find(c => c.id === callId), a = c && callType(c).approaches[index];
  if (!c || !a || c.state !== 'choice') return {ok: false};
  if (by === 'player' && !unitsOn(s, c).some(u => canCommand(s, u))) return {ok: false, message: 'На месте нет экипажа под вашей командой.'};
  c.approach = index; c.state = 'active'; c.work = callType(c).work * MIN * (a.time ?? 1) * (s.policies.community ? 1.15 : 1); c.progress = 0;
  if (by === 'ai') c.auto = true;
  say(s, `На месте выбрано: ${a.label.toLowerCase()}.`, 'unit');
  return {ok: true};
}
export function spendPoint(s, perk) {
  if (!PERKS[perk] || s.player.points < 1 || s.player.perks[perk] >= 3) return {ok: false, message: 'Нет свободных очков или навык на максимуме.'};
  s.player.points--; s.player.perks[perk]++; return {ok: true};
}
export function setPolicy(s, id, on) {
  if (!canPolicy(s) || !POLICIES.some(p => p.id === id)) return {ok: false, message: 'Политику отделения определяет капитан.'};
  s.policies[id] = !!on; return {ok: true};
}

// ---------- покупки (с лейтенанта) ----------
const MANAGE = 'Управление отделением откроется со званием «Лейтенант».';
export function buyUnit(s, type) {
  const v = VEHICLES[type];
  if (!v) return {ok: false, message: 'Неизвестная машина.'};
  if (!canManage(s)) return {ok: false, message: MANAGE};
  if (s.rank < v.rank) return {ok: false, message: 'Откроется со званием «' + RANKS[v.rank].title + '».'};
  if (s.units.length >= unitCap(s)) return {ok: false, message: 'Лимит экипажей для вашего звания: ' + unitCap(s) + '.'};
  if (s.money < v.cost) return {ok: false, message: 'Не хватает бюджета.'};
  s.money -= v.cost; const u = makeUnit(s, type); s.units.push(u);
  say(s, `В отделение прибыл ${u.callsign} (${v.short}).`, 'good');
  return {ok: true, unit: u};
}
export function buyUpgrade(s, id) {
  const up = UPGRADES.find(u => u.id === id);
  if (!up || s.upgrades[id]) return {ok: false, message: 'Уже куплено.'};
  if (!canManage(s)) return {ok: false, message: MANAGE};
  if (s.rank < up.rank) return {ok: false, message: 'Откроется со званием «' + RANKS[up.rank].title + '».'};
  if (s.money < up.cost) return {ok: false, message: 'Не хватает бюджета.'};
  s.money -= up.cost; s.upgrades[id] = true; say(s, 'Отделение получило улучшение: ' + up.name + '.', 'good');
  return {ok: true};
}
export const trainCost = u => Math.round(250 + (u.skill - 0.5) * 900);
export function trainUnit(s, unitId) {
  const u = s.units.find(u => u.id === unitId);
  if (!u) return {ok: false};
  if (!canManage(s)) return {ok: false, message: MANAGE};
  if (u.skill >= 0.95) return {ok: false, message: 'Экипаж уже на пике формы.'};
  const cost = trainCost(u);
  if (s.money < cost) return {ok: false, message: 'Не хватает бюджета.'};
  s.money -= cost; u.skill = Math.min(0.95, u.skill + 0.06);
  return {ok: true};
}

// ---------- вызовы ----------
function spawnCall(s, forced = null, at = null, caseId = null) {
  const night = isNight(s.t);
  let key = forced;
  if (!key) {
    const pool = Object.entries(CALLS).filter(([, c]) => c.rank <= s.rank && !c.special);
    const weight = c => (night ? c.n : c.d) * (c.sev === 3 ? cityGrowth(s) : 1);
    let total = 0; for (const [, c] of pool) total += weight(c);
    let roll = rnd(s) * total;
    for (const [k, c] of pool) { roll -= weight(c); if (roll <= 0) { key = k; break; } }
    key ??= pool[0][0];
  }
  let node = at;
  if (!node) { // чем выше преступность района, тем чаще там происшествия
    let total = 0; s.districts.forEach(d => { if (d.crime >= 0) total += d.crime + 12; });
    let roll = rnd(s) * total, district = 0;
    for (let k = 0; k < s.districts.length; k++) { if (s.districts[k].crime < 0) continue; roll -= s.districts[k].crime + 12; district = k; if (roll <= 0) break; }
    node = pick(s, districtNodes[district]);
  }
  const type = CALLS[key], wait = type.wait * MIN * (s.upgrades.radio ? 1.25 : 1);
  const c = {id: s.nextId++, type: key, node: node.id, x: node.x, y: node.y, district: node.district, place: placeName(node), created: s.t, deadline: s.t + wait, wait,
    state: 'pending', approach: null, progress: 0, work: 0, choiceAt: 0, suspectId: null, assignedAt: null, auto: false, own: false, caseId};
  s.calls.push(c);
  if (type.pursuit) spawnSuspect(s, c, node);
  say(s, `${caseId ? 'По делу' : 'Новый вызов'}: ${type.name} — ${c.place}.`, type.sev === 3 ? 'alert' : 'call');
  emit(s, {type: 'call', sev: type.sev, id: c.id});
  return c;
}
function spawnSuspect(s, c, node) {
  const sus = {id: s.nextId++, callId: c.id, x: node.x, y: node.y, heading: 0, node, path: [], dest: null, speed: 8, meter: 0, until: s.t + 16 * MIN};
  s.suspects.push(sus); c.suspectId = sus.id; c.deadline = sus.until; c.wait = 16 * MIN;
  for (const u of unitsFor(s, c)) { u.status = 'pursuit'; u.suspectId = sus.id; u.nextChase = 0; }
  return sus;
}
function release(s, u, toPatrol = true) {
  u.callId = null; u.suspectId = null;
  if (toPatrol) { u.status = u.fatigue >= 92 ? 'returning' : 'patrol'; u.path = u.path.slice(0, 1); if (u.status === 'returning') setRoute(u, STATION); }
}
function gainXp(s, amount) {
  amount = Math.round(amount); if (amount <= 0) return 0;
  s.xp += amount; s.stats.xp += amount;
  while (s.rank < RANKS.length - 1 && s.xp >= RANKS[s.rank + 1].xp) {
    s.rank++; s.player.points++;
    say(s, `Повышение! Новое звание: ${RANKS[s.rank].title}. ${RANKS[s.rank].perk}`, 'good'); emit(s, {type: 'rank'});
    // до лейтенанта город сам усиливает смену
    if (s.rank === 3) { s.auto = true; say(s, 'Теперь вы командуете сменой. Автодиспетчер включён — отключите его, чтобы распределять экипажи самому.', 'info'); }
    if (s.rank < 4 && s.units.length < unitCap(s)) { const u = makeUnit(s, 'sedan'); s.units.push(u); say(s, `Смену усилили: на линию вышел ${u.callsign}.`, 'info'); }
  }
  return amount;
}
const crimeShift = (s, district, delta) => { const d = s.districts[district]; if (d && d.crime >= 0) d.crime = clamp(d.crime + delta, 4, 100); };
function reward(s, c, success, extra = {}) {
  const type = callType(c), sev = type.sev;
  // Опыт: полный — если работал экипаж игрока; с сержанта идёт и «командирский» опыт за чужие вызовы.
  const share = c.own ? 1 : s.rank >= 3 ? (c.auto ? 0.35 : 0.6) : 0;
  if (success) {
    const money = canManage(s) ? 15 * sev + (extra.arrest ? 20 : 0) : 0, xp = gainXp(s, (8 * sev + (extra.arrest ? 5 : 0)) * share);
    s.money += money; s.stats.income += money; s.trust = clamp(s.trust + ((sev === 3 ? 0.9 : 0.45) + (s.upgrades.cam && sev >= 2 ? 0.5 : 0)) * Math.max(0.25, 1 - s.trust / 135), 0, 100);
    s.stats.resolved++; s.career.resolved++; if (c.own) { s.stats.own++; s.career.own++; }
    crimeShift(s, c.district, -(1 * sev + (extra.arrest ? 2 : 0)));
    emit(s, {type: 'resolved', x: c.x, y: c.y, text: xp ? '+' + xp + ' опыта' : 'Вызов закрыт', own: c.own});
  } else {
    s.trust = clamp(s.trust - (sev * 1.5 + (extra.missed ? sev * 0.5 + 0.5 : 0) + (s.policies.hard ? 1 : 0)) * (0.5 + 0.5 * Math.min(1, s.trust / 70)), 0, 100); // у дна потери мягче — есть шанс отыграться gainXp(s, 2 * share);
    if (extra.missed) s.stats.missed++; else s.stats.failed++;
    s.career.failed++; crimeShift(s, c.district, (extra.missed ? 4 : 2.5) * sev);
    emit(s, {type: 'failed', x: c.x, y: c.y, text: extra.missed ? 'Вызов пропущен' : 'Неудача', own: c.own});
  }
  if (c.caseId) caseProgress(s, c, success);
  else if (!success && CASE_TYPES.has(c.type) && s.rank >= 2 && s.cases.filter(k => k.state === 'open').length < 3) openCase(s, c);
}
function closeCall(s, c, text, kind) {
  c.state = 'done'; c.closedAt = s.t; c.outcome = text;
  for (const u of unitsFor(s, c)) if (u.status !== 'transport') release(s, u);
  s.suspects = s.suspects.filter(x => x.callId !== c.id);
  say(s, `${callType(c).name}: ${text}`, kind);
}
function arrest(s, c, u) {
  s.stats.arrests++; s.career.arrests++;
  if (u) { u.status = 'transport'; u.callId = null; u.suspectId = null; setRoute(u, STATION); }
}
function credit(units) { for (const u of units) { u.handled++; u.skill = Math.min(0.95, u.skill + 0.004); } } // экипажи растут с практикой
function resolve(s, c) {
  const type = callType(c), a = type.approaches[c.approach], on = unitsOn(s, c), p = successChance(s, c, c.approach, on);
  credit(on);
  if (rnd(s) < p) {
    if (a.arrest) { arrest(s, c, on.find(u => !u.player) ?? on[0]); reward(s, c, true, {arrest: true}); closeCall(s, c, 'нарушитель задержан, экипаж везёт его в участок.', 'good'); }
    else { reward(s, c, true); closeCall(s, c, 'ситуация улажена, заявитель благодарит.', 'good'); }
  } else if (a.flee) {
    spawnSuspect(s, c, nodeById(c.node)); c.state = 'assigned';
    say(s, `${type.name}: подозреваемый прорвался к машине и уходит! Погоня.`, 'alert'); emit(s, {type: 'pursuit', id: c.id});
  } else { reward(s, c, false); closeCall(s, c, 'не удалось помочь. Доверие жителей снизилось.', 'bad'); }
}

// ---------- расследования ----------
function openCase(s, c) {
  const k = {id: s.nextCase++, title: callType(c).name, district: c.district, stage: 0, fails: 0, state: 'open', nextAt: s.t + (12 + rnd(s) * 14) * MIN, opened: s.t};
  s.cases.push(k); if (s.cases.length > 12) s.cases.shift();
  say(s, `Открыто дело №${k.id}: ${k.title.toLowerCase()}, ${DISTRICTS[k.district].name}. Скоро появятся зацепки.`, 'call'); emit(s, {type: 'case'});
}
function caseProgress(s, c, success) {
  const k = s.cases.find(k => k.id === c.caseId);
  if (!k || k.state !== 'open') return;
  if (success && c.type === 'raid') {
    k.state = 'solved'; s.trust = clamp(s.trust + 4, 0, 100); if (canManage(s)) { s.money += 200; s.stats.income += 200; } s.stats.solved++; s.career.solved++;
    crimeShift(s, k.district, -14); gainXp(s, c.own ? 40 : s.rank >= 3 ? 20 : 0);
    say(s, `Дело №${k.id} раскрыто! Преступность в районе ${DISTRICTS[k.district].name} заметно упала.`, 'good'); emit(s, {type: 'solved'});
  } else if (success) { k.stage++; k.nextAt = s.t + (8 + rnd(s) * 10) * MIN; say(s, `Дело №${k.id}: зацепка подтвердилась (${k.stage} из 2).`, 'good'); }
  else if (++k.fails >= 2) { k.state = 'cold'; s.trust = clamp(s.trust - 2, 0, 100); say(s, `Дело №${k.id} зашло в тупик и отправлено в архив.`, 'bad'); }
  else { k.nextAt = s.t + 15 * MIN; say(s, `Дело №${k.id}: след потерян, ищем новую зацепку.`, 'info'); }
}
function tickCases(s) {
  for (const k of s.cases) {
    if (k.state !== 'open' || s.t < k.nextAt || s.calls.some(c => c.caseId === k.id && c.state !== 'done')) continue;
    const nodes = districtNodes[k.district];
    spawnCall(s, k.stage >= 2 ? 'raid' : 'lead', pick(s, nodes.length ? nodes : callNodes), k.id); k.nextAt = Infinity;
  }
}

// ---------- шаг симуляции ----------
function tickUnit(s, u, dt) {
  const v = VEHICLES[u.type], tire = (s.upgrades.rest ? 0.7 : 1) * (s.policies.presence ? 1.25 : 1) * dt / 3600;
  switch (u.status) {
    case 'patrol':
      // экипажи под диспетчером отдыхают заранее; свой экипаж и подчинённые без автодиспетчера — на усмотрение игрока
      if (u.fatigue >= (u.player || (canCommand(s, u) && !s.auto) ? 92 : 85)) { u.status = 'returning'; setRoute(u, STATION); say(s, `${u.callsign}: экипаж вымотан, едем в участок.`, 'unit'); break; }
      if (!u.path.length) {
        let target = null;
        if (u.zone >= 0 && districtNodes[u.zone].length) target = pick(s, districtNodes[u.zone]);
        for (let k = 0; k < 12 && !target; k++) { const n = pick(s, callNodes); if (Math.hypot(n.x - u.x, n.y - u.y) < 1.1 && n !== u.node) target = n; }
        setRoute(u, target ?? pick(s, callNodes));
      }
      advance(u, dt, 0.85 * v.speed); u.fatigue += 5 * tire;
      crimeShift(s, u.node.district, -9 * (s.policies.presence ? 1.4 : 1) * dt / 3600); // присутствие патруля
      break;
    case 'hold': advance(u, dt, 1 * v.speed); u.fatigue += 3 * tire; break;
    case 'enroute': {
      const c = s.calls.find(c => c.id === u.callId);
      if (!c || c.state === 'done') { release(s, u); break; }
      advance(u, dt, emergencyFactor(s, u)); u.fatigue += 9 * tire;
      if (!u.path.length) {
        u.status = 'onscene';
        if (c.state === 'assigned' || c.state === 'pending') {
          s.stats.responseSum += s.t - c.created; s.stats.responseN++;
          c.state = 'choice'; c.choiceAt = s.t;
          say(s, `${u.callsign}: на месте. ${callType(c).brief}`, 'unit');
          if (canCommand(s, u)) emit(s, {type: 'arrived', id: c.id});
        }
      }
      break;
    }
    case 'onscene': u.fatigue += 10 * tire; if (!s.calls.some(c => c.id === u.callId && c.state !== 'done')) release(s, u); break;
    case 'pursuit': {
      const sus = s.suspects.find(x => x.id === u.suspectId);
      if (!sus) { release(s, u); break; }
      if (s.t >= (u.nextChase ?? 0)) { setRoute(u, sus.path[0] ?? sus.node); u.nextChase = s.t + 3; }
      advance(u, dt, 1.75 * v.speed * (s.upgrades.nav ? 1.1 : 1)); u.fatigue += 14 * tire; break;
    }
    case 'transport':
      advance(u, dt, 1.1 * v.speed); u.fatigue += 6 * tire;
      if (!u.path.length) { u.status = 'booking'; u.busyUntil = s.t + 6 * MIN; }
      break;
    case 'booking': if (s.t >= u.busyUntil) { u.status = 'patrol'; say(s, `${u.callsign}: задержанный оформлен, снова на линии.`, 'unit'); } break;
    case 'returning': advance(u, dt, 1 * v.speed); if (!u.path.length) u.status = 'resting'; break;
    case 'resting': u.fatigue = Math.max(0, u.fatigue - 150 * dt / 3600); if (u.fatigue <= 8) { u.status = 'patrol'; say(s, `${u.callsign}: отдохнули, выходим на линию.`, 'unit'); } break;
  }
  u.fatigue = clamp(u.fatigue, 0, 100);
}
function tickSuspect(s, sus, dt) {
  const c = s.calls.find(c => c.id === sus.callId);
  if (!c) return;
  if (!sus.path.length) { let far = null; for (let k = 0; k < 8; k++) { const n = pick(s, callNodes); if (!far || Math.hypot(n.x - sus.x, n.y - sus.y) > Math.hypot(far.x - sus.x, far.y - sus.y)) far = n; } setRoute(sus, far); }
  advance(sus, dt, 1.42);
  const chasers = s.units.filter(u => u.suspectId === sus.id);
  let pressure = 0;
  for (const u of chasers) if (Math.hypot(u.x - sus.x, u.y - sus.y) * METRES < 90) pressure += VEHICLES[u.type].chase ?? 1;
  if (pressure) sus.meter += dt * pressure * (s.upgrades.spikes ? 1.5 : 1); else sus.meter = Math.max(0, sus.meter - dt * 0.5);
  if (sus.meter >= 40) {
    const near = chasers.slice().sort((a, b) => Math.hypot(a.x - sus.x, a.y - sus.y) - Math.hypot(b.x - sus.x, b.y - sus.y));
    credit(chasers); c.district = sus.node.district;
    arrest(s, c, near.find(u => !u.player) ?? near[0]); reward(s, c, true, {arrest: true}); closeCall(s, c, 'погоня окончена, нарушитель задержан!', 'good'); emit(s, {type: 'arrest'});
  } else if (s.t >= sus.until) {
    s.stats.escaped++; reward(s, c, false, {missed: !chasers.length}); closeCall(s, c, 'нарушитель скрылся.', 'bad');
  }
}
function tickCall(s, c, dt) {
  if (c.state === 'done' || c.suspectId) return;
  const type = callType(c), on = unitsOn(s, c);
  if (c.state === 'pending' || c.state === 'assigned') {
    if (s.t >= c.deadline) { reward(s, c, false, {missed: true}); closeCall(s, c, 'экипаж не успел. Заявитель остался без помощи.', 'bad'); }
    return;
  }
  if (!on.length) { c.state = unitsFor(s, c).length ? 'assigned' : 'pending'; c.deadline = Math.max(c.deadline, s.t + 5 * MIN); return; }
  if (c.state === 'choice') {
    const waitsPlayer = playerDecides(s, c);
    if ((!waitsPlayer && s.t - c.choiceAt > 1 * MIN) || s.t - c.choiceAt > 8 * MIN) {
      let best = 0; type.approaches.forEach((_, k) => { if (successChance(s, c, k, on) > successChance(s, c, best, on)) best = k; });
      chooseApproach(s, c.id, best, 'ai');
    }
    return;
  }
  c.progress += dt * (1 + 0.5 * (on.length - 1)) * (on.length < (type.needs ?? 1) ? 0.7 : 1);
  if (c.progress >= c.work) resolve(s, c);
}
// Диспетчер ведёт экипажи, которыми игрок не командует; с автодиспетчером — все, кроме машины игрока до сержанта.
function aiDispatch(s) {
  const mine = u => s.auto ? !u.player : !canCommand(s, u); // своей машиной игрок всегда управляет сам
  if (!s.units.some(u => mine(u) && isFree(u))) return;
  for (const c of s.calls) {
    if (c.state === 'done' || c.state === 'choice' || c.state === 'active') continue;
    const assigned = unitsFor(s, c).length, wanted = c.suspectId ? 2 : (callType(c).needs ?? 1), sev = callType(c).sev;
    const patience = assigned ? 3 * MIN : (sev === 3 ? 3 : 5) * MIN;
    if (assigned >= wanted || s.t - c.created < patience) continue;
    const u = bestUnitFor(s, c, mine);
    if (u) dispatch(s, u.id, c.id, 'ai');
  }
}
const cityGrowth = s => Math.min(1.5, 1 + 0.03 * (s.shift - 1));
function callInterval(s) {
  const pressure = 1.25 - cityCrime(s) / 200; // спокойный город — реже вызовы
  const base = Math.max(7, 12.5 - s.rank * 0.8) / (1 + Math.max(0, s.units.length - 3) * 0.13) * (isNight(s.t) ? 0.85 : 1) * pressure;
  return base / cityGrowth(s) * MIN * (0.55 + rnd(s) * 0.9);
}
export function tick(s, dt) {
  if (s.phase !== 'shift') return;
  for (let left = dt; left > 1e-6;) {
    const step = Math.min(2, left); left -= step; s.t += step;
    if (s.t >= s.nextCallAt && liveCalls(s).length < 3 + s.units.length) {
      spawnCall(s, s.tutorial === 0 ? 'noise' : s.tutorial === 1 ? 'accident' : null);
      if (s.tutorial < 2) s.tutorial++;
      s.nextCallAt = s.t + callInterval(s) * (s.tutorial < 2 ? 0.5 : 1);
    }
    const growth = (2 * (1 + 0.12 * Math.max(0, s.units.length - 3)) + 0.15 * s.rank) * step / 3600; // большой город сложнее удержать
    for (const d of s.districts) if (d.crime >= 0) d.crime = Math.min(100, d.crime + growth); // без присмотра преступность растёт
    for (const u of s.units) tickUnit(s, u, step);
    for (const sus of [...s.suspects]) tickSuspect(s, sus, step);
    for (const c of s.calls) tickCall(s, c, step);
    tickCases(s); aiDispatch(s);
    if (s.calls.length > 40) s.calls = s.calls.filter(c => c.state !== 'done' || s.t - c.closedAt < 120);
    if (s.trust <= 0) { s.phase = 'over'; say(s, 'Доверие города потеряно. Вас отстранили от службы.', 'bad'); emit(s, {type: 'over'}); return; }
    if (s.t >= s.shiftEnd) { endShift(s); return; }
  }
}

// ---------- смены ----------
export function shiftGrade(stats) {
  const total = stats.resolved + stats.failed + stats.missed, ratio = total ? stats.resolved / total : 0;
  if (!total) return {grade: '—', title: 'Тихая смена', bonus: 0};
  if (ratio >= 0.9) return {grade: 'A', title: 'Образцовая смена', bonus: 350};
  if (ratio >= 0.75) return {grade: 'B', title: 'Уверенная смена', bonus: 180};
  if (ratio >= 0.5) return {grade: 'C', title: 'Смена с потерями', bonus: 0};
  return {grade: 'D', title: 'Тяжёлая смена', bonus: 0};
}
function endShift(s) {
  const grade = shiftGrade(s.stats), grant = Math.round(200 + s.trust * 5), salaries = s.units.length * 220, upkeep = s.units.length * 60, crime = cityCrime(s);
  const mood = Math.round((42 - crime) / 9), point = ['A', 'B'].includes(grade.grade) && s.stats.own >= 3 ? 1 : 0;
  s.summary = {shift: s.shift, stats: {...s.stats}, grade, grant, salaries, upkeep, bonus: grade.bonus, before: s.money, crime, mood, point,
    response: s.stats.responseN ? s.stats.responseSum / s.stats.responseN : 0};
  if (canManage(s)) s.money = Math.max(0, s.money + grant + grade.bonus - salaries - upkeep);
  s.trust = clamp(s.trust + mood + (grade.grade === 'A' ? 2 : 0), 0, 100); s.player.points += point;
  s.summary.after = s.money; s.career.shifts++; s.phase = 'summary';
  for (const c of s.calls) if (c.state !== 'done') { c.state = 'done'; c.closedAt = s.t; c.outcome = 'передан следующей смене'; }
  for (const k of s.cases) if (k.state === 'open') k.nextAt = 0;
  s.suspects = [];
  say(s, `Смена ${s.shift} окончена. Оценка: ${grade.grade}.`, 'info'); emit(s, {type: 'shiftEnd'});
}
export function startNextShift(s) {
  if (s.phase !== 'summary') return;
  s.shift++; s.phase = 'shift'; s.stats = newStats(); s.calls = []; s.suspects = [];
  const startHour = s.shift % 2 ? 18 : 8, day = Math.floor(s.t / 86400) + 1;
  s.t = day * 86400 + startHour * 3600; s.shiftEnd = s.t + SHIFT_SECONDS; s.nextCallAt = s.t + 3 * MIN;
  for (const k of s.cases) if (k.state === 'open') k.nextAt = s.t + (10 + rnd(s) * 20) * MIN;
  for (const u of s.units) Object.assign(u, {x: STATION.x, y: STATION.y, node: STATION, path: [], dest: null, speed: 0, status: 'patrol', callId: null, suspectId: null, fatigue: 5});
  say(s, `Смена ${s.shift} началась в ${clockText(s.t)}. Удачи, ${RANKS[s.rank].title.toLowerCase()} ${s.player.name}.`, 'info');
}

// ---------- сохранение ----------
export function serialize(s) {
  const mover = m => ({...m, node: m.node.id, dest: m.dest?.id ?? null, path: undefined});
  return JSON.stringify({...s, events: [], units: s.units.map(mover), suspects: s.suspects.map(mover)});
}
export function deserialize(raw) {
  const s = JSON.parse(raw);
  if (!s || s.v !== SAVE_VERSION || !Array.isArray(s.units) || !Array.isArray(s.calls) || !Number.isFinite(s.t) || !s.player || !Array.isArray(s.districts) || s.districts.length !== DISTRICTS.length) throw Error('Несовместимое сохранение');
  const mover = m => {
    m.node = nodeById(m.node) ?? nearestNode(m.x, m.y); m.path = [];
    const dest = m.dest ? nodeById(m.dest) : null; m.dest = null;
    if (dest) setRoute(m, dest);
    return m;
  };
  s.units.forEach(mover); (s.suspects ??= []).forEach(mover); s.events = []; s.cases ??= []; s.policies ??= {};
  for (const k of s.cases) if (k.nextAt === null) k.nextAt = Infinity; // JSON не хранит Infinity
  s.calls = s.calls.filter(c => CALLS[c.type] && nodeById(c.node));
  for (const u of s.units) { if (!VEHICLES[u.type]) u.type = 'sedan'; if (u.callId && !s.calls.some(c => c.id === u.callId && c.state !== 'done')) { u.callId = null; u.suspectId = null; if (['enroute', 'onscene', 'pursuit'].includes(u.status)) u.status = 'patrol'; } }
  return s;
}
