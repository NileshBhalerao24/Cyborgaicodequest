// Video library. Every entry builds a playable "episode" for the Stage on demand, so clips,
// highlights and trailers reuse the same scene data (and pick up real video assets automatically
// once scenes carry `media.video`).

import { EPISODES, episodeById, castOf } from './episodes.js';
import { byId, MAJOR } from './characters.js';
import { createTournament, advance } from '../engine/tournament.js';
import { eventScene, aftermathScene, closingScene, openingScene } from '../engine/eventScenes.js';
import { eventById } from './events.js';

export const CATEGORIES = [
  { id: 'episodes', name: 'Full Episodes' },
  { id: 'specials', name: 'Specials' },
  { id: 'trailers', name: 'Trailers' },
  { id: 'highlights', name: 'Competition Highlights' },
  { id: 'action', name: 'Action Scenes' },
  { id: 'funny', name: 'Funny Moments' },
  { id: 'clips', name: 'Short Clips' },
  { id: 'intros', name: 'Meet the Cast' },
  { id: 'bts', name: 'Behind the Scenes' },
];

const clip = (id, cat, title, epId, idx, desc) => ({
  id, cat, title, desc, thumbFrom: { ep: epId, scene: idx },
  build: () => ({ id, title, scenes: [episodeById[epId].scenes[idx]] }),
  cast: () => Object.keys(episodeById[epId].scenes[idx].cast || {}),
});

// ─── Character introductions — each shows the character doing their thing with a friend.
const INTROS = {
  pinkie: { loc: 'brightspire', friend: 'rarity', anim: 'hop', lines: [['rarity', 'Pinkie. Why are there forty balloons in my locker?'], ['pinkie', 'Because forty-one wouldn\'t fit!']] },
  rainbow: { loc: 'track', friend: 'benny', anim: 'run', run: true, lines: [['benny', 'That was your fastest lap EVER!'], ['rainbow', 'That was my warm-up.']] },
  rarity: { loc: 'archery', friend: 'twilight', anim: 'bow', prop: 'bow', lines: [['twilight', 'Nine out of ten. Statistically impressive.'], ['rarity', 'Darling, the tenth was a warning shot.']] },
  sunset: { loc: 'brightspire', friend: 'rainbow', anim: 'think', lines: [['rainbow', 'You\'ve drawn this play like nine times.'], ['sunset', 'Ten. The tenth one\'s the one that works.']] },
  cherry: { loc: 'duskmere', friend: 'icecream', anim: 'crossed', lines: [['icecream', 'Wonderbolt got another magazine cover.'], ['cherry', 'Good. Let them enjoy it while it lasts.']] },
  icecream: { loc: 'corridor', friend: 'cena', anim: 'sneak', lines: [['cena', 'Why is Coach Valka\'s whistle full of glitter.'], ['icecream', 'Sooo… that\'s a fun mystery!']] },
  twilight: { loc: 'commonroom', friend: 'cherry', anim: 'point', lines: [['twilight', 'If we win the next three events, our odds go up forty percent.'], ['cherry', 'And if we win all of them?'], ['twilight', '…I didn\'t chart that. I\'ll chart that.']] },
  cena: { loc: 'mountain', friend: 'tess', anim: 'crossed', lines: [['tess', 'How do you climb so fast?!'], ['cena', 'Don\'t look down. Don\'t stop. Don\'t complain.'], ['tess', 'That\'s three things.'], ['cena', 'Yep.']] },
  nova: { loc: 'forest', friend: 'juni', anim: 'sit', lines: [['juni', 'Is that a map of the whole forest?'], ['nova', 'And the secret paths. Don\'t tell Ice Cream.']] },
  toby: { loc: 'pool', friend: 'rainbow', anim: 'nervous', lines: [['toby', 'Did you see my flip turn? Was it good? It was bad. Was it good?'], ['rainbow', 'Kid. Breathe.'], ['toby', 'Right! Breathing! Good idea!']] },
  juni: { loc: 'corridor', friend: 'hazel', anim: 'lookup', lines: [['juni', 'Which way is the gym?'], ['hazel', 'You\'re standing in the gym.'], ['juni', '…Huh.']] },
  milo: { loc: 'stadium', friend: 'priya', anim: 'cheer', lines: [['milo', 'THE BIGGEST MOMENT IN FRIENDSHIP GAMES HISTORY!'], ['priya', 'It\'s a practice warm-up, Milo.']] },
};

