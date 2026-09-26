// Friendship Games tournament engine. Pure logic — no DOM — so it runs in Node for tests.
//
// Flow per round (see advance()):
//   1. use the already-revealed nextEvent (or select one)   4. update individual stats
//   2. pick lineups & simulate the event                     5. update relationships
//   3. decide the actual winner & update team scores         6. select + reveal the NEXT event
//
// Event selection is a weighted graph walk: thematic links from the previous event, winner-
// dependent branches, score gap (comeback pressure), tension, finale timing, weather, recent
// story beats and seeded randomness. The same seed replays the same tournament; a new seed
// produces a different sequence.

import { EVENTS, eventById } from '../data/events.js';
import { MAJOR, byId, pairKey, BASE_REL } from '../data/characters.js';
import { makeRng, clamp } from '../util.js';

export const TEAMS = ['wonderbolt', 'shadowbolt'];
const other = (t) => (t === 'wonderbolt' ? 'shadowbolt' : 'wonderbolt');
const roster = (team) => MAJOR.filter((c) => c.team === team);

export function suit(ch, ev) {
  let s = 0, w = 0;
  for (const [k, v] of Object.entries(ev.weights)) { s += (ch.stats[k] ?? 5) * v; w += v; }
  const special = ch.specialties?.some((x) => ev.id.startsWith(x) || x === ev.id || (x === 'swim' && ev.cat === 'water')) ? 0.6 : 0;
  return s / w + special;
}

const roundRng = (t, salt = 0) => makeRng((t.seed ^ Math.imul(t.round + 1, 0x9e3779b1) ^ salt) >>> 0);

export function createTournament({ seed, length = 6, arcStage = 0, relDelta = {} } = {}) {
  const t = {
    seed: seed >>> 0, length, round: 0, arcStage,
    scores: { wonderbolt: 0, shadowbolt: 0 },
    eventHistory: [], currentEvent: null, previousEvent: null, nextEvent: null, nextSelection: null,
    weather: 'clear', fatigue: {}, charStats: {}, relDelta: {}, baseRelDelta: relDelta,
    streak: { team: null, n: 0 }, maxDeficit: { wonderbolt: 0, shadowbolt: 0 },
    finished: false, winner: null, mvp: null, tiebreak: false, startedAt: Date.now(),
  };
  t.weather = makeRng(t.seed ^ 0xabc)() < 0.2 ? 'rain' : 'clear';
  const sel = selectNextEvent(t);
  t.nextEvent = sel.event.id;
  t.nextSelection = sel;
  return t;
}

export function rel(t, a, b) {
  const k = pairKey(a, b);
  return (BASE_REL[k]?.v ?? 0) + (t.baseRelDelta?.[k] || 0) + (t.relDelta[k] || 0);
}
function bumpRel(t, a, b, d) { const k = pairKey(a, b); t.relDelta[k] = (t.relDelta[k] || 0) + d; }

function teamSuit(team, ev) {
  const xs = roster(team).map((c) => suit(c, ev)).sort((a, b) => b - a);
  const n = ev.size === 4 ? 4 : ev.size;
  return xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
}

