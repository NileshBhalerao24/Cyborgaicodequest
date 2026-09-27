import type { Position, StartPosition } from './levels';

/* =========================================================
   PARSER  (function extraction -> recursive-descent -> AST nodes)
   Ported verbatim from the web version, with only the minimal
   changes needed to add TypeScript types. Grammar, error copy,
   and evaluation order are unchanged.

   Node shapes:
     "move" | "turnLeft" | "turnRight"                (atomic action)
     { type:'if', cond, then:[...], else:[...] }
     { type:'while', cond, body:[...] }
   ========================================================= */

export type ActionNode = 'move' | 'turnLeft' | 'turnRight';

export interface Condition {
  sensor: 'wallAhead' | 'atGoal';
  negate: boolean;
}

export interface IfNode {
  type: 'if';
  cond: Condition;
  then: AstNode[];
  else: AstNode[];
}

export interface WhileNode {
  type: 'while';
  cond: Condition;
  body: AstNode[];
}

export type AstNode = ActionNode | IfNode | WhileNode;

interface ParseContext {
  functions: Record<string, string>;
  symbols: Record<string, number>;
  inlineStack: string[];
}

export function extractFunctions(source: string): { functions: Record<string, string>; remaining: string } {
  const functions: Record<string, string> = {};
  let out = '';
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const m = /^function\s+([a-zA-Z_]\w*)\s*\(\s*\)\s*\{/.exec(rest);
    if (m) {
      const name = m[1];
      let j = i + m[0].length;
      let depth = 1;
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
        j++;
      }
      if (depth !== 0) throw new Error('A function definition is missing a closing }.');
      functions[name] = source.slice(i + m[0].length, j - 1);
      i = j;
      continue;
    }
    out += source[i];
    i++;
  }
  return { functions, remaining: out };
}

