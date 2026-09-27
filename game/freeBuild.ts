import type { SimGrid } from './interpreter';

/* =========================================================
   FREE BUILD — the open sandbox after Lesson 9.
   No walls, no gems, no goal check, no fail state. `goal` below
   is a type-satisfying placeholder only: the sandbox never checks
   it, and the atGoal()/while(!atGoal()) construct is deliberately
   left out of FREE_BUILD_CHIPS since "goal" is not a concept that
   exists in a goal-less sandbox (see README design notes).
   ========================================================= */

export const FREE_BUILD_COLS = 7;
export const FREE_BUILD_ROWS = 7;
export const FREE_BUILD_START = { x: 3, y: 3, dir: 0 };

export function makeFreeBuildGrid(): SimGrid {
  return {
    cols: FREE_BUILD_COLS,
    rows: FREE_BUILD_ROWS,
    start: FREE_BUILD_START,
    goal: { x: -1, y: -1 }, // unreachable — Free Build has no goal
    wallSet: new Set<string>(),
    gemSet: new Set<string>(),
    gems: [],
  };
}

export const FREE_BUILD_CHIPS: string[] = [
  'move()',
  'turnRight()',
  'turnLeft()',
  'repeat(3) {\n  \n}',
  'if (wallAhead()) {\n  \n} else {\n  \n}',
  'let steps = 5',
  'repeat(steps) {\n  move()\n}',
  'function shape() {\n  \n}',
  'while (!wallAhead()) {\n  move()\n}',
];

export interface FreeBuildSuggestion {
  label: string;
  code: string;
}

export const FREE_BUILD_SUGGESTIONS: FreeBuildSuggestion[] = [
  {
    label: 'Draw a square',
    code: 'repeat(4) {\n  repeat(3) {\n    move()\n  }\n  turnRight()\n}',
  },
  {
    label: 'Draw a staircase',
    code: 'repeat(4) {\n  move()\n  turnRight()\n  move()\n  turnLeft()\n}',
  },
  {
    label: 'Spiral outward',
    code: 'repeat(4) {\n  repeat(2) {\n    move()\n  }\n  turnRight()\n}',
  },
];
