// Procedural SVG environments (PLACEHOLDER ART). Each location returns parallax layers.
// Real painted backgrounds can replace a location by returning { layers:[{factor, svg|href}] }.
//
// build(loc, { worldW, worldH, time, weather, course }) →
//   { worldW, worldH, groundY, sky, layers:[{factor, svg}], front }

import { makeRng } from '../util.js';

const SKIES = {
  day: ['#6ec6ff', '#bfe9ff', '#fff6d8'],
  dusk: ['#3b1d6e', '#c44e8a', '#ffb36b'],
  night: ['#0b0f2e', '#1f2a5c', '#3d3f7a'],
  indoor: ['#2a2f55', '#3b4577', '#4d5a90'],
};

function sky(time, weather) {
  const c = weather === 'rain' ? ['#56657f', '#8a98b0', '#b8c2d1'] : SKIES[time] || SKIES.day;
  const sun = time === 'day' && weather !== 'rain'
    ? `<circle cx="1300" cy="150" r="70" fill="#fff3b0" opacity=".9"/><circle cx="1300" cy="150" r="110" fill="#fff3b0" opacity=".25"/>`
    : time === 'night' ? `<circle cx="1280" cy="140" r="50" fill="#f4f1ff"/><circle cx="1300" cy="128" r="46" fill="${c[0]}"/>` + stars() : time === 'dusk' ? `<circle cx="1200" cy="560" r="120" fill="#ffcf7a" opacity=".7"/>` : '';
  return `<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".6" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#skyg)"/>${sun}`;
}

function stars() {
  const r = makeRng(7);
  let s = '';
  for (let i = 0; i < 70; i++) s += `<circle cx="${r.int(0, 1600)}" cy="${r.int(0, 500)}" r="${r.range(0.8, 2.4).toFixed(1)}" fill="#fff" opacity="${r.range(0.4, 1).toFixed(2)}" class="${i % 5 ? '' : 'twinkle'}"/>`;
  return s;
}

function clouds(w, seed, y = 120, tint = '#fff', op = 0.85) {
  const r = makeRng(seed);
  let s = `<g class="drift" opacity="${op}">`;
  for (let x = -200; x < w + 400; x += r.int(380, 700)) {
    const cy = y + r.int(-40, 60), k = r.range(0.7, 1.3);
    s += `<g transform="translate(${x},${cy}) scale(${k.toFixed(2)})" fill="${tint}"><ellipse cx="0" cy="0" rx="90" ry="34"/><ellipse cx="50" cy="-20" rx="60" ry="36"/><ellipse cx="-50" cy="-10" rx="54" ry="28"/></g>`;
  }
  return s + '</g>';
}

function hills(w, y, color, amp, seed) {
  const r = makeRng(seed);
  let d = `M-400,900 L-400,${y}`;
  for (let x = -400; x <= w + 400; x += 200) d += ` Q${x + 100},${y - r.range(0, amp)} ${x + 200},${y + r.range(-amp / 3, amp / 3)}`;
  return `<path d="${d} L${w + 400},900 Z" fill="${color}"/>`;
}

function trees(w, baseY, seed, { dark = '#2e7d32', light = '#43a047', trunk = '#6d4c41', size = 1, gap = [120, 260], pine = false } = {}) {
  const r = makeRng(seed);
  let s = '';
  for (let x = -100; x < w + 200; x += r.int(gap[0], gap[1])) {
    const k = size * r.range(0.8, 1.25);
    if (pine) s += `<g transform="translate(${x},${baseY}) scale(${k.toFixed(2)})"><rect x="-8" y="-40" width="16" height="40" fill="${trunk}"/><path d="M-60,-40 L0,-150 L60,-40 Z M-48,-100 L0,-200 L48,-100 Z M-36,-160 L0,-250 L36,-160 Z" fill="${dark}"/></g>`;
    else s += `<g transform="translate(${x},${baseY}) scale(${k.toFixed(2)})"><rect x="-10" y="-80" width="20" height="80" fill="${trunk}"/><circle cx="0" cy="-120" r="60" fill="${dark}"/><circle cx="-30" cy="-100" r="40" fill="${light}"/><circle cx="26" cy="-140" r="38" fill="${light}"/></g>`;
  }
  return s;
}

