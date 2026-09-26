// Inline Skating Sprint — side-scrolling race. Tap → to push, Space/↑ to jump cones, grab bolts.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';

export class Skating extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = 'Tap → to push · Space/↑ to jump';
    this.length = 7000;
    this.x = 0; this.v = 260; this.vy = 0; this.y = 0;
    this.rx = 0; this.rv = 0;
    this.bolts = 0; this.stumble = 0;
    this.maxV = 420 + stat(this.char, 'speed') * 22;
    this.rMax = 400 + stat(this.rival, 'speed') * 20 + stat(this.rival, 'agility') * 6;
    this.items = [];
    let x = 700;
    while (x < this.length - 300) {
      const r = Math.random();
      this.items.push({ x, type: r < 0.55 ? 'cone' : r < 0.75 ? 'ramp' : 'bolt', y: 0, got: false });
      if (Math.random() < 0.5) this.items.push({ x: x + 90, type: 'bolt', y: 120, got: false });
      x += 320 + Math.random() * 380;
    }
    this.rivalHits = 0;
  }
  update(dt) {
    const push = this.hit('ArrowRight') || this.taps.some((t) => t.x > W / 2);
    const jump = this.hit('Space') || this.hit('ArrowUp') || this.taps.some((t) => t.x <= W / 2);
    if (push && this.stumble <= 0) { this.v = Math.min(this.maxV, this.v + 42); this.sfx('step'); }
    if (jump && this.y === 0 && this.stumble <= 0) { this.vy = 720; this.sfx('jump'); }
    this.v = Math.max(200, this.v - 60 * dt);
    if (this.stumble > 0) { this.stumble -= dt; this.v = Math.min(this.v, 150); }
    if (this.y > 0 || this.vy > 0) { this.vy -= 1900 * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) { this.vy = 0; this.sfx('land'); } }
    this.x += this.v * dt;
    for (const it of this.items) {
      if (it.got || Math.abs(it.x - this.x) > 30) continue;
      if (it.type === 'cone' && this.y < 50) { it.got = true; this.stumble = 0.7; this.sfx('crash'); }
      else if (it.type === 'ramp' && this.y < 20) { it.got = true; this.vy = 950; this.v = Math.min(this.maxV + 80, this.v + 90); this.sfx('boing'); }
      else if (it.type === 'bolt' && Math.abs(this.y - it.y) < 90) { it.got = true; this.bolts++; this.v = Math.min(this.maxV + 60, this.v + 50); this.sfx('coin'); }
    }
    // Rival: accelerates toward its max with small random stumbles.
    this.rv += (this.rMax * (0.86 + 0.14 * Math.sin(this.t * 0.7)) - this.rv) * dt * 0.8;
    if (Math.random() < dt * 0.12) this.rv *= 0.5;
    this.rx += this.rv * dt;
    if (this.x >= this.length || this.rx >= this.length + 400) {
      const won = this.x >= this.length && this.x >= this.rx;
      const score = Math.max(0, Math.round((won ? 1500 : 600) + this.bolts * 60 - this.t * 12));
      this.finish({ won, score, stars: won ? (this.bolts >= 10 ? 3 : 2) : 1, summary: `${won ? 'You beat' : 'Beaten by'} ${this.rival.short} · ${this.bolts} bolts · ${this.t.toFixed(1)}s` });
    }
  }
  draw() {
    const c = this.ctx;
    this.sky('#7fd0ff', '#dff4ff');
    const cam = this.x - 260;
    // parallax hills
    c.fillStyle = '#a5d6a7';
    for (let i = -1; i < 6; i++) { const bx = i * 400 - ((cam * 0.3) % 400); c.beginPath(); c.ellipse(bx, 400, 260, 120, 0, Math.PI, 0); c.fill(); }
    c.fillStyle = '#9e9e9e'; c.fillRect(0, 420, W, H - 420);
    c.fillStyle = '#bdbdbd'; c.fillRect(0, 470, W, H - 470);
    c.fillStyle = '#fff';
    for (let i = -1; i < 12; i++) c.fillRect(i * 100 - (cam % 100), 462, 50, 4);
    // finish line
    const fx = this.length - cam;
    if (fx < W + 50) { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#222' : '#fff'; c.fillRect(fx, 420 + i * 10, 14, 10); } }
    // rival (back lane)
    drawSprite(c, sprite(this.rival.id, Math.floor(this.t * 6) % 2 ? 'skate1' : 'skate2', { prop: 'skates' }), this.rx - cam, 440, 130);
    for (const it of this.items) {
      const sx = it.x - cam;
      if (sx < -60 || sx > W + 60 || it.got) continue;
      if (it.type === 'cone') { c.fillStyle = '#ff7b00'; c.beginPath(); c.moveTo(sx - 16, 500); c.lineTo(sx, 452); c.lineTo(sx + 16, 500); c.fill(); c.fillStyle = '#fff'; c.fillRect(sx - 9, 474, 18, 6); }
      if (it.type === 'ramp') { c.fillStyle = '#78909c'; c.beginPath(); c.moveTo(sx - 60, 500); c.lineTo(sx + 30, 455); c.lineTo(sx + 30, 500); c.fill(); }
      if (it.type === 'bolt') { this.text('⚡', sx - 14, 490 - it.y, { size: 34, color: '#ffd23f' }); }
    }
    const pose = this.stumble > 0 ? 'fall' : this.y > 0 ? 'jump' : Math.floor(this.t * 6) % 2 ? 'skate1' : 'skate2';
    drawSprite(c, sprite(this.char.id, pose, { prop: this.y > 0 || this.stumble > 0 ? null : 'skates' }), 260, 500 - this.y, 150);
    // HUD
    this.bar(20, 30, 400, 14, this.x / this.length, '#1f86ff', 'You');
    this.bar(20, 66, 400, 14, this.rx / this.length, '#ff4fa3', this.rival.short);
    this.text(`⚡ ${this.bolts}`, W - 20, 40, { align: 'right', size: 28, color: '#ffd23f' });
    this.text(`${this.t.toFixed(1)}s`, W - 20, 74, { align: 'right' });
  }
}
