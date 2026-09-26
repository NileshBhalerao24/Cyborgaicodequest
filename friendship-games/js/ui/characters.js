// Character gallery & profiles. Profiles reveal more as the viewer discovers each character
// (watching episodes, videos, tournament events, and playing as them).

import { ALL, MAJOR, SUPPORTING, byId, relLabel } from '../data/characters.js';
import { EPISODES, castOf } from '../data/episodes.js';
import { eventById, EVENTS } from '../data/events.js';
import { TEAMS } from '../data/world.js';
import * as progress from '../engine/progress.js';
import { el } from '../util.js';
import { portrait, teamChip, videoCard } from './common.js';

const START_KNOWN = new Set(['pinkie', 'rainbow', 'rarity', 'sunset', 'cherry', 'icecream', 'twilight', 'cena']);
export const level = (id) => Math.max(progress.discovery(id), START_KNOWN.has(id) ? 1 : 0);

function firstAppearance(id) {
  const ep = EPISODES.find((e) => castOf(e).includes(id));
  if (ep) return ep.short ? `the short "${ep.title}"` : `Episode ${ep.number}`;
  return 'the Friendship Games LIVE';
}

export function charactersView(root) {
  let filter = 'all';
  const grid = el('div', { class: 'char-grid' });
  const known = ALL.filter((c) => level(c.id) > 0).length;
  const filters = [['all', 'Everyone'], ['wonderbolt', '⚡ Wonderbolt'], ['shadowbolt', '⚡ Shadow Bolt'], ['major', 'Main cast'], ['staff', 'Coaches & Staff'], ['students', 'Students'], ['creatures', 'Creatures']];
  const fbar = el('div', { class: 'filters' }, filters.map(([k, label]) => el('button', { class: k === filter ? 'on' : '', onclick: (e) => { filter = k; fbar.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, label)));
  function draw() {
    const list = ALL.filter((c) => {
      if (filter === 'all') return true;
      if (filter === 'major') return c.role === 'major';
      if (filter === 'staff') return c.group === 'Coaches & Staff';
      if (filter === 'students') return c.group === 'Students';
      if (filter === 'creatures') return c.kind === 'creature';
      return c.team === filter;
    });
    grid.replaceChildren(...list.map((c) => {
      const lv = level(c.id);
      const locked = lv === 0;
      return el('a', { class: 'char-card' + (locked ? ' locked' : ''), href: locked ? undefined : `#/character/${c.id}`, title: locked ? `Undiscovered — appears in ${firstAppearance(c.id)}` : c.name },
        el('img', { class: 'pic', src: portrait(c.id, locked ? { w: 200, h: 210, bg: false } : { w: 200, h: 210 }), alt: locked ? 'Undiscovered character' : c.name, loading: 'lazy' }),
        locked ? null : el('div', { class: 'lvl' }, '★'.repeat(lv)),
        el('div', { class: 'nm' }, locked ? '???' : c.short || c.name),
        el('div', { class: 'sub' }, locked ? `Appears in ${firstAppearance(c.id)}` : c.role === 'major' ? (c.reserve ? `${TEAMS[c.team].name} reserve` : TEAMS[c.team].name) : c.group));
    }));
  }
  root.append(
    el('h1', {}, 'Characters'),
    el('p', { class: 'muted' }, `${known} of ${ALL.length} discovered. Watch, play and follow the Games to discover everyone — profiles fill in the more you see of each character (★ → ★★★).`),
    fbar, grid);
  draw();
}

const STAT_KEYS = ['speed', 'agility', 'strength', 'endurance', 'balance', 'aim', 'swim', 'climb', 'nerve', 'teamwork'];

export function characterView(root, id) {
  const c = byId[id];
  if (!c) { root.append(el('h2', {}, 'Unknown character')); return; }
  const lv = level(id);
  if (lv === 0) { root.append(el('h2', {}, 'Not discovered yet'), el('p', {}, `Keep watching — they appear in ${firstAppearance(id)}.`), el('a', { class: 'btn', href: '#/characters' }, '← Back')); return; }
  progress.markSeen([id], 0);

  if (c.role !== 'major') return supportingProfile(root, c, lv);

  const variants = [
    { key: 'kit', label: 'Team kit', look: null, need: 1 },
    { key: 'casual', label: 'Casual', look: { outfit: '#f3f0ea', outfit2: c.look.hair }, need: 2 },
    { key: 'training', label: 'Training', look: { outfit: '#4a5068', outfit2: c.look.outfit2 }, need: 3 },
  ];
  const pic = el('img', { src: portrait(id, { crop: 'full', w: 300, h: 430, face: 'happy' }), alt: c.name });
  const vbar = el('div', { class: 'variants' }, variants.map((v) => el('button', {
    class: v.key === 'kit' ? 'on' : '', disabled: lv < v.need ? true : null, title: lv < v.need ? `Discover more (★${'★'.repeat(v.need - 1)}) to unlock` : v.label,
    onclick: (e) => { pic.src = portrait(id, { crop: 'full', w: 300, h: 430, face: 'happy', look: v.look || undefined }); vbar.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); },
  }, lv < v.need ? `🔒 ${v.label}` : v.label)));
  const exprs = el('div', { class: 'expr-strip' }, ['happy', 'laugh', 'surprised', 'angry', 'sad'].map((f) => el('img', { src: portrait(id, { face: f, w: 90, h: 100, bg: false }), alt: f, title: f })));

  const lock = (need, text) => el('div', { class: 'lockbox' }, `🔒 ${text || 'Discover more to reveal'} — ${'★'.repeat(need)} needed. Watch episodes and Games with ${c.short}, or play as them.`);
  const statBars = el('div', {}, STAT_KEYS.map((k) => el('div', { class: 'stat' + (c.team === 'shadowbolt' ? ' sbs' : '') }, el('span', {}, k), el('div', { class: 'track' }, el('i', { style: { width: `${c.stats[k] * 10}%` } })), el('b', {}, c.stats[k]))));
  const favEvents = EVENTS.filter((e) => c.specialties.some((s) => e.id.startsWith(s) || (s === 'swim' && e.id === 'swim'))).slice(0, 5);

  const rels = MAJOR.filter((o) => o.id !== id && o.team !== 'neutral' || (o.id !== id && ['juni', 'milo'].includes(o.id)))
    .map((o) => ({ o, r: progress.relationship(id, o.id) }))
    .filter((x) => x.r.v !== 0 || x.r.label)
    .sort((a, b) => Math.abs(b.r.v) - Math.abs(a.r.v)).slice(0, 7);
  const relList = el('div', {}, rels.map(({ o, r }) => {
    const v = r.v, left = v >= 0 ? 50 : 50 + v / 2, width = Math.abs(v) / 2;
    const known = level(o.id) > 0;
    return el('div', { class: 'rel' },
      el('img', { src: portrait(o.id, { w: 60, h: 60 }), alt: '' }),
      el('div', {}, el('div', { style: { fontWeight: 800 } }, known ? o.short : '???'), el('div', { class: 'meter' }, el('i', { style: { left: `${left}%`, width: `${width}%`, background: v >= 0 ? '#35e0c1' : '#ff4fa3' } }), el('i', { style: { left: '50%', width: '2px', background: '#fff', opacity: '.5' } }))),
      el('div', { class: 'lbl' }, r.label || relLabel(v), v !== r.base ? el('div', { style: { color: v > r.base ? '#8effc1' : '#ff9aa9' } }, v > r.base ? `▲ ${v - r.base}` : `▼ ${r.base - v}`) : null));
  }));

  const career = progress.get().charStats[id];
  const clips = [
    { v: { id: `intro-${id}`, title: `Meet ${c.short}`, desc: c.tagline, thumbFrom: { thumb: { location: 'brightspire', chars: [[id, 'wave', 'happy']] } } }, unlocked: true, href: `#/video/intro-${id}` },
    ...EPISODES.filter((e) => castOf(e).includes(id)).map((e) => ({ v: { id: e.id, title: e.short ? e.title : `Ep ${e.number} · ${e.title}`, desc: e.synopsis, thumbFrom: { thumb: e.thumb } }, unlocked: true, watched: progress.get().episodes[e.id]?.done, href: `#/watch/${e.id}` })),
  ];

  root.append(el('a', { href: '#/characters', class: 'btn small ghost', style: { marginBottom: '14px' } }, '← All characters'),
    el('div', { class: 'profile' },
      el('div', { class: 'profile-side' }, el('div', { class: 'profile-pic' }, pic), vbar, el('h3', { style: { marginTop: '14px' } }, 'Expressions'), exprs),
      el('div', {},
        el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, teamChip(c.team), el('span', { class: 'chip' }, c.ageGroup), c.reserve ? el('span', { class: 'chip' }, 'Reserve') : null, el('span', { class: 'chip', title: 'Discovery level' }, `Discovery ${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}`)),
        el('h1', { style: { marginTop: '10px' } }, c.name),
        el('p', { style: { fontSize: '19px', fontFamily: 'var(--display)', fontWeight: 700 } }, c.tagline),
        el('div', { class: 'panel' }, el('h3', {}, '🧠 Personality'), el('p', {}, c.personality), el('p', { class: 'muted' }, `Voice: ${c.voice}`)),
        el('div', { class: 'two' },
          el('div', { class: 'panel' }, el('h3', {}, '💪 Strengths'), el('ul', { class: 'bul' }, c.strengths.map((s) => el('li', {}, s)))),
          el('div', { class: 'panel' }, el('h3', {}, '🌧️ Weaknesses'), el('ul', { class: 'bul' }, c.weaknesses.map((s) => el('li', {}, s))))),
        el('div', { class: 'panel' }, el('h3', {}, '⚡ Abilities'), statBars,
          el('p', { style: { marginTop: '10px' } }, el('b', {}, 'Favorite events: '), favEvents.length ? favEvents.map((e) => `${e.icon} ${e.name}`).join(' · ') : c.favorites.join(', ')),
          el('p', {}, el('b', {}, 'Loves: '), c.favorites.join(' · '))),
        el('div', { class: 'panel' }, el('h3', {}, '💞 Relationships'), lv >= 2 ? relList : lock(2, 'Relationships')),
        el('div', { class: 'two' },
          el('div', { class: 'panel' }, el('h3', {}, '😨 Fears'), lv >= 2 ? el('ul', { class: 'bul' }, c.fears.map((s) => el('li', {}, s))) : lock(2, 'Fears')),
          el('div', { class: 'panel' }, el('h3', {}, '🤫 Secret'), lv >= 3 ? el('p', {}, c.secret) : lock(3, 'Secret'))),
        el('div', { class: 'panel' }, el('h3', {}, '📈 Story arc'), lv >= 2 ? el('p', {}, c.arc) : lock(2, 'Story arc')),
        career ? el('div', { class: 'panel' }, el('h3', {}, '🏅 Friendship Games career'),
          el('div', { class: 'stats-row' }, [['Events', career.events], ['Team wins', career.wins], ['MVPs', career.mvp], ['Helping hands', career.helps], ['Clutch moments', career.clutch], ['Falls', career.falls]].map(([k, v]) => el('div', { class: 'stat-tile' }, el('div', { class: 'v' }, v), el('div', { class: 'k' }, k))))) : null,
        el('div', { class: 'section' }, el('h2', {}, '🎬 Clips & episodes'), el('div', { class: 'grid' }, clips.map((x) => videoCard(x.v, { href: x.href, done: x.watched })))),
      )));
}