function crowd(w, y0, rows, seed, palette) {
  const r = makeRng(seed);
  let s = '';
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * 34;
    for (let x = -60; x < w + 60; x += r.int(24, 34)) {
      const c = r.pick(palette), sk = r.pick(['#f6cdb0', '#c68a62', '#8d5b3c', '#e9b98f', '#fbe3d0']);
      s += `<g class="fan fan${r.int(0, 3)}" transform="translate(${x},${y})"><rect x="-11" y="0" width="22" height="26" rx="8" fill="${c}"/><circle cx="0" cy="-8" r="10" fill="${sk}"/></g>`;
    }
  }
  return s;
}

function building(x, y, w, h, fill, roof, windows = '#fff7c2', win = true) {
  let s = `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${fill}"/><path d="M${x - 10},${y - h} L${x + w / 2},${y - h - 60} L${x + w + 10},${y - h} Z" fill="${roof}"/>`;
  if (win) for (let wy = y - h + 30; wy < y - 40; wy += 60) for (let wx = x + 20; wx < x + w - 30; wx += 50) s += `<rect x="${wx}" y="${wy}" width="24" height="32" rx="12" fill="${windows}" opacity=".85"/>`;
  return s;
}

function tower(x, y, h, fill, roof, flag) {
  return `<rect x="${x - 40}" y="${y - h}" width="80" height="${h}" fill="${fill}"/><path d="M${x - 52},${y - h} L${x},${y - h - 120} L${x + 52},${y - h} Z" fill="${roof}"/><path d="M${x},${y - h - 120} v-50" stroke="#555" stroke-width="4"/><path d="M${x},${y - h - 170} l40,12 l-40,12 Z" fill="${flag}" class="flag-wave"/>${[0, 1, 2].map((i) => `<rect x="${x - 12}" y="${y - h + 40 + i * 80}" width="24" height="40" rx="12" fill="#fff7c2" opacity=".8"/>`).join('')}`;
}

function banner(x, y, team) {
  const c = team === 'wonderbolt' ? ['#1f86ff', '#ffd23f'] : ['#3b2066', '#ff4fa3'];
  return `<g transform="translate(${x},${y})"><rect x="-40" y="0" width="80" height="140" fill="${c[0]}"/><path d="M-40,140 L0,170 L40,140 Z" fill="${c[0]}"/><path d="M4,30 L-14,70 L0,70 L-8,110 L16,62 L2,62 L12,30 Z" fill="${c[1]}"/></g>`;
}

function rainLayer() {
  let s = '<g class="rain">';
  const r = makeRng(3);
  for (let i = 0; i < 140; i++) s += `<path d="M${r.int(-100, 1700)},${r.int(-900, 900)} l-12,34" stroke="#dfe9ff" stroke-width="2" opacity=".55"/>`;
  return s + '</g>';
}

