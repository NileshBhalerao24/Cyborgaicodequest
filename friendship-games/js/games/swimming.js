// Freestyle Swim — alternate ← → for strokes, ↑ to breathe when the bubble appears, Space at the wall to flip-turn.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';

export class Swimming extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = 'Alternate ← → to swim · ↑ to breathe · Space at the wall to turn';
    this.poolLen = 1600; this.laps = 2;
    this.d = 0; this.v = 0; this.lastStroke = null; this.air = 1; this.lap = 0; this.dir = 1; this.turnWindow = false;
    this.rd = 0; this.rlap = 0; this.rv = 220 + stat(this.rival, "swim") * 16;
    this.power = 38 + stat(this.char, 'swim') * 3.5;
    this.strokes = 0; this.msg = ''; this.msgT = 0;
  }
  update(dt) {
    if (this.msgT > 0) this.msgT -= dt;
    const L = this.hit('ArrowLeft') || this.taps.some((t) => t.x < W / 3);
    const R = this.hit('ArrowRight') || this.taps.some((t) => t.x > (2 * W) / 3);
    const B = this.hit('ArrowUp') || this.taps.some((t) => t.x >= W / 3 && t.x <= (2 * W) / 3 && t.y < H / 2);
    const T = this.hit('Space') || this.taps.some((t) => t.x >= W / 3 && t.x <= (2 * W) / 3 && t.y >= H / 2);
    for (const k of [L && 'L', R && 'R'].filter(Boolean)) {
      if (k !== this.lastStroke) { this.v += this.power * (this.air > 0.15 ? 1 : 0.3); this.strokes++; this.sfx('splash'); }
      else { this.v *= 0.7; this.msg = 'Splash! Alternate strokes'; this.msgT = 0.8; }
      this.lastStroke = k;
    }
    if (B) { this.air = 1; this.v *= 0.85; this.sfx('pop'); }
    this.air = Math.max(0, this.air - dt * 0.16);
    this.v = Math.min(430, this.v * Math.pow(0.35, dt));
    const atWall = this.lap < this.laps - 1 && this.d > this.poolLen - 90;
    if (atWall && T) { this.lap++; this.d = 0; this.v = Math.max(this.v, 260); this.msg = 'Flip turn!'; this.msgT = 1; this.sfx('whoosh'); }
    this.d = Math.min(this.poolLen, this.d + this.v * dt);
    if (this.d >= this.poolLen && this.lap < this.laps - 1) { this.lap++; this.d = 0; this.v *= 0.3; this.msg = 'Slow turn — tap Space at the wall'; this.msgT = 1.3; }
    // Rival
    this.rd += this.rv * dt * (0.9 + 0.2 * Math.sin(this.t * 1.3));
    if (this.rd >= this.poolLen) { this.rd -= this.poolLen; this.rlap++; }
    const myProg = this.lap * this.poolLen + this.d, rProg = this.rlap * this.poolLen + this.rd, full = this.laps * this.poolLen;
    if (myProg >= full || rProg >= full) {
      const won = myProg >= full && myProg >= rProg;
      this.finish({ won, score: Math.max(0, Math.round((won ? 1400 : 500) - this.t * 15 + this.strokes)), stars: won ? (this.t < 10 ? 3 : 2) : 1, summary: `${won ? 'You touched first' : `${this.rival.short} touched first`} · ${this.t.toFixed(1)}s` });
    }
  }
  draw() {
    const c = this.ctx;
    c.fillStyle = '#dff4ff'; c.fillRect(0, 0, W, 170);
    c.fillStyle = '#29b6f6'; c.fillRect(0, 170, W, H - 170);
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#e74c3c' : '#fff'; for (let x = 0; x < W; x += 34) c.fillRect(x, 230 + i * 90, 20, 5); }
    const px = (dist, lap) => { const f = dist / this.poolLen; return lap % 2 === 0 ? 80 + f * (W - 180) : W - 100 - f * (W - 180); };
    c.fillStyle = '#b0bec5'; c.fillRect(W - 60, 170, 20, H - 170); c.fillRect(40, 170, 20, H - 170);
    const pose = Math.floor(this.strokes) % 2 ? 'swim1' : 'swim2';
    drawSprite(c, sprite(this.rival.id, Math.floor(this.t * 3) % 2 ? 'swim1' : 'swim2'), px(this.rd, this.rlap), 300, 140, this.rlap % 2 === 1);
    drawSprite(c, sprite(this.char.id, pose), px(this.d, this.lap), 420, 150, this.lap % 2 === 1);
    this.bar(20, 30, 260, 14, (this.lap * this.poolLen + this.d) / (this.laps * this.poolLen), '#1f86ff', 'You');
    this.bar(20, 66, 260, 14, (this.rlap * this.poolLen + this.rd) / (this.laps * this.poolLen), '#ff4fa3', this.rival.short);
    this.bar(W - 240, 30, 220, 14, this.air, this.air < 0.25 ? '#ff1744' : '#fff', this.air < 0.25 ? 'BREATHE! (↑)' : 'Air');
    this.text(`Lap ${this.lap + 1}/${this.laps}`, W - 20, 80, { align: 'right' });
    if (this.lap < this.laps - 1 && this.d > this.poolLen - 90) this.text('TURN! (Space)', W / 2, 140, { align: 'center', size: 36, color: '#ffd23f' });
    if (this.msgT > 0) this.text(this.msg, W / 2, 110, { align: 'center', size: 26, color: '#1b1f4f' });
  }
}
