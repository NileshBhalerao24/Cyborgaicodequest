// Turns tournament results into cartoon scenes for the Stage.
// Characters act and talk to each other; the only "voice" addressing a crowd is the in-world
// stadium announcer (Milo) and Referee Hale over the PA.

import { eventById } from '../data/events.js';
import { byId, MAJOR } from '../data/characters.js';
import { TEAMS } from '../data/world.js';
import { LINES, GENERIC, MILO, PRIYA } from '../data/dialogue.js';
import { makeRng, fill, clamp, lerp } from '../util.js';
import { rel } from './tournament.js';

const nm = (id) => byId[id].short || byId[id].name;
const teamName = (t) => TEAMS[t].name.toUpperCase();
const sayDur = (s) => clamp(900 + s.length * 45, 1400, 4400);

function line(rng, id, cat, vars = {}) {
  const bank = LINES[id]?.[cat] || GENERIC[cat] || ['…'];
  return fill(rng.pick(bank), vars);
}
const S = (id, text, extra = {}) => ({ say: id, text, dur: sayDur(text), ...extra });
const PA = (who, text, dur) => ({ pa: who, text, dur: dur || sayDur(text) + 300 });

class Seq {
  constructor() { this.beats = []; this.t = 0; }
  add(b, d = 0) { this.beats.push(b); this.t += d; return this; }
  wait(ms) { if (ms > 0) this.add({ wait: ms }, ms); return this; }
  say(id, text, extra) { const b = S(id, text, extra); return this.add(b, b.dur); }
  move(id, axis, v, dur, extra = {}) { return this.add({ move: id, [axis]: v, dur, keepFacing: axis === 'y', ...extra }, dur); }
}
function align(seqs) {
  const T = Math.max(...seqs.map((s) => s.t));
  for (const s of seqs) {
    const pad = T - s.t;
    if (pad > 0) { const last = s.beats.pop(); s.beats.push({ wait: pad }, last); s.t = T; }
  }
  return T;
}
const par = (seqs) => ({ par: seqs.map((s) => ({ seq: s.beats })) });

function interleave(a, b) { const out = []; for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); } return out; }
const scoreOf = (t, s, label) => ({ wonderbolt: s.wonderbolt, shadowbolt: s.shadowbolt, label: label || `EVENT ${Math.min(t.round + 1, t.length)} OF ${t.length}` });

// ───────────────────────────── Opening ceremony
export function openingScene(t) {
  const rng = makeRng(t.seed ^ 0x0be);
  const wb = MAJOR.filter((c) => c.team === 'wonderbolt' && !c.reserve).map((c) => c.id);
  const sb = MAJOR.filter((c) => c.team === 'shadowbolt' && !c.reserve).map((c) => c.id);
  const cast = { milo: { x: 260, face: 'happy' }, priya: { x: 400, face: 'neutral', facing: -1 }, hale: { x: 1200, face: 'neutral', anim: 'crossed' } };
  const beats = [
    { cam: { x: 1200, y: 450, zoom: 1 } }, { sfx: 'cheer' },
    { cam: { on: ['milo', 'priya'], zoom: 1.45, dur: 900 } },
    S('milo', rng.pick(MILO.open), { a: 'cheer', shout: true, then: 'idle' }),
    S('priya', rng.pick(PRIYA.deadpan)),
    { card: { title: 'OPENING CEREMONY', sub: `${t.length} events · anything can happen`, icon: '🎆', big: true }, dur: 2200 },
    { cam: { x: 900, zoom: 1, dur: 800 } },
  ];
  const wbEnter = wb.map((id, i) => ({ enter: id, from: 'left', x: 700 + i * 130, dur: 2200 + i * 150, as: 'walk', f: 'happy', noWait: i < wb.length - 1 }));
  beats.push(PA('milo', 'From the towers of Brightspire Academy… WONDERBOLT!'), { par: wbEnter }, { sfx: 'cheer' }, { fx: 'confetti', team: 'wonderbolt', at: { x: 900, y: 500 } });
  beats.push(...wb.map((id) => ({ anim: id, a: id === 'pinkie' ? 'hop' : 'wave' })), { wait: 1400 });
  beats.push({ cam: { x: 1500, zoom: 1, dur: 900 } });
  const sbEnter = sb.map((id, i) => ({ enter: id, from: 'right', x: 1360 + i * 130, dur: 2200 + i * 150, as: 'walk', f: 'smug', noWait: i < sb.length - 1 }));
  beats.push(PA('milo', 'And from the shadows of Duskmere Institute… SHADOW BOLT!'), { par: sbEnter }, { sfx: 'drum' }, { fx: 'sparkle', at: { x: 1550, y: 600 } });
  beats.push(...sb.map((id) => ({ anim: id, a: id === 'cena' ? 'crossed' : 'hips' })), { turn: 'cherry', dir: -1 }, { wait: 1200 });
  beats.push({ cam: { on: ['sunset', 'cherry'], zoom: 1.35, dur: 900 } });
  beats.push({ move: 'sunset', x: 1150, dur: 900 }, { move: 'cherry', x: 1300, dur: 700 }, { turn: 'cherry', dir: 'sunset' }, { turn: 'sunset', dir: 'cherry' });
  beats.push(S('sunset', line(rng, 'sunset', 'toCherry'), { f: 'worried' }), { face: 'cherry', f: 'angry' }, { wait: 700 }, S('cherry', line(rng, 'cherry', 'toSunset'), { f: 'angry' }));
  beats.push({ face: 'sunset', f: 'sad' }, { wait: 900 });
  beats.push({ cam: { on: ['rainbow', 'cena'], zoom: 1.3, dur: 800 } }, { move: 'rainbow', x: 1000, dur: 600 }, { move: 'cena', x: 1450, dur: 600 }, { turn: 'rainbow', dir: 1 }, { turn: 'cena', dir: -1 });
  beats.push(S('rainbow', line(rng, 'rainbow', 'pre', { rival: 'Cena' }), { f: 'smug' }), S('cena', 'Move.', { f: 'determined' }), { face: 'rainbow', f: 'surprised' });
  beats.push({ cam: { on: ['hale'], zoom: 1.5, dur: 700 } }, { sfx: 'whistle' }, S('hale', 'Captains. Clean Games. I will be watching every single one of you.', { f: 'angry' }));
  beats.push({ cam: { x: 1200, zoom: 1, dur: 900 } }, { score: scoreOf(t, t.scores, 'LET THE GAMES BEGIN') }, { sfx: 'cheer' }, PA('milo', 'LET THE FRIENDSHIP GAMES… BEGIN!'), { wait: 2400 });
  return { title: 'Opening Ceremony', location: 'stadium', time: 'day', weather: t.weather, world: { w: 2400 }, music: 'stadium', cast, beats, weight: 1.2 };
}