function obstacle(kind, x, y) {
  switch (kind) {
    case 'cone': return `<path d="M${x - 22},${y} L${x},${y - 60} L${x + 22},${y} Z" fill="#ff7b00"/><rect x="${x - 14}" y="${y - 34}" width="28" height="8" fill="#fff"/>`;
    case 'ramp': return `<path d="M${x - 90},${y} L${x + 60},${y - 70} L${x + 60},${y} Z" fill="#9aa5b1" stroke="#6b7785" stroke-width="4"/>`;
    case 'rail': return `<path d="M${x - 120},${y - 50} L${x + 120},${y - 50}" stroke="#c0c6ce" stroke-width="9"/><path d="M${x - 100},${y - 50} v50 M${x + 100},${y - 50} v50" stroke="#8a939d" stroke-width="7"/>`;
    case 'hurdle': return `<rect x="${x - 50}" y="${y - 70}" width="100" height="14" fill="#fff" stroke="#e74c3c" stroke-width="4"/><path d="M${x - 46},${y - 56} v56 M${x + 46},${y - 56} v56" stroke="#555" stroke-width="6"/>`;
    case 'wall': return `<rect x="${x - 30}" y="${y - 150}" width="60" height="150" rx="6" fill="#ff9f43" stroke="#c0661a" stroke-width="4"/>`;
    case 'tire': return [0, 1, 2].map((i) => `<ellipse cx="${x - 60 + i * 60}" cy="${y - 8}" rx="28" ry="12" fill="none" stroke="#222" stroke-width="10"/>`).join('');
    case 'net': return `<path d="M${x - 70},${y - 110} L${x + 70},${y - 110}" stroke="#444" stroke-width="6"/><path d="M${x - 70},${y - 110} Q${x},${y - 30} ${x + 70},${y - 110}" fill="none" stroke="#e8e8e8" stroke-width="3" stroke-dasharray="8 6"/>`;
    case 'log': return `<rect x="${x - 70}" y="${y - 32}" width="140" height="32" rx="16" fill="#8d6e63" stroke="#5d4037" stroke-width="4"/><circle cx="${x + 54}" cy="${y - 16}" r="12" fill="#bcaaa4"/>`;
    case 'rock': return `<path d="M${x - 50},${y} Q${x - 50},${y - 50} ${x - 10},${y - 60} Q${x + 40},${y - 64} ${x + 50},${y} Z" fill="#8e9aa6" stroke="#5f6b76" stroke-width="4"/>`;
    case 'puddle': return `<ellipse cx="${x}" cy="${y + 4}" rx="80" ry="14" fill="#6d4c41" opacity=".75"/><ellipse cx="${x}" cy="${y + 2}" rx="60" ry="8" fill="#8fb3c9" opacity=".6"/>`;
    case 'hedge': return `<rect x="${x - 60}" y="${y - 150}" width="120" height="150" rx="30" fill="#2e7d32" stroke="#1b5e20" stroke-width="5"/><circle cx="${x - 20}" cy="${y - 110}" r="10" fill="#66bb6a"/>`;
    case 'sign': return `<path d="M${x},${y} v-110" stroke="#6d4c41" stroke-width="8"/><path d="M${x - 40},${y - 120} h70 l20,16 l-20,16 h-70 Z" fill="#ffcc80" stroke="#8d6e63" stroke-width="3"/>`;
    case 'flag': return `<path d="M${x},${y} v-170" stroke="#6d4c41" stroke-width="7"/><path d="M${x},${y - 170} l70,20 l-70,20 Z" fill="#e74c3c" class="flag-wave"/>`;
    case 'stone': return `<ellipse cx="${x}" cy="${y + 6}" rx="70" ry="20" fill="#9aa5b1" stroke="#6b7785" stroke-width="4"/>`;
    case 'buoy': return `<circle cx="${x}" cy="${y - 10}" r="22" fill="#e74c3c" stroke="#fff" stroke-width="6" class="bob"/>`;
    case 'platform': return `<rect x="${x - 80}" y="${y - 10}" width="160" height="22" rx="8" fill="#ffcc80" stroke="#a1887f" stroke-width="4" class="bob"/>`;
    case 'plank': return '';
    case 'beam': return `<rect x="${x - 160}" y="${y - 44}" width="320" height="14" rx="5" fill="#d7a86e" stroke="#8d6e63" stroke-width="3"/><path d="M${x - 140},${y - 30} v30 M${x + 140},${y - 30} v30" stroke="#777" stroke-width="7"/>`;
    case 'sandpit': return `<rect x="${x - 160}" y="${y - 6}" width="320" height="20" rx="6" fill="#f2d49b"/>`;
    default: return '';
  }
}

// Course dressing for race-type events: obstacles evenly spaced, start and finish.
function courseLayer(course, groundY, w) {
  if (!course) return '';
  const { start, finish, obstacles = [], lanes = [0] } = course;
  let s = `<g><path d="M${start},${groundY - 20} v${lanes.length * 50 + 40}" stroke="#fff" stroke-width="8" stroke-dasharray="14 10"/>`;
  s += `<g transform="translate(${finish},${groundY - 20})"><rect x="-6" y="-190" width="12" height="${lanes.length * 50 + 230}" fill="#fff"/>${Array.from({ length: 10 }, (_, i) => `<rect x="-6" y="${-190 + i * 22}" width="12" height="11" fill="#222"/>`).join('')}<rect x="-80" y="-230" width="160" height="40" rx="8" fill="#ff4fa3"/><text x="0" y="-202" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="26" fill="#fff">FINISH</text></g>`;
  if (course.zip) for (const zy of course.zip) s += `<path d="M${start - 200},${zy} L${finish + 300},${zy + 40}" stroke="#444" stroke-width="5"/>`;
  const n = obstacles.length;
  obstacles.forEach((k, i) => {
    const x = start + ((i + 1) / (n + 1)) * (finish - start);
    s += obstacle(k, x, groundY - 6);
  });
  return s + '</g>';
}

const ground = (w, y, top, body) => `<rect x="-400" y="${y}" width="${w + 800}" height="${Math.max(400, 2300 - y)}" fill="${body}"/><rect x="-400" y="${y}" width="${w + 800}" height="14" fill="${top}"/>`;

export { rainLayer };

