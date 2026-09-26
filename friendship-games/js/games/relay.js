// Relay Rescue — run four legs with your team. Alternate ← → to sprint, press Space inside the gold zone to pass the baton.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';
import { MAJOR } from '../data/characters.js';

export class Relay extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = 'Alternate ← → to sprint · Space in the gold zone to hand off';
    const team = this.char.team === 'neutral' ? 'wonderbolt' : this.char.team;
    const mates = MAJOR.filter((c) => c.team === team && !c.reserve && c.id !== this.char.id).slice(0, 3);
    this.team = [this.char, ...mates];
    const other = team === 'wonderbolt' ? 'shadowbolt' : 'wonderbolt';
    this.rTeam = MAJOR.filter((c) => c.team === other && !c.reserve);
    this.leg = 0; this.legLen = 900; this.x = 0; this.v = 0; this.lastKey = null;
    this.rLeg = 0; this.rx = 0;
    this.fumble = 0; this.msg = ''; this.msgT = 0; this.passes = [];
  }
  update(dt) {
    if (this.msgT > 0) this.msgT -= dt;
    const runner = this.team[this.leg];
    const L = this.hit('ArrowLeft') || this.taps.some((t) => t.x < W / 3);
    const R = this.hit('ArrowRight') || this.taps.some((t) => t.x > (2 * W) / 3);
    const S = this.hit('Space') || this.taps.some((t) => t.x >= W / 3 && t.x <= (2 * W) / 3);
    if (this.fumble > 0) this.fumble -= dt;
    else for (const k of [L && 'L', R && 'R'].filter(Boolean)) { if (k !== this.lastKey) { this.v += 26 + stat(runner, 'speed') * 2.4; this.sfx('step'); } this.lastKey = k; }
    this.v = Math.min(520, this.v * Math.pow(0.4, dt));
    this.x += this.v * dt;
    const zoneStart = this.legLen - 140, zoneEnd = this.legLen;
    if (this.leg < 3 && S && this.fumble <= 0) {
      if (this.x >= zoneStart && this.x <= zoneEnd) {
        const q = 1 - Math.abs(this.x - (zoneStart + 70)) / 70;
        this.passes.push(q);
        this.msg = q > 0.7 ? 'PERFECT PASS!' : 'Good pass'; this.msgT = 1; this.sfx(q > 0.7 ? 'coin' : 'pop');
        this.leg++; this.x = 0; this.v = 160 + q * 200;
      } else { this.fumble = 0.9; this.v *= 0.2; this.msg = 'Fumble!'; this.msgT = 1; this.sfx('fail'); }
    }
    if (this.leg < 3 && this.x > zoneEnd) { this.x = zoneEnd; this.v *= 0.5; this.msg = 'Pass it! (Space)'; this.msgT = 0.4; }
    // Rival team
    const rr = this.rTeam[this.rLeg];
    this.rx += (250 + stat(rr, 'speed') * 20) * dt * (0.9 + 0.2 * Math.sin(this.t * 2 + this.rLeg));
    if (this.rx >= this.legLen && this.rLeg < 3) { this.rLeg++; this.rx = 0; }
    const me = this.leg * this.legLen + this.x, them = this.rLeg * this.legLen + this.rx, full = 4 * this.legLen;
    if (me >= full || them >= full) {
      const won = me >= full && me >= them;
      const perfect = this.passes.filter((q) => q > 0.7).length;
      this.finish({ won, score: Math.max(0, Math.round((won ? 1500 : 500) + perfect * 100 - this.t * 10)), stars: won ? (perfect >= 2 ? 3 : 2) : 1, summary: `${won ? 'Your team wins!' : 'Beaten at the line'} · ${perfect} perfect passes · ${this.t.toFixed(1)}s` });
    }
  }
  draw() {
    const c = this.ctx;
    this.sky('#7fd0ff', '#e3f4ff');
    c.fillStyle = '#39406b'; c.fillRect(0, 140, W, 160);
    for (let i = 0; i < 60; i++) { c.fillStyle = ['#1f86ff', '#ffd23f', '#6c3bd1', '#ff4fa3', '#fff'][i % 5]; c.beginPath(); c.arc((i * 37 + Math.sin(this.t * 3 + i) * 2) % W, 170 + (i % 4) * 32 + Math.sin(this.t * 6 + i) * 3, 9, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#d9534f'; c.fillRect(0, 300, W, H - 300);
    c.fillStyle = '#fff'; c.fillRect(0, 400, W, 4); c.fillRect(0, 500, W, 4);
    const sx = (x) => 120 + (x / this.legLen) * (W - 240);
    if (this.leg < 3) { c.fillStyle = 'rgba(255,210,63,0.45)'; c.fillRect(sx(this.legLen - 140), 300, sx(this.legLen) - sx(this.legLen - 140), 110); }
    const rr = this.rTeam[this.rLeg];
    drawSprite(c, sprite(rr.id, Math.floor(this.t * 8) % 2 ? 'run1' : 'run2'), sx(this.rx), 392, 120);
    if (this.rLeg < 3) drawSprite(c, sprite(this.rTeam[this.rLeg + 1].id, 'idle'), sx(this.legLen) + 30, 392, 110);
    const runner = this.team[this.leg];
    const pose = this.fumble > 0 ? 'fall' : this.v > 40 ? (Math.floor(this.t * 9) % 2 ? 'run1' : 'run2') : 'idle';
    drawSprite(c, sprite(runner.id, pose, { prop: 'baton' }), sx(this.x), 492, 145);
    if (this.leg < 3) drawSprite(c, sprite(this.team[this.leg + 1].id, 'idle', { face: 'happy' }), sx(this.legLen) + 40, 492, 130);
    this.text(`Leg ${this.leg + 1}/4 · ${runner.short}`, 20, 40, { size: 28 });
    this.bar(20, 60, 300, 14, (this.leg * this.legLen + this.x) / (4 * this.legLen), '#1f86ff');
    this.bar(20, 88, 300, 14, (this.rLeg * this.legLen + this.rx) / (4 * this.legLen), '#ff4fa3');
    this.text(`${this.t.toFixed(1)}s`, W - 20, 40, { align: 'right', size: 26 });
    if (this.msgT > 0) this.text(this.msg, W / 2, 270, { align: 'center', size: 40, color: '#ffd23f' });
  }
}
