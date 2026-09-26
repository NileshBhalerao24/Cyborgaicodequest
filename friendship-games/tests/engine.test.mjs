// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTournament, advance, runAll } from '../js/engine/tournament.js';
import * as ES from '../js/engine/eventScenes.js';
import { EPISODES } from '../js/data/episodes.js';
import { EVENTS, eventById } from '../js/data/events.js';
import { byId } from '../js/data/characters.js';

const BANNED = /\b(music|sing|singing|dance|dancing|quiz|science|puzzle|talent)\b/i;

test('event catalog is physical/adventure only and its graph is valid', () => {
  for (const e of EVENTS) {
    assert.ok(!BANNED.test(e.name) && !BANNED.test(e.cat), `banned event type: ${e.name}`);
    for (const id of [...Object.keys(e.links), ...e.branch.wonderbolt, ...e.branch.shadowbolt]) assert.ok(eventById[id], `${e.id} → unknown ${id}`);
  }
});

test('same seed replays the same tournament', () => {
  const a = runAll({ seed: 42 }), b = runAll({ seed: 42 });
  assert.deepEqual(a.scores, b.scores);
  assert.deepEqual(a.eventHistory.map((r) => r.event), b.eventHistory.map((r) => r.event));
});

test('tournaments are unpredictable: varied sequences, both teams win, no repeats', () => {
  const seqs = new Set(), wins = { wonderbolt: 0, shadowbolt: 0 }, eventWinners = {};
  for (let s = 1; s <= 400; s++) {
    const t = runAll({ seed: s * 7919, arcStage: s % 3 });
    const seq = t.eventHistory.map((r) => r.event);
    assert.equal(new Set(seq).size, seq.length, 'an event repeated inside one tournament');
    seqs.add(seq.join('>'));
    wins[t.winner]++;
    for (const r of t.eventHistory) (eventWinners[r.event] ||= new Set()).add(r.winner);
  }
  assert.ok(seqs.size > 390, `only ${seqs.size} distinct sequences`);
  assert.ok(wins.wonderbolt > 120 && wins.shadowbolt > 120, JSON.stringify(wins));
  const oneSided = Object.entries(eventWinners).filter(([, s]) => s.size < 2).map(([k]) => k);
  assert.deepEqual(oneSided, [], `events only one team ever won: ${oneSided}`);
});

test('the winner of an event changes what comes next', () => {
  // Branch weighting should make the next-event distribution depend on who won.
  const after = { wonderbolt: {}, shadowbolt: {} };
  for (let s = 1; s <= 1500; s++) {
    const t = createTournament({ seed: s });
    const r = advance(t);
    if (r.event !== 'skating') continue;
    after[r.winner][t.nextEvent] = (after[r.winner][t.nextEvent] || 0) + 1;
  }
  const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (Object.keys(after.wonderbolt).length && Object.keys(after.shadowbolt).length) assert.notEqual(top(after.wonderbolt), top(after.shadowbolt));
});

function checkScene(scene, where) {
  const ids = new Set(Object.keys(scene.cast || {}));
  for (const id of ids) assert.ok(byId[id], `${where}: unknown cast ${id}`);
  const walk = (b) => {
    if (b.par) return b.par.forEach(walk);
    if (b.seq) return b.seq.forEach(walk);
    if (b.spawn) ids.add(b.spawn.id);
    if (b.enter) ids.add(b.enter);
    for (const k of ['say', 'move', 'anim', 'face', 'turn', 'prop', 'exit']) if (typeof b[k] === 'string') assert.ok(ids.has(b[k]), `${where} (${scene.title}): ${k} → missing actor ${b[k]}`);
    if (b.say) assert.ok(b.text && !b.text.includes('{'), `${where}: unfilled line "${b.text}"`);
    if (b.cam?.on) for (const id of [].concat(b.cam.on)) assert.ok(ids.has(id), `${where}: camera on missing ${id}`);
  };
  scene.beats.forEach(walk);
}

test('generated tournament scenes only reference actors that are on stage', () => {
  for (let s = 1; s <= 120; s++) {
    const t = createTournament({ seed: s * 101, arcStage: s % 3 });
    checkScene(ES.openingScene(t), `seed ${s} opening`);
    while (!t.finished) { const r = advance(t); ES.roundScenes(t, r).forEach((sc) => checkScene(sc, `seed ${s} round ${r.round}`)); }
    checkScene(ES.closingScene(t), `seed ${s} closing`);
  }
});

test('scripted episodes are well-formed', () => {
  for (const ep of EPISODES) for (const sc of ep.scenes) checkScene(sc, ep.id);
});
