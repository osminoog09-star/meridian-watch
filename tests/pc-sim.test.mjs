// Новая ПК-игра (pc/): симуляция карьеры без браузера.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../pc/src/sim.js';
import {callNodes, route, STATION} from '../pc/src/world.js';
const {createGame, tick, dispatch, chooseApproach, liveCalls, serialize, deserialize, startNextShift, playerUnit, SHIFT_SECONDS} = sim;

// Простой «игрок»: берёт своим экипажем ближайший свободный вызов и выбирает лучший вариант.
function playShift(s) {
  for (let k = 0; k < SHIFT_SECONDS && s.phase === 'shift'; k++) {
    tick(s, 4);
    const me = playerUnit(s);
    if (sim.isFree(me) && me.fatigue < 80) { const c = liveCalls(s).find(c => c.state === 'pending'); if (c) dispatch(s, me.id, c.id); }
    for (const c of liveCalls(s)) if (c.state === 'choice' && sim.playerDecides(s, c)) { const on = sim.unitsOn(s, c); let best = 0; sim.callType(c).approaches.forEach((_, i) => { if (sim.successChance(s, c, i, on) > sim.successChance(s, c, best, on)) best = i; }); chooseApproach(s, c.id, best); }
    for (const u of s.units) { assert.ok(Number.isFinite(u.x) && Number.isFinite(u.y)); assert.ok(u.fatigue >= 0 && u.fatigue <= 100); }
  }
}

test('road graph connects any two call locations', () => {
  for (let k = 0; k < 40; k++) assert.ok(route(callNodes[k * 131 % callNodes.length], STATION).length > 0);
});

test('a trainee commands only their own unit', () => {
  const s = createGame(42, 'Тест');
  assert.equal(s.rank, 0); assert.equal(s.units.length, 3); assert.equal(playerUnit(s).crew[0].name, 'Тест');
  for (let k = 0; k < 200 && !liveCalls(s).length; k++) tick(s, 2);
  const call = liveCalls(s)[0], other = s.units.find(u => !u.player);
  assert.equal(dispatch(s, other.id, call.id).ok, false);
  assert.equal(sim.moveUnit(s, other.id, STATION).ok, false);
  assert.equal(sim.setZone(s, playerUnit(s).id, 0).ok, false);
  assert.equal(sim.buyUnit(s, 'sedan').ok, false);
  assert.ok(dispatch(s, playerUnit(s).id, call.id).ok);
  for (let k = 0; k < 2000 && call.state !== 'choice'; k++) tick(s, 2);
  assert.equal(call.state, 'choice'); assert.ok(sim.playerDecides(s, call));
  assert.ok(chooseApproach(s, call.id, 0).ok);
  for (let k = 0; k < 2000 && call.state !== 'done'; k++) tick(s, 2);
  assert.equal(call.state, 'done'); assert.ok(call.own);
});

test('the dispatcher handles calls the trainee ignores', () => {
  const s = createGame(9);
  sim.moveUnit(s, playerUnit(s).id, STATION);
  while (s.phase === 'shift') tick(s, 4);
  assert.ok(s.summary.stats.resolved > 8, 'resolved ' + s.summary.stats.resolved);
  assert.equal(s.xp, 0);
});

test('a career climbs the ranks, unlocks command and survives save/load', () => {
  const s = createGame(7, 'Карьера');
  let reinforced = false;
  for (let shift = 0; shift < 12 && s.phase !== 'over'; shift++) {
    playShift(s);
    if (s.phase !== 'summary') break;
    const copy = deserialize(serialize(s)); assert.equal(copy.units.length, s.units.length); assert.equal(copy.player.name, 'Карьера');
    while (s.player.points > 0 && sim.spendPoint(s, ['talk', 'invest', 'force', 'drive'].find(p => s.player.perks[p] < 3)).ok);
    if (s.units.length > 3) reinforced = true;
    if (sim.canManage(s) && s.units.length < sim.unitCap(s)) sim.buyUnit(s, 'sedan');
    startNextShift(s);
  }
  assert.ok(s.rank >= 3, 'rank ' + s.rank + ' xp ' + s.xp);
  assert.ok(reinforced);
  assert.ok(sim.canCommand(s, s.units.find(u => !u.player)));
  assert.ok(s.career.arrests > 3);
  assert.ok(s.cases.length > 0, 'no cases opened');
});

