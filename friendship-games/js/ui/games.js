// Friendship Games playable section: hub, character select, and the game screen.

import { GAMES, gameById } from '../games/index.js';
import { MAJOR, byId } from '../data/characters.js';
import * as progress from '../engine/progress.js';
import { el } from '../util.js';
import { portrait, stars } from './common.js';
import { liveStatus } from './live.js';

const RIVAL_STAT = { skating: 'speed', scooter: 'agility', archery: 'aim', climbing: 'climb', swimming: 'swim', maze: 'cunning', relay: 'speed' };

let chosen = null;
function selectedChar() {
  const unlocked = progress.playableUnlocked();
  if (!chosen || !unlocked.includes(chosen)) { try { chosen = localStorage.getItem('fg-char'); } catch { /* ignore */ } }
  if (!chosen || !unlocked.includes(chosen)) chosen = unlocked[0];
  return chosen;
}

function picker(onPick) {
  const unlocked = progress.playableUnlocked();
  const box = el('div', { class: 'picker' });
  const draw = () => box.replaceChildren(...Object.keys(progress.PLAYABLE_UNLOCKS).map((id) => {
    const ok = unlocked.includes(id);
    return el('button', {
      class: (id === selectedChar() ? 'on' : '') + (ok ? '' : ' lock'), title: ok ? byId[id].name : `Locked — ${progress.PLAYABLE_UNLOCKS[id].hint}`,
      onclick: () => { if (!ok) return; chosen = id; try { localStorage.setItem('fg-char', id); } catch { /* ignore */ } draw(); onPick?.(id); },
    }, el('img', { src: portrait(id, ok ? { w: 84, h: 90 } : { w: 84, h: 90, bg: false }), alt: '' }), ok ? byId[id].short : progress.PLAYABLE_UNLOCKS[id].hint);
  }));
  draw();
  return box;
}

export function gamesView(root) {
  const p = progress.get();
  root.append(
    el('h1', {}, '⚡ Friendship Games'),
    el('p', { class: 'muted' }, 'Step onto the course yourself. Pick an athlete, choose an event, and take on a rival from the other team.'),
    el('div', { class: 'two', style: { alignItems: 'start' } },
      el('div', { class: 'panel' }, el('h3', {}, '🎽 Your athlete'), el('p', { class: 'muted', style: { fontSize: '14px' } }, 'Each athlete\'s stats change how the games feel. Unlock more by watching and playing.'), picker()),
      el('div', { class: 'panel' }, el('h3', {}, '📺 Tournament LIVE'), el('p', {}, liveStatus()), el('a', { class: 'btn primary small', href: '#/live' }, '▶ Watch the Games'))),
    el('section', { class: 'section' }, el('h2', {}, 'Events'),
      el('div', { class: 'grid' }, GAMES.map((g) => {
        const r = p.games[g.id];
        return el('a', { class: 'card game-card', href: `#/play/${g.id}` },
          el('div', { class: 'thumb', style: { background: g.bg } }, g.icon),
          el('div', { class: 'body' }, el('h3', {}, g.name), el('p', {}, g.desc),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'center' } }, el('span', { class: 'stars' }, stars(r?.stars || 0)), el('span', { class: 'muted', style: { fontSize: '13px', fontWeight: 800 } }, r ? `Best ${r.best} · ${r.plays} play${r.plays > 1 ? 's' : ''}` : 'Not played'))));
      }))));
}

export function playView(root, id) {
  const g = gameById[id];
  if (!g) { root.append(el('h2', {}, 'Unknown game')); return; }
  let game = null;
  const stageBox = el('div', { class: 'game-stage' });
  const canvas = el('canvas', { 'aria-label': g.name });
  stageBox.append(canvas);
  const touch = el('div', { class: 'game-touch' });
  const info = el('div', { class: 'panel' });
  const side = el('aside', {}, el('div', { class: 'panel' }, el('h3', {}, '🎽 Athlete'), picker(() => start())), info);
  root.append(el('a', { href: '#/games', class: 'btn small ghost', style: { marginBottom: '12px' } }, '← All events'),
    el('div', { class: 'game-wrap' }, el('div', {}, el('h1', {}, `${g.icon} ${g.name}`), stageBox, touch, el('p', { class: 'muted', style: { marginTop: '10px' } }, `Controls: ${g.controls}`)), side));

  function rivalFor(charId) {
    const me = byId[charId];
    const other = me.team === 'shadowbolt' ? 'wonderbolt' : 'shadowbolt';
    const pool = MAJOR.filter((c) => c.team === other && !c.reserve);
    const k = RIVAL_STAT[id];
    pool.sort((a, b) => b.stats[k] - a.stats[k]);
    return (Math.random() < 0.6 ? pool[0] : pool[Math.floor(Math.random() * pool.length)]).id;
  }

  function start() {
    game?.destroy();
    stageBox.querySelector('.game-over')?.remove();
    const charId = selectedChar();
    const rival = rivalFor(charId);
    touch.replaceChildren();
    const buttons = g.touch.map(([label, key]) => { const b = el('button', { 'aria-label': label }, label); touch.append(b); return { el: b, key }; });
    const r = progress.get().games[id];
    info.replaceChildren(el('h3', {}, '🏁 This race'), el('p', {}, `${byId[charId].short} vs ${byId[rival].short}`), el('p', { class: 'muted' }, r ? `Your best: ${r.best} · ${stars(r.stars)}` : 'First attempt!'), el('button', { class: 'btn small', onclick: start }, '↻ Restart'));
    game = new g.cls(canvas, {
      char: charId, rival, touch: buttons,
      onEnd: (res) => {
        progress.gameResult(id, { score: res.score, stars: res.stars, charId, won: res.won });
        stageBox.append(el('div', { class: 'game-over' }, el('div', {},
          el('h2', {}, res.won ? `${byId[charId].short} wins!` : `${byId[rival].short} takes it`),
          el('div', { class: 'stars' }, stars(res.stars)),
          el('p', { style: { fontSize: '20px', fontWeight: 800 } }, `Score ${res.score}`),
          el('p', { class: 'muted' }, res.summary),
          el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' } },
            el('button', { class: 'btn primary', onclick: start }, '↻ Play again'),
            el('a', { class: 'btn', href: '#/games' }, 'Other events')))));
      },
    });
  }
  start();
  return () => game?.destroy();
}