// ───────────────────────────── 6. Dynamic event selection
export function selectNextEvent(t) {
  const rng = roundRng(t, 0x5e1ec7);
  const prev = t.eventHistory[t.eventHistory.length - 1];
  const used = new Set(t.eventHistory.map((r) => r.event));
  const isFinal = t.round >= t.length - 1;
  const gap = t.scores.wonderbolt - t.scores.shadowbolt;
  const trailing = gap > 0 ? 'shadowbolt' : gap < 0 ? 'wonderbolt' : null;
  const reasons = {};
  let pool = EVENTS.filter((e) => !used.has(e.id));
  if (pool.length < 3) pool = EVENTS.slice();

  const scored = pool.map((e) => {
    let w = 1;
    const why = [];
    if (prev) {
      const pe = eventById[prev.event];
      const link = pe.links[e.id] || 0;
      if (link) { w *= 1 + link; why.push('flow'); }
      if (pe.branch[prev.winner]?.includes(e.id)) { w *= 3.2; why.push('branch'); }
      if (e.cat === pe.cat) w *= 0.35;
      if (e.venue === pe.venue) w *= 0.6;
      if (prev.incidents.some((i) => i.type === 'help' && i.crossTeam) && e.cat === 'team') { w *= 1.5; why.push('story'); }
    }
    if (Math.abs(gap) >= 20 && trailing) {
      const adv = teamSuit(trailing, e) - teamSuit(other(trailing), e);
      w *= clamp(1 + adv * 0.7, 0.5, 2.5);
      if (e.tension >= 2) w *= 1.4;
      if (adv > 0.2) why.push('comeback');
    } else if (Math.abs(gap) <= 10 && t.round >= 2 && e.tension === 3) { w *= 1.5; why.push('close'); }
    if (isFinal) { if (e.finale) { w *= 6; why.push('finale'); } else w *= 0.3; }
    else if (e.finale) w *= t.round >= t.length - 3 ? 0.8 : 0.35;
    if (t.weather === 'rain') { if (!e.outdoor) { w *= 1.4; why.push('weather'); } else if (e.cat === 'wheels') w *= 0.6; }
    if (t.streak.n >= 2 && teamSuit(other(t.streak.team), e) > teamSuit(t.streak.team, e)) { w *= 1.35; why.push('streak'); }
    w *= rng.range(0.75, 1.3);
    return { e, w, why };
  });

  const chosen = rng.weighted(scored.map((s) => ({ item: s, w: s.w })));
  // Wheel options: the chosen event plus the strongest alternatives, shuffled.
  const alts = scored.filter((s) => s !== chosen).sort((a, b) => b.w - a.w).slice(0, 5).map((s) => s.e);
  const options = rng.shuffle([chosen.e, ...alts]);
  const total = scored.reduce((s, x) => s + x.w, 0);
  return {
    event: chosen.e, why: chosen.why, prevWinner: prev?.winner || null, trailing, gap,
    options: options.map((e) => ({ id: e.id, name: e.name, short: e.name.split(' ').slice(0, 2).join(' '), icon: e.icon })),
    index: options.indexOf(chosen.e),
    odds: scored.map((s) => ({ id: s.e.id, p: s.w / total })).sort((a, b) => b.p - a.p).slice(0, 8),
    isFinal,
  };
}

// ───────────────────────────── 2. Lineups
function pickLineup(t, team, ev, rng) {
  const cands = MAJOR.filter((c) => c.team === team);
  const last = t.eventHistory[t.eventHistory.length - 1];
  const scored = cands.map((c) => {
    let s = suit(c, ev) + rng.normal() * 0.9 - (t.fatigue[c.id] || 0) * 1.0;
    if (c.reserve) s -= 0.8;
    if (last && last.incidents.some((i) => i.who === c.id && (i.type === 'slip' || i.type === 'caught'))) s += rng.chance(0.4) ? 0.8 : 0; // redemption shot
    return { c, s };
  }).sort((a, b) => b.s - a.s);
  const n = ev.size === 4 ? 4 : ev.size;
  return scored.slice(0, n).map((x) => x.c.id);
}

// ───────────────────────────── Simulation helpers
function pressure(t) {
  const gap = Math.abs(t.scores.wonderbolt - t.scores.shadowbolt);
  return clamp(t.round / t.length + (gap <= 10 ? 0.3 : 0) + (t.round >= t.length - 1 ? 0.4 : 0), 0, 1.5);
}

function sabotageChance(t, ch) {
  if (ch.team !== 'shadowbolt') return 0;
  const S = ch.stats;
  let p = 0.03 + S.risk * 0.012 + S.cunning * 0.01;
  p += [0, 0.06, 0][t.arcStage] || 0;
  if (t.streak.team === 'wonderbolt' && t.streak.n >= 1) p += 0.05 * t.streak.n;
  if (t.scores.shadowbolt < t.scores.wonderbolt) p += 0.05;
  const mult = { cherry: 1.3, icecream: 1.6, twilight: t.arcStage >= 2 ? 0.25 : 0.6, cena: 0.15, nova: 0.1 }[ch.id] ?? 1;
  return clamp(p * mult, 0, 0.45);
}

function helpChance(t, h, v, final) {
  const H = byId[h], same = H.team === byId[v].team;
  let p = 0.06 + H.stats.kindness * 0.028 + rel(t, h, v) * 0.0025 + (same ? 0.18 : 0);
  if (H.team === 'shadowbolt' && !same) p += [-0.1, -0.06, 0.06][t.arcStage] || 0;
  if (final) p -= 0.05;
  return clamp(p, 0.02, 0.8);
}

export function favorite(t, ev, lineups) {
  const avg = (ids) => ids.reduce((s, id) => s + suit(byId[id], ev), 0) / ids.length;
  const a = avg(lineups.wonderbolt), b = avg(lineups.shadowbolt);
  return { team: a >= b ? 'wonderbolt' : 'shadowbolt', margin: Math.abs(a - b) };
}