// ───────────────────────────── Next-event reveal (wheel)
export function revealScene(t, r) {
  const rng = makeRng(t.seed ^ (r.round * 131) ^ 0x7e7);
  const ev = eventById[r.event];
  const sel = r.selection;
  const wb = r.participants.wonderbolt, sb = r.participants.shadowbolt;
  const cast = { milo: { x: 260, face: 'happy' }, priya: { x: 400, face: 'neutral', facing: -1 } };
  wb.forEach((id, i) => { cast[id] = { x: 820 + i * 120, face: 'neutral' }; });
  sb.forEach((id, i) => { cast[id] = { x: 1320 + i * 120, facing: -1, face: 'neutral' }; });
  const beats = [{ cam: { on: ['milo', 'priya'], zoom: 1.45 } }];
  beats.push(S('milo', rng.pick(MILO.wheel), { a: 'point', then: 'idle', shout: true }));
  beats.push({ wheel: { options: sel.options, index: sel.index, title: sel.isFinal ? 'FINAL EVENT · THE LIGHTNING WHEEL' : 'THE LIGHTNING WHEEL' } });
  beats.push(S('milo', fill(rng.pick(MILO.reveal), { event: ev.name.toUpperCase() }), { a: 'cheer', then: 'idle', shout: true }));
  const why = sel.why || [];
  if (why.includes('finale')) beats.push(S('milo', rng.pick(MILO.finale), { shout: true }));
  else if (why.includes('branch') && sel.prevWinner) beats.push(S('milo', fill(rng.pick(MILO.branchWin), { team: TEAMS[sel.prevWinner].name })));
  else if (why.includes('comeback')) beats.push(S('milo', rng.pick(MILO.comebackSet)));
  else if (why.includes('close')) beats.push(S('milo', rng.pick(MILO.close)));
  if (rng.chance(0.5)) {
    const star = [...wb, ...sb].sort((a, b) => byId[b].stats[Object.keys(ev.weights)[0]] - byId[a].stats[Object.keys(ev.weights)[0]])[0];
    beats.push(S('priya', fill(rng.pick(PRIYA.stat), { name: nm(star), stat: Object.keys(ev.weights)[0] })));
  }
  beats.push({ card: { title: ev.name, sub: ev.blurb + (sel.isFinal ? ' · DOUBLE POINTS' : ''), icon: ev.icon }, dur: 2600 });
  // Teams react
  const w0 = wb[0], s0 = sb[0];
  beats.push({ cam: { on: wb, zoom: 1.3, dur: 700 } });
  beats.push(S(w0, line(rng, w0, 'reveal', { event: ev.name, rival: nm(s0) }), { a: 'fistpump', then: 'idle', f: 'determined' }));
  if (wb[1]) beats.push(S(wb[1], line(rng, wb[1], 'encourage', { mate: nm(w0) }), { to: w0, f: 'happy' }));
  beats.push({ cam: { on: sb, zoom: 1.3, dur: 700 } });
  beats.push(S(s0, line(rng, s0, 'reveal', { event: ev.name, rival: nm(w0) }), { f: 'smug' }));
  if (sb[1]) beats.push(S(sb[1], line(rng, sb[1], 'encourage', { mate: nm(s0) }), { to: s0 }));
  if (t.scores && r.scoresBefore) {
    const gap = r.scoresBefore.wonderbolt - r.scoresBefore.shadowbolt;
    if (gap >= 20 && sb.includes('cherry')) beats.push(S('cherry', line(rng, 'cherry', 'trail'), { f: 'angry' }));
    if (gap <= -20 && wb.includes('sunset')) beats.push(S('sunset', line(rng, 'sunset', 'trail'), { f: 'determined' }));
  }
  return { title: `Reveal: ${ev.name}`, location: 'stadium', time: 'day', weather: r.weather, world: { w: 2000 }, music: sel.isFinal ? 'tense' : 'stadium', cast, beats, score: scoreOf(t, r.scoresBefore, `NEXT: EVENT ${r.round + 1}`), weight: 0.8 };
}

// ───────────────────────────── Event (race / swim / climb)
const WHEELED = new Set(['skates', 'scooter', 'board', 'bike', 'kayak']);
function animFor(ev) {
  if (ev.id === 'rescue') return 'carry';
  if (ev.id === 'balance' || ev.id === 'rope-bridge') return 'balance';
  if (ev.id === 'zipline') return 'zip';
  return ev.anim === 'bow' ? 'idle' : ev.anim;
}

export function eventScene(t, r) {
  const ev = eventById[r.event];
  if (r.mode === 'aim') return aimScene(t, r, ev);
  if (r.mode === 'relay') return relayScene(t, r, ev);
  return courseScene(t, r, ev);
}