function introScene(id) {
  const c = byId[id], I = INTROS[id];
  const beats = [
    { cam: { on: [id], zoom: 1.5 } },
    { anim: id, a: I.anim },
    { lower: { name: c.name, sub: c.tagline, team: c.team }, dur: 2400 },
    { cam: { on: [id, I.friend], zoom: 1.35, dur: 700 } },
  ];
  if (I.run) beats.splice(1, 1, { move: id, x: 900, dur: 1400, as: 'run', then: 'idle' });
  for (const [who, text] of I.lines) beats.push({ say: who, text, to: who === id ? I.friend : id });
  beats.push({ face: id, f: 'happy' }, { wait: 900 });
  return {
    title: `Meet ${c.short}`, location: I.loc, time: I.loc === 'commonroom' ? 'night' : 'day', music: c.team === 'shadowbolt' ? 'shadow' : 'bright', world: { w: 1600 },
    cast: { [id]: { x: I.run ? 300 : 700, face: 'happy', prop: I.prop }, [I.friend]: { x: 960, facing: -1, face: 'neutral' } },
    beats,
  };
}

// ─── Behind the scenes: animation test reel (the placeholder rig's full move set)
const ANIMS = ['idle', 'walk', 'run', 'skate', 'swim', 'climb', 'jump', 'fall', 'getup', 'cheer', 'celebrate', 'sad', 'angry', 'point', 'wave', 'clap', 'shrug', 'facepalm', 'think', 'reach', 'balance', 'kayak', 'bow', 'laugh', 'dizzy', 'sneak', 'hop'];
const FACES = ['neutral', 'happy', 'laugh', 'sad', 'angry', 'surprised', 'worried', 'smug', 'determined', 'sneaky', 'scared'];
function animTest(id) {
  const beats = [{ cam: { on: [id], zoom: 1.4 } }];
  for (const a of ANIMS) {
    beats.push({ anim: id, a, then: 'idle' }, { prop: id, p: a === 'kayak' ? 'kayak' : a === 'skate' ? 'skates' : a === 'bow' ? 'bow' : null }, { lower: { name: `RIG TEST · ${a.toUpperCase()}`, sub: 'procedural placeholder animation' }, dur: a === 'fall' ? 1400 : 1600 });
  }
  beats.push({ anim: id, a: 'idle' }, { prop: id, p: null });
  for (const f of FACES) beats.push({ face: id, f }, { lower: { name: `EXPRESSION · ${f.toUpperCase()}`, sub: 'face swap library' }, dur: 1100 });
  return { title: 'Rig Test Reel', location: 'brightspire', time: 'day', music: 'night', world: { w: 1600 }, cast: { [id]: { x: 800, face: 'neutral' } }, beats };
}

// ─── Trailer: quick cuts across the season
function excerpt(epId, idx, from, n, title) {
  const s = episodeById[epId].scenes[idx];
  return { ...s, title: title || s.title, skip: from, beats: s.beats.slice(0, from + n), tail: 150, transition: 'flash' };
}
function trailer() {
  const card = (title, sub) => ({ title, location: 'stadium', time: 'night', music: 'tense', world: { w: 1600 }, cast: {}, beats: [{ card: { title, sub, big: true, icon: '⚡' }, dur: 2200 }], tail: 100, transition: 'flash' });
  return {
    id: 'trailer', title: 'Season 1 Trailer', titleCard: false,
    scenes: [
      card('THIS SEASON…', 'Two schools. One rivalry.'),
      excerpt('ep1', 0, 6, 4, 'The spotlight'),
      excerpt('ep1', 1, 6, 5, 'The shadow'),
      card('THE FRIENDSHIP GAMES', 'Anything can happen'),
      excerpt('ep1', 2, 18, 8, 'One lap'),
      excerpt('ep2', 1, 5, 10, 'Storm'),
      excerpt('ep3', 3, 11, 8, 'River'),
      excerpt('ep4', 2, 1, 6, 'Bridge'),
      card('SHADOW BOLT vs WONDERBOLT', 'Now streaming · New tournament every time'),
    ],
  };
}