export function parseSource(sourceStr: string, ctx: ParseContext): AstNode[] {
  const str = sourceStr;
  let i = 0;

  function skipWs(): void {
    while (i < str.length && /[\s;]/.test(str[i])) i++;
  }

  function parseNumberExpr(): number {
    skipWs();
    const numMatch = /^[0-9]+/.exec(str.slice(i));
    if (numMatch) {
      i += numMatch[0].length;
      return parseInt(numMatch[0], 10);
    }
    const idMatch = /^[a-zA-Z_]\w*/.exec(str.slice(i));
    if (idMatch) {
      i += idMatch[0].length;
      if (!(idMatch[0] in ctx.symbols)) {
        throw new Error('"' + idMatch[0] + "\" doesn't have a value yet — try let " + idMatch[0] + ' = <number> first.');
      }
      return ctx.symbols[idMatch[0]];
    }
    throw new Error('Expected a number here.');
  }

  function parseCondition(): Condition {
    skipWs();
    let negate = false;
    if (str[i] === '!') {
      negate = true;
      i++;
      skipWs();
    }
    const m = /^[a-zA-Z_]\w*/.exec(str.slice(i));
    if (!m) throw new Error('Expected a check like wallAhead() here.');
    const name = m[0];
    if (!['wallAhead', 'atGoal'].includes(name)) {
      throw new Error('"' + name + '" is not something Cyborg can check.');
    }
    i += name.length;
    skipWs();
    if (str[i] !== '(') throw new Error(name + ' needs parentheses, like ' + name + '().');
    i++;
    skipWs();
    if (str[i] !== ')') throw new Error(name + "() shouldn't have anything inside.");
    i++;
    return { sensor: name as Condition['sensor'], negate };
  }

  function parseBlock(): AstNode[] {
    skipWs();
    if (str[i] !== '{') throw new Error('Expected a { to start a block of commands.');
    i++;
    const nodes = parseStatements();
    skipWs();
    if (str[i] !== '}') throw new Error('A block of commands is missing a closing }.');
    i++;
    return nodes;
  }

  function parseStatement(): AstNode[] {
    skipWs();
    const m = /^[a-zA-Z_]\w*/.exec(str.slice(i));
    if (!m) throw new Error("Cyborg doesn't recognize that.");
    const word = m[0];
    i += word.length;
    skipWs();

    if (word === 'let') {
      const nm = /^[a-zA-Z_]\w*/.exec(str.slice(i));
      if (!nm) throw new Error('let needs a name, like let steps = 3.');
      const name = nm[0];
      i += name.length;
      skipWs();
      if (str[i] !== '=') throw new Error('let needs an =, like let steps = 3.');
      i++;
      skipWs();
      ctx.symbols[name] = parseNumberExpr();
      return [];
    }

    if (word === 'repeat') {
      if (str[i] !== '(') throw new Error('repeat needs a number in parentheses, like repeat(3).');
      i++;
      const n = parseNumberExpr();
      if (n > 30) throw new Error("Whoa, that's a big number! Try repeating 30 times or fewer.");
      skipWs();
      if (str[i] !== ')') throw new Error('repeat is missing a closing parenthesis.');
      i++;
      const inner = parseBlock();
      const result: AstNode[] = [];
      for (let k = 0; k < n; k++) result.push(...inner);
      if (result.length > 250) throw new Error("That's a lot of steps! Try a smaller loop.");
      return result;
    }

    if (word === 'if') {
      if (str[i] !== '(') throw new Error('if needs a check in parentheses, like if (wallAhead()).');
      i++;
      const cond = parseCondition();
      skipWs();
      if (str[i] !== ')') throw new Error('if is missing a closing parenthesis.');
      i++;
      const thenNodes = parseBlock();
      let elseNodes: AstNode[] = [];
      skipWs();
      const elseMatch = /^else\b/.exec(str.slice(i));
      if (elseMatch) {
        i += elseMatch[0].length;
        elseNodes = parseBlock();
      }
      return [{ type: 'if', cond, then: thenNodes, else: elseNodes }];
    }

    if (word === 'while') {
      if (str[i] !== '(') throw new Error('while needs a check in parentheses, like while (!atGoal()).');
      i++;
      const cond = parseCondition();
      skipWs();
      if (str[i] !== ')') throw new Error('while is missing a closing parenthesis.');
      i++;
      const body = parseBlock();
      return [{ type: 'while', cond, body }];
    }

    if (['move', 'turnLeft', 'turnRight'].includes(word)) {
      if (str[i] !== '(') throw new Error(word + ' needs parentheses, like ' + word + '().');
      i++;
      skipWs();
      if (str[i] !== ')') throw new Error(word + "() shouldn't have anything inside the parentheses.");
      i++;
      return [word as ActionNode];
    }

    if (word in ctx.functions) {
      if (str[i] !== '(') throw new Error(word + ' needs parentheses, like ' + word + '().');
      i++;
      skipWs();
      if (str[i] !== ')') throw new Error(word + "() shouldn't have anything inside the parentheses.");
      i++;
      if (ctx.inlineStack.includes(word)) throw new Error("Functions can't call themselves — that would run forever.");
      ctx.inlineStack.push(word);
      const bodyNodes = parseSource(ctx.functions[word], ctx);
      ctx.inlineStack.pop();
      return bodyNodes;
    }

    throw new Error('"' + word + '" is not a command Cyborg knows yet.');
  }

  function parseStatements(): AstNode[] {
    const nodes: AstNode[] = [];
    skipWs();
    while (i < str.length && str[i] !== '}') {
      const before = i;
      nodes.push(...parseStatement());
      skipWs();
      if (i === before) throw new Error('Cyborg got stuck reading your code.');
    }
    return nodes;
  }

  const nodes = parseStatements();
  skipWs();
  if (i < str.length) throw new Error("There's extra text Cyborg can't understand.");
  return nodes;
}

export function parseProgram(rawSource: string): AstNode[] {
  const { functions, remaining } = extractFunctions(rawSource);
  const ctx: ParseContext = { functions, symbols: {}, inlineStack: [] };
  const nodes = parseSource(remaining, ctx);
  if (nodes.length === 0) throw new Error('Write at least one command for Cyborg to run.');
  return nodes;
}

/* =========================================================
   EXECUTOR  (walks AST nodes against live maze state)
   ========================================================= */

export interface SimState {
  x: number;
  y: number;
  dir: number;
}

export interface TraceFrame {
  x: number;
  y: number;
  dir: number;
  crashed: boolean;
  gem: string | null;
}

export const DELTA = [
  { x: 0, y: -1 }, // up
  { x: 1, y: 0 }, // right
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
];