function courseScene(t, r, ev) {
  const rng = makeRng(t.seed ^ (r.round * 977) ^ 0xc0);
  const climb = r.mode === 'climb';
  const swim = r.mode === 'swim';
  const axis = climb ? 'y' : 'x';
  const ids = interleave(r.participants.wonderbolt, r.participants.shadowbolt);
  const K = r.segments;
  const anim = animFor(ev);
  const prop = WHEELED.has(ev.prop) ? ev.prop : null;
  let world, cast = {}, course = null, climbCfg = null;
  let start, finish;
  if (climb) {
    const H = 2600;
    const lanes = ids.length === 1 ? [800] : ids.length === 2 ? [620, 980] : [440, 680, 920, 1160];
    climbCfg = { lanes, topY: 380 };
    world = { w: 1600, h: H };
    start = 0; finish = -1800;
    ids.forEach((id, i) => { cast[id] = { x: lanes[i], facing: 1, anim: 'idle', face: 'determined' }; });
  } else {
    const W = 5200;
    start = 420; finish = 4700;
    const gy = swim ? 630 : ids.length > 2 ? 640 : 690;
    world = { w: W, groundY: gy };
    course = { start, finish, obstacles: ev.obstacles || [], lanes: ids.map((_, i) => i) };
    if (ev.id === 'zipline') course.zip = ids.map((_, i) => gy + i * 58 - 290 - 260);
    ids.forEach((id, i) => { cast[id] = { x: start - 60, lane: i, facing: 1, anim: 'idle', prop, face: 'determined', y: ev.id === 'zipline' ? -260 : ev.id === 'balance' ? -40 : 0 }; });
  }
  // Positions per segment
  const maxTotal = Math.max(...ids.map((id) => r.totals[id]));
  const pos = {};
  for (const id of ids) {
    let c = 0;
    pos[id] = [climb ? 0 : start];
    for (let k = 0; k < K; k++) { c += r.perf[id][k]; pos[id].push(lerp(start, finish, c / maxTotal)); }
  }

  const beats = [];
  const final = r.round >= t.length - 1;
  beats.push({ card: { title: `EVENT ${r.round + 1} · ${ev.name.toUpperCase()}`, sub: final ? 'FINAL EVENT · DOUBLE POINTS' : ev.blurb, icon: ev.icon }, dur: 2400 });
  beats.push({ cam: { on: ids, zoom: climb ? 1.1 : 1.25 } });
  // Pre-race banter
  const taunt = r.incidents.find((i) => i.type === 'taunt');
  const w0 = r.participants.wonderbolt[0], s0 = r.participants.shadowbolt[0];
  if (taunt) {
    beats.push({ turn: taunt.who, dir: taunt.target }, S(taunt.who, line(rng, taunt.who, 'taunt', { rival: nm(taunt.target) }), { f: 'smug', to: taunt.target }));
    if (taunt.effect === 'fired') beats.push({ face: taunt.target, f: 'determined' }, S(taunt.target, line(rng, taunt.target, 'pre', { rival: nm(taunt.who) }), { to: taunt.who }));
    else if (taunt.effect === 'rattled') beats.push({ anim: taunt.target, a: 'nervous', f: 'worried', dur: 1400 }, { anim: taunt.target, a: 'idle' });
    else beats.push({ anim: taunt.target, a: 'shrug', dur: 1000 }, { anim: taunt.target, a: 'idle' });
  } else {
    beats.push({ turn: w0, dir: s0 }, S(w0, line(rng, w0, 'pre', { rival: nm(s0) }), { to: s0 }), S(s0, line(rng, s0, 'pre', { rival: nm(w0) }), { to: w0 }));
  }
  ids.forEach((id) => beats.push({ turn: id, dir: 1 }));
  beats.push({ sfx: 'beep' }, { wait: 600 }, { sfx: 'beep' }, { wait: 600 }, { sfx: 'go' }, PA('milo', rng.pick(MILO.go), 1400));
  if (swim) beats.push(...ids.map((id) => ({ anim: id, a: 'jump', then: 'swim' })), { wait: 500 }, { fx: 'splash', at: { x: start, y: 640 } });
  beats.push({ cam: { followMax: ids, climb, lead: climb ? 0 : 260, zoom: climb ? 0.9 : 1, dur: 600, wait: false } });

  const segDur = 2000;
  for (let k = 0; k < K; k++) {
    const incs = r.incidents.filter((i) => i.seg === k && ['slip', 'sabotage', 'clutch', 'shortcut', 'equipment', 'rain'].includes(i.type));
    const involved = new Set();
    const seqs = [];
    const extra = new Seq();
    let camTaken = false;
    for (const inc of incs) {
      if (inc.type === 'rain') { extra.add({ sfx: 'thunder' }).add({ weather: 'rain' }); const rr = ids.find((x) => LINES[x]?.rain); if (rr) extra.wait(400).say(rr, line(rng, rr, 'rain')); continue; }
      const people = [inc.who, inc.helper, inc.target].filter(Boolean).filter((x) => ids.includes(x));
      if (people.some((p) => involved.has(p))) continue;
      people.forEach((p) => involved.add(p));
      const built = buildIncident(inc, { rng, pos, k, axis, anim, climb, swim, ids, camTaken, t });
      seqs.push(...built.seqs);
      if (built.extra) { extra.wait(Math.max(0, built.extraAt - extra.t)); built.extra.forEach((b) => extra.add(b)); }
      camTaken = true;
    }
    for (const id of ids) {
      if (involved.has(id)) continue;
      const s = new Seq();
      s.move(id, axis, pos[id][k + 1], segDur, { as: anim, ease: 'linear', then: false });
      seqs.push(s);
    }
    // Flag capture: leaders of each team grab a flag mid-course
    if (ev.id === 'ctf' && k === 2) for (const team of ['wonderbolt', 'shadowbolt']) beats.push({ prop: r.participants[team][0], p: 'flag' });
    align(seqs);
    if (extra.beats.length) seqs.push(extra);
    beats.push(par(seqs));
    if (camTaken) beats.push({ cam: { followMax: ids, climb, lead: climb ? 0 : 260, zoom: climb ? 0.9 : 1, dur: 500, wait: false } });
  }

  // Finish
  const first = r.order[0];
  const finishSeqs = ids.map((id) => {
    const s = new Seq();
    const remain = Math.abs(finish - pos[id][K]);
    const extraDist = climb ? 0 : 180;
    const dur = id === first ? 700 : 700 + (remain / Math.abs(finish - start)) * K * segDur;
    s.move(id, axis, climb ? finish : finish + extraDist - ids.indexOf(id) * 30, dur, { as: anim, ease: 'out', then: climb ? 'hang' : 'idle' });
    return s;
  });
  if (r.photoFinish) beats.push({ flash: true }, { sfx: 'crash' });
  beats.push(par(finishSeqs));
  if (climb) beats.push({ sfx: 'bell' });
  beats.push({ cam: { on: [first], zoom: 1.3, dur: 600 } });
  beats.push({ anim: first, a: climb ? 'hang' : 'celebrate', f: 'happy' });
  if (r.photoFinish) beats.push(PA('milo', rng.pick(MILO.photo)), PA('priya', fill(rng.pick(PRIYA.photo), { name: nm(first) })));
  const teamWon = r.winner;
  const upsetLine = r.upset ? rng.pick(MILO.upset) + ' ' : '';
  beats.push(PA('milo', upsetLine + fill(rng.pick(MILO.winner), { team: teamName(teamWon), event: ev.name.toUpperCase() })));
  beats.push({ sfx: 'cheer' }, { fx: 'confetti', team: teamWon, at: first }, { card: { title: `${TEAMS[teamWon].name} win!`, sub: `+${r.points} points${r.penalties.shadowbolt ? ` · Shadow Bolt penalty −${r.penalties.shadowbolt}` : ''}`, team: teamWon, icon: '⚡' }, dur: 2400 });
  beats.push({ score: scoreOf(t, r.scoresAfter, `AFTER EVENT ${r.round + 1}`) }, { sfx: 'coin' }, { wait: 800 });
  return {
    title: ev.name, location: ev.venue, time: 'day', weather: r.weather, world, course, climb: climbCfg,
    music: final ? 'tense' : ev.tension >= 2 ? 'adventure' : 'stadium', cast, beats, score: scoreOf(t, r.scoresBefore), weight: 2,
  };
}