// ───────────────────────────── 2b. Simulate
export function simulate(t, ev, rng) {
  const lineups = { wonderbolt: pickLineup(t, 'wonderbolt', ev, rng), shadowbolt: pickLineup(t, 'shadowbolt', ev, rng) };
  const fav = favorite(t, ev, lineups);
  const P = pressure(t);
  const isFinal = t.round >= t.length - 1;
  const incidents = [];
  const penalties = { wonderbolt: 0, shadowbolt: 0 };
  const all = [...lineups.wonderbolt, ...lineups.shadowbolt];
  const outdoorRain = t.weather === 'rain' && ev.outdoor;
  let weatherChanged = false;

  const baseOf = (id) => {
    const c = byId[id], S = c.stats;
    return 3 + suit(c, ev) * 0.62 + (S.nerve - 6) * 0.13 * P - (outdoorRain ? (10 - S.balance) * 0.05 : 0) - (t.fatigue[id] || 0) * 0.3;
  };

  if (ev.mode === 'aim') return simulateAim(t, ev, rng, lineups, fav, P, isFinal);

  const K = ev.mode === 'relay' ? 4 : 5;
  const perf = {};
  // relay: per team per leg
  const runners = ev.mode === 'relay' ? { wonderbolt: orderRelay(lineups.wonderbolt, ev), shadowbolt: orderRelay(lineups.shadowbolt, ev) } : null;
  const actorsAt = (k) => (ev.mode === 'relay' ? [runners.wonderbolt[k], runners.shadowbolt[k]] : all);

  for (const id of all) perf[id] = Array(K).fill(0);
  const variance = (id) => 1.6 + byId[id].stats.risk * 0.04;
  for (let k = 0; k < K; k++) for (const id of actorsAt(k)) perf[id][k] = Math.max(1, baseOf(id) + rng.normal() * variance(id));

  let budget = ev.tension >= 3 ? 4 : 3;
  const add = (inc) => { if (budget <= 0) return false; incidents.push(inc); budget--; return true; };
  let sabotaged = false, equipment = false;

  // Pre-race taunt (flavor + tiny nerve effect)
  const sbT = lineups.shadowbolt.find((id) => byId[id].stats.cunning + byId[id].stats.risk >= 13) || null;
  if (sbT && rng.chance(0.55)) {
    const target = rng.pick(lineups.wonderbolt);
    const n = byId[target].stats.nerve;
    const effect = n >= 8 ? 'fired' : n <= 5 ? 'rattled' : 'none';
    if (ev.mode !== 'relay') perf[target][0] *= effect === 'fired' ? 1.1 : effect === 'rattled' ? 0.9 : 1;
    incidents.push({ seg: -1, type: 'taunt', who: sbT, target, effect });
  }

  for (let k = 0; k < K; k++) {
    const order = rng.shuffle(actorsAt(k));
    for (const id of order) {
      const c = byId[id], S = c.stats;
      // Sabotage (once per event)
      if (!sabotaged && k >= 1 && k <= K - 2 && rng.chance(sabotageChance(t, c) * 0.5)) {
        const victims = actorsAt(k).filter((x) => byId[x].team === 'wonderbolt');
        if (victims.length) {
          const victim = victims.sort((a, b) => perf[b].slice(0, k).reduce((s, v) => s + v, 0) - perf[a].slice(0, k).reduce((s, v) => s + v, 0))[0];
          const kind = ev.cat === 'adventure' && ['maze', 'forest', 'survival', 'ctf'].includes(ev.id) ? 'sign' : ev.mode === 'swim' || ev.mode === 'climb' ? 'distraction' : rng.chance(0.5) ? 'jostle' : 'distraction';
          const caught = rng.chance(0.38);
          const backfire = !caught && rng.chance(0.2);
          const resisted = !caught && !backfire && byId[victim].stats.nerve >= 9 && rng.chance(0.5);
          if (add({ seg: k, type: 'sabotage', who: id, target: victim, kind, caught, backfire, resisted })) {
            sabotaged = true;
            if (caught) { penalties.shadowbolt += 5; perf[id][k] *= 0.6; }
            else if (backfire) perf[id][k] *= 0.3;
            else if (!resisted) perf[victim][k] *= 0.45;
            bumpRel(t, id, victim, -14);
            // teammates react
            const mates = roster('shadowbolt').filter((m) => m.id !== id);
            for (const m of mates) {
              if (['cena', 'nova'].includes(m.id) || (m.id === 'twilight' && t.arcStage >= 1)) bumpRel(t, id, m.id, -8);
              else if (m.id === 'cherry' || m.id === 'icecream') bumpRel(t, id, m.id, 3);
            }
            continue;
          }
        }
      }
      // Slip / fall
      const pSlip = 0.025 + (10 - S.balance) * 0.008 + S.risk * 0.004 + (outdoorRain ? 0.06 : 0) + P * 0.02;
      if (k >= 1 && rng.chance(pSlip)) {
        const others = actorsAt(k).filter((x) => x !== id && !incidents.some((i) => i.seg === k && (i.who === x || i.helper === x)));
        let helper = null;
        for (const h of rng.shuffle(others)) if (ev.mode !== 'swim' && rng.chance(helpChance(t, h, id, isFinal))) { helper = h; break; }
        const crossTeam = helper ? byId[helper].team !== c.team : false;
        if (add({ seg: k, type: 'slip', who: id, helper, crossTeam })) {
          perf[id][k] *= helper ? 0.45 : 0.28;
          if (helper) { perf[helper][k] *= crossTeam ? 0.5 : 0.7; bumpRel(t, id, helper, crossTeam ? 16 : 5); }
          continue;
        }
      }
      // Clutch surge
      const pClutch = 0.04 + Math.max(0, S.nerve - 5) * 0.015 * P + (S.fame <= 3 ? 0.08 : 0);
      if (k >= 2 && rng.chance(pClutch)) {
        if (add({ seg: k, type: 'clutch', who: id })) { perf[id][k] *= 1.55; if (k + 1 < K) perf[id][k + 1] *= 1.2; continue; }
      }
      // Risky shortcut
      if (ev.mode === 'race' && k >= 1 && k <= K - 2 && rng.chance(S.risk * 0.009)) {
        const ok = rng.chance(0.42 + S.agility * 0.03 + S.cunning * 0.015 - (outdoorRain ? 0.12 : 0));
        if (add({ seg: k, type: 'shortcut', who: id, success: ok })) { perf[id][k] *= ok ? 1.75 : 0.35; continue; }
      }
      // Equipment trouble
      if (!equipment && k >= 1 && rng.chance(0.045)) {
        const mates = actorsAt(k).filter((x) => x !== id && byId[x].team === c.team);
        const fixer = mates.length && rng.chance(0.7) ? rng.pick(mates) : null;
        if (add({ seg: k, type: 'equipment', who: id, helper: fixer, hazard: ev.hazard })) {
          equipment = true;
          perf[id][k] *= fixer ? 0.6 : 0.4;
          if (fixer) { perf[fixer][k] *= 0.75; bumpRel(t, id, fixer, 4); }
        }
      }
    }
    // Weather can turn mid-tournament
    if (!weatherChanged && ev.outdoor && t.weather === 'clear' && k === 2 && rng.chance(0.07)) {
      weatherChanged = true;
      incidents.push({ seg: k, type: 'rain' });
    }
  }

  // Totals & winner
  const totals = {};
  for (const id of all) totals[id] = perf[id].reduce((s, v) => s + v, 0);
  let teamTotals;
  if (ev.mode === 'relay') {
    teamTotals = { wonderbolt: 0, shadowbolt: 0 };
    for (let k = 0; k < K; k++) {
      for (const team of TEAMS) {
        let v = perf[runners[team][k]][k];
        if (k > 0) {
          const tw = byId[runners[team][k]].stats.teamwork;
          if (rng.chance(0.05 + (10 - tw) * 0.012) && budget-- > 0) { incidents.push({ seg: k, type: 'baton', who: runners[team][k], team }); v *= 0.5; perf[runners[team][k]][k] = v; }
        }
        teamTotals[team] += v;
      }
    }
  } else {
    teamTotals = { wonderbolt: lineups.wonderbolt.reduce((s, id) => s + totals[id], 0), shadowbolt: lineups.shadowbolt.reduce((s, id) => s + totals[id], 0) };
  }
  const order = all.slice().sort((a, b) => totals[b] - totals[a]);
  let winner = teamTotals.wonderbolt > teamTotals.shadowbolt ? 'wonderbolt' : teamTotals.wonderbolt < teamTotals.shadowbolt ? 'shadowbolt' : rng.pick(TEAMS);
  const diff = Math.abs(teamTotals.wonderbolt - teamTotals.shadowbolt) / Math.max(teamTotals.wonderbolt, teamTotals.shadowbolt);
  return {
    event: ev.id, mode: ev.mode, participants: lineups, runners, segments: K, perf, totals, teamTotals, order, winner,
    penalties, incidents, favorite: fav.team, upset: winner !== fav.team && fav.margin > 0.5, photoFinish: diff < 0.03,
    weatherChanged,
  };
}

