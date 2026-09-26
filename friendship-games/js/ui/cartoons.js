// Cartoons: episode list, the watch page, and the optional post-episode reflection.

import { EPISODES, episodeById, castOf } from '../data/episodes.js';
import { byId } from '../data/characters.js';
import { Stage } from '../render/stage.js';
import * as progress from '../engine/progress.js';
import { el } from '../util.js';
import { videoCard, portrait, modal, toast, sceneThumb, teamChip } from './common.js';
import { liveStatus } from './live.js';

// Mount the cartoon player. Returns a destroy function.
export function mountPlayer(root, episode, { onEnd, onScene, autoplay = false } = {}) {
  const host = el('div');
  root.append(host);
  const stage = new Stage(host, { onEnd, onScene });
  stage.load(episode);
  if (autoplay) stage.play();
  return { stage, destroy: () => stage.destroy() };
}

const PROMPTS = {
  ep1: 'Rainbow Dash stopped mid-race. What would you have done?',
  ep2: 'Would you have climbed down for Cena?',
  ep3: 'If you were Ice Cream after the race, what would you do next?',
  ep4: 'Who would you have wanted on that bridge with you?',
};

export function reflection(ep, onDone) {
  const state = { feeling: null, favorite: null };
  const feelings = [['😄', 'Happy'], ['😂', 'Funny'], ['😮', 'Surprised'], ['😢', 'Sad'], ['😠', 'Annoyed'], ['🤔', 'Thinking'], ['🥰', 'Warm']];
  const optRow = (items, key, emoji) => el('div', { class: 'opts' }, items.map(([v, label]) => el('button', {
    class: 'opt' + (emoji ? ' emoji' : ''), title: label, 'aria-label': label,
    onclick: (e) => { state[key] = v; e.currentTarget.parentElement.querySelectorAll('.opt').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); },
  }, emoji ? v : label)));
  const didTa = el('textarea', { rows: 2, placeholder: PROMPTS[ep.id] || 'Anything goes — or leave it blank.' });
  const learnTa = el('textarea', { rows: 2, placeholder: 'Totally optional.' });
  const content = el('div', {},
    el('h2', {}, '💬 What did you think?'),
    el('p', { class: 'muted' }, 'Everything here is optional. There are no wrong answers.'),
    el('div', { class: 'q' }, el('label', {}, 'How did the episode make you feel?'), optRow(feelings, 'feeling', true)),
    el('div', { class: 'q' }, el('label', {}, 'What was your favorite moment?'), optRow(ep.scenes.map((s) => [s.title, s.title]), 'favorite')),
    el('div', { class: 'q' }, el('label', {}, 'What would you have done?'), didTa),
    el('div', { class: 'q' }, el('label', {}, 'What did you learn from the cartoon?'), learnTa),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn ghost', onclick: () => { m.close(); } }, 'Skip'),
      el('button', { class: 'btn primary', onclick: () => {
        const r = { ep: ep.id, title: ep.title, feeling: state.feeling, favorite: state.favorite, wouldDo: didTa.value.trim(), learned: learnTa.value.trim() };
        if (r.feeling || r.favorite || r.wouldDo || r.learned) { progress.reflection(r); toast('Thanks for sharing! 💛'); }
        m.close();
      } }, 'Save my thoughts')));
  const m = modal(content, { onClose: onDone });
}

function episodeCards() {
  const p = progress.get();
  return EPISODES.map((ep) => {
    const e = p.episodes[ep.id];
    const prog = e && !e.done && e.total ? e.last / e.total : 0;
    return videoCard({ title: ep.short ? `Short · ${ep.title}` : `Episode ${ep.number} · ${ep.title}`, desc: ep.synopsis, thumbFrom: { thumb: ep.thumb } }, { href: `#/watch/${ep.id}`, done: e?.done, progress: prog, tag: ep.short ? el('span', { class: 'chip' }, 'Short') : null });
  });
}

export function cartoonsView(root) {
  const status = liveStatus();
  root.append(
    el('h1', {}, 'Cartoons'),
    el('p', { class: 'muted' }, 'Season 1 of Shadow Bolt vs Wonderbolt, plus a live Friendship Games tournament that plays out differently every time.'),
    el('a', { href: '#/live', class: 'card', style: { marginTop: '18px' } },
      el('div', { class: 'hero', style: { minHeight: '260px', boxShadow: 'none', border: '0' } },
        el('div', { class: 'hero-stage' }, el('img', { src: sceneThumb({ location: 'stadium', chars: [['sunset', 'point', 'determined'], ['rainbow', 'cheer', 'laugh'], ['cherry', 'crossed', 'smug'], ['cena', 'hips', 'determined']] }), alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })),
        el('div', { class: 'hero-copy' },
          el('div', {}, el('span', { class: 'chip live' }, '● LIVE'), ' ', el('span', { class: 'kicker' }, 'SPECIAL')),
          el('h2', {}, 'Friendship Games LIVE'),
          el('p', { class: 'muted' }, 'A full tournament generated on the fly. The Lightning Wheel picks each next event from what just happened — so no two Games play out the same.'),
          el('p', {}, status),
          el('div', { class: 'actions' }, el('span', { class: 'btn primary' }, '▶ Watch the Games'))))),
    el('section', { class: 'section' }, el('div', { class: 'section-head' }, el('h2', {}, 'Season 1')), el('div', { class: 'grid' }, episodeCards())),
  );
}

export function watchView(root, epId) {
  const ep = episodeById[epId];
  if (!ep) { root.append(el('h2', {}, 'Episode not found.')); return; }
  const idx = EPISODES.indexOf(ep);
  const next = EPISODES[idx + 1];
  const cast = castOf(ep);
  const main = el('div');
  const side = el('aside', {}, el('h3', {}, 'Up next'), el('div', { class: 'upnext' }, EPISODES.filter((e) => e !== ep).map((e) => videoCard({ title: e.short ? `Short · ${e.title}` : `Ep ${e.number} · ${e.title}`, desc: e.synopsis, thumbFrom: { thumb: e.thumb } }, { href: `#/watch/${e.id}`, done: progress.get().episodes[e.id]?.done }))));
  root.append(el('div', { class: 'watch' }, main, side));
  const player = mountPlayer(main, ep, {
    onScene: (i) => progress.episodeProgress(ep.id, i, ep.scenes.length),
    onEnd: () => {
      progress.episodeDone(ep.id, cast);
      reflection(ep, () => {
        if (next) toast(`Up next: ${next.short ? next.title : `Episode ${next.number} · ${next.title}`}`);
      });
    },
  });
  main.append(el('div', { class: 'watch-info' },
    el('div', { class: 'muted', style: { fontWeight: 800 } }, ep.short ? 'SHORT' : `SEASON 1 · EPISODE ${ep.number}`),
    el('h1', {}, ep.title),
    el('p', {}, ep.synopsis),
    el('div', { class: 'cast-chips' }, cast.filter((id) => byId[id]).map((id) => el('a', { class: 'cast-chip', href: `#/character/${id}` }, el('img', { src: portrait(id, { w: 60, h: 60 }), alt: '' }), byId[id].short || byId[id].name))),
    next ? el('p', { style: { marginTop: '16px' } }, el('a', { class: 'btn', href: `#/watch/${next.id}` }, `Next: ${next.title} →`)) : null,
    el('p', { class: 'note', style: { marginTop: '18px' } }, 'Tip: Space plays/pauses, ← → skip scenes, CC toggles captions. Artwork and motion are procedural placeholders designed to be swapped for finished animation.'),
  ));
  return () => player.destroy();
}

export { teamChip };
