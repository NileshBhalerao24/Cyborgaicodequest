// Videos: browsable library and the generic video player page.

import { CATEGORIES, videoList, buildHighlight } from '../data/videos.js';
import * as progress from '../engine/progress.js';
import { el } from '../util.js';
import { videoCard } from './common.js';
import { mountPlayer } from './cartoons.js';

export function videosView(root) {
  const list = videoList(progress.get());
  const watched = progress.get().videos;
  root.append(el('h1', {}, 'Videos'), el('p', { class: 'muted' }, 'Full episodes, highlights from real tournaments (including yours), funny moments, cast intros and behind-the-scenes reels.'));
  for (const cat of CATEGORIES) {
    const items = list.filter((v) => v.cat === cat.id);
    if (!items.length) continue;
    root.append(el('section', { class: 'section' },
      el('div', { class: 'section-head' }, el('h2', {}, cat.name), el('span', { class: 'muted' }, `${items.length}`)),
      el('div', { class: 'row' }, items.map((v) => videoCard(v, {
        href: v.live ? '#/live' : v.full ? `#/watch/${v.epId}` : `#/video/${v.id}`,
        done: watched[v.id] || (v.epId && progress.get().episodes[v.epId]?.done),
        tag: v.live ? el('span', { class: 'chip live' }, '● LIVE') : v.mine ? el('span', { class: 'chip' }, '⭐ Your Games') : null,
      })))));
  }
}

export function videoView(root, id) {
  const list = videoList(progress.get());
  const v = list.find((x) => x.id === id);
  if (!v) { root.append(el('h2', {}, 'Video not found.'), el('a', { class: 'btn', href: '#/videos' }, '← Videos')); return; }
  let ep, cast = [];
  if (v.highlight) {
    ep = buildHighlight(v.highlight);
    if (!ep) { root.append(el('h2', {}, 'Highlight unavailable.')); return; }
    cast = [...ep.result.participants.wonderbolt, ...ep.result.participants.shadowbolt];
  } else {
    ep = v.build();
    cast = v.cast ? v.cast() : [];
  }
  ep = { ...ep, title: v.title };
  const main = el('div');
  const related = list.filter((x) => x.cat === v.cat && x.id !== v.id).slice(0, 6);
  root.append(el('div', { class: 'watch' }, main, el('aside', {}, el('h3', {}, 'More like this'), el('div', { class: 'upnext' }, related.map((x) => videoCard(x, { href: x.live ? '#/live' : x.full ? `#/watch/${x.epId}` : `#/video/${x.id}` }))))));
  const player = mountPlayer(main, ep, { onEnd: () => progress.videoWatched(v.id, cast) });
  const catName = CATEGORIES.find((c) => c.id === v.cat)?.name;
  main.append(el('div', { class: 'watch-info' }, el('div', { class: 'muted', style: { fontWeight: 800 } }, catName?.toUpperCase()), el('h1', {}, v.title), el('p', {}, v.desc || '')));
  return () => player.destroy();
}