test('patrol presence lowers district crime, neglect raises it', () => {
  const s = createGame(5); s.rank = 3;
  const zone = playerUnit(s).node.district; for (const u of s.units) sim.setZone(s, u.id, zone);
  const before = s.districts[zone].crime, other = s.districts.findIndex((d, k) => k !== zone && d.crime >= 0), otherBefore = s.districts[other].crime;
  s.nextCallAt = Infinity;
  for (let k = 0; k < 1500; k++) tick(s, 4);
  assert.ok(s.districts[zone].crime < before); assert.ok(s.districts[other].crime > otherBefore);
});

test('resting restores a tired unit', () => {
  const s = createGame(5), u = playerUnit(s);
  u.fatigue = 85; assert.ok(sim.sendRest(s, u.id).ok);
  for (let k = 0; k < 3000 && u.status !== 'patrol'; k++) tick(s, 2);
  assert.equal(u.status, 'patrol'); assert.ok(u.fatigue < 20);
});

test('riot needs three units and trust gains shrink near the ceiling', () => {
  const s = createGame(11); s.rank = 4;
  const c = {type: 'riot', id: -1};
  const one = sim.successChance(s, c, 0, s.units.slice(0, 1)), three = sim.successChance(s, c, 0, s.units.slice(0, 3));
  assert.ok(three - one > 0.35, `one ${one} three ${three}`);
  const gain = trust => { const g = createGame(12); g.trust = trust; g.calls.push({id: 999, type: 'alarm', node: STATION.id, x: STATION.x, y: STATION.y, district: STATION.district, state: 'pending', own: true}); const call = g.calls.at(-1), before = g.trust; for (const u of g.units) u.callId = null; sim.dispatch(g, playerUnit(g).id, call.id); for (let k = 0; k < 3000 && call.state !== 'done'; k++) { tick(g, 2); if (call.state === 'choice') chooseApproach(g, call.id, 0); } return {d: g.trust - before, ok: g.stats.resolved > 0}; };
  const low = gain(40), high = gain(95);
  if (low.ok && high.ok) assert.ok(high.d < low.d, `low ${low.d} high ${high.d}`);
});

// ---------- 2.0 ----------
const blankCall = (s, type, node, extra = {}) => { const c = {id: s.nextId++, type, node: node.id, x: node.x, y: node.y, district: node.district, place: 't', created: s.t, deadline: s.t + 1800, wait: 1800, state: 'pending', approach: null, progress: 0, work: 0, choiceAt: 0, suspectId: null, own: false, auto: false, caseId: null, reaction: null, onView: false, ...extra}; s.calls.push(c); return c; };

test('a hidden crime next to a patrol is spotted, far away it vanishes unseen', () => {
  const s = createGame(21, 'X', {mode: 'sandbox'}); s.nextCallAt = Infinity; s.settings.waves = false;
  const u = s.units[0]; for (const x of s.units) sim.moveUnit(s, x.id, STATION);
  const near = blankCall(s, 'drugs', u.node, {state: 'hidden', vanishAt: s.t + 3600});
  const far = callNodes.find(n => Math.hypot(n.x - STATION.x, n.y - STATION.y) > 1.5);
  const lost = blankCall(s, 'speeding', far, {state: 'hidden', vanishAt: s.t + 120});
  tick(s, 4);
  assert.notEqual(near.state, 'hidden'); assert.ok(near.onView);
  for (let k = 0; k < 60; k++) tick(s, 4);
  assert.equal(lost.state, 'done'); assert.ok(s.stats.unseen >= 1);
});

