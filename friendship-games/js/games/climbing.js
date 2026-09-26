// Wall Climb — press the side of the next glowing hold (← or →). Wrong side slips; climbing too fast drains grip.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';

export class Climbing extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = '← / → matches the next hold · watch your grip';
    this.total = 36;
    this.holds = Array.from({ length: this.total + 4 }, () => (Math.random() < 0.5 ? 'L' : 'R'));
    this.h = 0; this.shown = 0; this.grip = 1; this.slip = 0;
    this.rh = 0; this.rRate = 1.4 + stat(this.rival, 'climb') * 0.16;
    this.gripCost = 0.16 - stat(this.char, 'endurance') * 0.008;
  }
  update(dt) {
    this.grip = Math.min(1, this.grip + dt * 0.35);
    if (this.slip > 0) this.slip -= dt;
    const L = this.hit('ArrowLeft') || this.taps.some((t) => t.x < W / 2);
    const R = this.hit('ArrowRight') || this.taps.some((t) => t.x >= W / 2);
    if ((L || R) && this.slip <= 0) {
      const want = this.holds[this.h];
      if ((L && want === 'L') || (R && want === 'R')) {
        if (this.grip < this.gripCost) { this.slipDown('Out of grip!'); }
        else { this.h++; this.grip -= this.gripCost; this.sfx('step'); }
      } else this.slipDown('Wrong hold!');
    }
    this.shown += (this.h - this.shown) * Math.min(1, dt * 12);
    this.rh = Math.min(this.total, this.rh + this.rRate * dt * (0.8 + 0.4 * Math.random()));
    if (Math.random() < dt * 0.08) this.rh = Math.max(0, this.rh - 2);
    if (this.h >= this.total || this.rh >= this.total) {
      const won = this.h >= this.total;
      this.sfx('bell');
      this.finish({ won, score: Math.round((won ? 1200 : 400) + this.h * 20 - this.t * 8), stars: won ? (this.t < 22 ? 3 : 2) : 1, summary: `${won ? 'Rang the bell first' : `${this.rival.short} rang it first`} · ${this.t.toFixed(1)}s` });
    }
  }
  slipDown(msg) { this.h = Math.max(0, this.h - 2); this.slip = 0.6; this.msg = msg; this.msgT = 1; this.sfx('slip'); }
  draw() {
    const c = this.ctx;
    this.sky('#8fa3bf', '#cfd8e6');
    const unit = 70;
    const baseY = 470;
    const cam = this.shown * unit - 200;
    c.fillStyle = '#9c8574'; c.fillRect(220, 0, 520, H);
    c.fillStyle = '#7d6a5c';
    for (let i = 0; i < 20; i++) { const y = ((i * 97 + cam * 1) % 700) - 80; c.fillRect(240 + ((i * 53) % 480), y, 4, 60); }
    // Bell at top
    const topY = baseY - this.total * unit + cam;
    if (topY > -60) { this.text('🔔', W / 2 - 22, topY, { size: 48 }); }
    // Holds for player (left lane) & rival (right lane)
    for (let i = Math.max(0, this.h - 3); i < Math.min(this.holds.length, this.h + 8); i++) {
      const y = baseY - i * unit + cam - 60;
      const x = this.holds[i] === 'L' ? 330 : 430;
      c.fillStyle = i === this.h ? '#ffd23f' : i < this.h ? '#666' : '#ff4fa3';
      c.beginPath(); c.ellipse(x, y, i === this.h ? 22 : 16, 13, 0, 0, Math.PI * 2); c.fill();
      if (i === this.h) this.text(this.holds[i] === 'L' ? '←' : '→', x, y - 22, { align: 'center', size: 30, color: '#fff' });
    }
    drawSprite(c, sprite(this.char.id, this.slip > 0 ? 'fall' : this.h % 2 ? 'climb1' : 'climb2'), 380, baseY - this.shown * unit + cam, 150);
    drawSprite(c, sprite(this.rival.id, Math.floor(this.rh) % 2 ? 'climb1' : 'climb2'), 620, baseY - this.rh * unit + cam, 150);
    this.bar(20, 30, 180, 14, this.h / this.total, '#1f86ff', 'You');
    this.bar(20, 66, 180, 14, this.rh / this.total, '#ff4fa3', this.rival.short);
    this.bar(W - 220, 30, 200, 14, this.grip, this.grip < this.gripCost ? '#ff1744' : '#35e0c1', 'Grip');
    if (this.msgT > 0) { this.msgT -= 1 / 60; this.text(this.msg, W / 2, 260, { align: 'center', size: 40, color: '#ff9aa9' }); }
  }
}
