// Procedural SVG character puppets (PLACEHOLDER ART).
// Every character is drawn from its `look` data so real illustrated rigs can replace
// `buildPuppet()` later without touching the stage, tournament or UI code.
//
// Local coordinates: origin at the feet, up is negative y. Roughly 330 units tall at height 1.

import { svgEl } from '../util.js';

const HIP_Y = -112;
const SHOULDER_Y = -196;
const NECK_Y = -206;
const HEAD_CY = -268;
const HEAD_R = 64;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ───────────────────────────── Hair
function hairBack(style, c, c2) {
  const d = shade(c, -30);
  switch (style) {
    case 'long': return `<path d="M-70,-300 Q-92,-200 -70,-130 Q-40,-118 -20,-150 L20,-150 Q40,-118 70,-130 Q92,-200 70,-300 Z" fill="${d}"/><path d="M-66,-190 Q-80,-150 -64,-132" stroke="${c2 || c}" stroke-width="8" fill="none" opacity=".7"/>`;
    case 'wave': return `<path d="M-72,-300 Q-98,-230 -80,-180 Q-96,-150 -70,-120 Q-50,-140 -30,-150 L30,-150 Q50,-140 70,-120 Q96,-150 80,-180 Q98,-230 72,-300 Z" fill="${d}"/>`;
    case 'ponytail': return `<path d="M40,-310 Q120,-300 108,-220 Q100,-170 120,-130 Q80,-150 74,-210 Q70,-260 40,-280 Z" fill="${d}"/><path d="M100,-170 Q112,-148 120,-130" stroke="${c2}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    case 'braid': return `<g fill="${d}"><ellipse cx="0" cy="-205" rx="14" ry="16"/><ellipse cx="0" cy="-180" rx="12" ry="14"/><ellipse cx="0" cy="-158" rx="10" ry="12"/></g><rect x="-10" y="-150" width="20" height="8" rx="3" fill="${c2}"/>`;
    case 'poof': return `<g fill="${d}">${[-60, -30, 0, 30, 60].map((x, i) => `<circle cx="${x}" cy="${-300 + (i % 2) * 14}" r="40"/>`).join('')}<circle cx="-72" cy="-240" r="34"/><circle cx="72" cy="-240" r="34"/><circle cx="-62" cy="-200" r="28"/><circle cx="62" cy="-200" r="28"/></g>`;
    case 'buns': return `<circle cx="-54" cy="-322" r="26" fill="${d}"/><circle cx="54" cy="-322" r="26" fill="${d}"/>`;
    case 'bob': return `<path d="M-72,-300 Q-84,-230 -68,-205 L68,-205 Q84,-230 72,-300 Z" fill="${d}"/>`;
    default: return '';
  }
}

function hairFront(style, c, c2) {
  switch (style) {
    case 'spiky': return `<path d="M-66,-282 L-84,-330 L-40,-316 L-30,-362 L0,-326 L24,-366 L36,-318 L78,-338 L66,-282 Q40,-300 0,-300 Q-40,-300 -66,-282 Z" fill="${c}"/><path d="M-30,-362 L0,-326 L-8,-300 Z" fill="${c2}"/><path d="M-60,-270 Q-40,-300 -10,-296 L-32,-262 Z" fill="${c}"/>`;
    case 'poof': return `<g fill="${c}">${[-50, -18, 16, 48].map((x, i) => `<circle cx="${x}" cy="${-318 - (i % 2) * 10}" r="32"/>`).join('')}<circle cx="-62" cy="-282" r="24"/><circle cx="62" cy="-282" r="24"/></g><circle cx="-20" cy="-330" r="8" fill="${c2}" opacity=".7"/><circle cx="30" cy="-340" r="6" fill="${c2}" opacity=".7"/>`;
    case 'wave': return `<path d="M-70,-270 Q-72,-330 -10,-336 Q60,-340 72,-280 Q40,-300 20,-296 Q30,-270 -4,-252 Q10,-284 -20,-294 Q-50,-292 -70,-270 Z" fill="${c}"/><path d="M-10,-332 Q40,-330 60,-296" stroke="${c2}" stroke-width="7" fill="none" opacity=".8"/>`;
    case 'long': return `<path d="M-70,-268 Q-74,-334 0,-338 Q74,-334 70,-268 Q50,-292 16,-300 Q-2,-282 -30,-276 Q-50,-284 -70,-268 Z" fill="${c}"/><path d="M-60,-300 Q-20,-330 40,-320" stroke="${c2}" stroke-width="8" fill="none" opacity=".8"/>`;
    case 'ponytail': return `<path d="M-68,-270 Q-70,-334 0,-338 Q70,-334 68,-270 Q40,-300 0,-296 Q-30,-296 -68,-270 Z" fill="${c}"/><path d="M-56,-276 Q-30,-310 10,-298 L-20,-270 Z" fill="${c}"/>`;
    case 'swoop': return `<path d="M-68,-272 Q-60,-340 10,-342 Q84,-338 70,-286 Q40,-318 -20,-306 Q10,-290 30,-262 Q-20,-280 -68,-272 Z" fill="${c}"/><path d="M-10,-340 Q50,-340 70,-300" stroke="${c2}" stroke-width="9" fill="none"/>`;
    case 'bob': return `<path d="M-72,-236 Q-80,-336 0,-338 Q80,-336 72,-236 L60,-236 Q60,-290 30,-300 L-40,-296 Q-60,-280 -60,-236 Z" fill="${c}"/><path d="M-40,-296 L30,-300 L20,-286 Z" fill="${c2}"/>`;
    case 'braid': return `<path d="M-68,-266 Q-70,-334 0,-338 Q70,-334 68,-266 Q60,-300 0,-304 Q-60,-300 -68,-266 Z" fill="${c}"/><path d="M-66,-280 Q-70,-240 -64,-226" stroke="${c}" stroke-width="12" stroke-linecap="round" fill="none"/>`;
    case 'pixie': return `<path d="M-68,-262 Q-74,-340 0,-340 Q70,-338 68,-270 Q50,-300 30,-290 L20,-310 L0,-292 L-20,-312 L-40,-288 Q-56,-290 -68,-262 Z" fill="${c}"/><path d="M20,-320 Q40,-330 56,-306" stroke="${c2}" stroke-width="8" fill="none"/>`;
    case 'messy': return `<path d="M-68,-266 L-80,-300 L-56,-306 L-60,-336 L-26,-326 L-10,-352 L12,-328 L40,-348 L44,-320 L76,-316 L66,-270 Q30,-298 -10,-290 Q-40,-292 -68,-266 Z" fill="${c}"/><path d="M-10,-352 L12,-328 L0,-320 Z" fill="${c2}"/>`;
    case 'buns': return `<path d="M-68,-266 Q-70,-334 0,-338 Q70,-334 68,-266 Q40,-296 0,-298 Q-40,-296 -68,-266 Z" fill="${c}"/><circle cx="-54" cy="-322" r="22" fill="${c}"/><circle cx="54" cy="-322" r="22" fill="${c}"/>${c2 ? `<path d="M-72,-322 a18,18 0 0 1 36,0" stroke="${c2}" stroke-width="6" fill="none"/><path d="M36,-322 a18,18 0 0 1 36,0" stroke="${c2}" stroke-width="6" fill="none"/>` : ''}`;
    case 'flat': return `<path d="M-66,-276 Q-68,-336 0,-340 Q68,-336 66,-276 L50,-300 L-50,-300 Z" fill="${c}"/>${c2 ? `<path d="M-40,-322 L40,-322" stroke="${c2}" stroke-width="6"/>` : ''}`;
    case 'buzz': return `<path d="M-64,-284 Q-66,-334 0,-336 Q66,-334 64,-284 Q30,-306 0,-306 Q-30,-306 -64,-284 Z" fill="${c}" opacity=".9"/>`;
    case 'mohawk': return `<path d="M-14,-300 L-20,-372 L0,-356 L6,-384 L20,-352 L14,-300 Z" fill="${c}"/><path d="M-62,-280 Q-64,-320 -16,-330 L-16,-300 Z M62,-280 Q64,-320 16,-330 L16,-300 Z" fill="${c}" opacity=".6"/>`;
    case 'curly': return `<g fill="${c}">${[-54, -28, 0, 28, 54].map((x, i) => `<circle cx="${x}" cy="${-322 - (i % 2) * 8}" r="22"/>`).join('')}<circle cx="-64" cy="-292" r="18"/><circle cx="64" cy="-292" r="18"/></g>`;
    case 'chefhat': return `<path d="M-66,-280 Q-66,-320 0,-322 Q66,-320 66,-280 Z" fill="${c}"/><rect x="-50" y="-352" width="100" height="40" fill="#fff" stroke="#ddd" stroke-width="3"/><g fill="#fff" stroke="#ddd" stroke-width="3"><circle cx="-34" cy="-370" r="26"/><circle cx="0" cy="-384" r="30"/><circle cx="34" cy="-370" r="26"/></g><rect x="-50" y="-350" width="100" height="36" fill="#fff"/>`;
    default: return `<path d="M-66,-276 Q-68,-336 0,-340 Q68,-336 66,-276 Z" fill="${c}"/>`;
  }
}

// ───────────────────────────── Faces
const EYE_X = 24;
const EYE_Y = -262;

function eyes(expr, color, lashes) {
  const L = (x) => lashes ? `<path d="M${x - 14},${EYE_Y - 14} l-7,-6 M${x - 8},${EYE_Y - 17} l-4,-8" stroke="#222" stroke-width="3" stroke-linecap="round"/>` : '';
  const open = (x, ry = 16, pupil = 0) => `<ellipse cx="${x}" cy="${EYE_Y}" rx="12" ry="${ry}" fill="#fff" stroke="#2a2233" stroke-width="3"/><circle cx="${x + 3 + pupil}" cy="${EYE_Y + 2}" r="8.5" fill="${color}"/><circle cx="${x + 3 + pupil}" cy="${EYE_Y + 2}" r="4.2" fill="#1a1422"/><circle cx="${x + 6 + pupil}" cy="${EYE_Y - 3}" r="3" fill="#fff"/>${L(x)}`;
  const arc = (x) => `<path d="M${x - 11},${EYE_Y + 2} Q${x},${EYE_Y - 12} ${x + 11},${EYE_Y + 2}" stroke="#2a2233" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const line = (x) => `<path d="M${x - 11},${EYE_Y} L${x + 11},${EYE_Y}" stroke="#2a2233" stroke-width="4.5" stroke-linecap="round"/>`;
  const narrow = (x) => `<ellipse cx="${x}" cy="${EYE_Y + 3}" rx="12" ry="8" fill="#fff" stroke="#2a2233" stroke-width="3"/><circle cx="${x + 3}" cy="${EYE_Y + 4}" r="6" fill="${color}"/><circle cx="${x + 3}" cy="${EYE_Y + 4}" r="3" fill="#1a1422"/>`;
  const X = -EYE_X + 6, Y = EYE_X + 6; // shifted toward facing direction (3/4 view)
  switch (expr) {
    case 'happy': case 'laugh': return arc(X) + arc(Y);
    case 'closed': case 'sad-closed': return line(X) + line(Y);
    case 'smug': case 'determined': case 'angry': case 'sneaky': return narrow(X) + narrow(Y);
    case 'surprised': case 'scared': return open(X, 19) + open(Y, 19);
    case 'worried': case 'sad': return open(X, 15, -2) + open(Y, 15, -2);
    default: return open(X) + open(Y);
  }
}

function brows(expr, hair) {
  const X = -EYE_X + 6, Y = EYE_X + 6;
  const b = (x, dy1, dy2) => `<path d="M${x - 13},${EYE_Y - 26 + dy1} L${x + 13},${EYE_Y - 26 + dy2}" stroke="${shade(hair, -40)}" stroke-width="6" stroke-linecap="round"/>`;
  switch (expr) {
    case 'angry': case 'determined': return b(X, -4, 6) + b(Y, 6, -4);
    case 'sad': case 'worried': case 'sad-closed': case 'scared': return b(X, 6, -5) + b(Y, -5, 6);
    case 'surprised': return b(X, -8, -8) + b(Y, -8, -8);
    case 'smug': case 'sneaky': return b(X, 0, 0) + b(Y, -8, 2);
    default: return b(X, -2, -2) + b(Y, -2, -2);
  }
}

function mouth(expr, talking) {
  const mx = 10, my = -228;
  if (talking) return `<ellipse cx="${mx}" cy="${my}" rx="10" ry="8" fill="#6b1d2e"/><path d="M${mx - 6},${my + 4} Q${mx},${my + 8} ${mx + 6},${my + 4}" fill="#ff7a8a"/>`;
  switch (expr) {
    case 'happy': return `<path d="M${mx - 16},${my - 4} Q${mx},${my + 16} ${mx + 16},${my - 4} Z" fill="#6b1d2e"/><path d="M${mx - 8},${my + 5} Q${mx},${my + 10} ${mx + 8},${my + 5}" fill="#ff7a8a"/>`;
    case 'laugh': return `<path d="M${mx - 18},${my - 6} Q${mx},${my + 22} ${mx + 18},${my - 6} Z" fill="#6b1d2e"/><path d="M${mx - 9},${my + 8} Q${mx},${my + 14} ${mx + 9},${my + 8}" fill="#ff7a8a"/>`;
    case 'sad': case 'sad-closed': return `<path d="M${mx - 12},${my + 6} Q${mx},${my - 4} ${mx + 12},${my + 6}" stroke="#4a2030" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'worried': case 'scared': return `<path d="M${mx - 12},${my + 2} q6,-6 12,0 t12,0" stroke="#4a2030" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'surprised': return `<ellipse cx="${mx}" cy="${my + 2}" rx="8" ry="11" fill="#6b1d2e"/>`;
    case 'angry': return `<path d="M${mx - 12},${my + 4} L${mx + 12},${my + 1}" stroke="#4a2030" stroke-width="5" stroke-linecap="round"/>`;
    case 'smug': case 'sneaky': return `<path d="M${mx - 12},${my + 1} Q${mx + 4},${my + 8} ${mx + 16},${my - 6}" stroke="#4a2030" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'determined': return `<path d="M${mx - 12},${my + 2} Q${mx},${my + 6} ${mx + 12},${my + 2}" stroke="#4a2030" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    default: return `<path d="M${mx - 12},${my} Q${mx},${my + 10} ${mx + 12},${my}" stroke="#4a2030" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  }
}

export function faceSVG(look, expr = 'neutral', talking = false) {
  const blush = ['happy', 'laugh', 'surprised'].includes(expr) || look.freckles
    ? `<ellipse cx="-24" cy="-238" rx="11" ry="6" fill="#ff8fa3" opacity=".45"/><ellipse cx="48" cy="-238" rx="11" ry="6" fill="#ff8fa3" opacity=".45"/>` : '';
  const freckles = look.freckles ? `<g fill="${shade(look.skin, -60)}" opacity=".6"><circle cx="-28" cy="-242" r="2"/><circle cx="-20" cy="-246" r="2"/><circle cx="-24" cy="-236" r="2"/><circle cx="44" cy="-242" r="2"/><circle cx="52" cy="-246" r="2"/><circle cx="48" cy="-236" r="2"/></g>` : '';
  const tear = expr === 'sad' ? `<path d="M-24,-244 q-4,10 0,14 q4,-4 0,-14" fill="#7fd3ff"/>` : '';
  const sweat = expr === 'worried' || expr === 'scared' ? `<path d="M58,-300 q-6,12 0,16 q6,-4 0,-16" fill="#9be7ff"/>` : '';
  return blush + freckles + eyes(expr, look.eyes || '#5b3a29', look.lashes) + brows(expr, look.hair || '#333') + mouth(expr, talking) + tear + sweat;
}

// ───────────────────────────── Accessories & props
function accessory(look) {
  const a = look.accColor || '#fff';
  switch (look.accessory) {
    case 'headband': return `<path d="M-66,-296 Q0,-332 66,-296" stroke="${a}" stroke-width="10" fill="none"/>`;
    case 'clip': return `<path d="M36,-318 l16,-8 l4,10 l-16,8 Z" fill="${a}" stroke="#999" stroke-width="2"/>`;
    case 'blossom': return `<g transform="translate(52,-316)">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-9" rx="6" ry="9" fill="${a}" transform="rotate(${r})"/>`).join('')}<circle r="4" fill="#ffe066"/></g>`;
    case 'cap': return `<path d="M-68,-296 Q-60,-346 0,-348 Q60,-346 68,-296 Z" fill="${a}"/><path d="M-68,-296 L-110,-292 Q-100,-304 -66,-306 Z" fill="${shade(a, -30)}"/>`;
    case 'glasses': return `<g fill="none" stroke="#2a2233" stroke-width="3.5"><rect x="${-EYE_X + 6 - 17}" y="${EYE_Y - 16}" width="34" height="30" rx="10"/><rect x="${EYE_X + 6 - 17}" y="${EYE_Y - 16}" width="34" height="30" rx="10"/><path d="M${-EYE_X + 23},${EYE_Y - 4} L${EYE_X - 11},${EYE_Y - 4}"/></g><rect x="${-EYE_X + 6 - 17}" y="${EYE_Y - 16}" width="34" height="30" rx="10" fill="${a}" opacity=".12"/>`;
    case 'bandana': return `<path d="M-68,-292 Q0,-322 68,-292 L66,-282 Q0,-310 -66,-282 Z" fill="${a}"/><path d="M-66,-288 l-24,10 l6,-18 Z" fill="${a}"/>`;
    case 'goggles': return `<path d="M-66,-300 Q0,-326 66,-300" stroke="#444" stroke-width="7" fill="none"/><circle cx="-18" cy="-312" r="13" fill="${a}" stroke="#444" stroke-width="4"/><circle cx="22" cy="-314" r="13" fill="${a}" stroke="#444" stroke-width="4"/>`;
    case 'headset': return `<path d="M-66,-276 Q-70,-346 0,-346 Q70,-346 66,-276" stroke="#333" stroke-width="7" fill="none"/><rect x="-78" y="-290" width="16" height="30" rx="6" fill="${a}"/><path d="M-70,-262 Q-60,-226 -10,-226" stroke="#333" stroke-width="4" fill="none"/><circle cx="-10" cy="-226" r="5" fill="#333"/>`;
    case 'pencil': return `<g transform="translate(-58,-312) rotate(-30)"><rect x="-4" y="-20" width="8" height="36" fill="${a}"/><path d="M-4,16 L0,26 L4,16 Z" fill="#f5d6a0"/></g>`;
    case 'facepaint': return `<path d="M-38,-252 l10,-10 l10,10 M40,-252 l10,-10 l10,10" stroke="${a}" stroke-width="5" fill="none"/>`;
    default: return '';
  }
}

function bodyExtra(look) {
  const a = look.accColor || '#fff';
  switch (look.accessory) {
    case 'jacket': return `<path d="M-40,-198 L-46,-110 L-14,-110 L-6,-190 Z M40,-198 L46,-110 L14,-110 L6,-190 Z" fill="${a}"/>`;
    case 'whistle': return `<path d="M-20,-200 L0,-160 L20,-200" stroke="#333" stroke-width="3" fill="none"/><rect x="-6" y="-164" width="14" height="10" rx="3" fill="${a}"/>`;
    case 'backpack': return `<path d="M-30,-196 L-34,-120 M30,-196 L34,-120" stroke="${a}" stroke-width="8"/>`;
    case 'camera': return `<path d="M-24,-200 L0,-150 L24,-200" stroke="#333" stroke-width="3" fill="none"/><rect x="-16" y="-156" width="32" height="22" rx="4" fill="${a}"/><circle cx="0" cy="-145" r="7" fill="#7fd3ff" stroke="#111" stroke-width="2"/>`;
    default: return '';
  }
}

export function propSVG(prop, look) {
  const o2 = look.outfit2 || '#ffd23f';
  switch (prop) {
    case 'skates': return `<g class="prop-feet"><rect x="-44" y="-10" width="36" height="8" rx="3" fill="${o2}"/><circle cx="-38" cy="2" r="6" fill="#333"/><circle cx="-14" cy="2" r="6" fill="#333"/><rect x="8" y="-10" width="36" height="8" rx="3" fill="${o2}"/><circle cx="14" cy="2" r="6" fill="#333"/><circle cx="38" cy="2" r="6" fill="#333"/></g>`;
    case 'scooter': return `<g><rect x="-50" y="-4" width="100" height="10" rx="5" fill="${o2}"/><circle cx="-42" cy="10" r="10" fill="#333"/><circle cx="42" cy="10" r="10" fill="#333"/><path d="M46,0 L60,-150" stroke="#888" stroke-width="7"/><path d="M42,-150 L78,-150" stroke="#333" stroke-width="8" stroke-linecap="round"/></g>`;
    case 'board': return `<g><path d="M-60,-6 Q-66,-4 -62,4 L62,4 Q66,-4 60,-6 Z" fill="${o2}"/><circle cx="-40" cy="10" r="7" fill="#333"/><circle cx="40" cy="10" r="7" fill="#333"/></g>`;
    case 'bike': return `<g fill="none" stroke="#333" stroke-width="6"><circle cx="-60" cy="-36" r="36"/><circle cx="70" cy="-36" r="36"/><path d="M-60,-36 L-10,-40 L40,-90 L70,-36 M-10,-40 L-24,-100 M40,-90 L-24,-100 M40,-90 L46,-120" stroke="${o2}"/><path d="M36,-122 L60,-122" stroke="#333"/><path d="M-36,-102 L-12,-102" stroke="#333" stroke-width="9"/></g>`;
    case 'bow': return `<g class="prop-hand"><path d="M70,-270 Q110,-190 70,-110" stroke="#8b5a2b" stroke-width="7" fill="none"/><path d="M70,-270 L70,-110" stroke="#ddd" stroke-width="2"/></g>`;
    case 'kayak': return `<g transform="translate(0,-80)"><path d="M-120,-40 Q0,-10 120,-40 Q60,-10 0,-8 Q-60,-10 -120,-40 Z" fill="${o2}" stroke="${shade(o2, -50)}" stroke-width="3"/><ellipse cx="0" cy="-36" rx="34" ry="8" fill="#222"/></g>`;
    case 'baton': return `<rect class="prop-hand" x="30" y="-120" width="12" height="36" rx="4" fill="#ffd23f" stroke="#b8860b" stroke-width="2"/>`;
    case 'flag': return `<g class="prop-hand"><path d="M40,-210 L40,-80" stroke="#8b5a2b" stroke-width="5"/><path d="M40,-210 L90,-192 L40,-174 Z" fill="${look.outfit2 || '#ff4fa3'}"/></g>`;
    case 'megaphone': return `<g class="prop-hand"><path d="M40,-170 L80,-190 L80,-130 L40,-150 Z" fill="#ffd23f" stroke="#333" stroke-width="3"/></g>`;
    default: return '';
  }
}

// ───────────────────────────── Creatures
function creatureSVG(c) {
  const { fur, fur2, glow } = c.look;
  switch (c.creature) {
    case 'sparkfox': return `<g class="cr-body"><path d="M40,-40 Q110,-80 120,-150 Q90,-110 60,-100" fill="${fur}" stroke="${glow}" stroke-width="4" class="cr-tail"/><ellipse cx="0" cy="-40" rx="48" ry="34" fill="${fur}"/><ellipse cx="-4" cy="-30" rx="26" ry="18" fill="${fur2}"/><circle cx="-36" cy="-84" r="34" fill="${fur}"/><path d="M-60,-104 L-66,-146 L-38,-114 Z M-18,-110 L-6,-148 L-4,-110 Z" fill="${fur}"/><ellipse cx="-48" cy="-70" rx="14" ry="10" fill="${fur2}"/><circle cx="-46" cy="-90" r="6" fill="#221"/><circle cx="-22" cy="-92" r="6" fill="#221"/><circle cx="-44" cy="-92" r="2" fill="#fff"/><circle cx="-20" cy="-94" r="2" fill="#fff"/><circle cx="-60" cy="-72" r="4" fill="#221"/><path d="M-30,-20 v20 M20,-20 v20" stroke="${fur}" stroke-width="12" stroke-linecap="round"/></g>`;
    case 'shadowcat': return `<g class="cr-body"><path d="M40,-40 Q100,-50 90,-130" fill="none" stroke="${fur}" stroke-width="14" stroke-linecap="round" class="cr-tail"/><ellipse cx="0" cy="-44" rx="54" ry="38" fill="${fur}"/><ellipse cx="-4" cy="-38" rx="30" ry="22" fill="${fur2}"/><circle cx="-34" cy="-92" r="40" fill="${fur}"/><path d="M-66,-110 L-70,-156 L-44,-124 Z M-10,-124 L0,-160 L6,-118 Z" fill="${fur}"/><ellipse cx="-50" cy="-94" rx="9" ry="11" fill="${glow}"/><ellipse cx="-20" cy="-96" rx="9" ry="11" fill="${glow}"/><ellipse cx="-50" cy="-94" rx="3" ry="8" fill="#12091f"/><ellipse cx="-20" cy="-96" rx="3" ry="8" fill="#12091f"/><path d="M-40,-74 q4,5 8,0" stroke="${glow}" stroke-width="3" fill="none"/><path d="M-30,-18 v18 M24,-18 v18" stroke="${fur}" stroke-width="14" stroke-linecap="round"/></g>`;
    case 'cloud': return `<g class="cr-body"><g fill="${fur}">${[-30, 0, 30].map((x) => `<circle cx="${x}" cy="-60" r="30"/>`).join('')}<circle cx="0" cy="-86" r="30"/></g><circle cx="-12" cy="-64" r="5" fill="#334"/><circle cx="12" cy="-64" r="5" fill="#334"/><path d="M-8,-50 q8,6 16,0" stroke="#334" stroke-width="3" fill="none"/><ellipse cx="-26" cy="-54" rx="7" ry="4" fill="#ffb3c7"/><ellipse cx="26" cy="-54" rx="7" ry="4" fill="#ffb3c7"/></g>`;
    case 'moth': return `<g class="cr-body"><ellipse cx="-26" cy="-70" rx="30" ry="22" fill="${fur}" opacity=".85" class="cr-wing"/><ellipse cx="26" cy="-70" rx="30" ry="22" fill="${fur}" opacity=".85" class="cr-wing"/><ellipse cx="0" cy="-66" rx="9" ry="22" fill="${fur2}"/><circle cx="0" cy="-66" r="46" fill="${glow}" opacity=".18"/><path d="M-4,-88 q-8,-14 -16,-14 M4,-88 q8,-14 16,-14" stroke="${fur2}" stroke-width="3" fill="none"/></g>`;
    case 'otter': return `<g class="cr-body"><ellipse cx="0" cy="-50" rx="30" ry="46" fill="${fur}"/><ellipse cx="0" cy="-40" rx="18" ry="30" fill="${fur2}"/><circle cx="0" cy="-104" r="28" fill="${fur}"/><ellipse cx="0" cy="-94" rx="16" ry="11" fill="${fur2}"/><circle cx="-10" cy="-110" r="5" fill="#221"/><circle cx="10" cy="-110" r="5" fill="#221"/><ellipse cx="0" cy="-98" rx="6" ry="4" fill="#221"/><path d="M26,-20 Q60,-10 56,-40" stroke="${fur}" stroke-width="12" fill="none" stroke-linecap="round" class="cr-tail"/></g>`;
    default: return `<circle cx="0" cy="-50" r="40" fill="${fur}"/>`;
  }
}

// ───────────────────────────── Puppet builder
// Returns { g, parts, setFace(expr, talking), setProp(prop) }.
export function buildPuppet(ch, opts = {}) {
  const g = svgEl('g', { class: 'puppet', 'data-id': ch.id });
  const inner = svgEl('g', { class: 'puppet-scale' });
  g.append(inner);
  const s = (ch.look.height || 1) * (opts.scale || 1);

  if (ch.kind === 'creature') {
    inner.setAttribute('transform', `scale(${s * 0.9})`);
    inner.innerHTML = `<ellipse cx="0" cy="4" rx="50" ry="10" fill="#000" opacity=".18"/>` + creatureSVG(ch);
    const body = inner.querySelector('.cr-body');
    return { g, inner, parts: { body }, creature: true, setFace() {}, setProp() {}, scale: s };
  }

  const L = ch.look;
  const skin = L.skin, o = L.outfit || '#888', o2 = L.outfit2 || '#ccc';
  const skinD = shade(skin, -24);
  const pants = shade(o, -45);
  inner.setAttribute('transform', `scale(${s})`);

  const stripe = L.stripes ? `<path d="M-30,-196 L-30,-112 M-10,-198 L-10,-110 M10,-198 L10,-110 M30,-196 L30,-112" stroke="#fff" stroke-width="7"/>` : '';
  const emblem = ch.team === 'wonderbolt'
    ? `<path d="M4,-178 L-10,-150 L0,-150 L-6,-126 L12,-158 L2,-158 L10,-178 Z" fill="${o2}" stroke="#fff" stroke-width="2"/>`
    : ch.team === 'shadowbolt'
      ? `<path d="M4,-178 L-10,-150 L0,-150 L-6,-126 L12,-158 L2,-158 L10,-178 Z" fill="#1a1030" stroke="${o2}" stroke-width="3"/>`
      : '';

  const beard = L.beard ? `<path d="M-50,-250 Q-40,-196 10,-196 Q60,-196 64,-250 Q40,-222 10,-222 Q-20,-222 -50,-250 Z" fill="${L.beard}"/>` : '';

  inner.innerHTML = `
    <ellipse class="shadow" cx="0" cy="4" rx="58" ry="12" fill="#000" opacity=".2"/>
    <g class="prop-back"></g>
    <g class="leg leg-b" transform="translate(-16,${HIP_Y})"><rect x="-13" y="0" width="26" height="100" rx="12" fill="${shade(pants, -15)}"/><path d="M-16,92 h36 a10,10 0 0 1 0,20 h-36 Z" fill="${shade(o2, -30)}"/></g>
    <g class="arm arm-b" transform="translate(-36,${SHOULDER_Y})"><rect x="-11" y="-4" width="22" height="86" rx="11" fill="${shade(o, -25)}"/><circle cx="0" cy="84" r="12" fill="${skinD}"/></g>
    <g class="torso">
      <path d="M-42,-196 Q-48,-150 -40,-104 L40,-104 Q48,-150 42,-196 Q0,-212 -42,-196 Z" fill="${o}"/>
      <path d="M-40,-120 L40,-120 L40,-104 L-40,-104 Z" fill="${pants}"/>
      <path d="M-42,-196 Q0,-180 42,-196" stroke="${o2}" stroke-width="7" fill="none"/>
      ${stripe}${emblem}${bodyExtra(L)}
    </g>
    <g class="leg leg-f" transform="translate(16,${HIP_Y})"><rect x="-13" y="0" width="26" height="100" rx="12" fill="${pants}"/><path d="M-16,92 h36 a10,10 0 0 1 0,20 h-36 Z" fill="${o2}"/></g>
    <g class="head" transform="translate(0,${NECK_Y})"><g transform="translate(0,${-NECK_Y})">
      <g class="hair-back">${hairBack(L.hairStyle, L.hair, L.hair2)}</g>
      <rect x="-12" y="-214" width="24" height="18" fill="${skinD}"/>
      <circle cx="0" cy="${HEAD_CY}" r="${HEAD_R}" fill="${skin}"/>
      <ellipse cx="-64" cy="-262" rx="9" ry="13" fill="${skinD}"/>
      <g class="face"></g>
      ${beard}
      <g class="hair-front">${hairFront(L.hairStyle, L.hair, L.hair2)}</g>
      <g class="acc">${accessory(L)}</g>
    </g></g>
    <g class="arm arm-f" transform="translate(36,${SHOULDER_Y})"><rect x="-11" y="-4" width="22" height="86" rx="11" fill="${o}"/><circle cx="0" cy="84" r="12" fill="${skin}"/></g>
    <g class="prop-front"></g>`;

  const q = (sel) => inner.querySelector(sel);
  const parts = {
    torso: q('.torso'), head: q('.head'), face: q('.face'),
    legF: q('.leg-f'), legB: q('.leg-b'), armF: q('.arm-f'), armB: q('.arm-b'),
    propBack: q('.prop-back'), propFront: q('.prop-front'), shadow: q('.shadow'),
  };
  let lastFace = '';
  const api = {
    g, inner, parts, scale: s,
    setFace(expr = 'neutral', talking = false) {
      const key = expr + (talking ? '1' : '0');
      if (key === lastFace) return;
      lastFace = key;
      parts.face.innerHTML = faceSVG(L, expr, talking);
    },
    setProp(prop) {
      parts.propBack.innerHTML = '';
      parts.propFront.innerHTML = '';
      if (!prop) return;
      const svg = propSVG(prop, L);
      if (['bike', 'scooter', 'board', 'skates'].includes(prop)) parts.propBack.innerHTML = svg;
      else parts.propFront.innerHTML = svg;
    },
  };
  api.setFace(opts.face || 'neutral');
  if (opts.prop) api.setProp(opts.prop);
  return api;
}

// Static SVG markup (thumbnails, portraits, cards). Returns an <svg> string.
export function portraitSVG(ch, { face = 'happy', w = 200, h = 220, bg = true, crop = 'bust', pose = null } = {}) {
  const tmp = buildPuppet(ch, { face });
  if (pose) applyStaticPose(tmp, pose);
  const inner = tmp.g.outerHTML;
  const team = ch.team;
  const bgFill = team === 'wonderbolt' ? 'url(#pg-wb)' : team === 'shadowbolt' ? 'url(#pg-sb)' : 'url(#pg-n)';
  const vb = ch.kind === 'creature' ? '-110 -190 220 220' : crop === 'bust' ? '-110 -380 220 250' : '-150 -410 300 430';
  return `<svg viewBox="${vb}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <radialGradient id="pg-wb" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#1f86ff"/></radialGradient>
      <radialGradient id="pg-sb" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#b58cff"/><stop offset="1" stop-color="#241046"/></radialGradient>
      <radialGradient id="pg-n" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#ffe0b2"/><stop offset="1" stop-color="#ff9f43"/></radialGradient>
    </defs>
    ${bg ? `<rect x="-400" y="-600" width="800" height="800" fill="${bgFill}"/>` : ''}
    ${inner}
  </svg>`;
}

// Static poses for thumbnails.
export function applyStaticPose(p, pose) {
  if (p.creature) return;
  const { armF, armB, legF, legB, torso, head } = p.parts;
  const set = (n, base, rot) => n.setAttribute('transform', `${base} rotate(${rot})`);
  const A = (side) => `translate(${side * 36},${SHOULDER_Y})`;
  const Lg = (side) => `translate(${side * 16},${HIP_Y})`;
  switch (pose) {
    case 'cheer': set(armF, A(1), -150); set(armB, A(-1), 150); break;
    case 'run': set(armF, A(1), -40); set(armB, A(-1), 40); set(legF, Lg(1), -35); set(legB, Lg(-1), 30); torso.setAttribute('transform', 'rotate(6)'); break;
    case 'point': set(armF, A(1), -95); break;
    case 'cross': set(armF, A(1), -60); set(armB, A(-1), 60); break;
    case 'wave': set(armF, A(1), -140); break;
    case 'hips': set(armF, A(1), -25); set(armB, A(-1), 25); break;
    case 'sad': head.setAttribute('transform', `translate(0,${NECK_Y}) rotate(12)`); break;
  }
}

export const RIG = { HIP_Y, SHOULDER_Y, NECK_Y, HEAD_CY };