function buildIncident(inc, ctx) {
  const { rng, pos, k, axis, anim, climb, swim, t } = ctx;
  const V = inc.who;
  const p0 = (id) => pos[id][k], p1 = (id) => pos[id][k + 1];
  const mid = (id, f = 0.4) => lerp(p0(id), p1(id), f);
  const seqs = [];
  let extra = null, extraAt = 0;
  const camOn = (who, z = 1.35) => ({ cam: { on: [].concat(who), zoom: climb ? 1.1 : z, dur: 450, wait: false, followY: climb } });

  if (inc.type === 'slip') {
    const H = inc.helper;
    const v = new Seq();
    const mV = mid(V);
    v.add(camOn(H ? [V, H] : V));
    v.move(V, axis, mV, 700, { as: anim, then: false });
    v.add({ anim: V, a: climb ? 'hang' : swim ? 'float' : 'fall', f: 'surprised' }).add({ fx: swim ? 'splash' : 'dust', at: V });
    if (climb) v.move(V, 'y', mV + 150, 300, { as: 'hang', then: false }); else v.wait(300);
    v.say(V, line(rng, V, 'fall'), { dur: 1300 });
    if (H) {
      v.wait(1300);
      if (inc.crossTeam) v.add({ face: V, f: 'surprised' });
      if (!climb && !swim) v.add({ anim: V, a: 'getup', f: 'neutral', dur: 550 }, 550); else v.wait(550);
      const h = new Seq();
      const meet = climb ? mV + 150 : mV + (p0(H) > mV ? 90 : -90);
      h.move(H, axis, meet, 1500, { as: climb ? 'climb' : anim, then: 'idle' });
      if (!climb) h.add({ turn: H, dir: V });
      h.say(H, line(rng, H, 'helpGive'), { a: 'reach', dur: 1400, f: inc.crossTeam ? 'determined' : 'worried' });
      h.add({ anim: H, a: 'pull', dur: 500 }, 500).wait(750);
      h.add({ fx: 'heart', at: V });
      h.move(H, axis, p1(H), 1000, { as: anim, then: false });
      seqs.push(h);
      extra = [PA('milo', fill(rng.pick(MILO.fall), { name: nm(V) }), 1400), { wait: 1200 }, PA('milo', fill(rng.pick(MILO.help), { helper: nm(H), name: nm(V) }), 2200)];
      if (inc.crossTeam) extra.push({ sfx: 'gasp' });
      extraAt = 800;
    } else {
      v.wait(400);
      if (!climb && !swim) v.add({ anim: V, a: 'getup', f: 'determined', dur: 550 }, 550);
      extra = [PA('milo', fill(rng.pick(MILO.fall), { name: nm(V) }), 1600), { sfx: 'aww' }];
      extraAt = 800;
    }
    v.move(V, axis, p1(V), 1000, { as: anim, then: false });
    seqs.push(v);
  } else if (inc.type === 'sabotage') {
    const Sb = inc.who, Vt = inc.target;
    const s = new Seq(), v = new Seq();
    s.add(camOn([Sb, Vt]));
    s.move(Sb, axis, mid(Sb, 0.5), 900, { as: anim, then: false });
    if (!climb) s.add({ turn: Sb, dir: Vt });
    const sabLine = line(rng, Sb, 'sabotage', { victim: nm(Vt), mate: nm(Sb) });
    s.say(Sb, sabLine, { f: 'sneaky', whisper: inc.kind !== 'distraction', shout: inc.kind === 'distraction', dur: 1500 });
    if (inc.kind === 'jostle') s.add({ shake: 0.6 }).add({ sfx: 'thud' });
    v.move(Vt, axis, mid(Vt, 0.5), 900, { as: anim, then: false }).wait(1500);
    if (inc.backfire) {
      s.add({ anim: Sb, a: climb ? 'hang' : 'fall', f: 'surprised' }).add({ fx: 'dust', at: Sb }).wait(400).say(Sb, line(rng, Sb, 'backfire'), { dur: 1500 });
      if (!climb) s.add({ anim: Sb, a: 'getup', dur: 550 }, 550);
      v.add({ face: Vt, f: 'surprised' }).wait(600).add({ fx: 'question', at: Vt });
    } else if (inc.resisted) {
      v.add({ face: Vt, f: 'smug' }).say(Vt, rng.pick(['Nice try.', 'Not today.', 'Seriously? That\'s your plan?']), { dur: 1300 });
      s.add({ face: Sb, f: 'angry' }).add({ fx: 'anger', at: Sb });
    } else {
      v.add({ anim: Vt, a: inc.kind === 'distraction' ? 'lookup' : climb ? 'hang' : 'trip', f: 'surprised' }).add({ fx: 'question', at: Vt }).wait(700);
      v.say(Vt, inc.kind === 'distraction' ? rng.pick(['Wait — what? Where?', 'Huh?! …Oh, come ON.', 'What star?!']) : rng.pick(['Hey!', 'Whoa — watch it!', 'That sign was NOT there before!']), { dur: 1300, f: 'angry' });
      s.add({ face: Sb, f: 'smug' }).wait(400);
    }
    if (inc.caught) {
      s.add({ sfx: 'whistle' }).add(PA('hale', 'PENALTY. Shadow Bolt, minus five. I saw that.', 2400)).wait(600);
      s.say(Sb, line(rng, Sb, 'caught'), { f: 'worried', dur: 1500 });
    }
    s.move(Sb, axis, p1(Sb), 1000, { as: anim, then: false });
    v.move(Vt, axis, p1(Vt), 1000, { as: anim, then: false });
    seqs.push(s, v);
    extra = [PA('milo', rng.pick(MILO.sabotage), 1800), ...(inc.caught ? [{ wait: 2400 }, PA('milo', rng.pick(MILO.caught), 2200)] : [])];
    extraAt = 1400;
  } else if (inc.type === 'clutch') {
    const c = new Seq();
    c.add({ cam: { on: [V], zoom: climb ? 1.05 : 1.2, dur: 400, wait: false, follow: V, followY: climb } });
    c.add({ fx: 'speed', at: V, dur: 2200 }).add({ face: V, f: 'determined' });
    c.add(S(V, line(rng, V, 'clutch'), { shout: true, dur: 1500 }));
    c.move(V, axis, p1(V), 2600, { as: anim, then: false, ease: 'in' });
    seqs.push(c);
    extra = [PA('milo', fill(rng.pick(MILO.clutch), { name: nm(V).toUpperCase() }), 1800)];
    extraAt = 500;
  } else if (inc.type === 'shortcut') {
    const c = new Seq();
    c.add(camOn(V, 1.25));
    c.move(V, axis, mid(V, 0.35), 700, { as: anim, then: false });
    c.say(V, line(rng, V, 'shortcut'), { f: 'sneaky', dur: 1300 });
    if (inc.success) c.add({ fx: 'speed', at: V, dur: 1400 }).add({ face: V, f: 'happy' });
    else c.add({ anim: V, a: 'dizzy', f: 'worried' }).add({ fx: 'question', at: V }).wait(1100);
    c.move(V, axis, p1(V), 1000, { as: anim, then: false });
    seqs.push(c);
    extra = [PA('milo', fill(rng.pick(inc.success ? MILO.shortcutWin : MILO.shortcutFail), { name: nm(V) }), 1800)];
    extraAt = 1900;
  } else if (inc.type === 'equipment') {
    const F = inc.helper;
    const v = new Seq();
    v.add(camOn(F ? [V, F] : V));
    v.move(V, axis, mid(V), 700, { as: anim, then: false });
    v.add({ anim: V, a: climb ? 'hang' : 'nervous', f: 'worried' }).add({ fx: 'exclaim', at: V }).say(V, line(rng, V, 'fall'), { dur: 1300 });
    if (F) {
      v.wait(1800);
      const f = new Seq();
      f.move(F, axis, climb ? mid(V) : mid(V) + (p0(F) > mid(V) ? 80 : -80), 1300, { as: climb ? 'climb' : anim, then: 'idle' });
      if (!climb) f.add({ turn: F, dir: V });
      f.say(F, rng.pick([`Hold still — I've got it.`, `Two seconds. Don't move.`, `Here — like this.`]), { a: 'reach', dur: 1300 });
      f.add({ anim: F, a: 'clap', dur: 500 }, 500);
      f.move(F, axis, p1(F), 1000, { as: anim, then: false });
      seqs.push(f);
    } else v.wait(900);
    v.move(V, axis, p1(V), 1000, { as: anim, then: false });
    seqs.push(v);
    extra = [PA('milo', fill(rng.pick(MILO.equipment), { hazard: inc.hazard ? inc.hazard[0].toUpperCase() + inc.hazard.slice(1) : 'Gear trouble' }), 2000)];
    extraAt = 700;
  }
  return { seqs, extra, extraAt };
}