// ─── Curated competition highlights (seeds found by engine search; see README)
const CURATED = [
  { seed: 2, round: 0, title: 'A Hand on the Mountain', desc: 'Mid-rescue, a rival stops to pull an opponent up.' },
  { seed: 1, round: 1, title: 'Hale Sees Everything', desc: 'A sneaky move, a whistle, and a penalty.' },
  { seed: 1, round: 3, title: 'The Quiet Reserve', desc: 'Nobody expected this relay.' },
  { seed: 5, round: 5, title: 'Butterfingers', desc: 'A dropped baton in the final relay.' },
  { seed: 37, round: 1, title: 'Look, a Shooting Star!', desc: 'An archery duel with an unwanted soundtrack.' },
  { seed: 3, round: 6, title: 'Summit Storm', desc: 'A climber slips on the final ascent.' },
];

export function buildHighlight({ seed, round, arcStage = 0, title }, withAftermath = true) {
  const t = createTournament({ seed, arcStage });
  let r = null;
  while (!t.finished && t.round <= round) r = advance(t);
  if (!r) return null;
  const scenes = [eventScene(t, r)];
  if (withAftermath) scenes.push(aftermathScene(t, r, 1));
  return { id: `hl-${seed}-${round}`, title: title || eventById[r.event].name, scenes, result: r };
}

