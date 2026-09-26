// Whisperwood Maze — a new maze every run. Reach the flag before your rival; glimmermoths are bonus points.
import { Game, W, H, sprite, drawSprite, stat } from './base.js';

const COLS = 17, ROWS = 9;

function genMaze() {
  const cells = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ n: true, s: true, e: true, w: true, v: false })));
  const stack = [[0, 0]];
  cells[0][0].v = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [[r - 1, c, 'n', 's'], [r + 1, c, 's', 'n'], [r, c + 1, 'e', 'w'], [r, c - 1, 'w', 'e']].filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS && !cells[y][x].v);
    if (!nb.length) { stack.pop(); continue; }
    const [y, x, a, b] = nb[Math.floor(Math.random() * nb.length)];
    cells[r][c][a] = false; cells[y][x][b] = false; cells[y][x].v = true;
    stack.push([y, x]);
  }
  // A few extra openings so there are shortcuts to find.
  for (let i = 0; i < 12; i++) {
    const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * (COLS - 1));
    cells[r][c].e = false; cells[r][c + 1].w = false;
  }
  return cells;
}

function bfs(cells, from, to) {
  const key = (r, c) => r * COLS + c;
  const prev = new Map([[key(...from), null]]);
  const q = [from];
  while (q.length) {
    const [r, c] = q.shift();
    if (r === to[0] && c === to[1]) break;
    const cell = cells[r][c];
    for (const [dr, dc, wall] of [[-1, 0, 'n'], [1, 0, 's'], [0, 1, 'e'], [0, -1, 'w']]) {
      if (cell[wall]) continue;
      const k = key(r + dr, c + dc);
      if (!prev.has(k)) { prev.set(k, [r, c]); q.push([r + dr, c + dc]); }
    }
  }
  const path = [];
  let cur = to;
  while (cur) { path.unshift(cur); cur = prev.get(key(...cur)); }
  return path;
}

export class Maze extends Game {
  constructor(canvas, o) {
    super(canvas, o);
    this.help = 'Arrow keys / swipe / d-pad · reach the 🚩 first';
    this.cells = genMaze();
    this.cw = (W - 40) / COLS; this.ch = (H - 80) / ROWS;
    this.me = [ROWS - 1, 0]; this.goal = [Math.floor(ROWS / 2), COLS - 1];
    this.rival_ = [0, 0];
    this.rpath = bfs(this.cells, this.rival_, this.goal);
    this.ri = 0; this.rStep = 0.62 - stat(this.rival, 'cunning') * 0.03;
    this.rt = 0.8;
    this.moths = [];
    for (let i = 0; i < 8; i++) this.moths.push([Math.floor(Math.random() * ROWS), 2 + Math.floor(Math.random() * (COLS - 3))]);
    this.lights = 0;
    this.swipe = null;
    canvas.addEventListener('pointerdown', (this.sd = (e) => { this.swipe = [e.clientX, e.clientY]; }));
    canvas.addEventListener('pointerup', (this.su = (e) => {
      if (!this.swipe) return;
      const dx = e.clientX - this.swipe[0], dy = e.clientY - this.swipe[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) this.pressed.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
      this.swipe = null;
    }));
  }
  destroy() { super.destroy(); this.canvas.removeEventListener('pointerdown', this.sd); this.canvas.removeEventListener('pointerup', this.su); }
  tryMove(dr, dc, wall) {
    const [r, c] = this.me;
    if (this.cells[r][c][wall]) { this.sfx('thud'); return; }
    this.me = [r + dr, c + dc];
    this.sfx('step');
    const mi = this.moths.findIndex(([y, x]) => y === this.me[0] && x === this.me[1]);
    if (mi >= 0) { this.moths.splice(mi, 1); this.lights++; this.sfx('sparkle'); }
  }
  update(dt) {
    this.taps.length = 0; // taps are handled as swipes
    if (this.hit('ArrowUp')) this.tryMove(-1, 0, 'n');
    if (this.hit('ArrowDown')) this.tryMove(1, 0, 's');
    if (this.hit('ArrowLeft')) this.tryMove(0, -1, 'w');
    if (this.hit('ArrowRight')) this.tryMove(0, 1, 'e');
    this.rt -= dt;
    if (this.rt <= 0 && this.ri < this.rpath.length - 1) { this.ri++; this.rival_ = this.rpath[this.ri]; this.rt = this.rStep * (0.8 + Math.random() * 0.5); }
    const meWin = this.me[0] === this.goal[0] && this.me[1] === this.goal[1];
    const rWin = this.ri >= this.rpath.length - 1;
    if (meWin || rWin) {
      const won = meWin;
      this.finish({ won, score: Math.max(0, Math.round((won ? 1200 : 400) + this.lights * 80 - this.t * 10)), stars: won ? (this.lights >= 4 ? 3 : 2) : 1, summary: `${won ? 'Flag captured!' : `${this.rival.short} got there first`} · ${this.lights} glimmermoths · ${this.t.toFixed(1)}s` });
    }
  }
  draw() {
    const c = this.ctx;
    c.fillStyle = '#23422a'; c.fillRect(0, 0, W, H);
    const ox = 20, oy = 60, cw = this.cw, ch = this.ch;
    c.fillStyle = '#6d8b3a'; c.fillRect(ox, oy, cw * COLS, ch * ROWS);
    c.strokeStyle = '#1b5e20'; c.lineWidth = 8; c.lineCap = 'round';
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const cell = this.cells[r][q], x = ox + q * cw, y = oy + r * ch;
      c.beginPath();
      if (cell.n) { c.moveTo(x, y); c.lineTo(x + cw, y); }
      if (cell.w) { c.moveTo(x, y); c.lineTo(x, y + ch); }
      if (r === ROWS - 1 && cell.s) { c.moveTo(x, y + ch); c.lineTo(x + cw, y + ch); }
      if (q === COLS - 1 && cell.e) { c.moveTo(x + cw, y); c.lineTo(x + cw, y + ch); }
      c.stroke();
    }
    for (const [r, q] of this.moths) { c.fillStyle = `rgba(184,255,241,${0.6 + 0.4 * Math.sin(this.t * 4 + r)})`; c.beginPath(); c.arc(ox + (q + 0.5) * cw, oy + (r + 0.5) * ch, 7, 0, Math.PI * 2); c.fill(); }
    this.text('🚩', ox + (this.goal[1] + 0.2) * cw, oy + (this.goal[0] + 0.85) * ch, { size: 34 });
    drawSprite(c, sprite(this.rival.id, 'run1'), ox + (this.rival_[1] + 0.5) * cw, oy + (this.rival_[0] + 0.95) * ch, ch * 1.3);
    drawSprite(c, sprite(this.char.id, Math.floor(this.t * 4) % 2 ? 'run1' : 'run2'), ox + (this.me[1] + 0.5) * cw, oy + (this.me[0] + 0.95) * ch, ch * 1.4);
    this.text(`✨ ${this.lights}   ${this.t.toFixed(1)}s`, 20, 40, { size: 26 });
    this.text(`${this.rival.short} is in the maze too…`, W - 20, 40, { align: 'right', color: '#ff9aa9' });
  }
}