// ───────────────────────────── Relay
function relayScene(t, r, ev) {
  const rng = makeRng(t.seed ^ (r.round * 577) ^ 0x4e1);
  const W = 5200, start = 420, finish = 4700, gy = 690;
  const legX = (k) => lerp(start, finish, k / 4);
  const cast = {};
  const teams = ['wonderbolt', 'shadowbolt'];
  teams.forEach((team, lane) => r.runners[team].forEach((id, k) => { cast[id] = { x: legX(k) - (k === 0 ? 40 : 0), lane, facing: 1, face: k === 0 ? 'determined' : 'neutral', prop: null }; }));
  const beats = [];
  const final = r.round >= t.length - 1;
  beats.push({ card: { title: `EVENT ${r.round + 1} · ${ev.name.toUpperCase()}`, sub: final ? 'FINAL EVENT · DOUBLE POINTS' : ev.blurb, icon: ev.icon }, dur: 2400 });
  const w0 = r.runners.wonderbolt[0], s0 = r.runners.shadowbolt[0];
  beats.push({ prop: w0, p: 'baton' }, { prop: s0, p: 'baton' });
  beats.push({ cam: { on: [w0, s0], zoom: 1.3 } }, S(w0, line(rng, w0, 'pre', { rival: nm(s0) }), { to: s0 }), S(s0, line(rng, s0, 'pre', { rival: nm(w0) }), { to: w0 }));
  beats.push({ turn: w0, dir: 1 }, { turn: s0, dir: 1 }, { sfx: 'beep' }, { wait: 600 }, { sfx: 'go' }, PA('milo', rng.pick(MILO.go), 1400));
  // Leg durations: team total time ∝ 1/teamMean, split by 1/leg speed.
  const legV = (team) => r.runners[team].map((id, k) => r.perf[id][k]);
  const means = Object.fromEntries(teams.map((tm) => [tm, legV(tm).reduce((s, v) => s + v, 0) / 4]));
  const avg = (means.wonderbolt + means.shadowbolt) / 2;
  const seqs = teams.map((team) => {
    const s = new Seq();
    const lv = legV(team);
    const T = 4 * 2600 * (avg / means[team]);
    const inv = lv.map((v) => 1 / v), invSum = inv.reduce((a, b) => a + b, 0);
    const other = team === 'wonderbolt' ? 'shadowbolt' : 'wonderbolt';
    r.runners[team].forEach((id, k) => {
      const d = (T * inv[k]) / invSum;
      s.move(id, 'x', k === 3 ? finish + 160 : legX(k + 1) - 30, d, { as: 'run', ease: 'linear', then: k === 3 ? 'celebrate' : 'idle' });
      const next = r.runners[team][k + 1];
      if (next) {
        const drop = r.incidents.find((i) => i.type === 'baton' && i.who === next);
        s.add({ prop: id, p: null }).add({ prop: next, p: 'baton' }).add({ sfx: 'pop' });
        s.add({ say: id, text: line(rng, id, 'encourage', { mate: nm(next) }), dur: 1200 });
        if (drop) {
          s.add({ prop: next, p: null }).add({ anim: next, a: 'crouch', f: 'surprised' }).add({ fx: 'exclaim', at: next });
          s.add(PA('milo', `${nm(next)} DROPS THE BATON!`, 1600)).say(next, line(rng, next, 'fall'), { dur: 1200 }).add({ prop: next, p: 'baton' }).add({ anim: next, a: 'idle', f: 'determined' });
          s.add({ say: r.runners[other][k + 1] || id, text: '…!', dur: 500 });
        }
      }
    });
    return s;
  });
  beats.push({ cam: { followMax: [...r.runners.wonderbolt, ...r.runners.shadowbolt], lead: 200, dur: 400, wait: false } });
  if (r.photoFinish) seqs[0].add({ flash: true });
  beats.push(par(seqs));
  const anchor = r.runners[r.winner][3];
  beats.push({ cam: { on: [anchor], zoom: 1.3, dur: 600 } });
  if (r.photoFinish) beats.push(PA('milo', rng.pick(MILO.photo)));
  beats.push(PA('milo', (r.upset ? rng.pick(MILO.upset) + ' ' : '') + fill(rng.pick(MILO.winner), { team: teamName(r.winner), event: ev.name.toUpperCase() })));
  beats.push({ sfx: 'cheer' }, { fx: 'confetti', team: r.winner, at: anchor }, { card: { title: `${TEAMS[r.winner].name} win!`, sub: `+${r.points} points`, team: r.winner, icon: '⚡' }, dur: 2400 });
  beats.push({ score: scoreOf(t, r.scoresAfter, `AFTER EVENT ${r.round + 1}`) }, { sfx: 'coin' }, { wait: 800 });
  return { title: ev.name, location: 'track', time: 'day', weather: r.weather, world: { w: W, groundY: gy }, course: { start, finish, obstacles: [], lanes: [0, 1] }, music: final ? 'tense' : 'stadium', cast, beats, score: scoreOf(t, r.scoresBefore), weight: 2 };
}