export function videoList(progress) {
  const list = [];
  for (const ep of EPISODES) {
    list.push({ id: `v-${ep.id}`, cat: 'episodes', title: ep.short ? `Short: ${ep.title}` : `Ep ${ep.number} · ${ep.title}`, desc: ep.synopsis, epId: ep.id, thumbFrom: { ep: ep.id, scene: 0, thumb: ep.thumb }, build: () => ep, cast: () => castOf(ep), full: true });
  }
  list.push({ id: 'live', cat: 'specials', title: 'Friendship Games LIVE', desc: 'A brand-new tournament generated every time you watch — different events, different winners, different drama.', live: true, thumbFrom: { thumb: { location: 'stadium', chars: [['sunset', 'cheer', 'determined'], ['cherry', 'point', 'smug']] } } });
  list.push({ id: 'trailer', cat: 'trailers', title: 'Season 1 Trailer', desc: 'Two schools. One rivalry. Every Games is different.', thumbFrom: { thumb: { location: 'stadium', chars: [['rainbow', 'run', 'determined'], ['cena', 'crossed', 'determined']] } }, build: trailer, cast: () => ['rainbow', 'cherry', 'cena', 'rarity', 'twilight', 'toby', 'icecream', 'scoop', 'pinkie'] });
  list.push({ id: 'teaser-opening', cat: 'trailers', title: 'Teaser: Opening Ceremony', desc: 'The teams march in. Two captains who used to be best friends come face to face.', thumbFrom: { thumb: { location: 'stadium', chars: [['sunset', 'idle', 'sad'], ['cherry', 'crossed', 'angry']] } }, build: () => ({ id: 'teaser-opening', title: 'Opening Ceremony', scenes: [openingScene(createTournament({ seed: 11 }))] }), cast: () => ['sunset', 'cherry', 'rainbow', 'cena', 'hale', 'milo'] });

  for (const h of CURATED) list.push({ id: `hl-${h.seed}-${h.round}`, cat: 'highlights', title: h.title, desc: h.desc, highlight: h, thumbFrom: { thumb: { location: 'track', chars: [['rainbow', 'run', 'determined'], ['cherry', 'run', 'determined']] } } });
  for (const h of (progress?.highlights || []).slice(0, 12)) list.push({ id: `hl-${h.seed}-${h.round}-mine`, cat: 'highlights', title: `Your Games: ${h.title}`, desc: h.desc, highlight: h, mine: true, thumbFrom: { thumb: { location: eventById[h.event]?.venue || 'track', chars: h.chars || [] } } });

  list.push(clip('c-lap', 'action', 'One Lap', 'ep1', 2, 'Rainbow Dash vs Cherry Blossom. One lap. One confetti cannon.'));
  list.push(clip('c-westface', 'action', 'West Face', 'ep2', 1, 'A storm, a slip, and a hand held out.'));
  list.push(clip('c-silverrun', 'action', 'Silverrun', 'ep3', 3, 'A snapped paddle changes the race.'));
  list.push(clip('c-bridge', 'action', 'Junior Adventure Bridge', 'ep4', 2, 'One walks. One anchors.'));
  list.push(clip('c-chalk', 'funny', 'Chalk', 'ep2', 3, 'Ice Cream steals Pinkie\'s chalk. Pinkie has contingencies.'));
  list.push(clip('c-define', 'funny', 'Define "Anything"', 'ep3', 0, 'Twilight lays down the law. Ice Cream looks for loopholes.'));
  list.push({ ...clip('c-friday', 'funny', 'Lasagna Pudding', 'short1', 0, 'Experimental Friday claims its first volunteer.') });
  list.push(clip('c-plaza', 'clips', 'Across the Plaza', 'ep1', 1, '"They always get the spotlight."'));
  list.push(clip('c-onehold', 'clips', 'One Hold at a Time', 'ep2', 2, 'Rarity freezes. Twilight counts.'));
  list.push(clip('c-soaked', 'clips', 'Soaked', 'ep3', 4, 'Shadow Bolt argues on the riverbank.'));
  list.push(clip('c-rooftop', 'clips', 'Rooftop', 'ep1', 4, 'Two captains, one sky.'));

  for (const c of MAJOR) list.push({ id: `intro-${c.id}`, cat: 'intros', title: `Meet ${c.short}`, desc: c.tagline, charId: c.id, thumbFrom: { thumb: { location: INTROS[c.id].loc, chars: [[c.id, INTROS[c.id].anim === 'run' ? 'run' : 'wave', 'happy']] } }, build: () => ({ id: `intro-${c.id}`, title: `Meet ${c.short}`, scenes: [introScene(c.id)] }), cast: () => [c.id, INTROS[c.id].friend] });

  list.push({ id: 'bts-rig', cat: 'bts', title: 'Rig Test Reel: Pinkie', desc: 'Every procedural animation and expression in the placeholder puppet rig.', thumbFrom: { thumb: { location: 'brightspire', chars: [['pinkie', 'cheer', 'laugh']] } }, build: () => ({ id: 'bts-rig', title: 'Rig Test Reel', scenes: [animTest('pinkie')] }), cast: () => ['pinkie'] });
  list.push({ id: 'bts-rig2', cat: 'bts', title: 'Rig Test Reel: Cena', desc: 'Same rig, different character data — proportions, hair, outfit and team emblem all come from the character database.', thumbFrom: { thumb: { location: 'duskmere', chars: [['cena', 'crossed', 'determined']] } }, build: () => ({ id: 'bts-rig2', title: 'Rig Test Reel', scenes: [animTest('cena')] }), cast: () => ['cena'] });
  list.push({ id: 'bts-closing', cat: 'bts', title: 'Engine Demo: Instant Tournament', desc: 'The tournament engine simulates a full Games in milliseconds, then stages only the closing ceremony.', thumbFrom: { thumb: { location: 'stadium', chars: [['sunset', 'celebrate', 'laugh'], ['cherry', 'sad', 'sad']] } }, build: () => { const t = createTournament({ seed: (Math.random() * 1e9) | 0 }); while (!t.finished) advance(t); return { id: 'bts-closing', title: 'Instant Tournament', scenes: [closingScene(t)] }; }, cast: () => [] });
  return list;
}
