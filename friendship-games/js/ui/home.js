// Home: hero with a live ambient scene, the two teams, continue watching, and quick links.

import { EPISODES } from '../data/episodes.js';
import { MAJOR } from '../data/characters.js';
import { TEAMS } from '../data/world.js';
import { Stage } from '../render/stage.js';
import * as progress from '../engine/progress.js';
import { el } from '../util.js';
import { videoCard, portrait } from './common.js';
import { GAMES } from '../games/index.js';
import { liveStatus } from './live.js';

const AMBIENT = {
  id: 'ambient', title: 'Brightspire', scenes: [{
    title: 'Courtyard', location: 'brightspire', time: 'day', music: 'bright', world: { w: 1600 },
    cast: { pinkie: { x: 420, face: 'laugh', anim: 'hop' }, rainbow: { x: 200, face: 'happy', prop: 'skates' }, sunset: { x: 650, face: 'happy', anim: 'think' }, pip: { x: 540, face: 'happy' } },
    cam: { x: 700, zoom: 1.08 },
    beats: [
      { move: 'rainbow', x: 1250, dur: 2600, as: 'skate', then: 'idle' }, { turn: 'rainbow', dir: -1 },
      { par: [{ enter: 'cherry', from: 'right', x: 1120, dur: 2200, as: 'walk', f: 'smug' }, { seq: [{ wait: 500 }, { enter: 'icecream', from: 'right', x: 1300, dur: 2000, as: 'sneak', f: 'sneaky' }] }] },
      { turn: 'cherry', dir: 'rainbow' }, { face: 'rainbow', f: 'smug' }, { anim: 'cherry', a: 'crossed', dur: 1600 },
      { anim: 'icecream', a: 'laugh', dur: 1200 }, { anim: 'pinkie', a: 'wave', dur: 900 },
      { par: [{ exit: 'cherry', to: 'right', as: 'walk', dur: 2200 }, { exit: 'icecream', to: 'right', as: 'run', dur: 1800 }] },
      { move: 'rainbow', x: 200, dur: 2600, as: 'skate', then: 'idle' }, { turn: 'rainbow', dir: 1 }, { anim: 'pinkie', a: 'hop' }, { wait: 800 },
    ],
  }],
};