function orderRelay(ids, ev) {
  // Strongest runner anchors, second strongest leads off.
  const s = ids.slice().sort((a, b) => suit(byId[b], ev) - suit(byId[a], ev));
  return [s[1], s[3], s[2], s[0]].filter(Boolean);
}

function simulateAim(t, ev, rng, lineups, fav, P, isFinal) {
  const shooters = [lineups.wonderbolt[0], lineups.shadowbolt[0]];
  const shots = { [shooters[0]]: [], [shooters[1]]: [] };
  const incidents = [];
  const penalties = { wonderbolt: 0, shadowbolt: 0 };
  let wind = 0, sabotaged = false;
  for (let r = 0; r < 3; r++) {
    if (rng.chance(0.3)) { wind = rng.range(-2.4, 2.4); incidents.push({ seg: r, type: 'wind', strength: wind }); }
    for (const id of rng.shuffle(shooters)) {
      const c = byId[id], S = c.stats;
      let mod = 0;
      if (!sabotaged && r >= 1 && c.team === 'wonderbolt') {
        const sb = rng.chance(0.6) ? 'icecream' : shooters.find((x) => byId[x].team === 'shadowbolt');
        if (rng.chance(sabotageChance(t, byId[sb]) * 0.7)) {
          sabotaged = true;
          const caught = rng.chance(0.4);
          const resisted = S.nerve >= 8 && rng.chance(0.55);
          incidents.push({ seg: r, type: 'sabotage', who: sb, target: id, kind: 'distraction', caught, resisted, sideline: !shooters.includes(sb) });
          if (caught) penalties.shadowbolt += 5;
          if (!resisted) mod -= rng.range(2.5, 4.5);
          bumpRel(t, sb, id, -12);
        }
      }
      const windPenalty = Math.abs(wind) * (1 - S.aim / 12);
      let score = S.aim * 0.72 + 2.6 + (S.nerve - 6) * 0.25 * P + rng.normal() * 1.5 - windPenalty + mod;
      if (r === 2 && rng.chance(0.06 + (S.nerve - 5) * 0.02 * P)) { score = 10; incidents.push({ seg: r, type: 'clutch', who: id }); }
      shots[id].push(clamp(Math.round(score), 0, 10));
    }
  }
  const sum = (id) => shots[id].reduce((s, v) => s + v, 0);
  let shootOff = [];
  while (sum(shooters[0]) === sum(shooters[1]) && shootOff.length < 5) {
    const a = clamp(Math.round(byId[shooters[0]].stats.aim * 0.7 + 3 + rng.normal() * 1.5), 0, 10);
    const b = clamp(Math.round(byId[shooters[1]].stats.aim * 0.7 + 3 + rng.normal() * 1.5), 0, 10);
    shootOff.push([a, b]);
    shots[shooters[0]].push(a); shots[shooters[1]].push(b);
  }
  if (sum(shooters[0]) === sum(shooters[1])) shots[shooters[0]][shots[shooters[0]].length - 1]++;
  const totals = { [shooters[0]]: sum(shooters[0]), [shooters[1]]: sum(shooters[1]) };
  const winnerId = totals[shooters[0]] > totals[shooters[1]] ? shooters[0] : shooters[1];
  const winner = byId[winnerId].team;
  return {
    event: ev.id, mode: 'aim', participants: lineups, segments: 3, shots, totals, shootOff,
    teamTotals: { wonderbolt: totals[lineups.wonderbolt[0]], shadowbolt: totals[lineups.shadowbolt[0]] },
    order: [winnerId, shooters.find((x) => x !== winnerId)], winner, penalties, incidents,
    favorite: fav.team, upset: winner !== fav.team && fav.margin > 0.5, photoFinish: Math.abs(totals[shooters[0]] - totals[shooters[1]]) <= 1,
  };
}

