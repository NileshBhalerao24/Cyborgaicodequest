// Synthesized original music loops & sound effects (Web Audio). Placeholder for a real score:
// replace `music(mood)` with <audio> stems keyed by mood and `sfx(name)` with sampled files.

let ctx = null;
let master = null, musicBus = null, sfxBus = null;
let muted = false;
let current = null; // { mood, timer, nextTime, step }
let noiseBuf = null;

try { muted = localStorage.getItem('fg-muted') === '1'; } catch { /* storage unavailable */ }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}
window.addEventListener('pointerdown', unlock, { once: false, passive: true });
window.addEventListener('keydown', unlock, { once: false });

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('fg-muted', m ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tone(freq, t, dur, { type = 'square', vol = 0.2, bus = musicBus, attack = 0.01, release = 0.08, slide = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(t, dur, { vol = 0.2, freq = 1000, q = 1, type = 'bandpass', bus = sfxBus, sweep = 0, attack = 0.005 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

// ───────────────────────────── Music
// Each mood: bpm, root (midi), scale degrees, chord roots (scale degree), lead pattern, voice types.
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], MIX = [0, 2, 4, 5, 7, 9, 10];
const MOODS = {
  bright: { bpm: 118, root: 60, scale: MAJ, chords: [0, 4, 5, 3], lead: [0, 2, 4, 2, 7, 4, 2, 4], leadType: 'square', drums: 1 },
  adventure: { bpm: 132, root: 62, scale: MIX, chords: [0, 6, 3, 0], lead: [0, 4, 7, 4, 9, 7, 4, 2], leadType: 'sawtooth', drums: 2 },
  tense: { bpm: 144, root: 57, scale: MIN, chords: [0, 5, 6, 0], lead: [0, -1, 0, 2, 3, 2, 0, -1], leadType: 'square', drums: 2, pulse: true },
  sneaky: { bpm: 100, root: 52, scale: MIN, chords: [0, 3, 0, 4], lead: [0, null, 2, null, 3, 2, null, 0], leadType: 'triangle', drums: 0, stacc: true },
  sad: { bpm: 72, root: 53, scale: MAJ, chords: [0, 5, 3, 4], lead: [4, null, 2, null, 0, null, 2, null], leadType: 'triangle', drums: 0 },
  triumph: { bpm: 126, root: 58, scale: MAJ, chords: [0, 3, 4, 0], lead: [0, 4, 7, 7, 9, 7, 4, 7], leadType: 'square', drums: 3 },
  night: { bpm: 80, root: 55, scale: MAJ, chords: [0, 5, 3, 4], lead: [7, null, null, 4, null, null, 2, null], leadType: 'sine', drums: 0 },
  stadium: { bpm: 128, root: 60, scale: MIX, chords: [0, 3, 6, 4], lead: [0, 0, 4, 0, 7, 0, 4, 2], leadType: 'square', drums: 3 },
  shadow: { bpm: 112, root: 50, scale: MIN, chords: [0, 5, 3, 6], lead: [0, 3, 7, 3, 10, 7, 3, 2], leadType: 'sawtooth', drums: 1 },
};

const deg = (m, d) => {
  if (d == null) return null;
  const oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
  return m.root + m.scale[i] + 12 * oct;
};

export function music(mood) {
  if (!ensure()) return;
  if (current && current.mood === mood) return;
  stopMusic();
  const m = MOODS[mood];
  if (!m) return;
  const st = { mood, step: 0, nextTime: ctx.currentTime + 0.1 };
  const stepDur = 60 / m.bpm / 2; // eighth notes
  st.timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    while (st.nextTime < ctx.currentTime + 0.3) {
      const t = st.nextTime, s = st.step;
      const bar = Math.floor(s / 8) % m.chords.length;
      const chordRoot = m.chords[bar];
      // bass
      if (s % 2 === 0 || m.pulse) tone(midi(deg(m, chordRoot) - 24), t, stepDur * (m.pulse ? 0.9 : 1.8), { type: 'triangle', vol: 0.34 });
      // pad on bar start
      if (s % 8 === 0) [0, 2, 4].forEach((k) => tone(midi(deg(m, chordRoot + k) - 12), t, stepDur * 8, { type: 'sine', vol: 0.07, attack: 0.2, release: 0.4 }));
      // lead
      const ln = m.lead[s % 8];
      if (ln != null && (Math.floor(s / 16) % 2 === 0 || m.lead.length)) {
        const n = deg(m, ln + chordRoot * (s % 16 < 8 ? 0 : 0));
        tone(midi(n + 12), t, stepDur * (m.stacc ? 0.4 : 0.9), { type: m.leadType, vol: m.leadType === 'sawtooth' ? 0.05 : 0.07 });
      }
      // drums
      if (m.drums) {
        if (s % 4 === 0) tone(110, t, 0.12, { type: 'sine', vol: 0.5, slide: 0.3 }); // kick
        if (m.drums >= 2 && s % 4 === 2) noise(t, 0.1, { vol: 0.16, freq: 1800, q: 0.7, bus: musicBus }); // snare
        if (s % 2 === 1 || m.drums >= 3) noise(t, 0.03, { vol: 0.07, freq: 8000, q: 1, type: 'highpass', bus: musicBus }); // hat
        if (m.drums >= 3 && s % 8 === 6) noise(t, 0.08, { vol: 0.2, freq: 1400, q: 2, bus: musicBus }); // clap
      }
      st.step++;
      st.nextTime += stepDur;
    }
  }, 60);
  current = st;
}

export function stopMusic() {
  if (current) clearInterval(current.timer);
  current = null;
}

// ───────────────────────────── SFX
const SFX = {
  whoosh: (t) => noise(t, 0.35, { vol: 0.35, freq: 400, q: 1.5, sweep: 6 }),
  jump: (t) => tone(300, t, 0.2, { type: 'square', vol: 0.12, bus: sfxBus, slide: 2.5 }),
  land: (t) => { tone(120, t, 0.12, { type: 'sine', vol: 0.4, bus: sfxBus, slide: 0.5 }); noise(t, 0.1, { vol: 0.15, freq: 300 }); },
  thud: (t) => { tone(90, t, 0.25, { type: 'sine', vol: 0.5, bus: sfxBus, slide: 0.4 }); noise(t, 0.2, { vol: 0.25, freq: 200 }); },
  splash: (t) => { noise(t, 0.6, { vol: 0.4, freq: 1200, q: 0.6, sweep: 0.3 }); noise(t + 0.05, 0.4, { vol: 0.2, freq: 3000, q: 1 }); },
  cheer: (t) => { noise(t, 2.2, { vol: 0.28, freq: 1100, q: 0.4, attack: 0.4 }); noise(t, 2, { vol: 0.12, freq: 2500, q: 0.8, attack: 0.3 }); },
  gasp: (t) => noise(t, 0.9, { vol: 0.25, freq: 700, q: 1.2, attack: 0.1, sweep: 1.6 }),
  aww: (t) => noise(t, 1.2, { vol: 0.2, freq: 900, q: 1, attack: 0.2, sweep: 0.5 }),
  whistle: (t) => { for (let i = 0; i < 6; i++) tone(2600 + (i % 2) * 180, t + i * 0.05, 0.05, { type: 'sine', vol: 0.12, bus: sfxBus }); },
  bell: (t) => { tone(1318, t, 1.2, { type: 'sine', vol: 0.2, bus: sfxBus, release: 1 }); tone(1975, t, 0.8, { type: 'sine', vol: 0.08, bus: sfxBus, release: 0.7 }); },
  twang: (t) => { tone(180, t, 0.3, { type: 'sawtooth', vol: 0.12, bus: sfxBus, slide: 0.6 }); noise(t, 0.3, { vol: 0.2, freq: 2000, q: 2, sweep: 0.2 }); },
  thunk: (t) => { tone(200, t, 0.1, { type: 'square', vol: 0.2, bus: sfxBus, slide: 0.5 }); noise(t, 0.08, { vol: 0.3, freq: 600 }); },
  pop: (t) => tone(600, t, 0.08, { type: 'sine', vol: 0.2, bus: sfxBus, slide: 2 }),
  tick: (t) => tone(1800, t, 0.03, { type: 'square', vol: 0.06, bus: sfxBus }),
  fanfare: (t) => [0, 4, 7, 12, 7, 12].forEach((n, i) => tone(midi(70 + n), t + i * 0.11, i === 5 ? 0.6 : 0.12, { type: 'square', vol: 0.1, bus: sfxBus })),
  sadtrombone: (t) => [0, -1, -2, -4].forEach((n, i) => tone(midi(55 + n), t + i * 0.32, i === 3 ? 0.8 : 0.3, { type: 'sawtooth', vol: 0.08, bus: sfxBus, slide: i === 3 ? 0.9 : 1 })),
  slip: (t) => tone(800, t, 0.4, { type: 'triangle', vol: 0.14, bus: sfxBus, slide: 0.25 }),
  sparkle: (t) => [0, 4, 7, 11, 14].forEach((n, i) => tone(midi(84 + n), t + i * 0.05, 0.12, { type: 'sine', vol: 0.07, bus: sfxBus })),
  horn: (t) => { tone(midi(62), t, 0.7, { type: 'sawtooth', vol: 0.1, bus: sfxBus }); tone(midi(69), t, 0.7, { type: 'sawtooth', vol: 0.07, bus: sfxBus }); },
  beep: (t) => tone(880, t, 0.15, { type: 'square', vol: 0.1, bus: sfxBus }),
  go: (t) => tone(1320, t, 0.4, { type: 'square', vol: 0.12, bus: sfxBus }),
  boing: (t) => tone(220, t, 0.35, { type: 'sine', vol: 0.25, bus: sfxBus, slide: 3 }),
  crash: (t) => { noise(t, 0.5, { vol: 0.4, freq: 900, q: 0.5, sweep: 0.3 }); tone(80, t, 0.3, { type: 'square', vol: 0.2, bus: sfxBus, slide: 0.5 }); },
  zip: (t) => noise(t, 0.8, { vol: 0.2, freq: 2500, q: 6, sweep: 0.3 }),
  step: (t) => noise(t, 0.04, { vol: 0.1, freq: 500, q: 1 }),
  coin: (t) => { tone(988, t, 0.08, { type: 'square', vol: 0.1, bus: sfxBus }); tone(1319, t + 0.08, 0.2, { type: 'square', vol: 0.1, bus: sfxBus }); },
  fail: (t) => tone(300, t, 0.4, { type: 'square', vol: 0.1, bus: sfxBus, slide: 0.5 }),
  thunder: (t) => noise(t, 1.8, { vol: 0.45, freq: 160, q: 0.5, type: 'lowpass', attack: 0.05 }),
  drum: (t) => [0, 0.15, 0.3].forEach((d) => tone(140, t + d, 0.12, { type: 'sine', vol: 0.4, bus: sfxBus, slide: 0.4 })),
  wheel: (t) => SFX.tick(t),
};

export function sfx(name) {
  if (!ensure() || ctx.state !== 'running') return;
  const f = SFX[name];
  if (f) f(ctx.currentTime + 0.01);
}
