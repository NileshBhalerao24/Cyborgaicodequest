import type { Position, StartPosition } from './levels';
import type { SimGrid } from './interpreter';

/* =========================================================
   PREDICT DEMO DATA
   Ported verbatim — the demo code, demo scenario, question,
   and correct answer for each lesson's Predict→Run step are
   fixed content, not to be redesigned or re-derived. Only the
   TypeScript types are new.
   ========================================================= */

export interface PredictDemoLevel {
  cols: number;
  rows: number;
  start: StartPosition;
  goal: Position; // only meaningful when democode uses atGoal()
  walls: string[];
}

export interface PredictDemo {
  lesson: number; // matches LEVELS index, 1-based
  democode: string;
  demoLevel: PredictDemoLevel;
  question: string;
  options: string[];
  correctIndex: number;
}

export const PREDICT_DEMOS: PredictDemo[] = [
  {
    lesson: 1,
    democode: 'move()\nmove()',
    demoLevel: { cols: 3, rows: 1, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What will Cyborg do?',
    options: ['Move forward 2 steps', 'Turn around twice', 'Stay still'],
    correctIndex: 0,
  },
  {
    lesson: 2,
    democode: 'move()\nturnRight()\nmove()',
    demoLevel: { cols: 3, rows: 2, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What will Cyborg do?',
    options: ['Move right, then turn and move down', 'Spin in a circle', 'Move down first, then right'],
    correctIndex: 0,
  },
  {
    lesson: 3,
    democode: 'repeat(3) {\n  move()\n}',
    demoLevel: { cols: 4, rows: 1, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'How many times will move() run?',
    options: ['Once', 'Three times', 'Not at all'],
    correctIndex: 1,
  },
  {
    lesson: 4,
    democode: 'repeat(2) {\n  move()\n}\nturnRight()\nmove()',
    demoLevel: { cols: 3, rows: 2, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What happens after the loop finishes?',
    options: ['Cyborg turns and takes one more step', 'Cyborg stops right away', 'The loop repeats forever'],
    correctIndex: 0,
  },
  {
    lesson: 5,
    democode: 'if (wallAhead()) {\n  turnRight()\n} else {\n  move()\n}',
    demoLevel: { cols: 2, rows: 1, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: ['1,0'] },
    question: "There's a wall right in front of Cyborg. What will this code do?",
    options: ["Turn right, because there's a wall ahead", 'Walk into the wall anyway', 'Do nothing'],
    correctIndex: 0,
  },
  {
    lesson: 6,
    democode: 'let steps = 3\nrepeat(steps) {\n  move()\n}',
    demoLevel: { cols: 4, rows: 1, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What does `let steps = 3` do?',
    options: ['Stores the number 3 to use later', 'Makes Cyborg wait 3 seconds', 'Draws the number 3 on screen'],
    correctIndex: 0,
  },
  {
    lesson: 7,
    democode: 'function hop() {\n  move()\n  turnRight()\n  move()\n  turnLeft()\n}\nhop()',
    demoLevel: { cols: 3, rows: 3, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What will calling hop() once do?',
    options: [
      'Move diagonally — forward, turn, forward, turn back',
      'Move forward 4 times in a straight line',
      'Do nothing until called twice',
    ],
    correctIndex: 0,
  },
  {
    lesson: 8,
    democode: 'while (!atGoal()) {\n  move()\n}',
    demoLevel: { cols: 4, rows: 1, start: { x: 0, y: 0, dir: 1 }, goal: { x: 3, y: 0 }, walls: [] },
    question: 'How long will this loop keep going?',
    options: ['Exactly 3 times, no matter what', 'Until Cyborg actually reaches the goal', 'Forever, it never stops'],
    correctIndex: 1,
  },
  {
    lesson: 9,
    democode: 'function goToWall() {\n  while (!wallAhead()) {\n    move()\n  }\n  turnRight()\n}\ngoToWall()',
    demoLevel: { cols: 3, rows: 3, start: { x: 0, y: 0, dir: 1 }, goal: { x: 0, y: 0 }, walls: [] },
    question: 'What does goToWall() do?',
    options: [
      'Keeps moving until it hits a wall, then turns',
      'Turns immediately without moving',
      'Moves exactly 3 steps then stops',
    ],
    correctIndex: 0,
  },
];

export function getPredictDemo(lessonIndex: number): PredictDemo | undefined {
  return PREDICT_DEMOS.find((d) => d.lesson === lessonIndex + 1);
}

export function toSimGrid(demoLevel: PredictDemoLevel): SimGrid {
  return {
    cols: demoLevel.cols,
    rows: demoLevel.rows,
    start: demoLevel.start,
    goal: demoLevel.goal,
    wallSet: new Set(demoLevel.walls),
    gemSet: new Set<string>(),
    gems: [],
  };
}
