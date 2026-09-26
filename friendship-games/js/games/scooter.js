// Scooter Challenge — top-down three-lane slalom. ← → to switch lanes, dodge cones & puddles, grab bolts.
import { Game, W, H, sprite, drawSprite, stat, round } from './base.js';

const LANES = [W / 2 - 150, W / 2, W / 2 + 150];

export class Scooter extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = '← → to switch lanes · 45 seconds';
    this.lane = 1; this.px = LANES[1];
    this.speed = 300; this.dist = 0; this.bolts = 0; this.hits = 0; this.combo = 0; this.best = 0;
    this.items = []; this.spawn = 0; this.flash = 0;
    this.duration = 45;
    this.ghost = 0;
    this.ghostSpeed = 330 + stat(this.rival, 'agility') * 14;
  }
  update(dt) {
    if (this.hit('ArrowLeft') || this.taps.some((t) => t.x < W / 2)) { this.lane = Math.max(0, this.lane - 1); this.sfx('whoosh'); }
    if (this.hit('ArrowRight') || this.taps.some((t) => t.x >= W / 2)) { this.lane = Math.min(2, this.lane + 1); this.sfx('whoosh'); }
    this.px += (LANES[this.lane] - this.px) * Math.min(1, dt * 14);
    this.speed = Math.min(620 + stat(this.char, 'agility') * 10, this.speed + dt * 9);
    if (this.flash > 0) this.flash -= dt;
    this.dist += this.speed * dt * (this.flash > 0 ? 0.5 : 1);
    this.ghost += this.ghostSpeed * dt * (0.95 + 0.1 * Math.sin(this.t));
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = Math.max(0.35, 0.9 - this.t * 0.012);
      const lane = Math.floor(Math.random() * 3);
      const r = Math.random();
      this.items.push({ lane, y: -40, type: r < 0.45 ? 'cone' : r < 0.65 ? 'puddle' : 'bolt' });
    }
    for (const it of this.items) {
      it.y += this.speed * dt;
      if (!it.done && it.y > 400 && it.y < 470 && it.lane === this.lane) {
        it.done = true;
        if (it.type === 'bolt') { this.bolts++; this.combo++; this.best = Math.max(this.best, this.combo); this.sfx('coin'); }
        else { this.hits++; this.combo = 0; this.flash = 0.8; this.speed *= 0.8; this.sfx(it.type === 'puddle' ? 'splash' : 'crash'); }
      }
    }
    this.items = this.items.filter((i) => i.y < H + 60);
    if (this.t >= this.duration) {
      const score = Math.round(this.dist / 10 + this.bolts * 25 + this.best * 10);
      const won = this.dist >= this.ghost;
      this.finish({ won, score, stars: won ? (this.hits <= 2 ? 3 : 2) : 1, summary: `${Math.round(this.dist / 10)}m · ${this.bolts} bolts · ${this.hits} hits · best combo ${this.best}` });
    }
  }
  draw() {
    const c = this.ctx;
    c.fillStyle = '#6d8b3a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9e9e9e'; c.fillRect(LANES[0] - 90, 0, 480, H);
    c.fillStyle = '#fff';
    const off = (this.dist * 1) % 80;
    for (const x of [LANES[0] + 75, LANES[1] + 75]) for (let y = -80; y < H; y += 80) c.fillRect(x - 3, y + off, 6, 40);
    for (const it of this.items) {
      const x = LANES[it.lane];
      if (it.done && it.type === 'bolt') continue;
      if (it.type === 'cone') { c.fillStyle = '#ff7b00'; c.beginPath(); c.moveTo(x - 22, it.y + 20); c.lineTo(x, it.y - 24); c.lineTo(x + 22, it.y + 20); c.fill(); }
      else if (it.type === 'puddle') { c.fillStyle = 'rgba(64,120,190,0.8)'; c.beginPath(); c.ellipse(x, it.y, 46, 20, 0, 0, Math.PI * 2); c.fill(); }
      else this.text('⚡', x - 16, it.y + 14, { size: 38, color: '#ffd23f' });
    }
    if (this.flash > 0 && Math.floor(this.t * 12) % 2) c.globalAlpha = 0.5;
    drawSprite(c, sprite(this.char.id, 'scooter', { prop: 'scooter' }), this.px, 500, 150);
    c.globalAlpha = 1;
    this.bar(20, 30, 300, 14, Math.min(1, this.t / this.duration), '#ffd23f', `Time ${Math.max(0, this.duration - this.t).toFixed(0)}s`);
    const lead = this.dist - this.ghost;
    this.text(`${Math.round(this.dist / 10)}m`, W - 20, 40, { align: 'right', size: 30 });
    this.text(`${lead >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(lead / 10))}m vs ${this.rival.short}`, W - 20, 72, { align: 'right', color: lead >= 0 ? '#8effc1' : '#ff9aa9' });
    this.text(`⚡ ${this.bolts}  ×${this.combo}`, 20, 80, { size: 24, color: '#ffd23f' });
  }
}
export { round };
