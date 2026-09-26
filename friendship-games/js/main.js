// App shell: navigation + hash router.

import { el } from './util.js';
import * as progress from './engine/progress.js';
import * as audio from './engine/audio.js';
import { toast } from './ui/common.js';
import { homeView } from './ui/home.js';
import { cartoonsView, watchView } from './ui/cartoons.js';
import { liveView } from './ui/live.js';
import { charactersView, characterView } from './ui/characters.js';
import { videosView, videoView } from './ui/videos.js';
import { gamesView, playView } from './ui/games.js';
import { progressView } from './ui/progressView.js';

const NAV = [
  { href: 'home', label: 'Home', ico: '🏠' },
  { href: 'cartoons', label: 'Cartoons', ico: '📺' },
  { href: 'characters', label: 'Characters', ico: '🧑‍🤝‍🧑' },
  { href: 'videos', label: 'Videos', ico: '🎬' },
  { href: 'games', label: 'Friendship Games', short: 'Games', ico: '⚡' },
  { href: 'progress', label: 'My Progress', short: 'Progress', ico: '🏆' },
];

const ROUTES = [
  [/^home$|^$/, homeView, 'home'],
  [/^cartoons$/, cartoonsView, 'cartoons'],
  [/^watch\/([\w-]+)$/, watchView, 'cartoons'],
  [/^live$/, liveView, 'cartoons'],
  [/^characters$/, charactersView, 'characters'],
  [/^character\/([\w-]+)$/, characterView, 'characters'],
  [/^videos$/, videosView, 'videos'],
  [/^video\/([\w-]+)$/, videoView, 'videos'],
  [/^games$/, gamesView, 'games'],
  [/^play\/([\w-]+)$/, playView, 'games'],
  [/^progress$/, progressView, 'progress'],
];

const app = document.getElementById('app');
let cleanup = null;

function renderNav(active) {
  const mk = (short) => NAV.map((n) => el('a', { href: `#/${n.href}`, class: n.href === active ? 'active' : '' }, el('span', { class: 'ico' }, n.ico), short ? n.short || n.label : [el('span', { class: 'l-long' }, n.label), el('span', { class: 'l-short' }, n.short || n.label)]));
  document.getElementById('nav').replaceChildren(...mk(false));
  document.getElementById('bottomnav').replaceChildren(...mk(true));
}

function route() {
  const path = location.hash.replace(/^#\/?/, '');
  for (const [re, view, nav] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    audio.stopMusic();
    renderNav(nav);
    const root = el('div', { class: 'view' });
    app.replaceChildren(root);
    window.scrollTo({ top: 0 });
    cleanup = view(root, ...m.slice(1)) || null;
    return;
  }
  location.hash = '#/home';
}

progress.setToast(toast);
progress.commit();
window.addEventListener('hashchange', route);

const muteBtn = document.getElementById('mute');
const syncMute = () => { muteBtn.textContent = audio.isMuted() ? '🔇' : '🔊'; };
muteBtn.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); syncMute(); });
syncMute();

route();
