// Mini-game registry.
import { Skating } from './skating.js';
import { Scooter } from './scooter.js';
import { Archery } from './archery.js';
import { Climbing } from './climbing.js';
import { Swimming } from './swimming.js';
import { Maze } from './maze.js';
import { Relay } from './relay.js';

export const GAMES = [
  { id: 'skating', name: 'Skating Sprint', icon: '🛼', cls: Skating, bg: 'linear-gradient(135deg,#1f86ff,#7fd0ff)', desc: 'Push, jump cones, hit ramps and out-skate your rival.', controls: 'Tap → to push · Space/↑ to jump', touch: [['Jump', 'Space'], ['Push ▶', 'ArrowRight']] },
  { id: 'scooter', name: 'Scooter Challenge', icon: '🛴', cls: Scooter, bg: 'linear-gradient(135deg,#ff7b00,#ffd23f)', desc: 'Three lanes. Cones, puddles, bolts. 45 seconds.', controls: '← → to switch lanes', touch: [['◀', 'ArrowLeft'], ['▶', 'ArrowRight']] },
  { id: 'archery', name: 'Archery Duel', icon: '🏹', cls: Archery, bg: 'linear-gradient(135deg,#43a047,#b2ff59)', desc: 'Steady your breath, read the wind, shoot five arrows.', controls: 'Hold ↑ to steady · Space to shoot', touch: [['Steady', 'ArrowUp'], ['Shoot', 'Space']] },
  { id: 'climbing', name: 'Wall Climb', icon: '🧗', cls: Climbing, bg: 'linear-gradient(135deg,#8d6e63,#d7ccc8)', desc: 'Match the holds, manage your grip, ring the bell first.', controls: '← / → for the glowing hold', touch: [['◀ Left hold', 'ArrowLeft'], ['Right hold ▶', 'ArrowRight']] },
  { id: 'swimming', name: 'Freestyle Swim', icon: '🏊', cls: Swimming, bg: 'linear-gradient(135deg,#0288d1,#80deea)', desc: 'Alternate strokes, breathe on time, nail the flip turn.', controls: 'Alternate ← → · ↑ breathe · Space turn', touch: [['◀', 'ArrowLeft'], ['Breathe', 'ArrowUp'], ['Turn', 'Space'], ['▶', 'ArrowRight']] },
  { id: 'maze', name: 'Whisperwood Maze', icon: '🌿', cls: Maze, bg: 'linear-gradient(135deg,#1b5e20,#66bb6a)', desc: 'A new maze every time. Beat your rival to the flag.', controls: 'Arrow keys or swipe', touch: [['◀', 'ArrowLeft'], ['▲', 'ArrowUp'], ['▼', 'ArrowDown'], ['▶', 'ArrowRight']] },
  { id: 'relay', name: 'Relay Rescue', icon: '🥇', cls: Relay, bg: 'linear-gradient(135deg,#6c3bd1,#ff4fa3)', desc: 'Four legs, three hand-offs, one team.', controls: 'Alternate ← → · Space in the gold zone', touch: [['◀', 'ArrowLeft'], ['Pass', 'Space'], ['▶', 'ArrowRight']] },
];
export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));