// ───────────────────────────── Archery
function aimScene(t, r, ev) {
  const rng = makeRng(t.seed ^ (r.round * 313) ^ 0xa1);
  const A = r.participants.wonderbolt[0], B = r.participants.shadowbolt[0];
  const cast = { [A]: { x: 330, face: 'determined', facing: 1 }, [B]: { x: 150, face: 'determined', facing: 1 } };
  const tx = 1600 - 260, ty = 780 - 150;
  const beats = [];
  const final = r.round >= t.length - 1;
  beats.push({ card: { title: `EVENT ${r.round + 1} · ${ev.name.toUpperCase()}`, sub: final ? 'FINAL EVENT · DOUBLE POINTS' : ev.blurb, icon: ev.icon }, dur: 2400 });
  beats.push({ cam: { on: [A, B], zoom: 1.35 } }, { turn: A, dir: B }, S(A, line(rng, A, 'pre', { rival: nm(B) }), { to: B }), S(B, line(rng, B, 'pre', { rival: nm(A) }), { to: A }), { turn: A, dir: 1 });
  const tally = { [A]: 0, [B]: 0 };
  const rounds = Math.max(r.shots[A].length, r.shots[B].length);
  let sabotageSpawned = false;
  for (let i = 0; i < rounds; i++) {
    if (i === 3) beats.push(PA('milo', 'TIED! SHOOT-OFF! ONE ARROW EACH!'), { sfx: 'drum' });
    const wind = r.incidents.find((x) => x.type === 'wind' && x.seg === i);
    if (wind) beats.push({ sfx: 'whoosh' }, PA('milo', 'Big gust across the meadow!', 1400), { shake: 0.2 });
    for (const [id, otherId] of [[A, B], [B, A]]) {
      const sc = r.shots[id][i];
      if (sc == null) continue;
      beats.push({ par: [{ move: id, x: 330, dur: 500 }, { move: otherId, x: 150, dur: 500 }] }, { turn: id, dir: 1 }, { turn: otherId, dir: 1 });
      beats.push({ prop: id, p: 'bow' }, { prop: otherId, p: null }, { cam: { on: [id], zoom: 1.4, dur: 400 } }, { anim: id, a: 'bow', f: 'determined', dur: 900 });
      const sab = r.incidents.find((x) => x.type === 'sabotage' && x.seg === i && x.target === id);
      if (sab) {
        const sabId = sab.who;
        if (sab.sideline && !sabotageSpawned) { beats.push({ spawn: { id: sabId, x: 600, lane: -1, face: 'sneaky', facing: -1 } }); sabotageSpawned = true; }
        beats.push({ cam: { on: [sabId], zoom: 1.4, dur: 400 } }, S(sabId, line(rng, sabId, 'sabotage', { victim: nm(id), mate: nm(sabId) }), { shout: true, f: 'sneaky' }));
        beats.push({ cam: { on: [id], zoom: 1.4, dur: 300 } });
        if (sab.resisted) beats.push({ face: id, f: 'smug' }, S(id, rng.pick(['Nice try.', 'Darling, please.', 'Not falling for that.']), {}));
        else beats.push({ anim: id, a: 'lookup', f: 'surprised', dur: 600 }, { fx: 'question', at: id });
        if (sab.caught) beats.push({ sfx: 'whistle' }, PA('hale', 'PENALTY. Shadow Bolt, minus five. Sit DOWN.', 2200), S(sabId, line(rng, sabId, 'caught'), { f: 'worried' }));
      }
      const off = (10 - sc) * 9;
      const ang = rng.range(0, Math.PI * 2);
      const hitX = tx + Math.cos(ang) * off, hitY = ty + Math.sin(ang) * off;
      beats.push({ anim: id, a: 'shoot' }, { fx: 'arrow', at: id, to: { x: hitX, y: hitY }, dur: 600, wait: true });
      beats.push({ cam: { x: tx, y: ty, zoom: 1.8, dur: 300 } }, { fx: 'hit', at: { x: hitX, y: hitY - 30 }, text: sc === 10 ? 'BULLSEYE!' : String(sc), color: sc >= 9 ? '#ffd23f' : sc >= 6 ? '#fff' : '#ff8a8a' });
      tally[id] += sc;
      beats.push({ wait: 700 }, { lower: { name: `${nm(A)} ${tally[A]}  ·  ${nm(B)} ${tally[B]}`, sub: i >= 3 ? 'SHOOT-OFF' : `ROUND ${i + 1} OF 3` }, dur: 0 });
      if (sc === 10) beats.push({ sfx: 'cheer' });
      else if (sc <= 4) beats.push({ sfx: 'aww' });
      beats.push({ cam: { on: [id], zoom: 1.4, dur: 400 } });
      if (sc >= 9) beats.push({ anim: id, a: 'fistpump', f: 'happy', dur: 800 });
      else if (sc <= 5) beats.push({ anim: id, a: 'facepalm', f: 'sad', dur: 900 }, rng.chance(0.5) ? S(otherId, line(rng, otherId, 'taunt', { rival: nm(id) }), { f: 'smug' }) : { wait: 1 });
      beats.push({ anim: id, a: 'idle' });
    }
  }
  const win = r.order[0];
  beats.push({ cam: { on: [win], zoom: 1.35, dur: 600 } }, { anim: win, a: 'celebrate', f: 'happy' });
  if (r.photoFinish) beats.push(PA('milo', 'BY A SINGLE POINT!'));
  beats.push(PA('milo', (r.upset ? rng.pick(MILO.upset) + ' ' : '') + fill(rng.pick(MILO.winner), { team: teamName(r.winner), event: ev.name.toUpperCase() })));
  beats.push({ sfx: 'cheer' }, { fx: 'confetti', team: r.winner, at: win }, { card: { title: `${TEAMS[r.winner].name} win!`, sub: `${tally[A]}–${tally[B]} · +${r.points} points`, team: r.winner, icon: '🏹' }, dur: 2400 });
  beats.push({ score: scoreOf(t, r.scoresAfter, `AFTER EVENT ${r.round + 1}`) }, { sfx: 'coin' }, { wait: 800 });
  return { title: ev.name, location: 'archery', time: 'day', weather: r.weather, world: { w: 1600 }, music: final ? 'tense' : 'bright', cast, beats, score: scoreOf(t, r.scoresBefore), weight: 2 };
}