// ───────────────────────────── One round
export function advance(t) {
  if (t.finished) return null;
  const rng = roundRng(t, 0x51a7);
  const selection = t.nextSelection || selectNextEvent(t);
  const ev = eventById[t.nextEvent || selection.event.id];
  t.previousEvent = t.currentEvent;
  t.currentEvent = ev.id;
  const scoresBefore = { ...t.scores };
  const result = simulate(t, ev, rng);
  const points = t.tiebreak ? 10 : t.round >= t.length - 1 ? 20 : 10;

  // 3. team scores
  t.scores[result.winner] += points;
  for (const team of TEAMS) t.scores[team] = Math.max(0, t.scores[team] - result.penalties[team]);

  // 4. individual stats
  const cs = (id) => (t.charStats[id] ||= { events: 0, wins: 0, firsts: 0, helps: 0, sabotages: 0, caught: 0, falls: 0, clutch: 0 });
  for (const id of [...result.participants.wonderbolt, ...result.participants.shadowbolt]) {
    cs(id).events++;
    if (byId[id].team === result.winner) cs(id).wins++;
    t.fatigue[id] = (t.fatigue[id] || 0) + 1;
  }
  cs(result.order[0]).firsts++;
  for (const inc of result.incidents) {
    if (inc.type === 'slip') { cs(inc.who).falls++; if (inc.helper) cs(inc.helper).helps++; }
    if (inc.type === 'sabotage') { cs(inc.who).sabotages++; if (inc.caught) cs(inc.who).caught++; }
    if (inc.type === 'clutch') cs(inc.who).clutch++;
    if (inc.type === 'rain') t.weather = 'rain';
  }
  for (const id of Object.keys(t.fatigue)) if (!result.participants.wonderbolt.includes(id) && !result.participants.shadowbolt.includes(id)) t.fatigue[id] = Math.max(0, t.fatigue[id] - 0.6);

  // 5. relationships: winning together bonds teammates
  const wl = result.participants[result.winner];
  for (let i = 0; i < wl.length; i++) for (let j = i + 1; j < wl.length; j++) bumpRel(t, wl[i], wl[j], 2);

  // streaks & deficits
  t.streak = t.streak.team === result.winner ? { team: result.winner, n: t.streak.n + 1 } : { team: result.winner, n: 1 };
  for (const team of TEAMS) t.maxDeficit[team] = Math.max(t.maxDeficit[team], t.scores[other(team)] - t.scores[team]);

  Object.assign(result, { round: t.round, points, scoresBefore, scoresAfter: { ...t.scores }, selection, weather: t.weather, arcStage: t.arcStage, streak: { ...t.streak } });
  t.eventHistory.push(result);
  t.round++;

  // Finish or tiebreak
  if (t.round >= t.length) {
    if (t.scores.wonderbolt === t.scores.shadowbolt) { t.length++; t.tiebreak = true; }
    else finalize(t);
  }
  // 6. select & reveal the next event
  if (!t.finished) {
    const sel = selectNextEvent(t);
    t.nextEvent = sel.event.id;
    t.nextSelection = sel;
  } else { t.nextEvent = null; t.nextSelection = null; }
  return result;
}

