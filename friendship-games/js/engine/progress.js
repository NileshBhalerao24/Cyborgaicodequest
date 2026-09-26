// Player progress, persisted to localStorage. Everything the UI shows under "My Progress",
// character discovery levels, unlocks and achievements is derived from this one object.

import { pairKey, BASE_REL, MAJOR, ALL } from '../data/characters.js';

const KEY = 'friendship-games-progress-v1';

export const ACHIEVEMENTS = [
  { id: 'first-episode', icon: '📺', name: 'Pilot Viewer', desc: 'Watch your first episode.' },
  { id: 'binge', icon: '🍿', name: 'Binge Watcher', desc: 'Finish four different episodes.' },
  { id: 'first-event', icon: '⚡', name: 'Games On', desc: 'Watch a Friendship Games event.' },
  { id: 'champion', icon: '🏆', name: 'Closing Ceremony', desc: 'Follow a tournament all the way to the end.' },
  { id: 'two-tourneys', icon: '🔁', name: 'Never the Same Twice', desc: 'Complete two tournaments.' },
  { id: 'upset', icon: '😲', name: 'Nobody Saw That Coming', desc: 'Witness an underdog upset.' },
  { id: 'sportsmanship', icon: '🤝', name: 'Hand Up', desc: 'See a competitor stop to help a rival.' },
  { id: 'caught', icon: '🚩', name: 'Hale Sees All', desc: 'See Referee Hale catch a sneaky move.' },
  { id: 'comeback', icon: '📈', name: 'The Comeback', desc: 'See a team come back from 15+ points down.' },
  { id: 'first-game', icon: '🎮', name: 'Warm-Up', desc: 'Play a Friendship Games mini-game.' },
  { id: 'all-games', icon: '🎯', name: 'Decathlete', desc: 'Play every mini-game.' },
  { id: 'three-stars', icon: '⭐', name: 'Gold Standard', desc: 'Earn three stars in any mini-game.' },
  { id: 'collector', icon: '📇', name: 'Who\'s Who', desc: 'Discover 20 characters.' },
  { id: 'reflect', icon: '💬', name: 'Two Cents', desc: 'Share your thoughts after an episode.' },
  { id: 'superfan', icon: '🌟', name: 'Superfan', desc: 'Unlock every playable character.' },
];

export const PLAYABLE_UNLOCKS = {
  rainbow: { start: true },
  pinkie: { start: true },
  cherry: { start: true },
  icecream: { start: true },
  sunset: { hint: 'Finish Episode 1', test: (p) => !!p.episodes.ep1?.done },
  twilight: { hint: 'Watch a Friendship Games event', test: (p) => p.stats.eventsWatched >= 1 },
  rarity: { hint: 'Earn 2★ in Archery', test: (p) => (p.games.archery?.stars || 0) >= 2 },
  cena: { hint: 'Finish the Climbing game', test: (p) => (p.games.climbing?.plays || 0) >= 1 },
  nova: { hint: 'Finish the Maze game', test: (p) => (p.games.maze?.plays || 0) >= 1 },
  toby: { hint: 'Play 5 mini-games', test: (p) => Object.values(p.games).reduce((s, g) => s + g.plays, 0) >= 5 },
  juni: { hint: 'Finish 3 episodes', test: (p) => Object.values(p.episodes).filter((e) => e.done).length >= 3 },
  milo: { hint: 'Complete a tournament', test: (p) => p.tournaments.length >= 1 },
};

const fresh = () => ({
  v: 1,
  episodes: {},
  videos: {},
  seen: {},
  played: {},
  games: {},
  achievements: {},
  tournament: null,
  tournaments: [],
  highlights: [],
  relDelta: {},
  reflections: [],
  charStats: {},
  stats: { eventsWatched: 0, upsets: 0, helps: 0, caught: 0 },
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* private mode or corrupted — start fresh */ }
  return fresh();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((f) => f(state));
}

export const get = () => state;
export const onChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
export function reset() { state = fresh(); save(); }

let toast = () => {};
export const setToast = (f) => { toast = f; };

export function unlock(id) {
  if (state.achievements[id]) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return;
  state.achievements[id] = Date.now();
  toast(`${a.icon} Achievement unlocked: ${a.name}`);
}

function checkDerived() {
  const eps = Object.values(state.episodes).filter((e) => e.done).length;
  if (eps >= 1) unlock('first-episode');
  if (eps >= 4) unlock('binge');
  if (state.stats.eventsWatched >= 1) unlock('first-event');
  if (state.tournaments.length >= 1) unlock('champion');
  if (state.tournaments.length >= 2) unlock('two-tourneys');
  if (Object.keys(state.games).length >= 1) unlock('first-game');
  if (Object.keys(state.games).length >= 7) unlock('all-games');
  if (Object.values(state.games).some((g) => g.stars >= 3)) unlock('three-stars');
  if (Object.keys(state.seen).length >= 20) unlock('collector');
  if (state.reflections.length >= 1) unlock('reflect');
  const before = state._unlocked || [];
  const now = playableUnlocked();
  for (const id of now) if (!before.includes(id) && before.length) toast(`🔓 New playable character: ${MAJOR.find((m) => m.id === id)?.name}`);
  state._unlocked = now;
  if (now.length === Object.keys(PLAYABLE_UNLOCKS).length) unlock('superfan');
}

