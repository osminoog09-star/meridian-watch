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