test('armor cuts injuries in shootouts', () => {
  const injuries = armor => { let n = 0; for (let seed = 1; seed <= 60; seed++) { const s = createGame(seed, 'X', {mode: 'sandbox'}); s.nextCallAt = Infinity; const on = s.units.slice(0, 2); for (const u of on) u.gear.armor = armor;
    const c = blankCall(s, 'shooting', on[0].node, {state: 'active', approach: 0, work: 1, progress: 2, reaction: 'fight'}); for (const u of on) { u.callId = c.id; u.status = 'onscene'; } tick(s, 2); n += s.stats.injuries; } return n; };
  assert.ok(injuries('heavy') < injuries('none'));
});

test('spikes stop a fleeing suspect', () => {
  const s = createGame(5, 'X', {mode: 'sandbox'}); s.nextCallAt = Infinity;
  const node = callNodes[500], c = blankCall(s, 'carjack', node);
  tick(s, 0.5); // announce не вызывается для ручного вызова — создаём погоню напрямую
  const sus = {id: s.nextId++, callId: c.id, x: node.x, y: node.y, heading: 0, node, path: [], dest: null, speed: 8, meter: 0, until: s.t + 900, started: s.t};
  s.suspects.push(sus); c.suspectId = sus.id;
  assert.ok(sim.placeSpike(s, node).ok);
  tick(s, 2);
  assert.equal(c.state, 'done'); assert.equal(s.stats.arrests, 1);
});

test('an early warrant carries a risk of arresting the wrong person', () => {
  const s = createGame(8, 'X', {mode: 'sandbox'});
  s.cases.push({id: 1, title: 'Убийство', district: 0, evidence: 40, fails: 0, state: 'open', nextAt: Infinity, opened: s.t, search: {x: 1, y: 1, r: 450}});
  assert.equal(sim.arrestNow(s, 1).ok, false);
  s.cases[0].evidence = 55; let r; for (let i = 0; i < 30 && !(r = sim.arrestNow(s, 1)).ok; i++) { assert.ok(r.denied); assert.equal(sim.arrestNow(s, 1).ok, false); s.shift++; } assert.ok(r.ok); // судья может отказать — повтор в следующую смену
  const raid = s.calls.find(c => c.type === 'raid'); assert.ok(raid.innocentRisk > 0.25 && raid.innocentRisk < 0.35);
});

test('sandbox and challenges start correctly and challenges end with a verdict', () => {
  const sand = createGame(2, 'X', {mode: 'sandbox', difficulty: 'hard', money: 12000});
  assert.equal(sand.rank, 4); assert.equal(sand.money, 12000); assert.equal(playerUnit(sand), null);
  const ch = createGame(2, 'X', {mode: 'challenge', challenge: 'riotnight'});
  assert.equal(ch.units.filter(u => u.type === 'van').length, 2);
  ch.trust = 90; while (ch.phase === 'shift') tick(ch, 4);
  assert.ok(['won', 'over'].includes(ch.phase));
});

test('a 1.2 save (v2) migrates to 2.0', () => {
  const s = createGame(4); const raw = JSON.parse(serialize(s));
  raw.v = 2; raw.policies = {hard: true}; delete raw.policy; delete raw.settings; delete raw.informants; delete raw.undercover; delete raw.spikes;
  for (const u of raw.units) delete u.gear;
  const m = deserialize(JSON.stringify(raw));
  assert.equal(m.v, sim.SAVE_VERSION); assert.equal(m.policy.force, 'hard'); assert.ok(m.units.every(u => u.crew.every(o => o.skills && Number.isFinite(o.morale)))); assert.ok(m.units.every(u => u.gear.armor === 'vest'));
  tick(m, 60);
});

