// Shared UI helpers: thumbnails, portraits, cards, toasts, modals.

import { buildBackground } from '../render/backgrounds.js';
import { buildPuppet, applyStaticPose, portraitSVG } from '../render/art.js';
import { byId } from '../data/characters.js';
import { episodeById } from '../data/episodes.js';
import { el, esc } from '../util.js';

const cache = new Map();
const toURL = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// Static scene snapshot used for episode/video cards.
export function sceneThumb(thumb) {
  if (!thumb) return '';
  const key = 'T' + JSON.stringify(thumb);
  if (cache.has(key)) return cache.get(key);
  const time = thumb.time || (['duskmere', 'commonroom'].includes(thumb.location) ? 'night' : 'day');
  const bg = buildBackground(thumb.location, { worldW: 1600, time, groundY: 780 });
  const chars = thumb.chars || [];
  const n = chars.length;
  let actors = '';
  chars.forEach(([id, pose, face], i) => {
    const ch = byId[id];
    if (!ch) return;
    const p = buildPuppet(ch, { face: face || 'happy', scale: 1.35 });
    applyStaticPose(p, pose);
    const x = n === 1 ? 800 : 560 + (i * 480) / Math.max(1, n - 1);
    const facing = n > 1 && i === n - 1 ? -1 : 1;
    actors += `<g transform="translate(${x},840) scale(${facing},1)">${p.g.innerHTML}</g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${bg.sky}${bg.layers.map((l) => l.svg).join('')}${actors}</svg>`;
  const url = toURL(svg);
  cache.set(key, url);
  return url;
}

export function thumbFor(v) {
  const tf = v.thumbFrom || {};
  if (tf.thumb) return sceneThumb(tf.thumb);
  if (tf.ep) {
    const s = episodeById[tf.ep]?.scenes[tf.scene || 0];
    if (s) return sceneThumb({ location: s.location, time: s.time, chars: Object.entries(s.cast || {}).filter(([, c]) => (c.x ?? 800) > 0).slice(0, 3).map(([id, c]) => [id, c.anim || 'idle', c.face || 'happy']) });
  }
  return sceneThumb({ location: 'stadium', chars: [] });
}

export function portrait(id, opts = {}) {
  const key = 'P' + id + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const ch = opts.look ? { ...byId[id], look: { ...byId[id].look, ...opts.look } } : byId[id];
  const url = toURL(portraitSVG(ch, opts));
  cache.set(key, url);
  return url;
}

export const teamChip = (team) => el('span', { class: `chip ${team === 'wonderbolt' ? 'wb' : team === 'shadowbolt' ? 'sb' : 'neutral'}` }, team === 'wonderbolt' ? '⚡ Wonderbolt' : team === 'shadowbolt' ? '⚡ Shadow Bolt' : 'Glimmerhaven');

export function videoCard(v, { href, tag, progress, done } = {}) {
  return el('a', { class: 'card', href: href || `#/video/${v.id}` },
    el('div', { class: 'thumb' },
      el('img', { src: thumbFor(v), alt: '', loading: 'lazy' }),
      el('div', { class: 'play' }, el('span', {}, '▶')),
      tag ? el('div', { class: 'tag' }, tag) : null,
      done ? el('div', { class: 'done' }, '✓ Watched') : null,
      progress ? el('div', { class: 'bar', style: { width: `${Math.round(progress * 100)}%` } }) : null),
    el('div', { class: 'body' }, el('h3', {}, v.title), el('p', {}, v.desc || '')));
}

export function toast(msg) {
  let box = document.querySelector('.toasts');
  if (!box) { box = el('div', { class: 'toasts' }); document.body.append(box); }
  const t = el('div', { class: 'toast' }, msg);
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
}

export function modal(content, { onClose } = {}) {
  const back = el('div', { class: 'modal-back' });
  const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, content);
  back.append(box);
  const close = () => { back.remove(); onClose?.(); };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  return { close, box };
}

export const stars = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
export const html = (s) => el('div', { html: s });
export { esc };