function supportingProfile(root, c, lv) {
  const eps = EPISODES.filter((e) => castOf(e).includes(c.id));
  root.append(el('a', { href: '#/characters', class: 'btn small ghost', style: { marginBottom: '14px' } }, '← All characters'),
    el('div', { class: 'profile' },
      el('div', { class: 'profile-side' }, el('div', { class: 'profile-pic' }, el('img', { src: portrait(c.id, { crop: c.kind === 'creature' ? 'bust' : 'full', w: 300, h: 430, face: 'happy' }), alt: c.name }))),
      el('div', {},
        el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, teamChip(c.team), el('span', { class: 'chip' }, c.group)),
        el('h1', { style: { marginTop: '10px' } }, c.name),
        el('div', { class: 'panel' }, el('p', { style: { fontSize: '18px' } }, c.blurb)),
        eps.length ? el('div', { class: 'section' }, el('h2', {}, 'Appears in'), el('div', { class: 'grid' }, eps.map((e) => videoCard({ title: e.short ? e.title : `Ep ${e.number} · ${e.title}`, desc: e.synopsis, thumbFrom: { thumb: e.thumb } }, { href: `#/watch/${e.id}` })))) : el('p', { class: 'muted' }, 'Shows up around Glimmerhaven and at the Friendship Games.'))));
}

export { SUPPORTING };
