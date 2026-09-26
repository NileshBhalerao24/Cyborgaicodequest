// My Progress: everything the viewer has watched, played, unlocked and shared.

import * as progress from '../engine/progress.js';
import { EPISODES } from '../data/episodes.js';
import { ALL, byId } from '../data/characters.js';
import { GAMES } from '../games/index.js';
import { eventById } from '../data/events.js';
import { TEAMS } from '../data/world.js';
import { el } from '../util.js';
import { stars, portrait } from './common.js';
import { level } from './characters.js';

export function progressView(root) {
  const p = progress.get();
  const epsDone = EPISODES.filter((e) => p.episodes[e.id]?.done).length;
  const discovered = ALL.filter((c) => level(c.id) > 0).length;
  const achieved = Object.keys(p.achievements).length;
  const unlocked = progress.playableUnlocked();
  const stage = ['Jealous', 'Obsessed', 'Questioning'][progress.arcStage()];

  root.append(
    el('h1', {}, '🏆 My Progress'),
    el('div', { class: 'stats-row' }, [
      ['Episodes finished', `${epsDone}/${EPISODES.length}`], ['Videos watched', Object.keys(p.videos).length], ['Games events watched', p.stats.eventsWatched],
      ['Tournaments', p.tournaments.length], ['Characters discovered', `${discovered}/${ALL.length}`], ['Achievements', `${achieved}/${progress.ACHIEVEMENTS.length}`],
    ].map(([k, v]) => el('div', { class: 'stat-tile' }, el('div', { class: 'v' }, v), el('div', { class: 'k' }, k)))),

    el('section', { class: 'section' }, el('h2', {}, 'Achievements'),
      el('div', { class: 'ach-grid' }, progress.ACHIEVEMENTS.map((a) => el('div', { class: 'ach' + (p.achievements[a.id] ? ' on' : '') }, el('div', { class: 'i' }, a.icon), el('div', {}, el('b', {}, a.name), el('span', {}, a.desc)))))),

    el('section', { class: 'section two' },
      el('div', { class: 'panel' }, el('h3', {}, '📺 Episodes'),
        el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Episode'), el('th', {}, 'Status'), el('th', {}, 'Views')),
          EPISODES.map((e) => { const s = p.episodes[e.id]; return el('tr', {}, el('td', {}, el('a', { href: `#/watch/${e.id}`, style: { fontWeight: 800 } }, e.short ? e.title : `${e.number}. ${e.title}`)), el('td', {}, s?.done ? '✓ Finished' : s ? 'In progress' : '—'), el('td', {}, s?.watched || 0)); }))),
      el('div', { class: 'panel' }, el('h3', {}, '🎮 Mini-games'),
        el('table', { class: 'tbl' }, el('tr', {}, el('th', {}, 'Game'), el('th', {}, 'Best'), el('th', {}, 'Stars'), el('th', {}, 'Wins')),
          GAMES.map((g) => { const s = p.games[g.id]; return el('tr', {}, el('td', {}, el('a', { href: `#/play/${g.id}`, style: { fontWeight: 800 } }, `${g.icon} ${g.name}`)), el('td', {}, s?.best ?? '—'), el('td', { style: { color: '#ffd23f' } }, stars(s?.stars || 0)), el('td', {}, s ? `${s.wins}/${s.plays}` : '—')); })))),

    el('section', { class: 'section' }, el('h2', {}, 'Playable athletes'),
      el('div', { class: 'picker', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))' } }, Object.entries(progress.PLAYABLE_UNLOCKS).map(([id, u]) => el('div', { class: 'picker-item' }, el('button', { class: unlocked.includes(id) ? '' : 'lock', title: u.hint || 'Unlocked' }, el('img', { src: portrait(id, unlocked.includes(id) ? { w: 100, h: 110 } : { w: 100, h: 110, bg: false }), alt: '' }), unlocked.includes(id) ? byId[id].short : u.hint))))),

    el('section', { class: 'section two' },
      el('div', { class: 'panel' }, el('h3', {}, '🗂️ Tournament history'),
        p.tournaments.length ? el('div', { class: 'timeline' }, p.tournaments.slice().reverse().map((s) => el('div', { class: `tl-item ${s.winner}` }, el('div', { class: 'ic' }, '🏆'), el('div', {}, el('div', { class: 'nm' }, `${TEAMS[s.winner].name} ${s.scores.wonderbolt}–${s.scores.shadowbolt}`), el('div', { class: 'ds' }, s.sequence.map((x) => eventById[x.event].icon).join(' → '))), el('div', { class: 'muted', style: { fontSize: '12px' } }, s.mvp ? `MVP ${byId[s.mvp].short}` : '')))) : el('p', { class: 'muted' }, 'No tournaments finished yet.'),
        el('p', { class: 'muted', style: { marginTop: '10px', fontSize: '14px' } }, `The rivalry right now: Shadow Bolt feel… ${stage.toLowerCase()}.`)),
      el('div', { class: 'panel' }, el('h3', {}, '💬 Your thoughts'),
        p.reflections.length ? el('div', {}, p.reflections.slice().reverse().slice(0, 8).map((r) => el('div', { class: 'rel', style: { gridTemplateColumns: '40px 1fr' } }, el('div', { style: { fontSize: '28px' } }, r.feeling || '💭'), el('div', {}, el('b', {}, r.title), r.favorite ? el('div', { class: 'muted', style: { fontSize: '13px' } }, `Favorite moment: ${r.favorite}`) : null, r.wouldDo ? el('div', { style: { fontSize: '14px' } }, `“${r.wouldDo}”`) : null, r.learned ? el('div', { style: { fontSize: '14px' } }, `“${r.learned}”`) : null)))) : el('p', { class: 'muted' }, 'After an episode ends you can (optionally) share what you thought. It\'s saved here, only on this device.'))),

    el('section', { class: 'section' }, el('button', { class: 'btn ghost small', onclick: () => { if (confirm('Reset all progress on this device?')) { progress.reset(); location.hash = '#/home'; } } }, 'Reset progress')),
  );
}