// ───────────────────────────── Aftermath
export function aftermathScene(t, r, jealousyCount = 0) {
  const rng = makeRng(t.seed ^ (r.round * 733) ^ 0xaf7);
  const ev = eventById[r.event];
  const win = r.winner, lose = win === 'wonderbolt' ? 'shadowbolt' : 'wonderbolt';
  const W = r.participants[win], L = r.participants[lose];
  const cast = {};
  // Winners left-center, losers right. Bring two non-competing teammates for reactions.
  const extrasFor = (team, used) => MAJOR.filter((c) => c.team === team && !c.reserve && !used.includes(c.id)).map((c) => c.id).slice(0, 2);
  const wAll = [...W, ...extrasFor(win, W)].slice(0, 4), lAll = [...L, ...extrasFor(lose, L)].slice(0, 4);
  wAll.forEach((id, i) => { cast[id] = { x: 380 + i * 115, face: 'happy', anim: W.includes(id) ? 'celebrate' : 'cheer' }; });
  lAll.forEach((id, i) => { cast[id] = { x: 1030 + i * 115, face: 'sad', facing: -1 }; });
  const beats = [];
  const star = r.order.find((id) => W.includes(id)) || W[0];
  beats.push({ cam: { on: wAll, zoom: 1.2 } }, { sfx: 'cheer' });
  beats.push(S(star, line(rng, star, 'win', { rival: nm(L[0]) }), { f: 'laugh' }));
  const mate = wAll.find((x) => x !== star);
  if (mate) beats.push({ turn: mate, dir: star }, { anim: mate, a: 'highfive' }, { anim: star, a: 'highfive' }, { sfx: 'pop' }, { wait: 500 }, { anim: mate, a: 'cheer' }, { anim: star, a: 'celebrate' });
  if (r.upset && byId[star].stats.fame <= 3) beats.push(S(mate || star, rng.pick([`${nm(star)}! Where did THAT come from?!`, `Did everyone see ${nm(star)}?!`, `${nm(star)}, you absolute legend!`]), { f: 'surprised' }), { anim: star, a: 'hop', f: 'laugh', dur: 1200 });

  // Loser reaction
  const lead = L[0];
  beats.push({ cam: { on: lAll, zoom: 1.25, dur: 700 } });
  const angryLose = ['rainbow', 'cherry'].includes(lead);
  beats.push(S(lead, line(rng, lead, 'lose'), { f: angryLose ? 'angry' : 'sad', a: angryLose ? 'angry' : 'sad' }));
  const comforter = lAll.find((x) => x !== lead && (LINES[x]?.comfort));
  if (comforter && rng.chance(0.6)) beats.push({ turn: comforter, dir: lead }, S(comforter, line(rng, comforter, 'comfort'), { f: 'worried' }), { anim: comforter, a: 'hug', dur: 900 }, { anim: comforter, a: 'idle' });

  // Incident follow-ups — shown, not explained.
  const help = r.incidents.find((i) => i.type === 'slip' && i.helper && i.crossTeam);
  const sab = r.incidents.find((i) => i.type === 'sabotage');
  if (help) {
    const V = help.who, H = help.helper;
    if (!cast[V]) cast[V] = { x: byId[V].team === win ? 700 : 1100, face: 'neutral' };
    if (!cast[H]) cast[H] = { x: byId[H].team === win ? 700 : 1100, face: 'neutral' };
    beats.push({ cam: { on: [V, H], zoom: 1.45, dur: 800 } }, { music: 'sad' });
    beats.push({ move: V, x: cast[H].x + (cast[H].x > 800 ? -150 : 150), dur: 1200, as: 'walk' }, { turn: V, dir: H }, { turn: H, dir: V }, { face: V, f: 'neutral' }, { face: H, f: 'neutral' }, { wait: 900 });
    beats.push(S(V, line(rng, V, 'helpGet'), { f: 'worried' }));
    if (rng.chance(0.5)) beats.push({ anim: H, a: 'shrug', dur: 900 }, { face: H, f: 'happy' }, { wait: 500 });
    else beats.push(S(H, line(rng, H, 'respect', { rival: nm(V) }), { f: 'happy' }));
    // A teammate of the helper saw it.
    const hMates = MAJOR.filter((c) => c.team === byId[H].team && c.id !== H && cast[c.id]).map((c) => c.id);
    if (byId[H].team === 'shadowbolt' && hMates.includes('cherry') && H !== 'cherry') beats.push({ cam: { on: ['cherry'], zoom: 1.5, dur: 500 } }, { face: 'cherry', f: 'angry' }, { fx: 'anger', at: 'cherry' }, { wait: 1300 });
    else if (hMates[0]) beats.push({ cam: { on: [hMates[0]], zoom: 1.5, dur: 500 } }, { face: hMates[0], f: 'surprised' }, { fx: 'question', at: hMates[0] }, { wait: 1100 });
    beats.push({ music: win === 'shadowbolt' ? 'shadow' : 'bright' });
  }
  if (sab) {
    const Sb = sab.who;
    if (!cast[Sb]) cast[Sb] = { x: byId[Sb].team === win ? 820 : 1260, face: 'neutral', facing: -1 };
    const critic = ['cena', 'twilight', 'nova'].find((x) => x !== Sb && (x !== 'twilight' || t.arcStage >= 1));
    if (critic && (sab.caught || rng.chance(0.6))) {
      if (!cast[critic]) cast[critic] = { x: cast[Sb].x + 150, facing: -1 };
      beats.push({ cam: { on: [Sb, critic], zoom: 1.45, dur: 700 } }, { music: 'sneaky' }, { turn: critic, dir: Sb }, { turn: Sb, dir: critic });
      beats.push(S(critic, line(rng, critic, 'disapprove'), { f: 'angry' }));
      if (Sb === 'cherry') beats.push(S('cherry', rng.pick(['Don\'t. Not now.', 'You want to win or not?', 'I did what I had to.']), { f: 'angry' }), { exit: 'cherry', to: 'right', dur: 1300, as: 'walk' });
      else if (t.arcStage >= 1 && LINES[Sb]?.regret) beats.push({ face: Sb, f: 'sad' }, { wait: 800 }, S(Sb, line(rng, Sb, 'regret'), { f: 'sad' }));
      else beats.push(S(Sb, line(rng, Sb, 'approve'), { f: 'smug' }), { face: critic, f: 'sad' }, { wait: 800 });
    } else if (!sab.caught && !sab.resisted) {
      const V = sab.target;
      if (!cast[V]) cast[V] = { x: 600 };
      beats.push({ cam: { on: [V], zoom: 1.5, dur: 600 } }, S(V, rng.pick(['Did anyone else see that?', 'That was NOT an accident.', 'Somebody tell Hale. Anybody?']), { f: 'angry' }));
      beats.push({ cam: { on: [Sb], zoom: 1.5, dur: 500 } }, { face: Sb, f: 'smug' }, { wait: 1200 });
    }
  }

  // The spotlight: jealousy is shown, then answered.
  const sbCaptainHere = 'cherry';
  if (win === 'wonderbolt' && (jealousyCount === 0 || rng.chance(0.35))) {
    if (!cast[sbCaptainHere]) cast[sbCaptainHere] = { x: 1250, facing: -1, face: 'angry' };
    const replier = ['icecream', 'twilight', 'cena'].find((x) => x !== sbCaptainHere && (!cast[x] || true));
    if (!cast[replier]) cast[replier] = { x: 1400, facing: -1, face: 'neutral' };
    beats.push({ cam: { on: wAll, zoom: 1.1, dur: 600 } }, { sfx: 'cheer' }, { spawn: { id: 'benny', x: 220, face: 'laugh', anim: 'cheer' } }, { spawn: { id: 'hazel', x: 120, face: 'happy' } }, { fx: 'sparkle', at: { x: 500, y: 520 } });
    beats.push({ cam: { on: [sbCaptainHere, replier], zoom: 1.5, dur: 900 } }, { music: 'shadow' }, { face: sbCaptainHere, f: 'angry' }, { wait: 900 });
    beats.push(S(sbCaptainHere, line(rng, 'cherry', 'jealous'), { f: 'angry' }));
    beats.push({ turn: replier, dir: sbCaptainHere }, S(replier, jealousyCount === 0 ? 'Then let\'s take it.' : line(rng, replier, 'jealousReply'), { f: 'determined' }), { face: sbCaptainHere, f: 'smug' }, { wait: 800 });
    r.jealousyBeat = true;
  } else if (win === 'shadowbolt') {
    const sbStar = star;
    const wbWatcher = lAll.includes('rainbow') ? 'rainbow' : lAll.includes('sunset') ? 'sunset' : lAll[0];
    beats.push({ cam: { on: [sbStar, wbWatcher], zoom: 1.2, dur: 700 } }, { turn: sbStar, dir: wbWatcher });
    beats.push(S(sbStar, line(rng, sbStar, 'taunt', { rival: nm(wbWatcher) }), { f: 'smug' }));
    const rv = rel(t, sbStar, wbWatcher);
    if (rv > 10 || rng.chance(0.3)) beats.push(S(wbWatcher, line(rng, wbWatcher, 'respect', { rival: nm(sbStar) }), { f: 'neutral' }), { face: sbStar, f: 'surprised' }, { wait: 900 });
    else beats.push(S(wbWatcher, line(rng, wbWatcher, 'trail'), { f: 'determined' }));
  }
  // Rare quiet beat between Sunset and Cherry
  if (rng.chance(0.18) && t.round >= 2) {
    if (!cast.sunset) cast.sunset = { x: 700 };
    if (!cast.cherry) cast.cherry = { x: 1100, facing: -1 };
    beats.push({ cam: { on: ['sunset', 'cherry'], zoom: 1.5, dur: 900 } }, { music: 'sad' }, { turn: 'sunset', dir: 'cherry' }, { turn: 'cherry', dir: 'sunset' });
    beats.push(S('sunset', line(rng, 'sunset', 'toCherry'), { f: 'sad' }), { wait: 1000 });
    if (rel(t, 'sunset', 'cherry') > -20) beats.push({ face: 'cherry', f: 'sad' }, { wait: 1200 }, { turn: 'cherry', dir: 1 }, { exit: 'cherry', to: 'right', as: 'walk', dur: 1800 });
    else beats.push(S('cherry', line(rng, 'cherry', 'toSunset'), { f: 'angry' }), { exit: 'cherry', to: 'right', as: 'walk', dur: 1400 });
  }
  beats.push({ wait: 600 });
  const loc = ev.venue === 'gorge' || ev.venue === 'mountain' ? 'mountain' : ev.venue === 'pool' || ev.venue === 'river' || ev.venue === 'lake' ? 'stadium' : ev.venue;
  return { title: `After the ${ev.name}`, location: loc === 'archery' ? 'archery' : loc, time: t.round >= t.length - 1 ? 'dusk' : 'day', weather: r.weather, world: { w: 1600 }, music: win === 'shadowbolt' ? 'shadow' : 'bright', cast, beats, score: scoreOf(t, r.scoresAfter, `AFTER EVENT ${r.round + 1}`), weight: 1 };
}