export function buildBackground(loc, opts = {}) {
  const worldW = opts.worldW || 1600;
  const worldH = opts.worldH || 900;
  const time = opts.time || 'day';
  const weather = opts.weather || 'clear';
  const W = worldW;
  const G = opts.groundY || 780;
  const L = [];
  let front = '';
  let skyKind = time;

  switch (loc) {
    case 'brightspire':
      L.push({ factor: 0.1, svg: clouds(W, 1) });
      L.push({ factor: 0.3, svg: hills(W, 560, '#9ed28b', 70, 2) + tower(420, 560, 260, '#fdfdf7', '#1f86ff', '#ffd23f') + tower(820, 560, 340, '#fdfdf7', '#ffd23f', '#1f86ff') + tower(1220, 560, 240, '#fdfdf7', '#1f86ff', '#ffd23f') + building(520, 560, 260, 160, '#f6f2e6', '#1f86ff') + building(900, 560, 260, 150, '#f6f2e6', '#1f86ff') });
      L.push({ factor: 0.6, svg: trees(W, 690, 3, { size: 0.8 }) });
      L.push({ factor: 1, svg: ground(W, G, '#7cc36a', '#8fd07b') + `<path d="M${W / 2 - 160},${G} L${W / 2 - 60},${G + 200} L${W / 2 + 60},${G + 200} L${W / 2 + 160},${G} Z" fill="#e9dfc7"/>` + banner(160, G - 330, 'wonderbolt') + banner(W - 160, G - 330, 'wonderbolt') });
      break;
    case 'duskmere':
      skyKind = time === 'day' ? 'dusk' : time;
      L.push({ factor: 0.1, svg: clouds(W, 4, 160, '#e7a7d8', 0.5) });
      L.push({ factor: 0.3, svg: `<rect x="-400" y="600" width="${W + 800}" height="60" fill="#5b3f9a" opacity=".7"/>` + tower(360, 610, 300, '#4b3a78', '#241046', '#ff4fa3') + tower(760, 610, 400, '#54428a', '#241046', '#9b59b6') + tower(1180, 610, 280, '#4b3a78', '#241046', '#ff4fa3') + building(460, 610, 240, 180, '#433266', '#241046', '#ffd88a') });
      L.push({ factor: 0.6, svg: trees(W, 700, 5, { dark: '#3b2a5e', light: '#5a3f8a', trunk: '#2b1d40', pine: true, size: 0.8 }) });
      L.push({ factor: 1, svg: ground(W, G, '#5c4a8a', '#6b5a9c') + [200, 600, 1000, 1400].map((x) => `<g transform="translate(${x},${G})"><path d="M0,0 v-150" stroke="#2b1d40" stroke-width="8"/><circle cx="0" cy="-160" r="18" fill="#ffd88a" class="glow"/></g>`).join('') + banner(W - 180, G - 320, 'shadowbolt') });
      break;
    case 'corridor':
      skyKind = 'indoor';
      L.push({ factor: 1, svg: `<rect x="-400" y="0" width="${W + 800}" height="${G}" fill="#e8e1f4"/><rect x="-400" y="${G - 360}" width="${W + 800}" height="16" fill="#c9bfe0"/>` + Array.from({ length: Math.ceil(W / 110) + 8 }, (_, i) => { const x = -300 + i * 110; return `<rect x="${x}" y="${G - 330}" width="96" height="330" rx="6" fill="${i % 7 < 3 ? '#1f86ff' : i % 7 < 6 ? '#6c3bd1' : '#ffd23f'}" stroke="#2a2233" stroke-width="3" opacity=".9"/><rect x="${x + 70}" y="${G - 190}" width="8" height="36" rx="3" fill="#ddd"/><path d="M${x + 16},${G - 310} h64 M${x + 16},${G - 298} h64" stroke="#fff" stroke-width="3" opacity=".6"/>`; }).join('') + ground(W, G, '#b9a6d6', '#d7cbe9') + `<rect x="${W / 2 - 120}" y="120" width="240" height="160" rx="12" fill="#fff" stroke="#ffd23f" stroke-width="6"/><text x="${W / 2}" y="190" font-family="Baloo 2" font-weight="800" font-size="30" text-anchor="middle" fill="#1f86ff">FRIENDSHIP</text><text x="${W / 2}" y="230" font-family="Baloo 2" font-weight="800" font-size="30" text-anchor="middle" fill="#6c3bd1">GAMES</text>` });
      break;
    case 'cafeteria':
      skyKind = 'indoor';
      L.push({ factor: 1, svg: `<rect x="-400" y="0" width="${W + 800}" height="${G}" fill="#fff4e0"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${60 + i * 280}" y="80" width="200" height="220" rx="100" fill="#bfe9ff" stroke="#e0c9a6" stroke-width="10"/>`).join('') + `<rect x="-400" y="${G - 150}" width="${W + 800}" height="150" fill="#f2d7b3"/><rect x="1100" y="${G - 230}" width="480" height="90" fill="#c0c6ce"/><text x="1340" y="${G - 170}" font-family="Baloo 2" font-weight="800" font-size="34" text-anchor="middle" fill="#e74c3c">CHEF OZZIE'S</text>` + ground(W, G, '#e0c9a6', '#f0dcc0') + [250, 700].map((x) => `<rect x="${x - 170}" y="${G - 70}" width="340" height="20" rx="8" fill="#ffffff" stroke="#e0c9a6" stroke-width="4"/><path d="M${x - 140},${G - 50} v50 M${x + 140},${G - 50} v50" stroke="#aaa" stroke-width="8"/>`).join('') });
      break;
    case 'commonroom':
      skyKind = 'night';
      L.push({ factor: 1, svg: `<rect x="-400" y="0" width="${W + 800}" height="${G}" fill="#3a2d5c"/><rect x="200" y="100" width="420" height="300" rx="20" fill="#0b0f2e" stroke="#6c5aa6" stroke-width="14"/>${stars().replace(/cx="(\d+)"/g, (m, x) => `cx="${200 + (x % 420)}"`).replace(/cy="(\d+)"/g, (m, y) => `cy="${100 + (y % 300)}"`)}<path d="M-400,70 Q${W / 2},140 ${W + 400},70" stroke="#ffd88a" stroke-width="3" fill="none"/>${Array.from({ length: 24 }, (_, i) => `<circle cx="${-200 + i * 90}" cy="${86 + Math.sin(i) * 16}" r="7" fill="${['#ffd88a', '#ff9ff3', '#7fd3ff'][i % 3]}" class="glow"/>`).join('')}<rect x="900" y="160" width="360" height="240" rx="10" fill="#fdfdf7" stroke="#8d6e63" stroke-width="10"/><path d="M940,220 l60,40 l60,-30 l80,50" stroke="#6c3bd1" stroke-width="5" fill="none"/><circle cx="1000" cy="260" r="12" fill="#ff4fa3"/><text x="1080" y="370" font-family="Baloo 2" font-size="24" text-anchor="middle" fill="#6c3bd1">PLAN C (FINAL) (REAL)</text>` + ground(W, G, '#8e6fb8', '#a58ccb') + `<rect x="100" y="${G - 120}" width="360" height="100" rx="40" fill="#ff7eb6"/><rect x="90" y="${G - 170}" width="380" height="70" rx="30" fill="#ff9ecb"/>` });
      break;
    case 'town':
      L.push({ factor: 0.1, svg: clouds(W, 6) });
      L.push({ factor: 0.35, svg: hills(W, 520, '#b3d9a6', 60, 8) + building(100, 600, 220, 240, '#ffcc80', '#e57373') + building(360, 600, 200, 300, '#90caf9', '#5c6bc0') + building(1000, 600, 240, 260, '#ce93d8', '#8e24aa') + building(1300, 600, 220, 220, '#a5d6a7', '#43a047') });
      L.push({ factor: 0.7, svg: `<g transform="translate(700,640)"><rect x="-230" y="-330" width="460" height="260" rx="14" fill="#fff" stroke="#333" stroke-width="8"/><path d="M-160,-60 v60 M160,-60 v60" stroke="#555" stroke-width="12"/><rect x="-216" y="-316" width="432" height="232" fill="url(#wbposter)"/><text x="0" y="-110" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="40" fill="#fff" stroke="#0b3d91" stroke-width="2">WONDERBOLT</text><text x="0" y="-270" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="24" fill="#ffd23f">FRIENDSHIP GAMES FAVORITES</text><path d="M-20,-250 L-50,-170 L-20,-170 L-40,-120 L20,-200 L-10,-200 L10,-250 Z" fill="#ffd23f"/><defs><linearGradient id="wbposter" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f86ff"/><stop offset="1" stop-color="#63c1ff"/></linearGradient></defs></g>` });
      L.push({ factor: 1, svg: ground(W, G, '#d7ccc8', '#e8e0dc') + `<g transform="translate(${W - 260},${G})"><ellipse cx="0" cy="-10" rx="120" ry="26" fill="#90a4ae"/><rect x="-14" y="-110" width="28" height="100" fill="#b0bec5"/><ellipse cx="0" cy="-110" rx="50" ry="12" fill="#90a4ae"/><path d="M0,-120 q-40,-40 -60,20 M0,-120 q40,-40 60,20" stroke="#81d4fa" stroke-width="6" fill="none" class="fountain"/></g>` });
      break;
    case 'stadium': case 'track': {
      L.push({ factor: 0.08, svg: clouds(W, 9, 90) });
      const standTop = 290;
      L.push({ factor: 0.45, svg: `<rect x="-400" y="${standTop}" width="${W + 800}" height="${G - standTop}" fill="#39406b"/>` + crowd(W * 0.6 + 1600, standTop + 30, 8, 11, ['#1f86ff', '#ffd23f', '#6c3bd1', '#ff4fa3', '#ffffff', '#35e0c1']) + `<rect x="-400" y="${standTop - 30}" width="${W + 800}" height="30" fill="#232842"/>` + Array.from({ length: Math.ceil((W * 0.6 + 1600) / 500) }, (_, i) => banner(100 + i * 500, standTop - 180, i % 2 ? 'shadowbolt' : 'wonderbolt')).join('') });
      L.push({ factor: 1, svg: ground(W, G, '#e0e0e0', loc === 'track' ? '#d9534f' : '#4caf50') + (loc === 'track' ? Array.from({ length: 4 }, (_, i) => `<rect x="-400" y="${G + 30 + i * 48}" width="${W + 800}" height="4" fill="#fff" opacity=".8"/>`).join('') : `<rect x="-400" y="${G + 60}" width="${W + 800}" height="4" fill="#fff" opacity=".6"/>`) + courseLayer(opts.course, G, W) });
      break;
    }
    case 'skatepark':
      L.push({ factor: 0.1, svg: clouds(W, 12) });
      L.push({ factor: 0.35, svg: hills(W, 560, '#a5d6a7', 60, 13) + trees(W, 600, 14, { size: 0.7 }) });
      L.push({ factor: 0.7, svg: Array.from({ length: Math.ceil(W / 900) + 1 }, (_, i) => `<g transform="translate(${i * 900 + 200},700)"><path d="M-160,0 Q-160,-120 -40,-120 L40,-120 Q160,-120 160,0 Z" fill="#b0bec5"/><path d="M-120,-10 Q-120,-90 -40,-90 L40,-90 Q120,-90 120,-10 Z" fill="#90a4ae"/><text x="0" y="-40" font-family="Baloo 2" font-weight="800" font-size="28" text-anchor="middle" fill="${i % 2 ? '#ff4fa3' : '#1f86ff'}" transform="rotate(-6)">${i % 2 ? 'SB RULES' : 'FLY BRIGHT'}</text></g>`).join('') });
      L.push({ factor: 1, svg: ground(W, G, '#9e9e9e', '#bdbdbd') + courseLayer(opts.course, G, W) });
      break;
    case 'forest':
      skyKind = time === 'night' ? 'night' : time;
      L.push({ factor: 0.1, svg: clouds(W, 15, 100, '#fff', 0.5) });
      L.push({ factor: 0.3, svg: hills(W, 520, '#6a9f58', 80, 16) + trees(W, 600, 17, { dark: '#255d2a', light: '#2f7a36', pine: true, size: 0.9, gap: [70, 140] }) });
      L.push({ factor: 0.65, svg: trees(W, 720, 18, { size: 1.2, gap: [140, 260] }) + glowmoths(W, 19) });
      L.push({ factor: 1, svg: ground(W, G, '#6d8b3a', '#8d6e4a') + courseLayer(opts.course, G, W) });
      front = trees(W, 960, 20, { size: 1.8, gap: [500, 900], dark: '#1b4d20', light: '#23632a' });
      break;
    case 'mountain': {
      const climb = opts.climb;
      L.push({ factor: 0.08, svg: clouds(W, 21, 80) });
      L.push({ factor: 0.25, svg: `<path d="M-400,700 L100,260 L360,520 L700,180 L1000,500 L1300,240 L${W + 400},700 Z" fill="#8fa3bf"/><path d="M100,260 L160,320 L60,330 Z M700,180 L760,250 L640,250 Z M1300,240 L1360,300 L1240,300 Z" fill="#fff"/>` });
      if (climb) {
        // Vertical wall occupying the world; ground at bottom.
        L.push({ factor: 1, svg: `<rect x="-400" y="${-worldH}" width="${W + 800}" height="${worldH * 2 + 900}" fill="#9c8574"/>` + wallTexture(W, worldH, 22) + climbHolds(W, worldH, climb, 23) + ground(W, worldH - 120, '#6d8b3a', '#7a6552') + `<g transform="translate(${W / 2},${climb.topY - 40})"><path d="M0,0 v-120" stroke="#555" stroke-width="8"/><path d="M-40,-150 Q0,-190 40,-150 L30,-120 L-30,-120 Z" fill="#ffd23f" stroke="#b8860b" stroke-width="4" class="bell"/></g>` });
      } else {
        L.push({ factor: 0.6, svg: hills(W, 640, '#7a8b6a', 70, 24) + trees(W, 690, 25, { pine: true, size: 0.7, dark: '#355e3b' }) });
        L.push({ factor: 1, svg: ground(W, G, '#8d8173', '#a1917f') + courseLayer(opts.course, G, W) });
      }
      break;
    }
    case 'river': case 'lake': {
      L.push({ factor: 0.1, svg: clouds(W, 26) });
      L.push({ factor: 0.35, svg: hills(W, 540, '#8bc27a', 70, 27) + trees(W, 590, 28, { size: 0.7, pine: loc === 'river' }) + (loc === 'lake' ? tower(1300, 600, 200, '#4b3a78', '#241046', '#ff4fa3') : '') });
      const wy = G - 40;
      L.push({ factor: 1, svg: `<rect x="-400" y="${wy}" width="${W + 800}" height="900" fill="${loc === 'river' ? '#3f8fd4' : '#4aa3df'}"/>` + waves(W, wy, 29) + courseLayer(opts.course, G, W) + `<rect x="-400" y="${G + 100}" width="${W + 800}" height="400" fill="#2f78b8" opacity=".6"/>` });
      break;
    }
    case 'pool': {
      skyKind = 'indoor';
      L.push({ factor: 0.4, svg: `<rect x="-400" y="0" width="${W + 800}" height="${G}" fill="#dff4ff"/>` + Array.from({ length: Math.ceil((W * 0.4 + 1600) / 240) + 2 }, (_, i) => `<path d="M${-200 + i * 240},0 L${-200 + i * 240},${G - 200}" stroke="#b3e0f7" stroke-width="16"/>`).join('') + crowd(W * 0.4 + 1600, G - 180, 3, 30, ['#1f86ff', '#ffd23f', '#6c3bd1', '#ff4fa3']) });
      const wy = G - 30;
      L.push({ factor: 1, svg: `<rect x="-400" y="${wy}" width="${W + 800}" height="900" fill="#29b6f6"/>` + waves(W, wy, 31, '#81d4fa') + Array.from({ length: 4 }, (_, i) => `<path d="M-400,${wy + 40 + i * 50} H${W + 400}" stroke="${i % 2 ? '#e74c3c' : '#fff'}" stroke-width="6" stroke-dasharray="20 14"/>`).join('') + courseLayer(opts.course, G, W) });
      break;
    }
    case 'archery':
      L.push({ factor: 0.1, svg: clouds(W, 32) });
      L.push({ factor: 0.35, svg: hills(W, 560, '#a5d6a7', 50, 33) + trees(W, 610, 34, { size: 0.6 }) });
      L.push({ factor: 1, svg: ground(W, G, '#7cb342', '#8bc34a') + [0, 1].map((i) => `<g transform="translate(${W - 280},${G - 10 - i * 0})"></g>`).join('') + target(W - 260, G) + `<g transform="translate(${W - 520},${G})"><path d="M0,0 v-200" stroke="#6d4c41" stroke-width="6"/><path d="M0,-200 l70,14 l-70,14 Z" fill="#ffd23f" class="flag-wave"/></g><g transform="translate(${W / 2},${G - 10})" class="goose"><ellipse cx="0" cy="-30" rx="36" ry="24" fill="#fafafa"/><path d="M24,-40 q20,-60 36,-50" stroke="#fafafa" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M60,-92 l18,4 l-18,6 Z" fill="#ff9800"/><circle cx="56" cy="-94" r="3" fill="#222"/></g>` });
      break;
    case 'gorge': {
      L.push({ factor: 0.1, svg: clouds(W, 35, 110) });
      L.push({ factor: 0.3, svg: `<path d="M-400,900 L-400,480 L300,420 L500,900 Z M${W + 400},900 L${W + 400},480 L${W - 300},420 L${W - 500},900 Z" fill="#8a7d6b"/><rect x="-400" y="720" width="${W + 800}" height="200" fill="#dfe6ee" opacity=".7"/>` });
      const y = G - 60;
      L.push({ factor: 1, svg: `<path d="M-400,${y} L260,${y} L200,900 L-400,900 Z M${W + 400},${y} L${W - 260},${y} L${W - 200},900 L${W + 400},900 Z" fill="#7a6552"/><rect x="-400" y="${y}" width="660" height="12" fill="#6d8b3a"/><rect x="${W - 260}" y="${y}" width="660" height="12" fill="#6d8b3a"/>` + `<path d="M260,${y - 60} Q${W / 2},${y - 24} ${W - 260},${y - 60}" stroke="#8d6e63" stroke-width="5" fill="none"/><path d="M260,${y} Q${W / 2},${y + 36} ${W - 260},${y}" stroke="#8d6e63" stroke-width="5" fill="none"/>` + bridgePlanks(W, y) + courseLayer(opts.course ? { ...opts.course, obstacles: [] } : null, G, W) });
      front = `<rect x="-400" y="820" width="${W + 800}" height="200" fill="#eef3f8" opacity=".45" class="mist"/>`;
      break;
    }
    default:
      L.push({ factor: 1, svg: ground(W, G, '#7cc36a', '#8fd07b') });
  }

  if (weather === 'rain') front += rainLayer();
  return { worldW, worldH, groundY: G, sky: sky(skyKind, weather), layers: L, front, rainy: weather === 'rain' };
}