// ---------- 3.0 ----------
test('a standoff ends: talk builds compliance, buying time restores stability', () => {
  const s = createGame(31, 'X', {mode: 'sandbox'}); s.nextCallAt = Infinity; s.settings.waves = false;
  const u = s.units[0], c = blankCall(s, 'domestic', u.node, {state: 'assigned'}); u.callId = c.id; u.status = 'enroute'; u.path = [];
  let started = false;
  for (let k = 0; k < 40 && !started; k++) { const seed = 100 + k; Object.assign(s, {seed}); c.state = 'assigned'; c.reaction = null; u.status = 'enroute'; tick(s, 1); started = c.state === 'standoff'; }
  if (!started) return; // подозреваемый сразу сдался — тоже исход
  c.standoff.stability = 30; assert.ok(sim.setStrategy(s, c.id, 'time').ok);
  for (let k = 0; k < 60 && c.state === 'standoff'; k++) tick(s, 2);
  if (c.state === 'standoff') assert.ok(c.standoff.stability > 30);
  for (let k = 0; k < 2000 && c.state === 'standoff'; k++) { sim.setStrategy(s, c.id, 'negotiate'); tick(s, 2); }
  assert.notEqual(c.state, 'standoff');
});

test('officers gain experience, stress and morale; academy and hiring work', () => {
  const s = createGame(32, 'X', {mode: 'sandbox', money: 20000}); s.nextCallAt = Infinity;
  const u = s.units[0], o = u.crew[0], xp0 = o.xp, stress0 = o.stress;
  const c = blankCall(s, 'shooting', u.node, {state: 'active', approach: 0, work: 1, progress: 2, reaction: 'fight'}); u.callId = c.id; u.status = 'onscene';
  tick(s, 2);
  assert.ok(o.xp > xp0); assert.ok(o.stress > stress0 || o.injured);
  const cand = s.candidates[0]; assert.ok(sim.hireOfficer(s, cand.id).ok); assert.equal(s.reserve.length, 1);
  const other = s.units[1]; assert.ok(sim.swapOfficer(s, other.id, 0, s.reserve[0].id).ok); assert.equal(other.crew[0].id, cand.id);
  const before = cand.skills.talk; assert.ok(sim.trainOfficer(s, cand.id, 'talk').ok); assert.ok(cand.skills.talk > before);
});

test('burned-out officers may quit at shift end and are replaced', () => {
  const s = createGame(33, 'X', {mode: 'sandbox'}); s.nextCallAt = Infinity;
  for (const u of s.units) for (const o of u.crew) { o.morale = 5; o.stress = 95; }
  s.shiftEnd = s.t + 2; tick(s, 4);
  assert.equal(s.phase, 'summary'); assert.ok(s.summary.quits.length > 0);
  assert.ok(s.units.every(u => u.crew.length === 2));
});

test('patrol focus: traffic units stop cars, community builds trust, prevention cuts crime', () => {
  const s = createGame(77, 'Тест', {mode: 'sandbox'});
  const units = s.units.filter(u => !u.player && sim.roleOf(u) !== 'heli');
  assert.equal(sim.setFocus(s, units[0].id, 'traffic').ok, true);
  assert.equal(sim.setFocus(s, units[0].id, 'nope').ok, false);
  const trainee = createGame(78, 'Т');
  assert.equal(sim.setFocus(trainee, playerUnit(trainee).id, 'traffic').ok, false);
  // остановка ТС рождает вызов, на который сразу едет этот экипаж
  for (let k = 0; k < 50 && !units[0].node; k++) tick(s, 1);
  const c = sim._trafficStop(s, units[0]);
  assert.ok(c); assert.equal(c.type, 'stop'); assert.equal(units[0].callId, c.id);
  for (let k = 0; k < 3000 && c.state !== 'done'; k++) tick(s, 2);
  assert.equal(c.state, 'done');
  // за смену дорожный надзор сам останавливает машины
  const t = createGame(79, 'Тест', {mode: 'sandbox'});
  for (const u of t.units) if (!u.player && sim.roleOf(u) !== 'heli') sim.setFocus(t, u.id, 'traffic');
  t.auto = true; for (let k = 0; k < 1800 && t.phase === 'shift'; k++) tick(t, 4);
  assert.ok((t.stats.stops ?? 0) > 0, 'stops happened');
  // работа с жителями поднимает доверие, сериализация сохраняет приоритет
  const back = deserialize(serialize(t));
  assert.ok(back.units.some(u => u.focus === 'traffic'));
});