export const MAX_BUDGET = 400;

export class CrashSignal extends Error {}

interface Budget {
  count: number;
}

/**
 * The minimal shape execute()/simulate() need. `Level` (the graded-lesson
 * type in game/levels.ts) satisfies this structurally, but so does a small
 * Predict demo grid or the goal-less Free Build sandbox — neither carries
 * lesson metadata like title/hint/badge.
 */
export interface SimGrid {
  cols: number;
  rows: number;
  start: StartPosition;
  goal: Position;
  wallSet: Set<string>;
  gemSet: Set<string>;
  gems: Position[];
}

export function evalCond(cond: Condition, state: SimState, level: SimGrid): boolean {
  let result: boolean;
  if (cond.sensor === 'wallAhead') {
    const nx = state.x + DELTA[state.dir].x;
    const ny = state.y + DELTA[state.dir].y;
    result = nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows || level.wallSet.has(nx + ',' + ny);
  } else {
    result = state.x === level.goal.x && state.y === level.goal.y;
  }
  return cond.negate ? !result : result;
}

export function execute(
  nodes: AstNode[],
  state: SimState,
  level: SimGrid,
  trace: TraceFrame[],
  budget: Budget,
  gemsCollected: Set<string>,
  sandbox: boolean = false
): void {
  for (const node of nodes) {
    if (typeof node === 'string') {
      if (node === 'move') {
        const nx = state.x + DELTA[state.dir].x;
        const ny = state.y + DELTA[state.dir].y;
        const blocked = nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows || level.wallSet.has(nx + ',' + ny);
        if (blocked) {
          if (sandbox) {
            // Free Build: a blocked move is a silent no-op, never a crash.
            trace.push({ x: state.x, y: state.y, dir: state.dir, crashed: false, gem: null });
          } else {
            trace.push({ x: state.x, y: state.y, dir: state.dir, crashed: true, gem: null });
            throw new CrashSignal();
          }
        } else {
          state.x = nx;
          state.y = ny;
          const key = state.x + ',' + state.y;
          let gem: string | null = null;
          if (level.gemSet.has(key) && !gemsCollected.has(key)) {
            gemsCollected.add(key);
            gem = key;
          }
          trace.push({ x: state.x, y: state.y, dir: state.dir, crashed: false, gem });
        }
      } else {
        if (node === 'turnRight') state.dir = (state.dir + 1) % 4;
        else state.dir = (state.dir + 3) % 4;
        trace.push({ x: state.x, y: state.y, dir: state.dir, crashed: false, gem: null });
      }
      budget.count++;
      if (budget.count > MAX_BUDGET) {
        throw new Error('This program runs for a very long time — check that something changes each time through your loop.');
      }
    } else if (node.type === 'if') {
      execute(evalCond(node.cond, state, level) ? node.then : node.else, state, level, trace, budget, gemsCollected, sandbox);
    } else if (node.type === 'while') {
      while (evalCond(node.cond, state, level)) {
        budget.count++;
        if (budget.count > MAX_BUDGET) {
          throw new Error('This program runs for a very long time — check that something changes each time through your loop.');
        }
        execute(node.body, state, level, trace, budget, gemsCollected, sandbox);
      }
    }
  }
}

export interface SimulationResult {
  trace: TraceFrame[];
  success: boolean;
  crashed: boolean;
  allGems: boolean;
}

export function simulate(nodes: AstNode[], level: SimGrid, sandbox: boolean = false): SimulationResult {
  const state: SimState = { x: level.start.x, y: level.start.y, dir: level.start.dir };
  const trace: TraceFrame[] = [{ x: state.x, y: state.y, dir: state.dir, crashed: false, gem: null }];
  const budget: Budget = { count: 0 };
  const gemsCollected = new Set<string>();
  let crashed = false;
  try {
    execute(nodes, state, level, trace, budget, gemsCollected, sandbox);
  } catch (e) {
    if (e instanceof CrashSignal) crashed = true;
    else throw e;
  }
  const success = !crashed && state.x === level.goal.x && state.y === level.goal.y;
  const allGems = level.gems.length === 0 || level.gems.every((g) => gemsCollected.has(g.x + ',' + g.y));
  return { trace, success, crashed, allGems };
}
