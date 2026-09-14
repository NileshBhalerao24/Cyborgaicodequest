/* =========================================================
   LEVEL DATA
   Ported verbatim from the web version — do not change level
   geometry, walls, gems, goals, or hints. Each hint is verified
   to reach the goal and collect all gems for its level.
   ========================================================= */

export interface Position {
  x: number;
  y: number;
}

export interface StartPosition extends Position {
  dir: number; // 0=up, 1=right, 2=down, 3=left
}

export interface Badge {
  icon: string;
  name: string;
}

export interface Level {
  title: string;
  text: string;
  refs: string[];
  chips: string[];
  cols: number;
  rows: number;
  start: StartPosition;
  goal: Position;
  walls: string[];
  gems: Position[];
  hint: string;
  badge: Badge;
  wallSet: Set<string>;
  gemSet: Set<string>;
}

type RawLevel = Omit<Level, 'wallSet' | 'gemSet'>;

const RAW_LEVELS: RawLevel[] = [
  {
    title: 'Lesson 1: Sequences',
    text: "Hi, I'm Cyborg! I need to reach the star. Type move() to make me take one step forward. Use enough move() commands to get me all the way there.",
    refs: ['move()'],
    chips: ['move()'],
    cols: 5,
    rows: 1,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 4, y: 0 },
    walls: [],
    gems: [{ x: 2, y: 0 }],
    hint: 'move()\nmove()\nmove()\nmove()',
    badge: { icon: '🚀', name: 'Blast Off' },
  },
  {
    title: 'Lesson 2: Turning',
    text: 'Nice work! Now the path bends. Use turnRight() or turnLeft() to spin me a quarter turn, then keep moving to reach the star.',
    refs: ['move()', 'turnRight()', 'turnLeft()'],
    chips: ['move()', 'turnRight()', 'turnLeft()'],
    cols: 5,
    rows: 3,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 4, y: 2 },
    walls: ['1,1', '1,2'],
    gems: [{ x: 3, y: 0 }, { x: 4, y: 1 }],
    hint: 'move()\nmove()\nmove()\nmove()\nturnRight()\nmove()\nmove()',
    badge: { icon: '🛰️', name: 'Satellite Pilot' },
  },
  {
    title: 'Lesson 3: Loops',
    text: "This path is long! Instead of writing move() six times, wrap it in a loop: repeat(6) { move() } runs move() six times in a row.",
    refs: ['repeat(n) { ... }'],
    chips: ['move()', 'repeat(3) {\n  \n}'],
    cols: 7,
    rows: 1,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 6, y: 0 },
    walls: [],
    gems: [{ x: 3, y: 0 }],
    hint: 'repeat(6) {\n  move()\n}',
    badge: { icon: '🪐', name: 'Orbit Master' },
  },
  {
    title: 'Lesson 4: Put it together',
    text: 'Combine a loop and a turn to steer me around the corner and reach the star.',
    refs: ['move()', 'turnRight()', 'repeat(n) { ... }'],
    chips: ['move()', 'turnRight()', 'turnLeft()', 'repeat(3) {\n  \n}'],
    cols: 5,
    rows: 3,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 3, y: 2 },
    walls: ['0,1', '0,2'],
    gems: [{ x: 2, y: 0 }, { x: 3, y: 1 }],
    hint: 'repeat(3) {\n  move()\n}\nturnRight()\nrepeat(2) {\n  move()\n}',
    badge: { icon: '☄️', name: 'Comet Chaser' },
  },
  {
    title: 'Lesson 5: Decisions',
    text: "Cyborg hits a dead end and can't always know what's ahead! Use if (wallAhead()) { turnRight() } else { move() } so Cyborg decides for itself, then finish the trip with one more move().",
    refs: ['if (check) { ... }', 'else { ... }', 'wallAhead()'],
    chips: ['move()', 'turnRight()', 'if (wallAhead()) {\n  \n} else {\n  \n}'],
    cols: 4,
    rows: 2,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 2, y: 1 },
    walls: ['3,0'],
    gems: [{ x: 1, y: 0 }],
    hint: 'move()\nmove()\nif (wallAhead()) {\n  turnRight()\n} else {\n  move()\n}\nmove()',
    badge: { icon: '🛸', name: 'Star Navigator' },
  },
  {
    title: 'Lesson 6: Variables',
    text: 'A variable is a labeled box that holds a number. Use let steps = 5 to store how far Cyborg should go, then repeat(steps) { move() } to use it.',
    refs: ['let name = number', 'repeat(steps) { ... }'],
    chips: ['let steps = 5', 'repeat(steps) {\n  move()\n}'],
    cols: 6,
    rows: 1,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 5, y: 0 },
    walls: [],
    gems: [{ x: 3, y: 0 }],
    hint: 'let steps = 5\nrepeat(steps) {\n  move()\n}',
    badge: { icon: '🔭', name: 'Star Chartist' },
  },
  {
    title: 'Lesson 7: Functions',
    text: 'Functions let you name a group of moves and reuse them. Define function hop() with a move-turn-move-turn pattern, then call hop() as many times as you like.',
    refs: ['function name() { ... }', 'call it: name()'],
    chips: ['function hop() {\n  \n}', 'repeat(3) {\n  hop()\n}'],
    cols: 4,
    rows: 4,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 3, y: 3 },
    walls: ['0,3', '3,0'],
    gems: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
    hint: 'function hop() {\n  move()\n  turnRight()\n  move()\n  turnLeft()\n}\nrepeat(3) {\n  hop()\n}',
    badge: { icon: '🧑‍🚀', name: 'Mission Engineer' },
  },
  {
    title: 'Lesson 8: Loop until done',
    text: "Sometimes you don't know exactly how many steps you need! Use while (!atGoal()) { move() } to keep going until Cyborg actually arrives — no counting required.",
    refs: ['while (check) { ... }', 'atGoal()'],
    chips: ['move()', 'while (!atGoal()) {\n  \n}'],
    cols: 7,
    rows: 1,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 6, y: 0 },
    walls: [],
    gems: [{ x: 3, y: 0 }],
    hint: 'while (!atGoal()) {\n  move()\n}',
    badge: { icon: '🌌', name: 'Galaxy Wizard' },
  },
  {
    title: 'Lesson 9: Master Coder Challenge',
    text: 'The final challenge! Write a function that drives forward until it hits a wall, then turns — call it twice to steer Cyborg all the way around the corner to the star.',
    refs: ['function', 'while', 'wallAhead()', 'call it twice'],
    chips: ['function goToWall() {\n  \n}', 'while (!wallAhead()) {\n  move()\n}', 'goToWall()'],
    cols: 5,
    rows: 5,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 4, y: 4 },
    walls: ['1,2', '2,1'],
    gems: [{ x: 2, y: 0 }, { x: 4, y: 2 }],
    hint: 'function goToWall() {\n  while (!wallAhead()) {\n    move()\n  }\n  turnRight()\n}\ngoToWall()\ngoToWall()',
    badge: { icon: '🏆', name: 'Galaxy Champion' },
  },
];

export const LEVELS: Level[] = RAW_LEVELS.map((level) => ({
  ...level,
  wallSet: new Set(level.walls),
  gemSet: new Set(level.gems.map((g) => `${g.x},${g.y}`)),
}));

export const MAX_STARS = LEVELS.length * 2;
