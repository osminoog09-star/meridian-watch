// Симуляция Mercury Response 2.0: карьера, подразделения, снаряжение, политика, скрытая преступность,
// поведение подозреваемых, погони и шипы, расследования с уликами, информаторы и агенты, волны преступности,
// погода, газета, режимы и испытания. Без DOM — работает и в тестах.
import {CALLS, RANKS, VEHICLES, ROLES, GEAR, DEFAULT_GEAR, POLICY, DEFAULT_POLICY, UPGRADES, PERKS, CASE_TYPES, DIFFICULTY, CHALLENGES, SURNAMES, INITIALS, PAPER} from './content.js';
import {METRES, STATION, DISTRICTS, callNodes, districtNodes, nodeById, nearestNode, route, routeSeconds, edgeBetween, placeName} from './world.js';

export const SAVE_VERSION = 3;
export const SHIFT_SECONDS = 8 * 3600;
const MIN = 60;

// ---------- случайность (сохраняется вместе с игрой) ----------
export function rnd(s) { s.seed = (s.seed + 0x6D2B79F5) | 0; let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (s, list) => list[Math.floor(rnd(s) * list.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const perMinute = (p, dt) => 1 - Math.pow(1 - p, dt / 60);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * METRES;

// ---------- создание ----------
const CREW_TRAITS = {patrol: ['talk', 'drive', 'invest', 'force'], traffic: ['drive', 'drive', 'talk'], detective: ['invest', 'invest', 'talk'], swat: ['force', 'force', 'drive'], heli: ['drive', 'invest']};
function makeUnit(s, type) {
  const v = VEHICLES[type], number = 10 + s.nextUnit++, traits = CREW_TRAITS[v.role];
  const crew = [0, 1].map(() => ({name: pick(s, INITIALS) + ' ' + pick(s, SURNAMES), trait: pick(s, traits)}));
  return {id: s.nextId++, callsign: (v.role === 'heli' ? 'Сокол ' : 'Экипаж ') + number, type, crew, skill: 0.55 + rnd(s) * 0.2,
    x: STATION.x, y: STATION.y, heading: 0, node: STATION, path: [], dest: null, speed: 0, gear: {...DEFAULT_GEAR, ...(v.role === 'swat' ? {weapon: 'rifle', armor: 'heavy', kit: 'ram'} : v.role === 'traffic' ? {kit: 'radar'} : v.role === 'detective' ? {kit: 'forensics'} : {})},
    status: 'patrol', callId: null, suspectId: null, fatigue: 5, busyUntil: 0, handled: 0, zone: -1, waypoints: [], wp: 0, player: false};
}
export const roleOf = u => VEHICLES[u.type]?.role ?? 'patrol';
const isHeli = u => roleOf(u) === 'heli';
function newStats() { return {resolved: 0, failed: 0, missed: 0, arrests: 0, escaped: 0, income: 0, fines: 0, responseSum: 0, responseN: 0, own: 0, xp: 0, solved: 0, spotted: 0, unseen: 0, injuries: 0, wrongful: 0, crashes: 0, overkill: 0, events: []}; }

export function createGame(seed = (Date.now() & 0x7fffffff), name = 'Вы', opts = {}) {
  const mode = opts.mode ?? 'career', challenge = mode === 'challenge' ? CHALLENGES[opts.challenge] : null;
  const s = {v: SAVE_VERSION, seed, t: 18 * 3600, shift: 1, shiftEnd: 18 * 3600 + SHIFT_SECONDS, phase: 'shift', mode,
    settings: {difficulty: opts.difficulty ?? 'normal', crime: opts.crime ?? 1, waves: opts.waves ?? true},
    money: opts.money ?? challenge?.money ?? 2500, trust: 55, xp: 0, rank: 0, auto: false, units: [], calls: [], suspects: [], log: [], upgrades: {}, policy: {...DEFAULT_POLICY},
    player: {name: String(name).trim().slice(0, 24) || 'Вы', points: 0, perks: {talk: 0, invest: 0, force: 0, drive: 0}},
    districts: DISTRICTS.map((_, k) => ({crime: districtNodes[k].length ? 0 : -1})), cases: [], nextCase: 1, informants: {}, undercover: {}, spikes: [], spikesLeft: 0,
    weather: 'clear', wave: null, nextWaveAt: 0, challenge: challenge ? {id: opts.challenge, shiftsLeft: challenge.shifts} : null, challengeStats: {pursuitArrests: 0, injuries: 0},
    nextId: 1, nextUnit: 1, nextCallAt: 0, tutorial: mode === 'career' ? 0 : 2, events: [],
    stats: newStats(), career: {resolved: 0, failed: 0, arrests: 0, shifts: 0, solved: 0, own: 0}};
  for (const d of s.districts) if (d.crime === 0) d.crime = 24 + rnd(s) * 30;
  if (mode === 'career') {
    s.units.push(makeUnit(s, 'sedan'), makeUnit(s, 'sedan'), makeUnit(s, 'sedan'));
    Object.assign(s.units[0], {player: true, skill: 0.6, crew: [{name: s.player.name, trait: 'you'}, {name: 'А. Морозов', trait: 'talk'}]});
    say(s, `Диспетчер: ${s.units[0].callsign}, добро пожаловать на службу. Наставник Морозов с вами — выходите на маршрут.`, 'info');
  } else {
    const rank = challenge?.rank ?? 4; s.rank = rank; s.xp = RANKS[rank].xp;
    for (const type of challenge?.units ?? ['sedan', 'sedan', 'sedan', 'unmarked', 'interceptor']) s.units.push(makeUnit(s, type));
    if (challenge?.start) { s.t = challenge.start * 3600; s.shiftEnd = s.t + SHIFT_SECONDS; }
    say(s, challenge ? `Испытание «${challenge.name}». ${challenge.goal}` : 'Песочница: вы — начальник отделения. Город ваш.', 'info');
  }
  s.weather = rollWeather(s); s.spikesLeft = spikeQuota(s); s.nextWaveAt = s.t + (100 + rnd(s) * 80) * MIN;
  s.nextCallAt = s.t + 90;
  return s;
}
function rollWeather(s) { const r = rnd(s); return r < 0.55 ? 'clear' : r < 0.8 ? 'cloudy' : 'rain'; }
const spikeQuota = s => (s.rank >= 1 || s.mode !== 'career' ? 2 : 0) + (s.upgrades.spikes ? 2 : 0);

export function say(s, text, kind = 'info') { s.log.unshift({t: s.t, text, kind}); if (s.log.length > 80) s.log.length = 80; }
const emit = (s, e) => s.events.push(e);
const note = (s, kind, text) => { s.stats.events.push({kind, text}); if (s.stats.events.length > 40) s.stats.events.shift(); };
export const unitCap = s => RANKS[s.rank].units;
export const callType = c => CALLS[c.type];
export const liveCalls = s => s.calls.filter(c => c.state !== 'done' && c.state !== 'hidden');
export const isFree = u => ['patrol', 'hold', 'returning'].includes(u.status);
export const clockText = t => { const m = Math.floor(t / 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const isNight = t => { const h = (t / 3600) % 24; return h >= 21 || h < 6; };
export const playerUnit = s => s.units.find(u => u.player) ?? null;
export const cityCrime = s => { const live = s.districts.filter(d => d.crime >= 0); return live.reduce((n, d) => n + d.crime, 0) / Math.max(1, live.length); };
const diff = s => DIFFICULTY[s.settings.difficulty] ?? DIFFICULTY.normal;

// ---------- полномочия по званию ----------
export const canCommand = (s, u) => !!u && (u.player || s.rank >= 3);
export const canBackup = s => s.rank >= 2;
export const canZone = (s, u) => !!u && (s.rank >= 3 || (u.player && s.rank >= 1));
export const canManage = s => s.rank >= 4;
export const canPolicy = s => s.rank >= 4;
export const informantSlots = s => s.rank < 2 ? 0 : 1 + (s.rank >= 4 ? 2 : 0) + (s.rank >= 6 ? 1 : 0);
export const undercoverSlots = s => s.rank < 3 ? 0 : s.rank >= 5 ? 2 : 1;
const DENIED = 'Этим экипажем командует диспетчер. Командование сменой откроется со званием «Сержант».';

// ---------- движение ----------
function setRoute(m, target) {
  m.dest = target;
  if (m.fly) { m.path = target ? [target] : []; return; }
  if (m.path.length) { const next = m.path[0]; m.path = [next, ...route(next, target)]; }
  else m.path = route(m.node, target);
}
export function advance(m, dt, factor) {
  let travelled = 0;
  if (m.fly) { // вертолёт: напрямую к цели
    const t = m.path[0]; if (!t) { m.speed = 0; return 0; }
    const d = dist(m, t), v = 55 * factor, step = v * dt; m.speed = v;
    m.heading = Math.atan2(t.y - m.y, t.x - m.x);
    if (step >= d) { m.x = t.x; m.y = t.y; m.node = t.i !== undefined ? t : nearestNode(t.x, t.y); m.path = []; m.speed = 0; return d; }
    m.x += (t.x - m.x) * step / d; m.y += (t.y - m.y) * step / d; return step;
  }
  while (dt > 1e-6 && m.path.length) {
    const next = m.path[0], edge = edgeBetween(m.node, next), limit = (edge ? edge.speed : 30) / 3.6 * factor;
    const dx = next.x - m.x, dy = next.y - m.y, d = Math.hypot(dx, dy) * METRES;
    const stopping = m.path.length === 1 ? Math.sqrt(2 * 5 * d + 4) : Infinity, target = Math.min(limit, stopping);
    m.speed += clamp(target - m.speed, -7 * dt, 3.2 * dt);
    if (m.speed < 1.5) m.speed = 1.5;
    if (d < 0.05) { m.x = next.x; m.y = next.y; m.node = m.path.shift(); continue; }
    m.heading = Math.atan2(dy, dx);
    const step = m.speed * dt;
    if (step >= d) { m.x = next.x; m.y = next.y; m.node = m.path.shift(); dt -= d / m.speed; travelled += d; }
    else { m.x += dx / d * step; m.y += dy / d * step; travelled += step; dt = 0; }
  }
  if (!m.path.length) m.speed = 0;
  return travelled;
}

// ---------- расчёты для интерфейса ----------
const weatherSpeed = s => s.weather === 'rain' ? 0.92 : 1;
function emergencyFactor(s, u) { return 1.6 * VEHICLES[u.type].speed * (s.upgrades.nav ? 1.1 : 1) * (u.player ? 1 + 0.05 * s.player.perks.drive : 1) * (GEAR.armor[u.gear?.armor]?.speed ?? 1) * weatherSpeed(s); }
export function eta(s, u, target) {
  if (isHeli(u)) return dist(u, target) / (55 * VEHICLES[u.type].speed * 1.6);
  const start = u.path.length ? u.path[0] : u.node, path = route(start, target);
  return routeSeconds(start, path) / emergencyFactor(s, u) + (u.path.length ? dist(u, start) / 12 : 0);
}
export const unitsOn = (s, call) => s.units.filter(u => u.callId === call.id && u.status === 'onscene');
export const unitsFor = (s, call) => s.units.filter(u => u.callId === call.id);
const roleFits = (type, units) => units.some(u => type.roles?.includes(roleOf(u)));
const TRAFFIC = new Set(['speeding', 'dui', 'accident', 'injury', 'race', 'suspicious']);
export function successChance(s, call, index, units = unitsOn(s, call)) {
  const type = callType(call), a = type.approaches[index];
  if (!a) return 0;
  let p = a.p - 0.06;
  if (units.length) {
    const lead = units.reduce((best, u) => (u.skill > best.skill ? u : best), units[0]);
    p += (lead.skill - 0.62) * 0.5;
    if (units.some(u => u.crew.some(o => o.trait === a.trait))) p += 0.12;
    if (units.some(u => u.player)) p += 0.06 * (s.player.perks[a.trait] ?? 0);
    p += Math.max(0, ...units.map(u => VEHICLES[u.type].bonus?.[a.trait] ?? 0));
    if (roleFits(type, units)) p += 0.08;
    else if (type.armed && !units.some(u => roleOf(u) === 'swat')) p -= 0.06;
    // снаряжение
    const gear = slot => units.map(u => u.gear?.[slot]);
    if (a.trait === 'force') p += Math.max(0, ...gear('weapon').map(w => GEAR.weapon[w]?.force ?? 0));
    if (call.reaction === 'fight' && a.trait === 'force') p += Math.max(0, ...gear('weapon').map(w => GEAR.weapon[w]?.fight ?? 0));
    if (gear('kit').includes('radar') && TRAFFIC.has(call.type)) p += 0.15;
    if (gear('kit').includes('medkit') && (a.med || call.type === 'injury')) p += 0.15;
    if (gear('kit').includes('forensics') && a.trait === 'invest') p += 0.15;
    if (gear('kit').includes('ram') && a.breach) p += 0.12;
    const tired = Math.max(...units.map(u => u.fatigue));
    if (tired > 65) p -= (tired - 65) / 100 * 0.6;
  }
  if (s.upgrades[a.trait]) p += 0.1;
  if (a.trait === 'force' && s.policy.force === 'hard') p += 0.08;
  if (a.trait === 'talk' && s.policy.force === 'soft') p += 0.08;
  if (a.trait === 'drive' && s.weather === 'rain') p -= 0.05;
  if (call.reaction === 'surrender') p += 0.15;
  if (call.reaction === 'fight' && a.trait !== 'force') p -= 0.12;
  const needs = type.needs ?? 1;
  if (units.length >= 2) p += 0.1;
  if (units.length < needs) p -= 0.15 * (needs - units.length);
  return clamp(p, 0.08, 0.97);
}
function score(s, u, c, target) {
  const type = callType(c); let e = eta(s, u, target);
  if (type.roles?.includes(roleOf(u))) e *= 0.65;
  if (roleOf(u) === 'swat' && type.minor) e *= 4;
  if (roleOf(u) === 'detective' && !['lead', 'homicide', 'missing', 'assault', 'drugs'].includes(c.type)) e *= 1.6;
  return e;
}
const canTake = (u, c) => !isHeli(u) || !!c.suspectId;
export function bestUnitFor(s, call, filter = null) {
  const target = call.suspectId ? (s.suspects.find(x => x.id === call.suspectId)?.node ?? nodeById(call.node)) : nodeById(call.node);
  let best = null, bestScore = Infinity;
  const urgent = call.deadline - s.t < 4 * MIN;
  for (const u of s.units) { if (!isFree(u) || u.fatigue >= 92 || !canTake(u, call) || (filter && !filter(u)) || (filter && roleOf(u) === 'swat' && callType(call).minor && !urgent)) continue; const e = score(s, u, call, target); if (e < bestScore) { bestScore = e; best = u; } }
  return best;
}

// ---------- команды игрока ----------
export function dispatch(s, unitId, callId, by = 'player') {
  const u = s.units.find(u => u.id === unitId), c = s.calls.find(c => c.id === callId);
  if (!u || !c || c.state === 'done' || c.state === 'hidden' || s.phase !== 'shift') return {ok: false, message: 'Вызов уже закрыт.'};
  if (by === 'player' && !canCommand(s, u)) {
    const mine = playerUnit(s);
    if (!canBackup(s)) return {ok: false, message: DENIED};
    if (!mine || mine.callId !== c.id) return {ok: false, message: 'Подкрепление можно вызвать только на вызов, где работает ваш экипаж.'};
  }
  if (!canTake(u, c)) return {ok: false, message: 'Вертолёт работает только в погонях.'};
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
  u.zone = zone; u.waypoints = []; if (u.status === 'patrol') u.path = u.path.slice(0, 1);
  return {ok: true};
}
export function addWaypoint(s, unitId, node) {
  const u = s.units.find(u => u.id === unitId);
  if (!u || !node) return {ok: false};
  if (!canZone(s, u)) return {ok: false, message: u.player ? 'Маршрут патрулирования можно задавать со звания «Патрульный».' : DENIED};
  if (u.waypoints.length >= 8) return {ok: false, message: 'В маршруте не больше 8 точек.'};
  u.waypoints.push({id: node.id, x: node.x, y: node.y}); u.zone = -1;
  if (u.status === 'patrol' && u.waypoints.length === 1) { u.wp = 0; u.path = u.path.slice(0, 1); }
  return {ok: true};
}
export function clearWaypoints(s, unitId) { const u = s.units.find(u => u.id === unitId); if (!u || !canZone(s, u)) return {ok: false}; u.waypoints = []; return {ok: true}; }
// Игрок выбирает действие, если на месте его машина или экипаж под его командой (без автодиспетчера).
export const playerDecides = (s, c) => { const on = unitsOn(s, c); return on.some(u => u.player) || (!s.auto && on.some(u => canCommand(s, u))); };
export function chooseApproach(s, callId, index, by = 'player') {
  const c = s.calls.find(c => c.id === callId), a = c && callType(c).approaches[index];
  if (!c || !a || c.state !== 'choice') return {ok: false};
  if (by === 'player' && !unitsOn(s, c).some(u => canCommand(s, u))) return {ok: false, message: 'На месте нет экипажа под вашей командой.'};
  c.approach = index; c.state = 'active';
  c.work = callType(c).work * MIN * (a.time ?? 1) * (s.policy.force === 'soft' && a.trait === 'talk' ? 1.1 : 1) * (c.reaction === 'surrender' ? 0.6 : 1); c.progress = 0;
  if (by === 'ai') c.auto = true;
  say(s, `На месте выбрано: ${a.label.toLowerCase()}.`, 'unit');
  return {ok: true};
}
export function spendPoint(s, perk) {
  if (!PERKS[perk] || s.player.points < 1 || s.player.perks[perk] >= 3) return {ok: false, message: 'Нет свободных очков или навык на максимуме.'};
  s.player.points--; s.player.perks[perk]++; return {ok: true};
}
export function setPolicy(s, axis, value) {
  if (!canPolicy(s)) return {ok: false, message: 'Политику отделения определяет лейтенант и выше.'};
  if (!POLICY[axis]?.options[value]) return {ok: false};
  s.policy[axis] = value; say(s, `Директива: ${POLICY[axis].name.toLowerCase()} — ${POLICY[axis].options[value].toLowerCase()}.`, 'info'); return {ok: true};
}

// ---------- инструменты ----------
export function placeSpike(s, node) {
  if (s.mode === 'career' && s.rank < 1) return {ok: false, message: 'Шипы выдают со звания «Патрульный».'};
  if (!s.suspects.length) return {ok: false, message: 'Шипы ставят только во время погони.'};
  if (s.spikesLeft < 1) return {ok: false, message: 'Комплекты шипов на эту смену закончились.'};
  if (!node) return {ok: false};
  s.spikesLeft--; s.spikes.push({id: s.nextId++, x: node.x, y: node.y, until: s.t + 12 * MIN});
  say(s, `Шипы выставлены у ${placeName(node)}.`, 'unit'); return {ok: true};
}
const districtsUsed = obj => Object.keys(obj).filter(k => obj[k]).length;
export function toggleInformant(s, k) {
  if (!districtNodes[k]?.length) return {ok: false};
  if (s.informants[k]) { delete s.informants[k]; return {ok: true}; }
  if (districtsUsed(s.informants) >= informantSlots(s)) return {ok: false, message: informantSlots(s) ? 'Все информаторы уже работают. Освободите одного.' : 'Информаторов вербуют со звания «Старший патрульный».'};
  s.informants[k] = true; say(s, `Завербован информатор: ${DISTRICTS[k].name}.`, 'good'); return {ok: true};
}
export function toggleUndercover(s, k) {
  if (!districtNodes[k]?.length) return {ok: false};
  if (s.undercover[k]) { delete s.undercover[k]; return {ok: true}; }
  if (districtsUsed(s.undercover) >= undercoverSlots(s)) return {ok: false, message: undercoverSlots(s) ? 'Все агенты уже внедрены. Отзовите одного.' : 'Агентов под прикрытием дают со звания «Сержант».'};
  s.undercover[k] = true; say(s, `Агент под прикрытием внедрён: ${DISTRICTS[k].name}.`, 'good'); return {ok: true};
}
export function arrestNow(s, caseId) {
  const k = s.cases.find(k => k.id === caseId);
  if (!k || k.state !== 'open') return {ok: false};
  if (s.rank < 2) return {ok: false, message: 'Ордер на арест подписывают со звания «Старший патрульный».'};
  if (k.evidence < 50) return {ok: false, message: 'Для ордера нужно хотя бы 50% улик.'};
  if (s.calls.some(c => c.caseId === k.id && c.state !== 'done')) return {ok: false, message: 'По делу уже идёт выезд.'};
  spawnRaid(s, k); return {ok: true};
}

// ---------- покупки и снаряжение (с лейтенанта) ----------
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
  s.money -= up.cost; s.upgrades[id] = true; if (id === 'spikes') s.spikesLeft += 2;
  say(s, 'Отделение получило улучшение: ' + up.name + '.', 'good');
  return {ok: true};
}
export function setGear(s, unitId, slot, item) {
  const u = s.units.find(u => u.id === unitId), def = GEAR[slot]?.[item];
  if (!u || !def) return {ok: false};
  if (!canManage(s)) return {ok: false, message: MANAGE};
  if (isHeli(u)) return {ok: false, message: 'Вертолёту снаряжение не выдаётся.'};
  if (u.gear[slot] === item) return {ok: true};
  if (s.money < def.cost) return {ok: false, message: 'Не хватает бюджета.'};
  s.money -= def.cost; u.gear[slot] = item; return {ok: true};
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
const WAVE_TYPES = {theft: ['shoplift', 'burglary', 'carjack', 'vandalism'], violence: ['fight', 'assault', 'shooting', 'domestic'], traffic: ['speeding', 'race', 'dui', 'accident'], gang: ['gang', 'drugs', 'shooting']};
const WAVE_NAMES = {theft: 'волна краж', violence: 'всплеск насилия', traffic: 'гонки и пьяные водители', gang: 'передел территории бандами'};
function weightOf(s, key, c, night) {
  let w = night ? c.n : c.d;
  if (c.sev === 3) w *= cityGrowth(s);
  if (s.weather === 'rain' && c.rain) w *= c.rain;
  const ch = s.challenge && CHALLENGES[s.challenge.id]; if (ch?.weights?.[key]) w *= ch.weights[key];
  if (s.wave && WAVE_TYPES[s.wave.kind]?.includes(key)) w *= 3;
  return w;
}
function spawnCall(s, forced = null, at = null, caseId = null) {
  const night = isNight(s.t);
  let key = forced;
  if (!key) {
    const pool = Object.entries(CALLS).filter(([, c]) => c.rank <= s.rank && !c.special);
    let total = 0; for (const [k, c] of pool) total += weightOf(s, k, c, night);
    let roll = rnd(s) * total;
    for (const [k, c] of pool) { roll -= weightOf(s, k, c, night); if (roll <= 0) { key = k; break; } }
    key ??= pool[0][0];
  }
  let node = at;
  if (!node) { // чем выше преступность района, тем чаще там происшествия; волна стягивает их в свой район
    let total = 0; s.districts.forEach(d => { if (d.crime >= 0) total += d.crime + 12; });
    let roll = rnd(s) * total, district = 0;
    for (let k = 0; k < s.districts.length; k++) { if (s.districts[k].crime < 0) continue; roll -= s.districts[k].crime + 12; district = k; if (roll <= 0) break; }
    if (s.wave && rnd(s) < 0.5) district = s.wave.district;
    node = pick(s, districtNodes[district]);
  }
  const type = CALLS[key], wait = type.wait * MIN * (s.upgrades.radio ? 1.25 : 1);
  const c = {id: s.nextId++, type: key, node: node.id, x: node.x, y: node.y, district: node.district, place: placeName(node), created: s.t, deadline: s.t + wait, wait,
    state: 'pending', approach: null, progress: 0, work: 0, choiceAt: 0, suspectId: null, assignedAt: null, auto: false, own: false, caseId, reaction: null, onView: false};
  s.calls.push(c);
  if (!forced && type.hidden && rnd(s) < type.hidden) { // о преступлении никто не звонит
    c.state = 'hidden'; const later = (8 + rnd(s) * 14) * MIN;
    if (type.vanish) c.vanishAt = s.t + later; else c.reportAt = s.t + later;
    return c;
  }
  announce(s, c);
  return c;
}
function announce(s, c) {
  const type = callType(c);
  if (type.pursuit && !c.suspectId) spawnSuspect(s, c, nodeById(c.node));
  say(s, `${c.caseId ? 'По делу' : c.onView ? 'Замечено на месте' : 'Новый вызов'}: ${type.name} — ${c.place}.`, type.sev === 3 ? 'alert' : 'call');
  emit(s, {type: 'call', sev: type.sev, id: c.id, onView: c.onView});
}
function spawnSuspect(s, c, node) {
  const until = s.t + 16 * MIN * (s.policy.pursuit === 'cautious' ? 0.8 : 1);
  const sus = {id: s.nextId++, callId: c.id, x: node.x, y: node.y, heading: 0, node, path: [], dest: null, speed: 8, meter: 0, until, started: s.t};
  s.suspects.push(sus); c.suspectId = sus.id; c.deadline = until; c.wait = until - s.t;
  if (c.state === 'choice' || c.state === 'active') c.state = 'assigned';
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
    s.rank++; s.player.points++; s.spikesLeft = Math.max(s.spikesLeft, spikeQuota(s));
    say(s, `Повышение! Новое звание: ${RANKS[s.rank].title}. ${RANKS[s.rank].perk}`, 'good'); emit(s, {type: 'rank'});
    if (s.mode !== 'career') continue;
    if (s.rank === 3) { s.auto = true; say(s, 'Теперь вы командуете сменой. Автодиспетчер включён — отключите его, чтобы распределять экипажи самому.', 'info'); }
    // до лейтенанта город сам усиливает смену профильными подразделениями
    const gift = s.rank === 2 ? 'unmarked' : s.rank === 3 ? 'interceptor' : null;
    if (gift && s.units.length < unitCap(s)) { const u = makeUnit(s, gift); s.units.push(u); say(s, `Смену усилили: на линию вышел ${u.callsign} (${VEHICLES[gift].short}).`, 'info'); }
  }
  return amount;
}
const crimeShift = (s, district, delta) => { const d = s.districts[district]; if (d && d.crime >= 0) d.crime = clamp(d.crime + delta, 4, 100); };
const trustGain = (s, v) => { s.trust = clamp(s.trust + v * Math.max(0.25, 1 - s.trust / 135), 0, 100); };
const trustLoss = (s, v) => { s.trust = clamp(s.trust - v * diff(s).loss * (0.5 + 0.5 * Math.min(1, s.trust / 70)), 0, 100); }; // у дна потери мягче — есть шанс отыграться
function reward(s, c, success, extra = {}) {
  const type = callType(c), sev = type.sev, on = extra.units ?? unitsOn(s, c);
  // Опыт: полный — если работал экипаж игрока; с сержанта идёт и «командирский» опыт за чужие вызовы.
  const share = (c.own ? 1 : s.rank >= 3 ? (c.auto ? 0.35 : 0.6) : 0) * (c.onView ? 1.3 : 1);
  if (success) {
    const a = type.approaches[c.approach] ?? {}, enforce = s.policy.enforcement, minorish = type.minor || a.fine || TRAFFIC.has(c.type);
    let money = canManage(s) ? 15 * sev + (extra.arrest ? 20 : 0) : 0;
    if (minorish && enforce === 'fine' && canManage(s)) { const fine = (on.some(u => u.gear?.kit === 'radar') ? 2 : 1) * 25; money += fine; s.stats.fines += fine; }
    const xp = gainXp(s, (8 * sev + (extra.arrest ? 5 : 0)) * share);
    s.money += money; s.stats.income += money;
    trustGain(s, (sev === 3 ? 0.9 : 0.45) + (s.upgrades.cam && sev >= 2 ? 0.5 : 0) + (c.onView ? 0.3 : 0) + (minorish && enforce === 'warn' ? 0.3 : 0));
    if (minorish && enforce === 'arrest' && extra.arrest) trustLoss(s, 0.3);
    s.stats.resolved++; s.career.resolved++; if (c.own) { s.stats.own++; s.career.own++; }
    crimeShift(s, c.district, -(1 * sev + (extra.arrest ? 2 : 0)) * (enforce === 'warn' ? 0.6 : enforce === 'arrest' ? 1.4 : 1));
    emit(s, {type: 'resolved', x: c.x, y: c.y, text: xp ? '+' + xp + ' опыта' + (money ? ' · +' + money + ' €' : '') : 'Вызов закрыт', own: c.own});
  } else {
    trustLoss(s, sev * 1.5 + (extra.missed ? sev * 0.5 + 0.5 : 0) + (s.policy.force === 'hard' ? 1 : 0)); gainXp(s, 2 * share);
    if (extra.missed) s.stats.missed++; else s.stats.failed++;
    s.career.failed++; crimeShift(s, c.district, (extra.missed ? 4 : 2.5) * sev);
    emit(s, {type: 'failed', x: c.x, y: c.y, text: extra.missed ? 'Вызов пропущен' : 'Неудача', own: c.own});
  }
  // перебор: спецназ или тяжёлое оружие на мелком вызове
  if (type.minor && on.some(u => roleOf(u) === 'swat' || GEAR.weapon[u.gear?.weapon]?.heavy)) {
    trustLoss(s, s.upgrades.cam ? 1 : 1.5); s.stats.overkill++; note(s, 'overkill', type.name);
    say(s, `Жители возмущены: спецсредства на вызове «${type.name.toLowerCase()}» — явный перебор.`, 'bad');
  }
  if (c.caseId) caseProgress(s, c, success);
  else if (type.opensCase) openCase(s, c, success ? 30 : 10);
  else if (success && type.approaches[c.approach]?.lead) openCase(s, c, 25);
  else if (!success && CASE_TYPES.has(c.type) && s.rank >= 2 && s.cases.filter(k => k.state === 'open').length < 4) openCase(s, c, 0);
}
function closeCall(s, c, text, kind) {
  c.state = 'done'; c.closedAt = s.t; c.outcome = text;
  for (const u of unitsFor(s, c)) if (!['transport', 'injured'].includes(u.status)) release(s, u);
  s.suspects = s.suspects.filter(x => x.callId !== c.id);
  say(s, `${callType(c).name}: ${text}`, kind);
}
function arrest(s, c, u, viaPursuit = false) {
  s.stats.arrests++; s.career.arrests++; if (viaPursuit) s.challengeStats.pursuitArrests++;
  if (u && !isHeli(u)) { u.status = 'transport'; u.callId = null; u.suspectId = null; setRoute(u, STATION); }
}
function credit(units) { for (const u of units) { u.handled++; u.skill = Math.min(0.95, u.skill + 0.004); } } // экипажи растут с практикой
function injure(s, u, cause) {
  u.status = 'injured'; u.callId = null; u.suspectId = null; u.injuredUntil = s.upgrades.hospital ? s.t + 2 * 3600 : Infinity;
  setRoute(u, STATION); s.stats.injuries++; s.challengeStats.injuries++; trustLoss(s, 2);
  note(s, 'injury', u.callsign); say(s, `${u.callsign}: сотрудник ранен (${cause}). Экипаж выбывает${s.upgrades.hospital ? ' на 2 часа' : ' до конца смены'}.`, 'bad');
  emit(s, {type: 'injured', x: u.x, y: u.y});
}
function shootout(s, c, on) {
  const medic = on.some(u => u.gear?.kit === 'medkit');
  for (const u of on) {
    const p = 0.22 * (GEAR.armor[u.gear?.armor]?.injury ?? 1) * (roleOf(u) === 'swat' ? 0.5 : 1) * (s.policy.force === 'soft' ? 0.85 : 1) * (medic ? 0.6 : 1);
    if (rnd(s) < p) injure(s, u, callType(c).name.toLowerCase());
  }
}
function resolve(s, c) {
  const type = callType(c), a = type.approaches[c.approach], on = unitsOn(s, c), p = successChance(s, c, c.approach, on);
  credit(on);
  if (c.reaction === 'fight') shootout(s, c, on);
  const standing = on.filter(u => u.status === 'onscene');
  if (rnd(s) < p) {
    if (a.arrest) { arrest(s, c, standing.find(u => !u.player) ?? standing[0]); reward(s, c, true, {arrest: true, units: on}); closeCall(s, c, 'нарушитель задержан, экипаж везёт его в участок.', 'good'); }
    else { reward(s, c, true, {units: on}); closeCall(s, c, 'ситуация улажена, заявитель благодарит.', 'good'); }
  } else if (a.flee && standing.length) {
    spawnSuspect(s, c, nodeById(c.node));
    say(s, `${type.name}: подозреваемый прорвался к машине и уходит! Погоня.`, 'alert'); emit(s, {type: 'pursuit', id: c.id});
  } else { reward(s, c, false, {units: on}); closeCall(s, c, 'не удалось помочь. Доверие жителей снизилось.', 'bad'); }
}
// реакция подозреваемого на прибытие полиции
function react(s, c) {
  const type = callType(c); if (!type.suspect) return;
  const on = unitsOn(s, c), swat = on.some(u => roleOf(u) === 'swat'), enough = on.length >= (type.needs ?? 1), force = s.policy.force;
  const surrender = 0.3 + (force === 'hard' ? 0.12 : 0) + (swat ? 0.2 : 0) + (enough ? 0.08 : 0);
  const fight = Math.max(0, (type.armed ? 0.3 : 0.05) + (force === 'soft' ? -0.1 : force === 'hard' ? 0.04 : 0) - (swat ? 0.08 : 0));
  const flee = Math.max(0, ((type.minor ? 0.04 : 0.16) + (force === 'soft' ? 0.08 : 0) - (enough ? 0.06 : 0)) * (c.type === 'raid' || c.type === 'hostage' ? 0.5 : 1));
  const r = rnd(s);
  if (r < surrender) { c.reaction = 'surrender'; say(s, `${type.name}: подозреваемый сдался без сопротивления.`, 'good'); }
  else if (r < surrender + fight) { c.reaction = 'fight'; say(s, `${type.name}: подозреваемый оказывает вооружённое сопротивление!`, 'alert'); emit(s, {type: 'fight', id: c.id}); }
  else if (r < surrender + fight + flee && type.approaches.some(a => a.flee || a.arrest)) {
    c.reaction = 'flee'; spawnSuspect(s, c, nodeById(c.node)); say(s, `${type.name}: подозреваемый увидел полицию и сбежал! Погоня.`, 'alert'); emit(s, {type: 'pursuit', id: c.id});
  } else c.reaction = 'calm';
}

// ---------- расследования ----------
function openCase(s, c, evidence) {
  if (s.rank < 2 && s.mode === 'career') return;
  if (s.cases.filter(k => k.state === 'open').length >= 5) return;
  const k = {id: s.nextCase++, title: callType(c).name, district: c.district, evidence, fails: 0, state: 'open', nextAt: s.t + (10 + rnd(s) * 12) * MIN, opened: s.t,
    search: {x: c.x, y: c.y, r: 450}};
  s.cases.push(k);
  if (s.cases.length > 14) { const old = s.cases.findIndex(x => x.state !== 'open'); if (old >= 0) s.cases.splice(old, 1); }
  say(s, `Открыто дело №${k.id}: ${k.title.toLowerCase()}, ${DISTRICTS[k.district].name}. Зона поиска отмечена на карте.`, 'call'); emit(s, {type: 'case'});
}
function spawnRaid(s, k) {
  const nodes = districtNodes[k.district], c = spawnCall(s, 'raid', pick(s, nodes.length ? nodes : callNodes), k.id);
  c.innocentRisk = clamp((100 - k.evidence) / 100 * 0.7, 0, 0.7); k.nextAt = Infinity;
}
function caseProgress(s, c, success) {
  const k = s.cases.find(k => k.id === c.caseId);
  if (!k || k.state !== 'open') return;
  const on = unitsFor(s, c).concat(unitsOn(s, c));
  if (c.type === 'raid') {
    if (success && rnd(s) < (c.innocentRisk ?? 0)) {
      k.state = 'cold'; trustLoss(s, 6); s.stats.wrongful++; note(s, 'wrongful', k.title);
      say(s, `Дело №${k.id}: суд оправдал задержанного — улик не хватило. Доверие подорвано.`, 'bad'); emit(s, {type: 'wrongful'}); return;
    }
    if (success) {
      k.state = 'solved'; trustGain(s, 4); if (canManage(s)) { s.money += 200; s.stats.income += 200; } s.stats.solved++; s.career.solved++;
      crimeShift(s, k.district, -14); gainXp(s, c.own ? 40 : s.rank >= 3 ? 20 : 0); note(s, 'solved', k.title);
      say(s, `Дело №${k.id} раскрыто! Преступность в районе ${DISTRICTS[k.district].name} заметно упала.`, 'good'); emit(s, {type: 'solved'}); return;
    }
    if (++k.fails >= 3) { k.state = 'cold'; say(s, `Дело №${k.id} зашло в тупик и отправлено в архив.`, 'bad'); } else k.nextAt = s.t + 15 * MIN;
    return;
  }
  if (success) {
    const gain = 22 + (on.some(u => roleOf(u) === 'detective') ? 14 : 0) + (on.some(u => u.gear?.kit === 'forensics') ? 8 : 0);
    k.evidence = Math.min(100, k.evidence + gain); k.nextAt = s.t + (8 + rnd(s) * 10) * MIN;
    say(s, `Дело №${k.id}: зацепка подтвердилась, улик ${Math.round(k.evidence)}%.`, 'good');
  } else if (++k.fails >= 3) { k.state = 'cold'; trustLoss(s, 2); say(s, `Дело №${k.id} зашло в тупик и отправлено в архив.`, 'bad'); }
  else { k.nextAt = s.t + 15 * MIN; say(s, `Дело №${k.id}: след потерян, ищем новую зацепку.`, 'info'); }
}
function tickCases(s, dt) {
  for (const k of s.cases) {
    if (k.state !== 'open') continue;
    // улики в зоне поиска: патрули, кинологи, детективы и информатор
    let rate = s.informants[k.district] ? 3 : 0;
    for (const u of s.units) {
      if (!['patrol', 'hold'].includes(u.status) || isHeli(u) || Math.hypot(u.x - k.search.x, u.y - k.search.y) * METRES > k.search.r) continue;
      rate += (roleOf(u) === 'detective' ? 4.5 : u.type === 'k9' ? 3 : 1.2) * (u.gear?.kit === 'forensics' ? 1.6 : 1);
    }
    k.evidence = Math.min(100, k.evidence + rate * dt / 3600);
    if (s.calls.some(c => c.caseId === k.id && c.state !== 'done')) continue;
    if (k.evidence >= 100) { spawnRaid(s, k); continue; }
    if (s.t >= k.nextAt) { const nodes = districtNodes[k.district]; spawnCall(s, 'lead', pick(s, nodes.length ? nodes : callNodes), k.id); k.nextAt = Infinity; }
  }
}

// ---------- скрытая преступность ----------
const SPOT = {patrol: 170, traffic: 210, detective: 120, swat: 120, heli: 700};
function tickHidden(s, dt) {
  for (const c of s.calls) {
    if (c.state !== 'hidden') continue;
    let spotter = null;
    for (const u of s.units) {
      if (['resting', 'injured', 'booking', 'transport', 'onscene'].includes(u.status)) continue;
      let r = SPOT[roleOf(u)] ?? 170; if (u.type === 'k9') r = 200;
      if (u.gear?.kit === 'radar' && TRAFFIC.has(c.type)) r *= 2;
      if (dist(u, c) <= r) { spotter = u; break; }
    }
    let chance = 0;
    if (s.undercover[c.district]) chance += 0.08;
    if (s.informants[c.district]) chance += 0.04;
    if (s.upgrades.cctv) chance += 0.015;
    if (!spotter && chance && rnd(s) < perMinute(chance, dt)) spotter = 'intel';
    if (spotter) {
      c.state = 'pending'; c.onView = true; c.created = s.t; c.deadline = s.t + c.wait; s.stats.spotted++;
      announce(s, c);
      if (spotter !== 'intel' && !spotter.player && isFree(spotter) && canTake(spotter, c) && (!canCommand(s, spotter) || s.auto)) dispatch(s, spotter.id, c.id, 'ai');
      if (spotter.player) emit(s, {type: 'spotted', id: c.id});
      continue;
    }
    if (c.vanishAt && s.t >= c.vanishAt) { c.state = 'done'; c.closedAt = s.t; c.outcome = 'никто не заметил'; s.stats.unseen++; crimeShift(s, c.district, 2); }
    else if (c.reportAt && s.t >= c.reportAt) { c.state = 'pending'; c.created = s.t; c.wait *= 0.7; c.deadline = s.t + c.wait; c.late = true; announce(s, c); }
  }
}

// ---------- шаг симуляции ----------
function patrolTarget(s, u) {
  if (u.waypoints.length) { const w = u.waypoints[u.wp % u.waypoints.length]; u.wp = (u.wp + 1) % u.waypoints.length; return nodeById(w.id) ?? nearestNode(w.x, w.y); }
  if (u.zone >= 0 && districtNodes[u.zone].length) return pick(s, districtNodes[u.zone]);
  for (let k = 0; k < 12; k++) { const n = pick(s, callNodes); if (dist(u, n) < 1800 && n !== u.node) return n; }
  return pick(s, callNodes);
}
function tickUnit(s, u, dt) {
  const v = VEHICLES[u.type], tire = (s.upgrades.rest ? 0.7 : 1) * (s.policy.patrol === 'intensive' ? 1.25 : 1) * dt / 3600, sp = v.speed * (GEAR.armor[u.gear?.armor]?.speed ?? 1) * weatherSpeed(s);
  u.fly = isHeli(u);
  switch (u.status) {
    case 'patrol':
      if (u.fatigue >= (u.player || (canCommand(s, u) && !s.auto) ? 92 : 85)) { u.status = 'returning'; setRoute(u, STATION); say(s, `${u.callsign}: экипаж вымотан, едем в участок.`, 'unit'); break; }
      if (!u.path.length) setRoute(u, patrolTarget(s, u));
      advance(u, dt, 0.85 * sp); u.fatigue += 5 * tire;
      if (!u.fly) crimeShift(s, u.node.district, -9 * (s.policy.patrol === 'intensive' ? 1.4 : 1) * dt / 3600); // присутствие патруля
      break;
    case 'hold': advance(u, dt, 1 * sp); u.fatigue += 3 * tire; break;
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
          react(s, c);
          if (c.state === 'choice' && canCommand(s, u)) emit(s, {type: 'arrived', id: c.id});
        }
      }
      break;
    }
    case 'onscene': u.fatigue += 10 * tire; if (!s.calls.some(c => c.id === u.callId && c.state !== 'done')) release(s, u); break;
    case 'pursuit': {
      const sus = s.suspects.find(x => x.id === u.suspectId);
      if (!sus) { release(s, u); break; }
      if (u.fly) { u.path = [{x: sus.x, y: sus.y}]; advance(u, dt, sp * 1.6); }
      else { if (s.t >= (u.nextChase ?? 0)) { setRoute(u, sus.path[0] ?? sus.node); u.nextChase = s.t + 3; } advance(u, dt, 1.75 * sp * (s.upgrades.nav ? 1.1 : 1)); }
      u.fatigue += 14 * tire; break;
    }
    case 'transport':
      advance(u, dt, 1.1 * sp); u.fatigue += 6 * tire;
      if (!u.path.length) { u.status = 'booking'; u.busyUntil = s.t + 6 * MIN; }
      break;
    case 'booking': if (s.t >= u.busyUntil) { u.status = 'patrol'; say(s, `${u.callsign}: задержанный оформлен, снова на линии.`, 'unit'); } break;
    case 'returning': advance(u, dt, 1 * sp); if (!u.path.length) u.status = 'resting'; break;
    case 'resting': u.fatigue = Math.max(0, u.fatigue - 150 * dt / 3600); if (u.fatigue <= 8) { u.status = 'patrol'; say(s, `${u.callsign}: отдохнули, выходим на линию.`, 'unit'); } break;
    case 'injured':
      if (u.path.length) advance(u, dt, 1 * sp);
      else if (s.t >= u.injuredUntil) { u.status = 'patrol'; u.fatigue = 20; say(s, `${u.callsign}: сотрудник выписан, экипаж снова на линии.`, 'good'); }
      break;
  }
  u.fatigue = clamp(u.fatigue, 0, 100);
}
function tickSuspect(s, sus, dt) {
  const c = s.calls.find(c => c.id === sus.callId);
  if (!c) return;
  if (!sus.path.length) { let far = null; for (let k = 0; k < 8; k++) { const n = pick(s, callNodes); if (!far || dist(n, sus) > dist(far, sus)) far = n; } setRoute(sus, far); }
  advance(sus, dt, 1.42 * weatherSpeed(s));
  const chasers = s.units.filter(u => u.suspectId === sus.id);
  const spike = s.spikes.find(x => dist(x, sus) < 30); // беглец проезжает по шипам — конец погони
  let pressure = 0, tracked = false;
  for (const u of chasers) {
    const d = dist(u, sus);
    if (isHeli(u)) { if (d < 400) { tracked = true; pressure += 0.6 * (VEHICLES[u.type].chase ?? 1); } }
    else if (d < 90) pressure += VEHICLES[u.type].chase ?? 1;
  }
  const policy = s.policy.pursuit;
  if (tracked) sus.until = Math.min(Math.max(sus.until, s.t + 2 * MIN), sus.started + 30 * MIN); // с вертолёта не уйти
  c.deadline = sus.until;
  if (pressure) sus.meter += dt * pressure * (s.upgrades.spikes ? 1.5 : 1) * (policy === 'aggressive' ? 1.3 : policy === 'cautious' ? 0.75 : 1) * (s.weather === 'rain' ? 0.85 : 1);
  else sus.meter = Math.max(0, sus.meter - dt * 0.5);
  if (policy === 'aggressive' && pressure && rnd(s) < perMinute(0.025, dt)) {
    trustLoss(s, 2.5); s.stats.crashes++; note(s, 'crash', callType(c).name);
    say(s, 'Погоня: беглец протаранил гражданскую машину. Пострадавшие госпитализированы.', 'bad'); emit(s, {type: 'crash', x: sus.x, y: sus.y});
  }
  if (spike || sus.meter >= 40) {
    if (spike) s.spikes = s.spikes.filter(x => x !== spike);
    const near = chasers.filter(u => !isHeli(u)).sort((a, b) => dist(a, sus) - dist(b, sus));
    credit(chasers); c.district = sus.node.district;
    arrest(s, c, near.find(u => !u.player) ?? near[0], true); reward(s, c, true, {arrest: true, units: chasers});
    closeCall(s, c, spike ? 'беглец налетел на шипы и задержан!' : 'погоня окончена, нарушитель задержан!', 'good'); emit(s, {type: 'arrest', spike: !!spike});
  } else if (s.t >= sus.until) {
    s.stats.escaped++; note(s, 'escape', callType(c).name); reward(s, c, false, {missed: !chasers.length, units: chasers}); closeCall(s, c, 'нарушитель скрылся.', 'bad');
  }
}
function tickCall(s, c, dt) {
  if (c.state === 'done' || c.state === 'hidden' || c.suspectId) return;
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
// Диспетчер ведёт экипажи, которыми игрок не командует; с автодиспетчером — все, кроме машины игрока.
function aiDispatch(s) {
  const mine = u => s.auto ? !u.player : !canCommand(s, u);
  if (!s.units.some(u => mine(u) && isFree(u))) return;
  for (const c of s.calls) {
    if (['done', 'hidden', 'choice', 'active'].includes(c.state)) continue;
    const assigned = unitsFor(s, c).length, type = callType(c), wanted = c.suspectId ? 2 : (type.needs ?? 1), sev = type.sev;
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
  return base / cityGrowth(s) / diff(s).calls / s.settings.crime / (s.wave ? 1.3 : 1) * MIN * (0.55 + rnd(s) * 0.9);
}
function tickWave(s) {
  if (s.wave && s.t >= s.wave.until) { say(s, `Волна в районе ${DISTRICTS[s.wave.district].name} пошла на спад.`, 'info'); s.wave = null; }
  if (s.wave || !s.settings.waves || s.t < s.nextWaveAt || (s.mode === 'career' && s.rank < 1)) return;
  const live = s.districts.map((d, k) => [d.crime < 0 ? -1 : d.crime + rnd(s) * 30, k]).filter(([c]) => c >= 0).sort((a, b) => b[0] - a[0]);
  const kinds = ['theft', 'violence', 'traffic', ...(s.rank >= 3 ? ['gang'] : [])], kind = pick(s, kinds), district = live[0][1];
  s.wave = {district, kind, until: s.t + 120 * MIN}; s.nextWaveAt = s.t + (200 + rnd(s) * 120) * MIN; crimeShift(s, district, 10);
  note(s, 'wave', `${WAVE_NAMES[kind]} — ${DISTRICTS[district].name}`);
  say(s, `Оперативная сводка: ${WAVE_NAMES[kind]} в районе ${DISTRICTS[district].name}. Ближайшие два часа будет жарко.`, 'alert'); emit(s, {type: 'wave'});
  if (kind === 'gang' && CALLS.gang.rank <= s.rank) spawnCall(s, 'gang', pick(s, districtNodes[district]));
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
    const growth = (2 * (1 + 0.12 * Math.max(0, s.units.length - 3)) + 0.15 * s.rank) * s.settings.crime * step / 3600; // большой город сложнее удержать
    s.districts.forEach((d, k) => { if (d.crime >= 0) d.crime = Math.min(100, d.crime + growth * (s.informants[k] ? 0.7 : 1)); });
    for (const u of s.units) tickUnit(s, u, step);
    for (const sus of [...s.suspects]) tickSuspect(s, sus, step);
    for (const c of s.calls) tickCall(s, c, step);
    tickHidden(s, step); tickCases(s, step); tickWave(s); aiDispatch(s);
    s.spikes = s.spikes.filter(x => x.until > s.t);
    if (s.calls.length > 50) s.calls = s.calls.filter(c => c.state !== 'done' || s.t - c.closedAt < 120);
    if (s.trust <= 0) { s.phase = 'over'; s.overReason = 'trust'; say(s, 'Доверие города потеряно. Вас отстранили от службы.', 'bad'); emit(s, {type: 'over'}); return; }
    if (s.t >= s.shiftEnd) { endShift(s); return; }
  }
}

// ---------- смены, газета, испытания ----------
export function shiftGrade(stats) {
  const total = stats.resolved + stats.failed + stats.missed, ratio = total ? stats.resolved / total : 0;
  if (!total) return {grade: '—', title: 'Тихая смена', bonus: 0};
  if (ratio >= 0.9) return {grade: 'A', title: 'Образцовая смена', bonus: 350};
  if (ratio >= 0.75) return {grade: 'B', title: 'Уверенная смена', bonus: 180};
  if (ratio >= 0.5) return {grade: 'C', title: 'Смена с потерями', bonus: 0};
  return {grade: 'D', title: 'Тяжёлая смена', bonus: 0};
}
function newspaper(s, grade, crime, mood) {
  const st = s.stats, has = k => st.events.find(e => e.kind === k), worst = s.districts.map((d, k) => [d.crime, k]).sort((a, b) => b[0] - a[0])[0];
  const stories = [];
  if (has('solved')) stories.push(['Дело раскрыто', `Полиция закрыла дело «${has('solved').text.toLowerCase()}». Подозреваемый задержан, жители района выдохнули.`]);
  if (st.injuries) stories.push([st.injuries > 1 ? `Ранены ${st.injuries} полицейских` : 'Ранен полицейский', 'Вооружённые преступники оказали сопротивление. Профсоюз требует лучшей защиты для экипажей.']);
  if (st.wrongful) stories.push(['Суд оправдал задержанного', 'Адвокат указал на нехватку улик. Горожане спрашивают, не торопится ли полиция с арестами.']);
  if (st.crashes) stories.push(['Погоня закончилась аварией', 'Беглец протаранил машину горожан. Оппозиция в горсовете требует пересмотреть правила погонь.']);
  if (st.overkill) stories.push(['Спецназ на бытовом вызове?', 'Жители недоумевают, зачем на мелкое происшествие приехали люди в тяжёлой броне.']);
  if (has('wave')) stories.push(['Оперативная сводка', `За смену: ${has('wave').text}.`]);
  if (st.unseen >= 3) stories.push(['Невидимая преступность', `Сразу ${st.unseen} преступления прошли мимо полиции. Жители просят больше патрулей.`]);
  if (st.escaped >= 2) stories.push(['Беглецы на свободе', `${st.escaped} нарушителя ушли от погони.`]);
  if (st.spotted >= 3) stories.push(['Патрули работают', `${st.spotted} нарушения замечены на улицах ещё до звонков.`]);
  const headline = grade.grade === 'A' ? 'Город спит спокойно' : grade.grade === 'B' ? 'Полиция держит город' : grade.grade === 'C' ? 'Полиция не успевает' : grade.grade === 'D' ? 'Город на грани' : 'Тихая смена';
  const bad = ['C', 'D'].includes(grade.grade), sub = mood > 0 && !bad ? 'Опрос: горожане чувствуют себя безопаснее' : mood < 0 || (bad && mood <= 0) ? 'Опрос: тревога в городе растёт' : bad ? 'Опрос: на улицах спокойнее, но к полиции есть вопросы' : 'Опрос: оценки не изменились';
  return {name: PAPER, headline, sub, stories: stories.slice(0, 4),
    poll: {approve: Math.round(s.trust), concern: worst && worst[0] >= 0 ? DISTRICTS[worst[1]].name : '—', response: st.responseN ? Math.round(st.responseSum / st.responseN / 60) : 0, crime: Math.round(crime)}};
}
function endShift(s) {
  const grade = shiftGrade(s.stats), ch = s.challenge && CHALLENGES[s.challenge.id], crime = cityCrime(s);
  const grant = Math.round((200 + s.trust * 5) * (ch?.grant ?? 1)), salaries = s.units.length * 220, upkeep = s.units.length * 60 + (s.units.some(isHeli) ? 400 : 0);
  const agents = districtsUsed(s.informants) * 150 + districtsUsed(s.undercover) * 250;
  const mood = Math.round((42 - crime) / 9), point = ['A', 'B'].includes(grade.grade) && s.stats.own >= 3 ? 1 : 0, manage = canManage(s);
  s.summary = {shift: s.shift, stats: {...s.stats, events: [...s.stats.events]}, grade, grant, salaries, upkeep, agents: manage ? agents : 0, bonus: grade.bonus, before: s.money, crime, mood, point,
    response: s.stats.responseN ? s.stats.responseSum / s.stats.responseN : 0, weather: s.weather};
  if (manage) s.money = Math.max(0, s.money + grant + grade.bonus - salaries - upkeep - agents);
  s.trust = clamp(s.trust + mood + (grade.grade === 'A' ? 2 : 0), 0, 100); s.player.points += point;
  s.summary.after = s.money; s.summary.paper = newspaper(s, grade, crime, mood); s.career.shifts++; s.phase = 'summary';
  for (const c of s.calls) if (c.state !== 'done') { c.state = 'done'; c.closedAt = s.t; c.outcome = 'передан следующей смене'; }
  for (const k of s.cases) if (k.state === 'open') k.nextAt = 0;
  for (const u of s.units) { u.callId = null; u.suspectId = null; }
  s.suspects = []; s.spikes = []; s.wave = null;
  if (ch) {
    s.challenge.shiftsLeft--;
    if (s.challenge.shiftsLeft <= 0) { const won = ch.check(s); s.phase = won ? 'won' : 'over'; s.overReason = won ? null : 'challenge'; say(s, won ? `Испытание «${ch.name}» пройдено!` : `Испытание «${ch.name}» провалено.`, won ? 'good' : 'bad'); emit(s, {type: won ? 'won' : 'over'}); return; }
  }
  say(s, `Смена ${s.shift} окончена. Оценка: ${grade.grade}.`, 'info'); emit(s, {type: 'shiftEnd'});
}
export function startNextShift(s) {
  if (s.phase !== 'summary') return;
  s.shift++; s.phase = 'shift'; s.stats = newStats(); s.calls = []; s.suspects = []; s.spikes = [];
  const startHour = s.shift % 2 ? 18 : 8, day = Math.floor(s.t / 86400) + 1;
  s.t = day * 86400 + startHour * 3600; s.shiftEnd = s.t + SHIFT_SECONDS; s.nextCallAt = s.t + 3 * MIN;
  s.weather = rollWeather(s); s.spikesLeft = spikeQuota(s); s.nextWaveAt = s.t + (90 + rnd(s) * 120) * MIN;
  for (const k of s.cases) if (k.state === 'open') k.nextAt = s.t + (10 + rnd(s) * 20) * MIN;
  for (const u of s.units) Object.assign(u, {x: STATION.x, y: STATION.y, node: STATION, path: [], dest: null, speed: 0, status: 'patrol', callId: null, suspectId: null, fatigue: 5, injuredUntil: 0, wp: 0});
  const weather = {clear: 'ясно', cloudy: 'облачно', rain: 'дождь — на дорогах скользко'}[s.weather];
  say(s, `Смена ${s.shift} началась в ${clockText(s.t)}. Погода: ${weather}. Удачи, ${RANKS[s.rank].title.toLowerCase()} ${s.player.name}.`, 'info');
}

// ---------- сохранение ----------
export function serialize(s) {
  const mover = m => ({...m, node: m.node.id, dest: m.dest?.id ?? null, path: undefined, fly: undefined});
  return JSON.stringify({...s, events: [], units: s.units.map(mover), suspects: s.suspects.map(mover)}, (k, v) => v === Infinity ? 1e15 : v);
}
function migrate(s) {
  if (s?.v === 2) {
    const old = s.policies ?? {};
    s.policy = {...DEFAULT_POLICY, force: old.hard ? 'hard' : old.community ? 'soft' : 'standard', patrol: old.presence ? 'intensive' : 'normal'};
    delete s.policies; s.mode = 'career'; s.settings = {difficulty: 'normal', crime: 1, waves: true};
    Object.assign(s, {informants: {}, undercover: {}, spikes: [], spikesLeft: 2, weather: 'clear', wave: null, nextWaveAt: s.t + 3600, challenge: null, challengeStats: {pursuitArrests: 0, injuries: 0}});
    for (const k of s.cases ?? []) { k.evidence = Math.min(90, (k.stage ?? 0) * 35); k.search = {x: DISTRICTS[k.district]?.x ?? STATION.x, y: DISTRICTS[k.district]?.y ?? STATION.y, r: 450}; }
    s.stats = {...newStats(), ...s.stats, events: []}; s.v = 3;
  }
  return s;
}
export function deserialize(raw) {
  const s = migrate(JSON.parse(raw));
  if (!s || s.v !== SAVE_VERSION || !Array.isArray(s.units) || !Array.isArray(s.calls) || !Number.isFinite(s.t) || !s.player || !Array.isArray(s.districts) || s.districts.length !== DISTRICTS.length) throw Error('Несовместимое сохранение');
  const mover = m => {
    m.node = nodeById(m.node) ?? nearestNode(m.x, m.y); m.path = [];
    const dest = m.dest ? nodeById(m.dest) : null; m.dest = null;
    if (dest) setRoute(m, dest);
    return m;
  };
  s.events = []; s.cases ??= []; s.spikes ??= []; s.informants ??= {}; s.undercover ??= {}; s.policy = {...DEFAULT_POLICY, ...s.policy};
  s.stats.events ??= []; s.challengeStats ??= {pursuitArrests: 0, injuries: 0};
  for (const u of s.units) { u.gear = {...DEFAULT_GEAR, ...u.gear}; u.waypoints ??= []; u.wp ??= 0; if (!VEHICLES[u.type]) u.type = 'sedan'; u.fly = roleOf(u) === 'heli'; }
  s.units.forEach(mover); (s.suspects ??= []).forEach(mover);
  for (const k of s.cases) if (k.nextAt >= 1e15) k.nextAt = Infinity;
  for (const u of s.units) if (u.injuredUntil >= 1e15) u.injuredUntil = Infinity;
  s.calls = s.calls.filter(c => CALLS[c.type] && nodeById(c.node));
  for (const u of s.units) if (u.callId && !s.calls.some(c => c.id === u.callId && c.state !== 'done')) { u.callId = null; u.suspectId = null; if (['enroute', 'onscene', 'pursuit'].includes(u.status)) u.status = 'patrol'; }
  return s;
}
export {ROLES, GEAR, POLICY};
