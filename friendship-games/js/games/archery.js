// Archery Duel — the reticle sways; hold ↑ to steady (limited breath), release with Space / tap. Watch the wind.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';

const TX = 700, TY = 250, R = 150;

export class Archery extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = 'Hold ↑ to steady · Space or tap to shoot · mind the wind';
    this.arrows = []; this.rivalArrows = [];
    this.shot = 0; this.total = 5;
    this.breath = 1; this.wind = this.newWind();
    this.flight = null; this.msg = ''; this.msgT = 0;
    this.sway = 1.25 - stat(this.char, 'aim') * 0.07;
  }
  newWind() { return (Math.random() - 0.5) * 4; }
  score(dx, dy) { const d = Math.hypot(dx, dy); return Math.max(0, 10 - Math.floor(d / (R / 10))); }
  update(dt) {
    if (this.msgT > 0) this.msgT -= dt;
    if (this.flight) {
      this.flight.p += dt * 2.2;
      if (this.flight.p >= 1) {
        const f = this.flight; this.flight = null;
        if (f.rival) { this.rivalArrows.push(f); this.msg = `${this.rival.short}: ${f.s === 10 ? 'BULLSEYE' : f.s}`; this.msgT = 1.3; this.sfx('thunk'); this.wind = this.newWind(); if (this.shot >= this.total) this.end(); }
        else {
          this.arrows.push(f); this.sfx('thunk'); this.msg = f.s === 10 ? 'BULLSEYE!' : `${f.s}`; this.msgT = 1.2; if (f.s === 10) this.sfx('cheer');
          setTimeout(() => this.rivalShoot(), 900);
        }
      }
      return;
    }
    if (this.waiting) return;
    const hold = this.keys.has('ArrowUp');
    if (hold && this.breath > 0) this.breath = Math.max(0, this.breath - dt * 0.55); else this.breath = Math.min(1, this.breath + dt * 0.25);
    const steady = hold && this.breath > 0 ? 0.25 : 1;
    const a = this.sway * steady;
    this.aim = { x: TX + Math.sin(this.t * 1.7) * 90 * a + Math.sin(this.t * 3.1) * 30 * a, y: TY + Math.cos(this.t * 1.3) * 70 * a + Math.sin(this.t * 2.3) * 24 * a };
    if (this.hit('Space') || this.taps.length) {
      const dx = this.aim.x - TX + this.wind * 16, dy = this.aim.y - TY;
      this.flight = { dx, dy, s: this.score(dx, dy), p: 0 };
      this.shot++; this.waiting = true; this.sfx('twang');
    }
  }
  rivalShoot() {
    const aimSkill = stat(this.rival, 'aim');
    const spread = (13 - aimSkill) * 13 + Math.abs(this.wind) * 6;
    const ang = Math.random() * Math.PI * 2, d = Math.abs((Math.random() + Math.random() - 1) * spread);
    const dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
    this.flight = { dx, dy, s: this.score(dx, dy), p: 0, rival: true };
    this.sfx('twang');
    this.waiting = false;
  }
  end() {
    const me = this.arrows.reduce((s, a) => s + a.s, 0), them = this.rivalArrows.reduce((s, a) => s + a.s, 0);
    const won = me > them || (me === them && Math.random() < 0.5);
    this.finish({ won, score: me * 20 + (won ? 200 : 0), stars: won ? (me >= 42 ? 3 : 2) : 1, summary: `You ${me} – ${them} ${this.rival.short}` });
  }
  draw() {
    const c = this.ctx;
    this.sky('#8fd3ff', '#e9f7ff');
    c.fillStyle = '#8bc34a'; c.fillRect(0, 400, W, H - 400);
    // target
    c.save(); c.translate(TX, TY);
    ['#fff', '#222', '#1f86ff', '#e74c3c', '#ffd23f'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, R - i * 30, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#333'; c.stroke(); });
    c.restore();
    c.strokeStyle = '#6d4c41'; c.lineWidth = 8; c.beginPath(); c.moveTo(TX - 60, 420); c.lineTo(TX, 380); c.lineTo(TX + 60, 420); c.stroke();
    const drawArrow = (a, col) => { c.fillStyle = col; c.beginPath(); c.arc(TX + a.dx, TY + a.dy, 7, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 2; c.stroke(); };
    this.arrows.forEach((a) => drawArrow(a, '#35e0c1'));
    this.rivalArrows.forEach((a) => drawArrow(a, '#ff4fa3'));
    if (this.flight) { const f = this.flight, sx = 220, sy = 330; const x = sx + (TX + f.dx - sx) * f.p, y = sy + (TY + f.dy - sy) * f.p - Math.sin(f.p * Math.PI) * 50; c.strokeStyle = '#6d4c41'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x, y); c.stroke(); }
    drawSprite(c, sprite(this.char.id, 'bow', { prop: 'bow' }), 180, 470, 190);
    drawSprite(c, sprite(this.rival.id, 'idle', { face: 'smug' }), 60, 470, 150);
    if (!this.flight && !this.waiting && this.aim) { c.strokeStyle = '#ff1744'; c.lineWidth = 3; c.beginPath(); c.arc(this.aim.x, this.aim.y, 16, 0, Math.PI * 2); c.moveTo(this.aim.x - 26, this.aim.y); c.lineTo(this.aim.x + 26, this.aim.y); c.moveTo(this.aim.x, this.aim.y - 26); c.lineTo(this.aim.x, this.aim.y + 26); c.stroke(); }
    // HUD
    const me = this.arrows.reduce((s, a) => s + a.s, 0), them = this.rivalArrows.reduce((s, a) => s + a.s, 0);
    this.text(`You ${me}  ·  ${this.rival.short} ${them}`, 20, 40, { size: 28 });
    this.text(`Arrow ${Math.min(this.shot + 1, this.total)}/${this.total}`, 20, 72);
    this.text(`Wind ${this.wind > 0 ? '→' : '←'} ${Math.abs(this.wind).toFixed(1)}`, W - 20, 40, { align: 'right', size: 24, color: '#1b1f4f' });
    this.bar(W - 220, 60, 200, 12, this.breath, '#35e0c1', 'Breath (hold ↑)');
    if (this.msgT > 0) this.text(this.msg, TX, 470, { size: 44, align: 'center', color: '#ffd23f' });
  }
}
