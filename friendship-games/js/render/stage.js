// The cartoon player. Plays an "episode" — a list of scenes, each a list of beats — with
// puppets, parallax camera, speech bubbles, FX, broadcast graphics and transitions.
//
// Asset hand-off: any scene may carry `media: { video: 'assets/video/ep1-s2.mp4' }`. When present,
// the player shows that video instead of the procedural scene, so finished animation can be
// dropped in scene-by-scene without changing episode structure, progress tracking or UI.

import { buildPuppet, RIG } from './art.js';
import { buildBackground, rainLayer } from './backgrounds.js';
import { byId } from '../data/characters.js';
import { TEAMS } from '../data/world.js';
import * as audioMod from '../engine/audio.js';
import { el, svgEl, clamp, lerp, ease, esc } from '../util.js';

const VW = 1600, VH = 900;
const LOOPS = new Set(['idle', 'walk', 'run', 'skate', 'scooter', 'board', 'bike', 'swim', 'climb', 'hop', 'cheer', 'celebrate', 'fistpump', 'sad', 'angry', 'point', 'wave', 'clap', 'shrug', 'facepalm', 'think', 'reach', 'pull', 'bow', 'kayak', 'sit', 'sneak', 'nervous', 'carry', 'hang', 'hug', 'lookup', 'laugh', 'stretch', 'lie', 'dizzy', 'highfive', 'crossed', 'hips', 'float', 'zip', 'balance', 'crouch']);
const ONESHOT = { jump: 750, fall: 450, trip: 650, getup: 550, bigjump: 1100, shoot: 400, slip: 500 };

export class Stage {
  constructor(root, opts = {}) {
    this.opts = opts;
    const silent = !!opts.silent;
    this.audio = {
      sfx: (n) => { if (!silent) audioMod.sfx(n); },
      music: (m) => { if (!silent) audioMod.music(m); },
      stopMusic: () => { if (!silent) audioMod.stopMusic(); },
      isMuted: audioMod.isMuted, setMuted: audioMod.setMuted,
    };
    this.root = root;
    this.time = 0;
    this.playing = false;
    this.gen = 0;
    this.waiters = [];
    this.actors = new Map();
    this.fx = [];
    this.cam = { x: VW / 2, y: VH / 2, z: 1, follow: null, followY: false, tween: null };
    this.cc = opts.cc ?? false;
    this.speed = 1;
    if (/[?&]debug/.test(location.search)) window.__stage = this;
    this.sceneIndex = -1;
    this.scenes = [];
    this.build();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.onKey = (e) => this.key(e);
    window.addEventListener('keydown', this.onKey);
  }