function finalize(t) {
  t.finished = true;
  t.winner = t.scores.wonderbolt > t.scores.shadowbolt ? 'wonderbolt' : 'shadowbolt';
  let best = null, bestS = -1e9;
  for (const [id, s] of Object.entries(t.charStats)) {
    const v = s.wins * 3 + s.firsts * 2.5 + s.clutch * 1.5 + s.helps * 1.5 - s.caught * 3 - s.falls * 0.5 + (byId[id].team === t.winner ? 2 : 0);
    if (v > bestS) { bestS = v; best = id; }
  }
  t.mvp = best;
  t.comeback = t.maxDeficit[t.winner] >= 15;
}

export function summary(t) {
  const charStats = {};
  for (const [id, s] of Object.entries(t.charStats)) charStats[id] = { events: s.events, wins: s.wins, helps: s.helps, sabotages: s.sabotages, falls: s.falls, clutch: s.clutch };
  return {
    seed: t.seed, winner: t.winner, scores: { ...t.scores }, mvp: t.mvp, comeback: !!t.comeback,
    sequence: t.eventHistory.map((r) => ({ event: r.event, winner: r.winner, upset: r.upset })),
    relDelta: { ...t.relDelta }, charStats, date: Date.now(),
  };
}

// Convenience: run a whole tournament headless (used by tests & the "simulate" button).
export function runAll(opts) {
  const t = createTournament(opts);
  while (!t.finished) advance(t);
  return t;
}