// ───────────────────────────── Closing ceremony
export function closingScene(t) {
  const rng = makeRng(t.seed ^ 0xc105e);
  const win = t.winner, lose = win === 'wonderbolt' ? 'shadowbolt' : 'wonderbolt';
  const W = MAJOR.filter((c) => c.team === win).map((c) => c.id);
  const L = MAJOR.filter((c) => c.team === lose).map((c) => c.id);
  const cast = { milo: { x: 200, face: 'happy' }, priya: { x: 320, facing: -1 }, hale: { x: 2100, facing: -1, anim: 'crossed' } };
  W.forEach((id, i) => { cast[id] = { x: 720 + i * 110, face: 'happy', anim: 'celebrate' }; });
  L.forEach((id, i) => { cast[id] = { x: 1500 + i * 110, face: 'sad', facing: -1 }; });
  const beats = [{ cam: { x: 1200, y: 450, zoom: 1 } }, { card: { title: 'CLOSING CEREMONY', sub: `Final score ${t.scores.wonderbolt} – ${t.scores.shadowbolt}`, icon: '🏆', big: true }, dur: 2400 }];
  beats.push({ cam: { on: ['milo'], zoom: 1.5, dur: 600 } }, S('milo', fill(MILO.champion[0], { team: teamName(win) }), { shout: true, a: 'cheer' }));
  beats.push({ cam: { on: W, zoom: 1.2, dur: 800 } }, { sfx: 'fanfare' }, { sfx: 'cheer' }, { fx: 'confetti', team: win, at: { x: 1000, y: 500 } }, { fx: 'sparkle', at: { x: 900, y: 450 } });
  const cap = win === 'wonderbolt' ? 'sunset' : 'cherry';
  beats.push(S(cap, line(rng, cap, 'finalWin'), { f: 'laugh' }));
  const loud = win === 'wonderbolt' ? 'rainbow' : 'icecream';
  beats.push(S(loud, line(rng, loud, 'finalWin'), { f: 'laugh', a: 'celebrate' }));
  if (t.mvp) beats.push({ cam: { on: [t.mvp], zoom: 1.5, dur: 700 } }, { lower: { name: `MVP · ${byId[t.mvp].name}`, sub: `${TEAMS[byId[t.mvp].team].name} · ${mvpLine(t)}`, team: byId[t.mvp].team }, dur: 2600 }, { anim: t.mvp, a: 'fistpump', f: 'happy', dur: 1200 });
  if (t.comeback) beats.push(PA('milo', 'FROM WAY BEHIND! WHAT A COMEBACK!'));
  // Losing side
  const lcap = lose === 'wonderbolt' ? 'sunset' : 'cherry';
  beats.push({ cam: { on: L, zoom: 1.25, dur: 800 } }, { music: 'sad' }, S(lcap, line(rng, lcap, 'finalLose'), { f: 'sad' }));
  const lmate = L.find((x) => x !== lcap && LINES[x]?.comfort) || L[1];
  beats.push({ turn: lmate, dir: lcap }, S(lmate, line(rng, lmate, 'comfort'), { f: 'worried' }), { anim: lmate, a: 'hug', dur: 1000 });
  // The quiet moment: strongest cross-team bond formed during this tournament.
  let best = null, bestV = 6;
  for (const [k, v] of Object.entries(t.relDelta)) {
    const [a, b] = k.split('|');
    if (byId[a]?.team !== byId[b]?.team && byId[a]?.team !== 'neutral' && byId[b]?.team !== 'neutral' && v > bestV) { best = [a, b]; bestV = v; }
  }
  const pair = best || ['sunset', 'cherry'];
  const [p, q] = byId[pair[0]].team === win ? pair : [pair[1], pair[0]];
  beats.push({ cam: { on: [p, q], zoom: 1.2, dur: 900 } }, { move: p, x: 1250, dur: 1600, as: 'walk' }, { move: q, x: 1420, dur: 900, as: 'walk' }, { turn: p, dir: q }, { turn: q, dir: p }, { cam: { on: [p, q], zoom: 1.55, dur: 700 } }, { face: p, f: 'neutral' }, { face: q, f: 'neutral' }, { wait: 1200 });
  if (best) {
    beats.push(S(p, line(rng, p, 'respect', { rival: nm(q) }), { f: 'happy' }), { wait: 600 }, { anim: p, a: 'highfive' }, { wait: 700 }, { anim: q, a: 'highfive', f: 'happy' }, { sfx: 'pop' }, { fx: 'sparkle', at: { x: 1335, y: 420 } }, { wait: 900 });
    beats.push(S(q, line(rng, q, 'respect', { rival: nm(p) }), { f: 'happy' }));
  } else {
    beats.push(S('sunset', line(rng, 'sunset', 'toCherry'), { f: 'sad' }), { wait: 1400 });
    beats.push({ face: 'cherry', f: 'sad' }, { wait: 1000 }, S('cherry', rel(t, 'sunset', 'cherry') > -30 ? '…Next year. You and me. Final event.' : line(rng, 'cherry', 'toSunset'), { f: rel(t, 'sunset', 'cherry') > -30 ? 'determined' : 'angry' }));
  }
  beats.push({ music: 'triumph' }, { cam: { x: 1200, zoom: 0.9, dur: 1600 } }, { fx: 'sparkle', at: { x: 900, y: 250 } }, { fx: 'sparkle', at: { x: 1500, y: 220 } }, { fx: 'confetti', at: { x: 1200, y: 400 } }, { wait: 2600 });
  return { title: 'Closing Ceremony', location: 'stadium', time: 'dusk', weather: 'clear', world: { w: 2400 }, music: 'triumph', cast, beats, score: scoreOf(t, t.scores, 'FINAL'), weight: 1.5 };
}

function mvpLine(t) {
  const s = t.charStats[t.mvp];
  if (!s) return '';
  const bits = [`${s.firsts} first-place finish${s.firsts === 1 ? '' : 'es'}`];
  if (s.helps) bits.push(`${s.helps} helping hand${s.helps === 1 ? '' : 's'}`);
  if (s.clutch) bits.push(`${s.clutch} clutch moment${s.clutch === 1 ? '' : 's'}`);
  return bits.join(' · ');
}

// Scenes for one round.
export function roundScenes(t, r, jealousyCount = 0) {
  return [revealScene(t, r), eventScene(t, r), aftermathScene(t, r, jealousyCount)];
}