function glowmoths(w, seed) {
  const r = makeRng(seed);
  let s = '';
  for (let i = 0; i < w / 60; i++) s += `<circle cx="${r.int(0, w)}" cy="${r.int(300, 650)}" r="${r.range(3, 6).toFixed(1)}" fill="#b8fff1" class="moth-glow" style="animation-delay:${r.range(0, 4).toFixed(1)}s"/>`;
  return s;
}

function waves(w, y, seed, color = '#9fd4ff') {
  let d = '';
  for (let x = -400; x < w + 400; x += 60) d += `<path d="M${x},${y + 6} q15,-10 30,0 t30,0" stroke="${color}" stroke-width="4" fill="none" opacity=".8"/>`;
  return `<g class="wave-shift">${d}</g>`;
}

function target(x, g) {
  return `<g transform="translate(${x},${g - 150})"><path d="M-30,140 L0,60 L30,140" stroke="#6d4c41" stroke-width="8" fill="none"/>${['#fff', '#222', '#1f86ff', '#e74c3c', '#ffd23f'].map((c, i) => `<circle r="${90 - i * 18}" fill="${c}" stroke="#333" stroke-width="2"/>`).join('')}</g>`;
}

function bridgePlanks(W, y) {
  let s = '';
  for (let x = 280; x < W - 280; x += 34) {
    const t = (x - 260) / (W - 520);
    const sag = Math.sin(t * Math.PI) * 18;
    s += `<rect x="${x}" y="${y + sag - 4}" width="26" height="12" rx="2" fill="#a1887f" stroke="#6d4c41" stroke-width="2" class="plank" data-x="${x}"/>`;
  }
  return s;
}

function wallTexture(W, H, seed) {
  const r = makeRng(seed);
  let s = '';
  for (let i = 0; i < 60; i++) s += `<path d="M${r.int(-200, W + 200)},${r.int(-H, H)} l${r.int(-80, 80)},${r.int(40, 160)}" stroke="#7d6a5c" stroke-width="${r.int(3, 8)}" opacity=".5"/>`;
  return s;
}

function climbHolds(W, H, climb, seed) {
  const r = makeRng(seed);
  let s = '';
  for (const lx of climb.lanes) {
    for (let y = climb.topY; y < H - 160; y += r.int(70, 110)) {
      const c = r.pick(['#ff4fa3', '#1f86ff', '#ffd23f', '#35e0c1', '#ff7b00']);
      s += `<ellipse cx="${lx + r.int(-60, 60)}" cy="${y}" rx="${r.int(12, 20)}" ry="${r.int(9, 14)}" fill="${c}" stroke="#333" stroke-width="3"/>`;
    }
  }
  return s;
}