  // ─────────────────────────── DOM
  build() {
    this.root.innerHTML = '';
    this.svg = svgEl('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'stage-svg', preserveAspectRatio: 'xMidYMid slice' });
    this.skyG = svgEl('g');
    this.worldG = svgEl('g');
    this.layersG = svgEl('g');
    this.actorsG = svgEl('g');
    this.fxG = svgEl('g');
    this.frontG = svgEl('g');
    this.worldG.append(this.layersG, this.actorsG, this.fxG, this.frontG);
    this.svg.append(this.skyG, this.worldG);

    this.video = el('video', { class: 'stage-video', playsinline: true, hidden: true });
    this.overlay = el('div', { class: 'stage-overlay' });
    this.hud = el('div', { class: 'stage-hud' });
    this.caption = el('div', { class: 'stage-caption', hidden: true });
    this.scoreEl = el('div', { class: 'scorebug', hidden: true });
    this.cardEl = el('div', { class: 'bcast-card', hidden: true });
    this.lowerEl = el('div', { class: 'lower-third', hidden: true });
    this.paEl = el('div', { class: 'pa-line', hidden: true });
    this.trans = el('div', { class: 'stage-trans' });
    this.titleEl = el('div', { class: 'stage-title', hidden: true });
    this.flashEl = el('div', { class: 'stage-flash' });
    this.badge = el('div', { class: 'ph-badge', title: 'Procedural SVG puppets stand in for final animation. Scenes can be swapped for video files — see README.' }, '◆ Placeholder animation');
    this.bigPlay = el('button', { class: 'big-play', 'aria-label': 'Play', onclick: () => this.toggle() }, el('span', { html: '&#9654;' }));
    this.hud.append(this.scoreEl, this.paEl, this.cardEl, this.lowerEl, this.caption);
    this.frame_ = el('div', { class: 'stage-frame' }, this.svg, this.video, this.overlay, this.hud, this.flashEl, this.trans, this.titleEl, this.badge, this.bigPlay);

    // Controls
    this.btnPlay = el('button', { class: 'ctl', 'aria-label': 'Play/pause', onclick: () => this.toggle() }, '▶');
    this.btnPrev = el('button', { class: 'ctl', 'aria-label': 'Previous scene', onclick: () => this.seekScene(this.sceneIndex - 1) }, '⏮');
    this.btnNext = el('button', { class: 'ctl', 'aria-label': 'Next scene', onclick: () => this.seekScene(this.sceneIndex + 1) }, '⏭');
    this.bar = el('div', { class: 'ctl-bar' });
    this.sceneLabel = el('div', { class: 'ctl-label' }, '');
    this.btnCC = el('button', { class: 'ctl' + (this.cc ? ' on' : ''), 'aria-label': 'Captions', onclick: () => { this.cc = !this.cc; this.btnCC.classList.toggle('on', this.cc); if (!this.cc) this.caption.hidden = true; } }, 'CC');
    this.btnMute = el('button', { class: 'ctl', 'aria-label': 'Sound', onclick: () => { this.audio.setMuted(!this.audio.isMuted()); this.btnMute.textContent = this.audio.isMuted() ? '🔇' : '🔊'; } }, this.audio.isMuted() ? '🔇' : '🔊');
    this.btnFull = el('button', { class: 'ctl', 'aria-label': 'Fullscreen', onclick: () => this.fullscreen() }, '⛶');
    this.controls = el('div', { class: 'stage-controls' }, this.btnPlay, this.btnPrev, this.btnNext, el('div', { class: 'ctl-mid' }, this.bar, this.sceneLabel), this.btnCC, this.btnMute, this.btnFull);
    this.root.append(el('div', { class: 'stage' + (this.opts.mini ? ' mini' : '') }, this.frame_, this.controls));
    if (this.opts.mini) { this.controls.hidden = true; this.badge.hidden = true; this.bigPlay.hidden = true; }
    this.frame_.addEventListener('click', (e) => { if (this.opts.mini || e.target.closest('button') || e.target.closest('.ph-badge')) return; this.toggle(); });
  }

  fullscreen() {
    const n = this.root.querySelector('.stage');
    if (document.fullscreenElement) document.exitFullscreen();
    else n.requestFullscreen?.()?.catch?.(() => {});
  }

  key(e) {
    if (!this.root.isConnected || this.opts.mini) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); this.toggle(); }
    else if (e.code === 'ArrowRight') this.seekScene(this.sceneIndex + 1);
    else if (e.code === 'ArrowLeft') this.seekScene(this.sceneIndex - 1);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.gen++;
    this.flushWaiters();
    this.audio.stopMusic();
    this.video.pause();
    this.root.innerHTML = '';
  }

  // ─────────────────────────── Clock
  wait(ms) {
    const g = this.gen;
    return new Promise((resolve) => this.waiters.push({ until: this.time + ms, resolve, g }));
  }
  flushWaiters() { const w = this.waiters; this.waiters = []; w.forEach((x) => x.resolve()); }
  alive(g) { return g === this.gen; }

  toggle() { this.playing ? this.pause() : this.play(); }
  play() {
    if (this.ended) { this.ended = false; this.seekScene(0); }
    this.playing = true;
    this.bigPlay.hidden = true;
    this.btnPlay.textContent = '❚❚';
    if (!this.video.hidden) this.video.play();
    if (this.currentMood) this.audio.music(this.currentMood);
    if (!this.started) { this.started = true; this.run(0); }
  }
  pause() {
    this.playing = false;
    this.bigPlay.hidden = false;
    this.btnPlay.textContent = '▶';
    if (!this.video.hidden) this.video.pause();
    this.audio.stopMusic();
  }

  // ─────────────────────────── Episode control
  load(episode) {
    this.episode = episode;
    this.scenes = episode.scenes.slice();
    this.started = false;
    this.ended = false;
    this.sceneIndex = -1;
    this.renderBar();
    this.showTitle(episode);
    this.sceneLabel.textContent = episode.title;
  }

  renderBar() {
    this.bar.innerHTML = '';
    const n = this.scenes.length;
    this.scenes.forEach((s, i) => {
      this.bar.append(el('button', { class: 'ctl-seg' + (i < this.sceneIndex ? ' done' : i === this.sceneIndex ? ' now' : ''), title: s.title || `Scene ${i + 1}`, style: { flex: String(s.weight || 1) }, onclick: () => this.seekScene(i) }));
    });
    if (this.episode?.more && !this.episode.exhausted) this.bar.append(el('div', { class: 'ctl-seg live', title: 'More scenes are generated as the tournament unfolds' }, 'LIVE'));
    if (!n) this.bar.append(el('div', { class: 'ctl-seg' }));
  }

  showTitle(ep) {
    if (!ep.titleCard) { this.titleEl.hidden = true; return; }
    this.titleEl.hidden = false;
    this.titleEl.innerHTML = `<div class="tc-inner"><div class="tc-logo"><span class="bolt-l">⚡</span>FRIENDSHIP GAMES<span class="bolt-r">⚡</span></div><div class="tc-series">${esc(ep.series || 'Shadow Bolt vs Wonderbolt')}</div><div class="tc-ep">${esc(ep.number ? `Episode ${ep.number}` : ep.kind || '')}</div><div class="tc-title">${esc(ep.title)}</div></div>`;
  }

  async seekScene(i) {
    if (i < 0) i = 0;
    if (i >= this.scenes.length) {
      if (this.episode?.more && !this.episode.exhausted) { await this.pullMore(); if (i >= this.scenes.length) return this.finish(); }
      else return this.finish();
    }
    this.gen++;
    this.flushWaiters();
    this.started = true;
    this.ended = false;
    if (!this.playing) { this.playing = true; this.bigPlay.hidden = true; this.btnPlay.textContent = '❚❚'; }
    this.run(i);
  }

  async pullMore() {
    const more = await this.episode.more();
    if (!more || !more.length) { this.episode.exhausted = true; this.renderBar(); return false; }
    this.scenes.push(...more);
    this.renderBar();
    return true;
  }

  async run(startIndex) {
    const g = this.gen;
    if (startIndex === 0 && this.episode.titleCard && !this.titleShown) {
      this.titleShown = true;
      this.titleEl.hidden = false;
      this.titleEl.classList.add('show');
      this.audio.sfx('fanfare');
      await this.wait(2600);
      if (!this.alive(g)) return;
      this.titleEl.classList.remove('show');
      this.titleEl.hidden = true;
    } else this.titleEl.hidden = true;

    for (let i = startIndex; ; i++) {
      if (i >= this.scenes.length) {
        if (this.episode.more && !this.episode.exhausted) {
          const ok = await this.pullMore();
          if (!this.alive(g)) return;
          if (!ok) break;
        } else break;
      }
      await this.playScene(i, g);
      if (!this.alive(g)) return;
    }
    if (this.alive(g)) this.finish();
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    this.playing = false;
    this.btnPlay.textContent = '↺';
    this.audio.stopMusic();
    this.clearBubbles();
    this.opts.onEnd?.(this);
  }

  async playScene(i, g) {
    const scene = this.scenes[i];
    // Cover → set up → reveal
    this.trans.className = 'stage-trans cover ' + (scene.transition || 'wipe');
    await this.wait(i === 0 ? 50 : 380);
    if (!this.alive(g)) return;
    this.sceneIndex = i;
    this.renderBar();
    this.sceneLabel.textContent = `${this.episode.title} · ${scene.title || `Scene ${i + 1}`}`;
    this.setup(scene);
    this.opts.onScene?.(i, scene);
    this.trans.className = 'stage-trans reveal ' + (scene.transition || 'wipe');

    if (scene.media?.video) {
      await this.playVideo(scene.media.video, g);
      return;
    }
    for (const b of scene.beats.slice(scene.skip || 0)) {
      await this.beat(b, g);
      if (!this.alive(g)) return;
    }
    await this.wait(scene.tail ?? 500);
  }

  playVideo(src, g) {
    return new Promise((resolve) => {
      this.video.hidden = false;
      this.video.src = src;
      const done = () => { this.video.hidden = true; this.video.onended = null; resolve(); };
      this.video.onended = done;
      this.video.onerror = done; // missing asset → fall through to next scene
      if (this.playing) this.video.play().catch(done);
      const check = setInterval(() => { if (!this.alive(g)) { clearInterval(check); this.video.pause(); done(); } }, 200);
    });
  }

  // ─────────────────────────── Scene setup
  setup(scene) {
    this.clearBubbles();
    this.actors.clear();
    this.actorsG.innerHTML = '';
    this.fxG.innerHTML = '';
    this.fx = [];
    this.lowerEl.hidden = true;
    this.cardEl.hidden = true;
    this.paEl.hidden = true;
    this.svg.classList.remove('rainy');
    if (scene.score) this.setScore(scene.score, false);
    else if (!scene.keepScore) this.scoreEl.hidden = true;

    const bg = buildBackground(scene.location, { worldW: scene.world?.w, worldH: scene.world?.h, time: scene.time, weather: scene.weather, course: scene.course, climb: scene.climb, groundY: scene.world?.groundY });
    this.bg = bg;
    bg.climb = !!scene.climb;
    this.groundY = scene.climb ? bg.worldH - 120 : bg.groundY;
    this.skyG.innerHTML = bg.sky;
    this.layersG.innerHTML = '';
    this.layerNodes = bg.layers.map((L) => {
      const n = svgEl('g', { 'data-f': L.factor });
      n.innerHTML = L.svg;
      this.layersG.append(n);
      return { n, f: L.factor };
    });
    this.frontG.innerHTML = bg.front || '';
    this.worldW = bg.worldW;
    this.worldH = bg.worldH;

    const c = scene.cam || {};
    this.cam = { x: c.x ?? VW / 2, y: c.y ?? (scene.climb ? bg.worldH - VH / 2 : VH / 2), z: c.zoom ?? 1, follow: c.follow || null, followY: !!c.followY, followMax: null, tween: null, shake: 0 };
    for (const [id, spec] of Object.entries(scene.cast || {})) this.spawn({ id, ...spec });
    if (scene.skip) scene.beats.slice(0, scene.skip).forEach((b) => this.fastForward(b));
    if (scene.music) this.setMusic(scene.music);
    if (bg.rainy) this.audio.sfx('thunder');
  }

  setMusic(mood) {
    this.currentMood = mood;
    if (this.playing) this.audio.music(mood);
  }

  spawn(spec) {
    const ch = byId[spec.char || spec.id];
    if (!ch) { console.warn('unknown character', spec.id); return; }
    const p = buildPuppet(ch, { face: spec.face || 'neutral', prop: spec.prop });
    const lane = spec.lane || 0;
    const a = {
      id: spec.id, ch, p, x: spec.x ?? VW / 2, y: spec.y ?? 0,
      baseY: (spec.groundY ?? this.groundY) + lane * 58, ls: (spec.scale || 1) * (1 + lane * 0.06),
      facing: spec.facing ?? 1, anim: spec.anim || 'idle', animT0: this.time, after: null,
      face: spec.face || 'neutral', talking: false, tx: null, ty: null, rot: 0, hidden: !!spec.hidden,
      phase: Math.random() * 10,
    };
    this.actors.set(a.id, a);
    this.actorsG.append(p.g);
    this.sortActors();
    return a;
  }

  sortActors() {
    [...this.actors.values()].sort((a, b) => a.baseY - b.baseY).forEach((a) => this.actorsG.append(a.p.g));
  }

  setScore(s, animate = true) {
    this.score = { ...s };
    const W = TEAMS.wonderbolt, S = TEAMS.shadowbolt;
    this.scoreEl.hidden = false;
    this.scoreEl.innerHTML = `<div class="sb-team wb"><span class="sb-logo">⚡</span><span class="sb-name">${W.name}</span><span class="sb-pts">${s.wonderbolt}</span></div><div class="sb-mid">${esc(s.label || 'FRIENDSHIP GAMES')}</div><div class="sb-team sbt"><span class="sb-pts">${s.shadowbolt}</span><span class="sb-name">${S.name}</span><span class="sb-logo">⚡</span></div>`;
    if (animate) { this.scoreEl.classList.remove('bump'); void this.scoreEl.offsetWidth; this.scoreEl.classList.add('bump'); }
  }

  // ─────────────────────────── Beats
  async beat(b, g) {
    if (b.par) { await Promise.all(b.par.map((x) => this.beat(x, g))); return; }
    if (b.seq) { for (const x of b.seq) { await this.beat(x, g); if (!this.alive(g)) return; } return; }
    if (b.pa) { this.paLine(b, g); return; }
    if (b.weather) this.setWeather(b.weather);
    if (b.wait) return this.wait(b.wait);
    if (b.call) { b.call(this); return; }
    if (b.sfx) this.audio.sfx(b.sfx);
    if (b.music) this.setMusic(b.music);
    if (b.spawn) this.spawn(b.spawn);
    if (b.remove) { const a = this.actors.get(b.remove); if (a) { a.p.g.remove(); this.actors.delete(b.remove); } }
    if (b.score) this.setScore(b.score);
    if (b.shake) this.cam.shake = b.shake;
    if (b.flash) { this.flashEl.classList.remove('go'); void this.flashEl.offsetWidth; this.flashEl.classList.add('go'); }
    if (b.prop) this.actors.get(b.prop)?.p.setProp(b.p);
    if (b.face && b.f) { const a = this.actors.get(b.face); if (a) a.face = b.f; }
    if (b.turn) this.turn(b.turn, b.dir);
    if (b.anim) {
      const a = this.actors.get(b.anim);
      if (a) this.setAnim(a, b.a, b.then);
      if (b.f && a) a.face = b.f;
      if (b.dur) await this.wait(b.dur);
      return;
    }
    if (b.cam) { this.camTo(b.cam); if (b.cam.dur && b.cam.wait !== false) await this.wait(b.cam.dur); return; }
    if (b.enter) return this.enter(b);
    if (b.exit) return this.exit(b);
    if (b.move) return this.move(b);
    if (b.say) return this.say(b, g);
    if (b.card) return this.card(b.card, b.dur ?? 2400);
    if (b.lower) { this.lower(b.lower); if (b.dur) await this.wait(b.dur); return; }
    if (b.fx) return this.addFx(b);
    if (b.wheel) return this.wheel(b.wheel, g);
    if (b.hide) { const a = this.actors.get(b.hide); if (a) a.hidden = true; }
    if (b.show) { const a = this.actors.get(b.show); if (a) a.hidden = false; }
    if (b.place) { const a = this.actors.get(b.place); if (a) { if (b.x != null) a.x = b.x; if (b.y != null) a.y = b.y; a.tx = a.ty = null; } }
  }

  // Apply a beat's end state instantly (used to start a scene mid-way, e.g. trailer excerpts).
  fastForward(b) {
    if (b.par || b.seq) return (b.par || b.seq).forEach((x) => this.fastForward(x));
    if (b.spawn) this.spawn(b.spawn);
    if (b.enter) { if (!this.actors.has(b.enter)) this.spawn({ id: b.enter, char: b.char, x: b.x, lane: b.lane, face: b.f }); const a = this.actors.get(b.enter); a.x = b.x; a.hidden = false; }
    const a = this.actors.get(b.move || b.anim || b.face || b.prop || b.exit || b.say || b.turn);
    if (b.move && a) { if (b.x != null) { if (!b.keepFacing && b.x !== a.x) a.facing = b.x > a.x ? 1 : -1; a.x = b.x; } if (b.y != null) a.y = b.y; a.anim = b.then && b.then !== false ? b.then : b.keep ? (b.as || a.anim) : b.then === false ? (b.as || a.anim) : 'idle'; }
    if (b.anim && a) a.anim = ONESHOT[b.a] ? (b.a === 'fall' || b.a === 'slip' ? 'lie' : b.then || 'idle') : b.a;
    if ((b.face && b.f) && a) a.face = b.f;
    if (b.say && a && b.f) a.face = b.f;
    if (b.prop && a) a.p.setProp(b.p);
    if (b.exit && a) a.hidden = true;
    if (b.turn) this.turn(b.turn, b.dir);
    if (b.remove) { const r = this.actors.get(b.remove); if (r) { r.p.g.remove(); this.actors.delete(b.remove); } }
    if (b.weather) this.setWeather(b.weather);
    if (b.score) this.setScore(b.score, false);
    if (b.music) this.currentMood = b.music;
    if (b.cam) { const { dur, ...rest } = b.cam; this.camTo(rest); }
  }

  turn(id, dir) {
    const a = this.actors.get(id);
    if (!a) return;
    if (typeof dir === 'string') { const o = this.actors.get(dir); if (o) a.facing = o.x >= a.x ? 1 : -1; }
    else a.facing = dir;
  }

  setAnim(a, name, then) {
    a.anim = name;
    a.animT0 = this.time;
    a.after = then || (ONESHOT[name] ? (name === 'fall' || name === 'slip' ? 'lie' : a.after && !ONESHOT[a.after] ? a.after : 'idle') : null);
    if (name === 'jump' || name === 'bigjump') this.audio.sfx('jump');
    if (name === 'fall' || name === 'slip') { this.audio.sfx('slip'); setTimeout(() => this.audio.sfx('thud'), 350); }
  }

  move(b) {
    const a = this.actors.get(b.move);
    if (!a) return;
    const dur = b.dur ?? 1200;
    if (b.x != null) {
      a.tx = { from: a.x, to: b.x, t0: this.time, dur, e: ease[b.ease || 'inOut'] };
      if (!b.keepFacing && Math.abs(b.x - a.x) > 2) a.facing = b.x > a.x ? 1 : -1;
    }
    if (b.y != null) a.ty = { from: a.y, to: b.y, t0: this.time, dur, e: ease[b.ease || 'inOut'] };
    const prevLoop = LOOPS.has(a.anim) && !['idle'].includes(a.anim) ? a.anim : null;
    const anim = b.as || prevLoop || (Math.abs((b.x ?? a.x) - a.x) / dur > 0.45 ? 'run' : 'walk');
    this.setAnim(a, anim);
    if (b.f) a.face = b.f;
    const p = this.wait(dur).then(() => {
      if (b.then !== false && a.anim === anim) this.setAnim(a, b.then || (b.keep ? anim : 'idle'));
    });
    if (b.noWait) return;
    return p;
  }

  enter(b) {
    const ch = byId[b.char || b.enter];
    if (!this.actors.has(b.enter)) {
      const fromX = b.from === 'right' ? this.cam.x + VW / (2 * this.cam.z) + 150 : this.cam.x - VW / (2 * this.cam.z) - 150;
      this.spawn({ id: b.enter, char: ch.id, x: fromX, lane: b.lane, face: b.f, prop: b.propName });
    }
    return this.move({ move: b.enter, x: b.x, dur: b.dur ?? 1400, as: b.as, then: b.then, noWait: b.noWait, f: b.f });
  }

  exit(b) {
    const a = this.actors.get(b.exit);
    if (!a) return;
    const toX = b.to === 'left' ? this.cam.x - VW / (2 * this.cam.z) - 200 : this.cam.x + VW / (2 * this.cam.z) + 200;
    const p = this.move({ move: b.exit, x: toX, dur: b.dur ?? 1400, as: b.as, then: 'idle' });
    return p?.then(() => { a.hidden = true; });
  }

  camTo(c) {
    const from = { x: this.cam.x, y: this.cam.y, z: this.cam.z };
    let to = { x: c.x ?? from.x, y: c.y ?? from.y, z: c.zoom ?? from.z };
    if (c.on) {
      const ids = [].concat(c.on);
      const as = ids.map((id) => this.actors.get(id)).filter(Boolean);
      if (as.length) {
        to.x = as.reduce((s, a) => s + a.x, 0) / as.length;
        const ay = as.reduce((s, a) => s + a.baseY + a.y, 0) / as.length;
        to.y = c.y ?? (c.zoom && c.zoom > 1 ? ay - 190 : ay - 330);
      }
    }
    this.cam.follow = c.follow === undefined ? (c.on || c.x != null || c.followMax ? null : this.cam.follow) : c.follow;
    this.cam.followY = !!c.followY;
    if (c.followMax) { this.cam.followMax = c.followMax; this.cam.climb = !!c.climb; this.cam.lead = c.lead || 0; }
    else if (c.on || c.x != null || c.follow) this.cam.followMax = null;
    if (this.cam.follow || this.cam.followMax) { to.x = from.x; to.y = from.y; }
    this.cam.tween = c.dur ? { from, to, t0: this.time, dur: c.dur, e: ease.inOut } : null;
    if (!c.dur) Object.assign(this.cam, to);
  }

  async say(b, g) {
    const a = this.actors.get(b.say);
    if (!a) return;
    if (b.to) this.turn(b.say, b.to);
    if (b.f) a.face = b.f;
    if (b.a) this.setAnim(a, b.a, b.then);
    const text = b.text;
    const dur = b.dur ?? clamp(900 + text.length * 48, 1500, 5200);
    const bubble = el('div', { class: `bubble ${b.shout ? 'shout' : ''} ${b.whisper ? 'whisper' : ''} ${b.thought ? 'thought' : ''}` }, el('b', {}, a.ch.short || a.ch.name.split(' ')[0]), el('span', {}, text));
    this.overlay.append(bubble);
    const entry = { a, el: bubble };
    this.bubbles = this.bubbles || [];
    this.bubbles.push(entry);
    a.talking = !b.thought;
    if (this.cc) { this.caption.hidden = false; this.caption.innerHTML = `<b>${esc(a.ch.short || a.ch.name)}:</b> ${esc(text)}`; }
    this.opts.onLine?.(a.id, text);
    await this.wait(dur);
    a.talking = false;
    bubble.classList.add('out');
    setTimeout(() => bubble.remove(), 250);
    this.bubbles = this.bubbles.filter((x) => x !== entry);
    if (this.alive(g) && this.caption.innerHTML.includes(esc(text))) this.caption.hidden = true;
  }

  clearBubbles() {
    (this.bubbles || []).forEach((b) => b.el.remove());
    this.bubbles = [];
    this.caption.hidden = true;
    for (const a of this.actors.values()) a.talking = false;
  }

  async paLine({ pa, text, dur }, g) {
    const who = byId[pa];
    const id = (this.paSeq = (this.paSeq || 0) + 1);
    this.paEl.hidden = false;
    this.paEl.className = 'pa-line show';
    this.paEl.innerHTML = `<span class="pa-mic">${pa === 'hale' ? '🚩' : '🎙️'}</span><b>${esc(who ? who.name.replace(/^Referee /, 'Ref. ') : pa)}</b><span>${esc(text)}</span>`;
    if (this.cc) { this.caption.hidden = false; this.caption.innerHTML = `<b>${esc(who?.short || who?.name || pa)} (PA):</b> ${esc(text)}`; }
    await this.wait(dur || 2200);
    if (this.paSeq === id && this.alive(g)) { this.paEl.classList.remove('show'); setTimeout(() => { if (this.paSeq === id) this.paEl.hidden = true; }, 250); }
  }

  setWeather(w) {
    if (w === 'rain' && !this.frontG.querySelector('.rain')) {
      const n = svgEl('g');
      n.innerHTML = rainLayer();
      this.frontG.append(n);
      this.svg.classList.add('rainy');
    }
  }

  async card({ title, sub, icon, team, big }, dur) {
    const t = team ? TEAMS[team] : null;
    this.cardEl.hidden = false;
    this.cardEl.className = 'bcast-card show' + (big ? ' big' : '') + (team ? ` t-${team}` : '');
    this.cardEl.innerHTML = `${icon ? `<div class="bc-icon">${icon}</div>` : ''}<div class="bc-text"><div class="bc-title">${esc(title)}</div>${sub ? `<div class="bc-sub">${esc(sub)}</div>` : ''}</div>`;
    if (t) this.cardEl.style.setProperty('--tc', t.colors.main);
    await this.wait(dur);
    this.cardEl.classList.remove('show');
    await this.wait(300);
    this.cardEl.hidden = true;
  }

  lower({ name, sub, team }) {
    this.lowerEl.hidden = false;
    this.lowerEl.className = `lower-third show ${team ? 't-' + team : ''}`;
    this.lowerEl.innerHTML = `<div class="lt-name">${esc(name)}</div>${sub ? `<div class="lt-sub">${esc(sub)}</div>` : ''}`;
  }

  async wheel({ options, index, title }, g) {
    const n = options.length;
    const box = el('div', { class: 'wheel-wrap' });
    const colors = ['#1f86ff', '#6c3bd1', '#ffd23f', '#ff4fa3', '#35e0c1', '#ff7b00', '#3aa0ff', '#9b59b6'];
    let slices = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      slices += `<path d="M0,0 L${Math.cos(a0) * 200},${Math.sin(a0) * 200} A200,200 0 ${large} 1 ${Math.cos(a1) * 200},${Math.sin(a1) * 200} Z" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="4"/>`;
      const am = (a0 + a1) / 2;
      slices += `<g transform="translate(${Math.cos(am) * 128},${Math.sin(am) * 128}) rotate(${(am * 180) / Math.PI + 90})"><text text-anchor="middle" font-size="44" y="0">${options[i].icon}</text><text text-anchor="middle" font-size="17" font-family="Baloo 2" font-weight="800" fill="#fff" y="26">${esc(options[i].short || options[i].name).slice(0, 14)}</text></g>`;
    }
    box.innerHTML = `<div class="wheel-title">${esc(title || 'THE LIGHTNING WHEEL')}</div><svg viewBox="-220 -240 440 460" class="wheel-svg"><g class="wheel-rot">${slices}<circle r="34" fill="#fff" stroke="#ffd23f" stroke-width="8"/><text y="12" text-anchor="middle" font-size="34">⚡</text></g><path d="M-18,-236 L18,-236 L0,-196 Z" fill="#ff4fa3" stroke="#fff" stroke-width="4"/></svg><div class="wheel-result"></div>`;
    this.hud.append(box);
    const rot = box.querySelector('.wheel-rot');
    const target = 360 * 5 + (360 - ((index + 0.5) / n) * 360);
    const t0 = this.time, dur = 3800;
    let lastTick = 0;
    await new Promise((resolve) => {
      const step = () => {
        if (!this.alive(g)) return resolve();
        const p = clamp((this.time - t0) / dur, 0, 1);
        const r = target * ease.out(p);
        rot.setAttribute('transform', `rotate(${r})`);
        const tick = Math.floor(r / (360 / n));
        if (tick !== lastTick) { lastTick = tick; this.audio.sfx('tick'); }
        if (p >= 1) return resolve();
        requestAnimationFrame(step);
      };
      step();
    });
    if (!this.alive(g)) { box.remove(); return; }
    box.querySelector('.wheel-result').textContent = `${options[index].icon} ${options[index].name}`;
    box.classList.add('landed');
    this.audio.sfx('fanfare');
    await this.wait(1700);
    box.classList.add('out');
    await this.wait(300);
    box.remove();
  }

  // ─────────────────────────── FX
  addFx(b) {
    let x, y;
    const a = typeof b.at === 'string' ? this.actors.get(b.at) : null;
    if (a) { x = a.x; y = a.baseY + a.y - (b.head ? 330 * a.p.scale * a.ls : 60); }
    else if (b.at) { x = b.at.x; y = b.at.y; }
    else { x = this.cam.x; y = this.cam.y; }
    const kind = b.fx;
    const g = svgEl('g');
    this.fxG.append(g);
    const f = { kind, g, t0: this.time, dur: b.dur || 1200, x, y, parts: [] };
    const R = Math.random;
    if (kind === 'confetti') {
      this.audio.sfx('pop');
      const cols = b.team === 'shadowbolt' ? ['#6c3bd1', '#ff4fa3', '#35e0c1', '#fff'] : b.team === 'wonderbolt' ? ['#1f86ff', '#ffd23f', '#fff', '#63c1ff'] : ['#1f86ff', '#ffd23f', '#6c3bd1', '#ff4fa3', '#35e0c1'];
      f.dur = b.dur || 2600;
      for (let i = 0; i < 60; i++) {
        const r = svgEl('rect', { width: 14, height: 8, fill: cols[i % cols.length] });
        g.append(r);
        f.parts.push({ n: r, x: x + (R() - 0.5) * 900, y: y - 500 - R() * 300, vx: (R() - 0.5) * 120, vy: 150 + R() * 250, r: R() * 360, vr: (R() - 0.5) * 720 });
      }
    } else if (kind === 'splash') {
      this.audio.sfx('splash');
      for (let i = 0; i < 16; i++) {
        const c = svgEl('circle', { r: 6 + R() * 10, fill: '#bfe9ff' });
        g.append(c);
        f.parts.push({ n: c, x, y, vx: (R() - 0.5) * 500, vy: -300 - R() * 400, grav: 1200 });
      }
    } else if (kind === 'dust') {
      for (let i = 0; i < 10; i++) {
        const c = svgEl('circle', { r: 14 + R() * 16, fill: '#d7ccc8', opacity: 0.8 });
        g.append(c);
        f.parts.push({ n: c, x: x + (R() - 0.5) * 60, y: y + 40, vx: (R() - 0.5) * 200, vy: -40 - R() * 60, grow: 1 });
      }
    } else if (kind === 'sparkle') {
      this.audio.sfx('sparkle');
      for (let i = 0; i < 12; i++) {
        const s = svgEl('path', { d: 'M0,-14 L4,-4 L14,0 L4,4 L0,14 L-4,4 L-14,0 L-4,-4 Z', fill: i % 2 ? '#fff36b' : '#ffffff' });
        g.append(s);
        f.parts.push({ n: s, x: x + (R() - 0.5) * 200, y: y - 150 - R() * 200, vx: 0, vy: -30, spin: 1 });
      }
    } else if (kind === 'stars') {
      f.dur = b.dur || 1800;
      for (let i = 0; i < 4; i++) {
        const s = svgEl('text', { 'font-size': 34, 'text-anchor': 'middle' });
        s.textContent = '★';
        s.setAttribute('fill', '#ffd23f');
        g.append(s);
        f.parts.push({ n: s, orbit: i * (Math.PI / 2), a });
      }
    } else if (kind === 'speed') {
      for (let i = 0; i < 8; i++) {
        const l = svgEl('path', { d: 'M0,0 h-120', stroke: '#fff', 'stroke-width': 5, opacity: 0.7, 'stroke-linecap': 'round' });
        g.append(l);
        f.parts.push({ n: l, a, dy: -40 - i * 36, dx: -60 - R() * 80 });
      }
    } else if (kind === 'arrow') {
      this.audio.sfx('twang');
      const to = b.to;
      const ar = svgEl('g');
      ar.innerHTML = `<path d="M-40,0 L30,0" stroke="#6d4c41" stroke-width="5"/><path d="M30,-8 L46,0 L30,8 Z" fill="#555"/><path d="M-40,0 l-10,-10 M-40,0 l-10,10" stroke="#ff4fa3" stroke-width="4"/>`;
      g.append(ar);
      f.dur = b.dur || 600;
      f.parts.push({ n: ar, from: { x, y: y - 200 }, to, arrow: true });
      setTimeout(() => this.audio.sfx('thunk'), f.dur);
    } else if (kind === 'hit') {
      const t = svgEl('text', { 'font-size': 64, 'text-anchor': 'middle', 'font-family': 'Baloo 2', 'font-weight': 800, fill: b.color || '#ffd23f', stroke: '#1a1030', 'stroke-width': 3 });
      t.textContent = b.text;
      g.append(t);
      f.parts.push({ n: t, x, y, vx: 0, vy: -120 });
    } else if (kind === 'heart') {
      for (let i = 0; i < 5; i++) {
        const h = svgEl('text', { 'font-size': 36, 'text-anchor': 'middle' });
        h.textContent = '♥';
        h.setAttribute('fill', '#ff6b9d');
        g.append(h);
        f.parts.push({ n: h, x: x + (R() - 0.5) * 80, y: y - 280, vx: (R() - 0.5) * 40, vy: -60 - R() * 40 });
      }
    } else if (kind === 'anger') {
      const t = svgEl('text', { 'font-size': 46, 'text-anchor': 'middle' });
      t.textContent = '💢';
      g.append(t);
      f.parts.push({ n: t, a, head: true });
    } else if (kind === 'sweat' || kind === 'question' || kind === 'exclaim' || kind === 'music' || kind === 'idea') {
      const t = svgEl('text', { 'font-size': 56, 'text-anchor': 'middle', 'font-family': 'Baloo 2', 'font-weight': 800, fill: '#fff', stroke: '#1a1030', 'stroke-width': 3 });
      t.textContent = { sweat: '💧', question: '?', exclaim: '!', music: '♪', idea: '💡' }[kind];
      g.append(t);
      f.parts.push({ n: t, a, head: true });
    }
    this.fx.push(f);
    if (b.wait) return this.wait(f.dur);
  }

  stepFx(dt) {
    const now = this.time;
    this.fx = this.fx.filter((f) => {
      const p = (now - f.t0) / f.dur;
      if (p >= 1) { f.g.remove(); return false; }
      for (const q of f.parts) {
        if (q.arrow) {
          const x = lerp(q.from.x, q.to.x, p), y = lerp(q.from.y, q.to.y, p) - Math.sin(p * Math.PI) * 60;
          q.n.setAttribute('transform', `translate(${x},${y}) rotate(${(Math.atan2(q.to.y - q.from.y, q.to.x - q.from.x) * 180) / Math.PI})`);
          continue;
        }
        if (q.orbit != null && q.a) {
          const hx = q.a.x, hy = q.a.baseY + q.a.y - 360 * q.a.p.scale * q.a.ls;
          const ang = q.orbit + now / 200;
          q.n.setAttribute('x', hx + Math.cos(ang) * 60);
          q.n.setAttribute('y', hy + Math.sin(ang) * 16);
          continue;
        }
        if (q.head && q.a) {
          q.n.setAttribute('x', q.a.x + 60 * q.a.facing);
          q.n.setAttribute('y', q.a.baseY + q.a.y - 380 * q.a.p.scale * q.a.ls - p * 20);
          q.n.setAttribute('opacity', 1 - Math.max(0, p - 0.7) / 0.3);
          continue;
        }
        if (q.dy != null && q.a) {
          q.n.setAttribute('transform', `translate(${q.a.x + q.dx * q.a.facing - (p * 60) * q.a.facing},${q.a.baseY + q.a.y + q.dy}) scale(${q.a.facing},1)`);
          q.n.setAttribute('opacity', 0.7 * (1 - p));
          continue;
        }
        q.vy += (q.grav || 0) * dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.vr) q.r += q.vr * dt;
        const s = q.grow ? 1 + p * 1.5 : 1;
        q.n.setAttribute('transform', `translate(${q.x},${q.y}) rotate(${q.r || (q.spin ? now / 3 : 0)}) scale(${s})`);
        q.n.setAttribute('opacity', 1 - p);
      }
      return true;
    });
  }

  // ─────────────────────────── Frame loop
  frame = (now) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.playing) {
      this.time += dt * 1000 * this.speed;
      if (this.waiters.length) {
        const ready = this.waiters.filter((w) => w.until <= this.time);
        if (ready.length) {
          this.waiters = this.waiters.filter((w) => w.until > this.time);
          ready.forEach((w) => w.resolve());
        }
      }
      this.stepFx(dt);
    }
    this.update();
    this.raf = requestAnimationFrame(this.frame);
  };

  update() {
    const t = this.time;
    for (const a of this.actors.values()) {
      if (a.tx) { const p = clamp((t - a.tx.t0) / a.tx.dur, 0, 1); a.x = lerp(a.tx.from, a.tx.to, a.tx.e(p)); if (p >= 1) a.tx = null; }
      if (a.ty) { const p = clamp((t - a.ty.t0) / a.ty.dur, 0, 1); a.y = lerp(a.ty.from, a.ty.to, a.ty.e(p)); if (p >= 1) a.ty = null; }
      const os = ONESHOT[a.anim];
      if (os && t - a.animT0 >= os) { a.anim = a.after || 'idle'; a.animT0 = t; }
      this.pose(a, t);
    }
    // Camera
    const c = this.cam;
    if (c.tween) {
      const p = clamp((t - c.tween.t0) / c.tween.dur, 0, 1), e = c.tween.e(p);
      c.x = lerp(c.tween.from.x, c.tween.to.x, e); c.y = lerp(c.tween.from.y, c.tween.to.y, e); c.z = lerp(c.tween.from.z, c.tween.to.z, e);
      if (p >= 1) c.tween = null;
    }
    if (c.followMax) {
      const as = c.followMax.map((id) => this.actors.get(id)).filter((a) => a && !a.hidden);
      if (as.length) {
        const lead = as.reduce((m, a) => (c.climb ? (a.y < m.y ? a : m) : (a.x > m.x ? a : m)), as[0]);
        if (c.climb) { const ty = lead.baseY + lead.y - 200; c.y += (ty - c.y) * 0.08; c.x += (VW / 2 - c.x) * 0.05; }
        else { const tx = lead.x + (c.lead || 0) * 0.6; c.x += (tx - c.x) * 0.09; const ty = as.reduce((s, a) => s + a.baseY, 0) / as.length - 330 / c.z; c.y += (ty - c.y) * 0.05; }
      }
    } else if (c.follow) {
      const ids = [].concat(c.follow);
      const as = ids.map((id) => this.actors.get(id)).filter(Boolean);
      if (as.length) {
        const tx = as.reduce((s, a) => s + a.x, 0) / as.length + (c.lead || 0);
        c.x += (tx - c.x) * 0.08;
        if (c.followY) { const ty = as.reduce((s, a) => s + a.baseY + a.y, 0) / as.length - 180; c.y += (ty - c.y) * 0.08; }
      }
    }
    const hw = VW / (2 * c.z), hh = VH / (2 * c.z);
    c.x = clamp(c.x, hw, Math.max(hw, (this.worldW || VW) - hw));
    c.y = clamp(c.y, this.bg?.climb ? hh : hh - 200, Math.max(hh, (this.worldH || VH) - hh));
    let sx = 0, sy = 0;
    if (c.shake > 0) { sx = (Math.random() - 0.5) * c.shake * 20; sy = (Math.random() - 0.5) * c.shake * 20; c.shake = Math.max(0, c.shake - 0.04); }
    this.worldG.setAttribute('transform', `translate(${VW / 2 - c.x * c.z + sx},${VH / 2 - c.y * c.z + sy}) scale(${c.z})`);
    if (this.layerNodes) for (const L of this.layerNodes) if (L.f !== 1) L.n.setAttribute('transform', `translate(${(c.x - VW / 2) * (1 - L.f)},${(c.y - VH / 2) * (1 - L.f)})`);
    this.positionBubbles();
  }

  positionBubbles() {
    if (!this.bubbles?.length) return;
    const rect = this.frame_.getBoundingClientRect();
    // preserveAspectRatio slice: compute scale & offset
    const s = Math.max(rect.width / VW, rect.height / VH);
    const ox = (rect.width - VW * s) / 2, oy = (rect.height - VH * s) / 2;
    const c = this.cam;
    const used = [];
    let sb = null;
    if (!this.scoreEl.hidden) { const r = this.scoreEl.getBoundingClientRect(); sb = { l: r.left - rect.left, r: r.right - rect.left, b: r.bottom - rect.top }; }
    for (const b of this.bubbles) {
      const a = b.a;
      const hx = a.x, hy = a.baseY + a.y - 360 * a.p.scale * a.ls;
      let sx = (VW / 2 + (hx - c.x) * c.z) * s + ox;
      let sy = (VH / 2 + (hy - c.y) * c.z) * s + oy;
      const w = b.el.offsetWidth, h = b.el.offsetHeight;
      let left = clamp(sx - w / 2, 8, rect.width - w - 8);
      let top = clamp(sy - h - 18, 8, rect.height - h - 60);
      for (const u of used) if (Math.abs(u.left - left) < w * 0.8 && Math.abs(u.top - top) < h) top = Math.max(8, u.top - h - 8);
      if (sb && left < sb.r && left + w > sb.l && top < sb.b + 6) top = sb.b + 6;
      used.push({ left, top });
      b.el.style.transform = `translate(${left}px,${top}px)`;
      b.el.style.setProperty('--tail', `${clamp(sx - left, 16, w - 16)}px`);
    }
  }

  pose(a, t) {
    const p = a.p;
    const tt = (t - a.animT0) / 1000;
    const T = t / 1000 + a.phase;
    let bob = 0, rot = 0, dx = 0, sink = 0;
    let arF = 6, arB = -6, lgF = 0, lgB = 0, hd = 0;
    const s = (f) => Math.sin(T * f);
    switch (a.anim) {
      case 'idle': arF = 6 + s(1.6) * 2; arB = -6 - s(1.6) * 2; bob = s(2) * 1.5; if (a.talking) { arF = -25 + s(5) * 18; hd = s(3) * 3; } break;
      case 'walk': { const w = s(8); lgF = 24 * w; lgB = -24 * w; arF = -22 * w; arB = 22 * w; bob = -Math.abs(w) * 6; break; }
      case 'run': { const w = s(15); lgF = 46 * w; lgB = -46 * w; arF = -55 * w - 20; arB = 55 * w - 20; bob = -Math.abs(w) * 14; rot = 9; break; }
      case 'sneak': { const w = s(5); lgF = 16 * w; lgB = -16 * w; arF = -50; arB = -40; sink = 18; rot = 10; break; }
      case 'skate': { const w = s(5); lgF = 8 + 26 * Math.max(0, w); lgB = -8 - 26 * Math.max(0, -w); arF = -35 * w; arB = 35 * w; rot = 14; bob = -Math.abs(w) * 4; break; }
      case 'scooter': lgF = 4; lgB = -8 - 24 * Math.max(0, s(4)); arF = -78; arB = -70; rot = 6; break;
      case 'board': lgF = 20; lgB = -20; arF = -70 + s(3) * 10; arB = 70 - s(3) * 10; rot = 3; bob = s(4) * 2; break;
      case 'bike': lgF = 20 + 32 * s(10); lgB = 20 + 32 * s(10 + Math.PI); arF = -72; arB = -68; rot = 16; sink = -34; break;
      case 'swim': { const w = (T * 300) % 360; arF = -w; arB = -w - 180; lgF = 12 * s(18); lgB = -12 * s(18); rot = 82; dx = -150; sink = 44 + s(4) * 4; break; }
      case 'float': rot = 0; sink = 150; arF = -60 + s(4) * 20; arB = 60 - s(4) * 20; bob = s(2) * 6; break;
      case 'kayak': lgF = -90; lgB = -90; arF = -80 + 32 * s(4); arB = -80 - 32 * s(4); sink = 95; bob = s(3) * 4; rot = s(2) * 3; break;
      case 'climb': { const w = s(5); arF = -165 + 22 * w; arB = -148 - 22 * w; lgF = -34 + 22 * w; lgB = 10 - 22 * w; rot = -4; break; }
      case 'hang': arF = -172; arB = -168; lgF = 8 * s(2); lgB = -8 * s(2); break;
      case 'zip': arF = -168; arB = -172; lgF = -30; lgB = -10; rot = 8; bob = s(6) * 3; break;
      case 'balance': arF = -88 + s(3) * 12; arB = 88 - s(3) * 12; rot = s(2.2) * 6; lgF = 10 * s(4); lgB = -10 * s(4); break;
      case 'jump': case 'bigjump': { const d = a.anim === 'jump' ? 0.75 : 1.1; const q = clamp(tt / d, 0, 1); bob = -Math.sin(q * Math.PI) * (a.anim === 'jump' ? 160 : 260); lgF = -44 * Math.sin(q * Math.PI); lgB = 30 * Math.sin(q * Math.PI); arF = -150; arB = 150; break; }
      case 'hop': bob = -Math.abs(s(6)) * 60; arF = -120 + s(12) * 20; arB = 120 - s(12) * 20; lgF = -20 * Math.abs(s(6)); break;
      case 'fall': case 'slip': { const q = clamp(tt / 0.45, 0, 1); rot = -86 * ease.in(q); arF = -140; arB = 140; lgF = -30; break; }
      case 'lie': rot = -86; arF = -150; arB = 150; lgF = -12; lgB = 6; break;
      case 'getup': { const q = clamp(tt / 0.55, 0, 1); rot = -86 * (1 - ease.out(q)); arF = -60; arB = 60; break; }
      case 'trip': { const q = clamp(tt / 0.65, 0, 1); rot = Math.sin(q * Math.PI) * 30; arF = -120; arB = -90; lgB = -40 * Math.sin(q * Math.PI); break; }
      case 'cheer': arF = -150 + s(9) * 16; arB = 150 - s(9) * 16; bob = -Math.abs(s(8)) * 20; break;
      case 'celebrate': bob = -Math.abs(s(5.5)) * 90; arF = -160 + s(11) * 10; arB = 160 - s(11) * 10; lgF = -30 * Math.abs(s(5.5)); lgB = 20 * Math.abs(s(5.5)); break;
      case 'fistpump': arF = s(10) > 0 ? -160 : -70; arB = 10; bob = -Math.abs(s(10)) * 8; break;
      case 'sad': hd = 16; arF = 3; arB = -3; rot = 5; bob = s(1.2) * 1; break;
      case 'angry': case 'crossed': arF = -58; arB = -48; hd = -4; bob = a.anim === 'angry' ? -Math.abs(s(12)) * 3 : 0; break;
      case 'hips': arF = -28; arB = 28; hd = -3; break;
      case 'point': arF = -96; arB = 4; break;
      case 'wave': arF = -150 + s(10) * 22; break;
      case 'clap': arF = -72 + s(16) * 16; arB = -62 - s(16) * 16; break;
      case 'shrug': arF = -42; arB = 42; hd = s(2) * 6; bob = -6; break;
      case 'facepalm': arF = -158; arB = -4; hd = 12; break;
      case 'think': arF = -146; arB = -40; hd = -8; break;
      case 'reach': arF = -62; arB = -44; rot = 26; break;
      case 'pull': arF = -84; arB = -80; rot = -14 + s(6) * 4; lgF = -20; break;
      case 'bow': arF = -90; arB = -92 - Math.min(1, tt * 2) * 14; hd = -2; break;
      case 'shoot': arF = -90; arB = -70; break;
      case 'sit': lgF = -88; lgB = -84; sink = 58; arF = -20; arB = 10; break;
      case 'crouch': lgF = -50; lgB = 30; sink = 36; arF = -40; arB = -30; rot = 12; break;
      case 'nervous': arF = -30 + s(9) * 10; arB = -30 - s(9) * 10; hd = s(7) * 4; bob = s(14) * 2; break;
      case 'carry': arF = -82; arB = -78; bob = s(8) * 3; lgF = 20 * s(8); lgB = -20 * s(8); break;
      case 'hug': arF = -86; arB = -80; rot = 6; break;
      case 'lookup': hd = -18; arF = 4; arB = -4; break;
      case 'laugh': arF = -30 + s(20) * 6; arB = -30 - s(20) * 6; hd = -10 + s(20) * 3; bob = s(20) * 4; break;
      case 'stretch': arF = -172; arB = 172; bob = -8 - s(1.5) * 6; break;
      case 'dizzy': hd = s(6) * 12; rot = s(3) * 6; arF = -20; arB = 20; break;
      case 'highfive': arF = -148; arB = -10; break;
      case 'shoot2': arF = -90; arB = -80; break;
      default: break;
    }
    const P = p.parts;
    if (p.creature) {
      bob = ['run', 'walk', 'hop', 'celebrate', 'cheer'].includes(a.anim) ? -Math.abs(s(10)) * 22 : s(2) * 3;
      if (P.body) P.body.setAttribute('transform', `translate(0,${bob})`);
    } else {
      P.armF.setAttribute('transform', `translate(36,${RIG.SHOULDER_Y}) rotate(${arF})`);
      P.armB.setAttribute('transform', `translate(-36,${RIG.SHOULDER_Y}) rotate(${arB})`);
      P.legF.setAttribute('transform', `translate(16,${RIG.HIP_Y}) rotate(${lgF})`);
      P.legB.setAttribute('transform', `translate(-16,${RIG.HIP_Y}) rotate(${lgB})`);
      P.head.setAttribute('transform', `translate(0,${RIG.NECK_Y}) rotate(${hd})`);
      P.shadow.setAttribute('opacity', a.anim === 'swim' || a.anim === 'kayak' || a.anim === 'float' ? 0 : clamp(0.2 + bob / 600, 0.05, 0.2));
      // blink
      const blink = !a.talking && (T % 3.7) < 0.12 && !['happy', 'laugh', 'closed', 'sad-closed'].includes(a.face);
      p.setFace(blink ? 'closed' : a.face, a.talking && Math.floor(t / 110) % 2 === 0);
    }
    const bobY = p.creature ? 0 : bob;
    const f = a.facing;
    a.p.g.setAttribute('transform', `translate(${a.x + dx * f},${a.baseY + a.y + sink + bobY}) scale(${f * a.ls},${a.ls}) rotate(${rot})`);
    a.p.g.style.display = a.hidden ? 'none' : '';
  }
}