export function homeView(root) {
  const p = progress.get();
  const tourneys = p.tournaments;
  const wbTitles = tourneys.filter((x) => x.winner === 'wonderbolt').length;
  const sbTitles = tourneys.length - wbTitles;
  const pct = tourneys.length ? (wbTitles / tourneys.length) * 100 : 50;

  const stageHost = el('div', { class: 'hero-stage' });
  root.append(el('section', { class: 'hero' },
    stageHost,
    el('div', { class: 'hero-copy' },
      el('div', { class: 'kicker' }, 'NOW STREAMING · SEASON 1'),
      el('h1', {}, el('span', { class: 'sb' }, 'Shadow Bolt'), ' vs ', el('span', { class: 'wb' }, 'Wonderbolt')),
      el('p', { class: 'muted' }, 'Two schools. One rivalry. A Friendship Games that never plays out the same way twice.'),
      el('div', { class: 'actions' },
        el('a', { class: 'btn primary', href: '#/watch/ep1' }, '▶ Watch Episode 1'),
        el('a', { class: 'btn', href: '#/live' }, el('span', { class: 'chip live', style: { padding: '0 8px' } }, 'LIVE'), 'Friendship Games')),
      el('div', {}, el('div', { class: 'muted', style: { fontWeight: 800, fontSize: '13px', marginBottom: '4px' } }, tourneys.length ? `Your Games record · ${tourneys.length} tournament${tourneys.length > 1 ? 's' : ''}` : 'Your Games record · no tournaments yet'),
        el('div', { class: 'vs-meter' }, el('span', { style: { color: '#63c1ff' } }, `⚡${wbTitles}`), el('div', { class: 'vs-bar' }, el('i', { style: { width: `${pct}%` } })), el('span', { style: { color: '#d9b8ff' } }, `${sbTitles}⚡`))),
    )));
  const stage = new Stage(stageHost, { mini: true, silent: true, onEnd: (s) => { s.ended = false; s.titleShown = true; s.seekScene(0); } });
  stage.load(AMBIENT);
  stage.play();

  // Continue watching
  const cont = EPISODES.filter((e) => p.episodes[e.id] && !p.episodes[e.id].done);
  const nextUp = EPISODES.find((e) => !p.episodes[e.id]?.done);
  const contCards = [
    ...cont.map((e) => videoCard({ title: `Ep ${e.number} · ${e.title}`, desc: 'Continue watching', thumbFrom: { thumb: e.thumb } }, { href: `#/watch/${e.id}`, progress: p.episodes[e.id].total ? p.episodes[e.id].last / p.episodes[e.id].total : 0.1 })),
    nextUp && !cont.includes(nextUp) ? videoCard({ title: nextUp.short ? nextUp.title : `Ep ${nextUp.number} · ${nextUp.title}`, desc: nextUp.synopsis, thumbFrom: { thumb: nextUp.thumb } }, { href: `#/watch/${nextUp.id}`, tag: el('span', { class: 'chip' }, 'Up next') }) : null,
    videoCard({ title: 'Friendship Games LIVE', desc: liveStatus(), thumbFrom: { thumb: { location: 'stadium', chars: [['rainbow', 'run', 'determined'], ['cherry', 'run', 'determined']] } } }, { href: '#/live', tag: el('span', { class: 'chip live' }, '● LIVE') }),
  ].filter(Boolean);
  root.append(el('section', { class: 'section' }, el('div', { class: 'section-head' }, el('h2', {}, cont.length ? 'Continue watching' : 'Start here')), el('div', { class: 'row' }, contCards)));

  // Teams
  const teamCard = (team) => {
    const T = TEAMS[team];
    const members = MAJOR.filter((c) => c.team === team);
    return el('div', { class: `team-card ${team === 'wonderbolt' ? 'wb' : 'sb'}` },
      el('div', { class: 'bolt-bg' }, '⚡'),
      el('div', { class: 'motto' }, T.school.toUpperCase()),
      el('h2', {}, '⚡ ', T.name),
      el('p', { style: { maxWidth: '440px', opacity: 0.92 } }, T.identity),
      el('div', { class: 'motto' }, `“${T.motto}”`),
      el('div', { class: 'members' }, members.map((c) => el('a', { href: `#/character/${c.id}` }, el('img', { src: portrait(c.id, { w: 74, h: 80 }), alt: '' }), c.short))));
  };
  root.append(el('section', { class: 'section' }, el('div', { class: 'section-head' }, el('h2', {}, 'The rivalry')), el('div', { class: 'teams' }, teamCard('wonderbolt'), teamCard('shadowbolt'))));

  root.append(el('section', { class: 'section' },
    el('div', { class: 'section-head' }, el('h2', {}, 'Season 1'), el('a', { href: '#/cartoons', class: 'muted' }, 'All cartoons →')),
    el('div', { class: 'row' }, EPISODES.map((e) => videoCard({ title: e.short ? `Short · ${e.title}` : `Ep ${e.number} · ${e.title}`, desc: e.synopsis, thumbFrom: { thumb: e.thumb } }, { href: `#/watch/${e.id}`, done: p.episodes[e.id]?.done })))));

  root.append(el('section', { class: 'section' },
    el('div', { class: 'section-head' }, el('h2', {}, 'Play the Friendship Games'), el('a', { href: '#/games', class: 'muted' }, 'All games →')),
    el('div', { class: 'row' }, GAMES.map((g) => el('a', { class: 'card game-card', href: `#/play/${g.id}` }, el('div', { class: 'thumb', style: { background: g.bg } }, g.icon), el('div', { class: 'body' }, el('h3', {}, g.name), el('p', {}, g.desc)))))));

  return () => stage.destroy();
}