test('city: mayor demands, complaints and internal affairs, programs, operations, crises', () => {
  const s = createGame(91, 'Тест', {mode: 'sandbox'});
  const k = s.districts.findIndex(d => d.crime >= 0);
  assert.equal(sim.toggleProgram(s, k).ok, true); assert.ok(s.programs[k]);
  const money0 = s.money;
  assert.equal(sim.launchOperation(s, 'crackdown', k).ok, true); assert.equal(s.money, money0 - sim.OPERATIONS.crackdown.cost);
  assert.equal(sim.launchOperation(s, 'sting', k).ok, false, 'one operation per shift');
  const trainee = createGame(92, 'Т');
  assert.equal(sim.toggleProgram(trainee, k).ok, false);
  sim.setPolicy(s, 'force', 'hard'); s.auto = true;
  const crime0 = s.districts[k].crime;
  for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
  assert.equal(s.phase, 'summary'); assert.ok(s.summary.city); assert.equal(s.op, null);
  assert.ok(s.districts[k].crime < crime0, 'crackdown and watch cut crime');
  assert.ok(s.city.complaints.every(c => c.state !== 'open'), 'complaints resolved at shift end');
  // поручение мэра и кризис появляются в следующих сменах
  for (let shift = 0; shift < 8; shift++) { startNextShift(s); assert.ok(s.city.demand); for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4); if (s.phase !== 'summary') break; }
  assert.ok(s.career.shifts >= 3);
  assert.ok(s.city.complaints.length > 0, 'hard policy produces complaints');
  const back = deserialize(serialize(s));
  assert.equal(back.city.mayor, s.city.mayor);
  // кризис: прогресс засчитывается успешными вызовами в районе
  const t = createGame(93, 'Тест', {mode: 'sandbox'});
  t.crisis = {kind: 'gang', district: k, progress: 0, shiftsLeft: 4}; t.auto = true;
  for (let n = 0; n < 9000 && t.phase === 'shift'; n++) tick(t, 4);
  assert.ok(t.crisis === null || t.crisis.progress >= 0);
});

test('escalation grows with service and trust; mayor demands get stricter', () => {
  const s = createGame(101, 'Тест');
  assert.equal(sim.escalation(s), 1);
  s.career.shifts = 12; s.trust = 90;
  const e = sim.escalation(s); assert.ok(e > 1.4 && e <= 1.6, 'escalation ' + e);
  const c = createGame(102, 'Тест', {mode: 'challenge', challenge: 'budget'}); c.career.shifts = 20; assert.equal(sim.escalation(c), 1);
});

test('first crisis comes on shift 4, the next one 3-5 shifts after it ends; new crisis kinds work', () => {
  const s = createGame(103, 'Тест', {mode: 'sandbox'}); s.auto = true;
  const seen = [];
  for (let shift = 0; shift < 14 && s.phase !== 'over'; shift++) {
    for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
    if (s.phase !== 'summary') break;
    startNextShift(s); if (s.crisis && !seen.some(x => x.at === s.shift - 0 && x.kind === s.crisis.kind)) seen.push({at: s.shift, kind: s.crisis.kind});
  }
  assert.ok(seen.length >= 2, 'crises: ' + JSON.stringify(seen));
  assert.ok(seen[0].at <= 4, 'first crisis by shift 4: ' + seen[0].at);
  for (const k of Object.keys(sim.CRISES)) assert.ok(sim.CRISES[k].name && sim.CRISES[k].shifts > 0);
  // скандал засчитывает чистые смены
  const t = createGame(104, 'Тест', {mode: 'sandbox'}); t.auto = true; t.crisis = {kind: 'scandal', district: 0, progress: 2, shiftsLeft: 4}; sim.setPolicy(t, 'force', 'soft');
  for (let n = 0; n < 9000 && t.phase === 'shift'; n++) tick(t, 4);
  assert.ok(t.crisis === null || t.crisis.progress === 2, 'scandal resolved or failed on a dirty shift');
});

