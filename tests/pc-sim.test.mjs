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
  s.cases[0].evidence = 55; assert.ok(sim.arrestNow(s, 1).ok);
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
  assert.equal(m.v, 3); assert.equal(m.policy.force, 'hard'); assert.ok(m.units.every(u => u.gear.armor === 'vest'));
  tick(m, 60);
});
