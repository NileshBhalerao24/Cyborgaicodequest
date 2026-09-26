// Mini-game framework: fixed-resolution canvas, keyboard + touch input, sprites from the
// character rig, and a common result shape { score, stars, won, summary }.

import { byId } from '../data/characters.js';
import { buildPuppet, RIG } from '../render/art.js';
import { sfx } from '../engine/audio.js';

export const W = 960, H = 540;

// ── Sprites: rasterize the SVG puppet in a given pose (cached).
const spriteCache = new Map();
const POSES = {
  idle: { aF: 6, aB: -6, lF: 0, lB: 0 },
  run1: { aF: -60, aB: 40, lF: 40, lB: -40, rot: 8 },
  run2: { aF: 40, aB: -60, lF: -40, lB: 40, rot: 8 },
  jump: { aF: -150, aB: 150, lF: -40, lB: 30 },
  skate1: { aF: -35, aB: 35, lF: 30, lB: -10, rot: 14 },
  skate2: { aF: 35, aB: -35, lF: 10, lB: -30, rot: 14 },
  climb1: { aF: -170, aB: -140, lF: -40, lB: 10 },
  climb2: { aF: -140, aB: -170, lF: 10, lB: -40 },
  swim1: { aF: -170, aB: 10, lF: 12, lB: -12, rot: 84, dx: -160, dy: -10 },
  swim2: { aF: 10, aB: -170, lF: -12, lB: 12, rot: 84, dx: -160, dy: -10 },
  bow: { aF: -90, aB: -104, lF: 0, lB: 0 },
  cheer: { aF: -150, aB: 150, lF: 0, lB: 0 },
  sad: { aF: 3, aB: -3, lF: 0, lB: 0, head: 16 },
  fall: { aF: -140, aB: 140, lF: -30, lB: 0, rot: -80, dx: 160 },
  scooter: { aF: -78, aB: -70, lF: 4, lB: -20, rot: 6 },
};

export function sprite(id, pose = 'idle', { face = 'determined', prop = null } = {}) {
  const key = `${id}|${pose}|${face}|${prop}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const ch = byId[id];
  const p = buildPuppet(ch, { face, prop });
  const P = POSES[pose] || POSES.idle;
  if (!p.creature) {
    const set = (n, base, r) => n.setAttribute('transform', `${base} rotate(${r})`);
    set(p.parts.armF, `translate(36,${RIG.SHOULDER_Y})`, P.aF);
    set(p.parts.armB, `translate(-36,${RIG.SHOULDER_Y})`, P.aB);
    set(p.parts.legF, `translate(16,${RIG.HIP_Y})`, P.lF);
    set(p.parts.legB, `translate(-16,${RIG.HIP_Y})`, P.lB);
    if (P.head) p.parts.head.setAttribute('transform', `translate(0,${RIG.NECK_Y}) rotate(${P.head})`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-220 -440 440 480" width="440" height="480"><g transform="translate(${P.dx || 0},${P.dy || 0}) rotate(${P.rot || 0})">${p.g.innerHTML}</g></svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  spriteCache.set(key, img);
  return img;
}

// Draw a sprite with feet at (x, y). `h` = on-screen height of the 480-unit sprite box.
export function drawSprite(ctx, img, x, y, h = 150, flip = false) {
  if (!img.complete) return;
  const w = h * (440 / 480);
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h * (440 / 480), w, h);
  ctx.restore();
}

export class Game {
  constructor(canvas, { char, rival, onEnd, touch }) {
    this.canvas = canvas;
    canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.char = byId[char];
    this.rival = byId[rival];
    this.onEnd = onEnd;
    this.keys = new Set();
    this.pressed = new Set();
    this.taps = [];
    this.t = 0;
    this.over = false;
    this.countdown = 3;
    this.onKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onPointer = (e) => {
      const r = canvas.getBoundingClientRect();
      this.taps.push({ x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointerdown', this.onPointer);
    if (touch) touch.forEach((b) => {
      const down = (e) => { e.preventDefault(); this.pressed.add(b.key); this.keys.add(b.key); };
      const up = () => this.keys.delete(b.key);
      b.el.addEventListener('pointerdown', down);
      b.el.addEventListener('pointerup', up);
      b.el.addEventListener('pointerleave', up);
    });
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  hit(code) { return this.pressed.has(code); }
  sfx(n) { sfx(n); }

  loop = (now) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.over) {
      if (this.countdown > 0) {
        const before = Math.ceil(this.countdown);
        this.countdown -= dt;
        if (Math.ceil(this.countdown) !== before) this.sfx(this.countdown <= 0 ? 'go' : 'beep');
        this.pressed.clear(); this.taps = [];
      } else {
        this.t += dt;
        this.update(dt);
      }
    }
    this.draw();
    if (this.countdown > 0) this.drawCountdown();
    this.pressed.clear();
    this.taps = [];
    this.raf = requestAnimationFrame(this.loop);
  };

  drawCountdown() {
    const c = this.ctx;
    c.fillStyle = 'rgba(13,15,43,0.45)'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.font = '800 120px "Baloo 2", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(Math.ceil(this.countdown), W / 2, H / 2);
    c.font = '800 24px "Baloo 2", sans-serif';
    c.fillText(this.help || '', W / 2, H / 2 + 90);
  }

  finish(result) {
    if (this.over) return;
    this.over = true;
    this.sfx(result.won ? 'fanfare' : 'sadtrombone');
    setTimeout(() => this.onEnd(result), 700);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
  }

  // Helpers
  text(s, x, y, { size = 22, color = '#fff', align = 'left', weight = 800 } = {}) {
    const c = this.ctx;
    c.font = `${weight} ${size}px "Baloo 2", "Nunito", sans-serif`;
    c.textAlign = align; c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillText(s, x + 2, y + 2);
    c.fillStyle = color; c.fillText(s, x, y);
  }
  bar(x, y, w, h, frac, color, label) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.4)'; round(c, x, y, w, h, h / 2); c.fill();
    c.fillStyle = color; round(c, x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2); c.fill();
    if (label) this.text(label, x, y - 6, { size: 15 });
  }
  sky(top, bottom) {
    const g = this.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    this.ctx.fillStyle = g; this.ctx.fillRect(0, 0, W, H);
  }
}

export function round(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export const stat = (ch, k) => (ch?.stats?.[k] ?? 6);