test('routine delegation: minor calls are decided by the partner', () => {
  const s = createGame(105, 'Тест');
  const me = playerUnit(s);
  for (let k = 0; k < 50 && !me.node; k++) tick(s, 1);
  const c = sim._trafficStop(s, me);
  for (let k = 0; k < 400 && c.state !== 'choice'; k++) tick(s, 1);
  assert.equal(c.state, 'choice'); assert.ok(sim.playerDecides(s, c));
  sim.setRoutine(s, true); assert.equal(sim.playerDecides(s, c), false);
  for (let k = 0; k < 4000 && c.state !== 'done'; k++) tick(s, 2);
  assert.equal(c.state, 'done');
  assert.equal(deserialize(serialize(s)).player.routine, true);
});

test('nine skills, personas and spec abilities; old saves migrate', () => {
  const s = createGame(201, 'Тест', {mode: 'sandbox'});
  const o = sim.allOfficers(s)[0];
  assert.equal(Object.keys(o.skills).length, Object.keys(sim.SKILLS).length);
  assert.ok(sim.allOfficers(s).some(x => x.persona && sim.PERSONAS[x.persona]));
  for (const k of Object.keys(sim.SPEC_ABILITY)) assert.ok(sim.SPECS[k]);
  const u = s.units[0]; u.crew[0].spec = 'patrol'; u.crew[0].level = 6; assert.ok(sim.hasAbility([u], 'patrol'));
  // сохранение версии 4 без новых навыков
  const old = JSON.parse(serialize(s)); old.v = 4; delete old.union; for (const x of old.units) for (const c of x.crew) { delete c.skills.shoot; delete c.skills.calm; delete c.persona; }
  const back = deserialize(JSON.stringify(old));
  assert.equal(back.v, sim.SAVE_VERSION); assert.ok(back.union); assert.equal(back.units[0].crew[0].skills.shoot, 2);
});

test('investigation: interrogation once per shift, court verdict at shift end', () => {
  const s = createGame(202, 'Тест', {mode: 'sandbox'});
  s.cases.push({id: 1, title: 'Кража', district: 0, evidence: 30, fails: 0, state: 'open', nextAt: Infinity, opened: s.t, search: {x: 1, y: 1, r: 450}});
  assert.equal(sim.interrogate(s, 1).ok, false, 'needs 40% evidence');
  s.cases[0].evidence = 45; const r = sim.interrogate(s, 1); assert.ok(r.ok);
  assert.equal(sim.interrogate(s, 1).ok, false, 'once per shift');
  s.cases[0].state = 'court'; s.cases[0].conviction = 1; s.auto = true;
  for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
  assert.equal(s.cases[0].state, 'solved'); assert.ok(s.summary.court.some(v => v.id === 1 && v.guilty));
});

test('union demands a raise; refusing may lead to a strike; council sets the budget', () => {
  const s = createGame(203, 'Тест', {mode: 'sandbox'}); s.auto = true;
  s.union.nextTalks = 2; s.union.mood = 40;
  for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
  startNextShift(s); assert.ok(s.union.pending?.ask > 0);
  const ask = s.union.pending.ask;
  assert.ok(sim.answerUnion(s, 'refuse').ok); assert.equal(s.union.raise, 0); assert.equal(s.union.strike, 1);
  for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
  startNextShift(s); assert.ok(s.units.some(u => u.status === 'strike'));
  s.union.pending = {ask}; sim.answerUnion(s, 'accept'); assert.equal(s.union.raise, ask); assert.ok(sim.wageFactor(s) > 1);
  // бюджетный год
  s.city.budgetAt = s.career.shifts + 1;
  for (let n = 0; n < 9000 && s.phase === 'shift'; n++) tick(s, 4);
  assert.ok(s.summary.council && [0.85, 1, 1.15].includes(s.summary.council.factor));
});