export function commit() { checkDerived(); save(); }

// ─── Recording
export function markSeen(ids, weight = 1) {
  for (const id of ids) state.seen[id] = (state.seen[id] || 0) + weight;
}

export function episodeProgress(epId, sceneIndex, total) {
  const e = (state.episodes[epId] ||= { watched: 0, done: false, last: 0 });
  e.last = sceneIndex;
  e.total = total;
  commit();
}

export function episodeDone(epId, castIds) {
  const e = (state.episodes[epId] ||= { watched: 0, done: false, last: 0 });
  e.watched++;
  e.done = true;
  e.last = 0;
  e.at = Date.now();
  markSeen(castIds);
  commit();
}

export function videoWatched(id, castIds = []) {
  state.videos[id] = (state.videos[id] || 0) + 1;
  markSeen(castIds);
  commit();
}

export function gameResult(gameId, { score, stars, charId, won }) {
  const g = (state.games[gameId] ||= { plays: 0, best: 0, stars: 0, wins: 0 });
  g.plays++;
  g.best = Math.max(g.best, score);
  g.stars = Math.max(g.stars, stars);
  g.last = score;
  if (won) g.wins++;
  if (charId) { state.played[charId] = (state.played[charId] || 0) + 1; markSeen([charId], 2); }
  commit();
}

export function reflection(r) {
  state.reflections.push({ ...r, at: Date.now() });
  commit();
}

export function saveTournament(t) { state.tournament = t; save(); }

export function recordEventWatched(result) {
  state.stats.eventsWatched++;
  for (const inc of result.incidents || []) {
    if (inc.type === 'help' && inc.crossTeam) { state.stats.helps++; unlock('sportsmanship'); }
    if (inc.type === 'sabotage' && inc.caught) { state.stats.caught++; unlock('caught'); }
  }
  if (result.upset) { state.stats.upsets++; unlock('upset'); }
  markSeen([...result.participants.wonderbolt, ...result.participants.shadowbolt, 'milo', 'priya', 'hale']);
  commit();
}

export function finishTournament(summary) {
  state.tournaments.push(summary);
  if (state.tournaments.length > 30) state.tournaments.shift();
  if (summary.comeback) unlock('comeback');
  for (const [k, v] of Object.entries(summary.relDelta || {})) state.relDelta[k] = Math.max(-40, Math.min(40, (state.relDelta[k] || 0) + v));
  for (const [id, s] of Object.entries(summary.charStats || {})) {
    const c = (state.charStats[id] ||= { events: 0, wins: 0, helps: 0, sabotages: 0, falls: 0, clutch: 0, mvp: 0 });
    for (const k of Object.keys(c)) c[k] += s[k] || 0;
  }
  if (summary.mvp) (state.charStats[summary.mvp] ||= { events: 0, wins: 0, helps: 0, sabotages: 0, falls: 0, clutch: 0, mvp: 0 }).mvp++;
  state.tournament = null;
  commit();
}

export function addHighlight(h) {
  state.highlights.unshift(h);
  state.highlights = state.highlights.slice(0, 24);
  save();
}

// ─── Derived
export function relationship(a, b) {
  const k = pairKey(a, b);
  const base = BASE_REL[k]?.v ?? 0;
  const v = Math.max(-100, Math.min(100, base + (state.relDelta[k] || 0) + (state.tournament?.relDelta?.[k] || 0)));
  return { v, base, label: BASE_REL[k]?.label };
}

// Discovery level: 0 unseen, 1 seen, 2 familiar, 3 fully known.
export function discovery(id) {
  const n = (state.seen[id] || 0) + (state.played[id] || 0) * 2;
  if (n >= 8) return 3;
  if (n >= 3) return 2;
  if (n >= 1) return 1;
  return 0;
}

export function playableUnlocked() {
  return Object.entries(PLAYABLE_UNLOCKS).filter(([, u]) => u.start || u.test(state)).map(([id]) => id);
}

// How far along the Shadow Bolt arc the world is: 0 jealous → 1 obsessed → 2 questioning.
export function arcStage() {
  const n = state.tournaments.length + Object.values(state.episodes).filter((e) => e.done).length / 2;
  return n >= 4 ? 2 : n >= 1.5 ? 1 : 0;
}

export const allCharIds = ALL.map((c) => c.id);
