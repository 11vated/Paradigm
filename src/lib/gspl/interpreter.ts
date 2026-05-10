import { parse, type Expr, type Program, type Statement } from './parser.js';

export interface GSPLExecutionResult {
  seeds: any[];
  output: string[];
  errors: string[];
}

interface ReturnSignal {
  __return: true;
  value: any;
}

export class GSPLInterpreter {
  execute(source: string): GSPLExecutionResult {
    return executeGSPL(source);
  }
}

export function executeGSPL(source: string): GSPLExecutionResult {
  const parsed = parse(source);
  const result: GSPLExecutionResult = { seeds: [], output: [], errors: [...parsed.errors] };
  if (parsed.errors.length > 0) return result;
  const env = new Map<string, any>();
  try {
    runProgram(parsed.ast, env, result);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  return result;
}

function runProgram(program: Program, env: Map<string, any>, result: GSPLExecutionResult): void {
  for (const statement of program.body) {
    runStatement(statement, env, result);
  }
}

function runStatement(statement: Statement, env: Map<string, any>, result: GSPLExecutionResult): any {
  switch (statement.kind) {
    case 'seed_decl': {
      const name = String(evalExpr(statement.name, env, result));
      const domain = String(evalExpr(statement.domain, env, result));
      const seed = makeSeed(name, domain, statement.genes, env, result);
      result.seeds.push(seed);
      env.set(name.replace(/\W/g, ''), seed);
      env.set(name, seed);
      return seed;
    }
    case 'let_binding': {
      const value = evalExpr(statement.value, env, result);
      env.set(statement.name, value);
      return value;
    }
    case 'fn_decl':
      env.set(statement.name, statement);
      return statement;
    case 'return_stmt':
      return { __return: true, value: evalExpr(statement.value, env, result) } satisfies ReturnSignal;
    case 'expr_stmt':
      return evalExpr(statement.expr, env, result);
    case 'if_stmt': {
      const branch = evalExpr(statement.condition, env, result) ? statement.then : statement.else_branch;
      return runBlock(branch, env, result);
    }
    case 'for_stmt': {
      const iterable = evalExpr(statement.iterable, env, result);
      const values = Array.isArray(iterable) ? iterable : [];
      for (const [index, value] of values.entries()) {
        if (index >= 1000) break;
        env.set(statement.variable, value);
        const signal = runBlock(statement.body, env, result);
        if (isReturn(signal)) return signal;
      }
      return undefined;
    }
  }
}

function runBlock(statements: Statement[], env: Map<string, any>, result: GSPLExecutionResult): any {
  for (const statement of statements) {
    const value = runStatement(statement, env, result);
    if (isReturn(value)) return value;
  }
  return undefined;
}

function evalExpr(expr: Expr, env: Map<string, any>, result: GSPLExecutionResult): any {
  switch (expr.kind) {
    case 'literal':
      return expr.value;
    case 'identifier':
      return resolveIdentifier(expr.name, env);
    case 'array':
      return expr.elements.map(element => evalExpr(element, env, result));
    case 'object': {
      const object: Record<string, any> = {};
      for (const property of expr.properties) {
        object[property.name] = evalExpr(property.value, env, result);
      }
      return object;
    }
    case 'unary': {
      const value = evalExpr(expr.expr, env, result);
      return expr.op === '-' ? -value : value;
    }
    case 'binary': {
      const left = evalExpr(expr.left, env, result);
      const right = evalExpr(expr.right, env, result);
      if (expr.op === '+') return left + right;
      if (expr.op === '-') return left - right;
      if (expr.op === '*') return left * right;
      if (expr.op === '/') return left / right;
      if (expr.op === '>') return left > right;
      if (expr.op === '<') return left < right;
      return undefined;
    }
    case 'call':
      return callFunction(expr.callee, expr.args.map(arg => evalExpr(arg, env, result)), env, result);
  }
}

function callFunction(name: string, args: any[], env: Map<string, any>, result: GSPLExecutionResult): any {
  if (name === 'print') {
    result.output.push(formatOutput(args[0]));
    return args[0];
  }
  if (name === 'len') return Array.isArray(args[0]) || typeof args[0] === 'string' ? args[0].length : 0;
  if (name === 'range') return Array.from({ length: Math.max(0, Math.min(Number(args[0]) || 0, 1000)) }, (_, i) => i);
  if (name === 'abs') return Math.abs(Number(args[0]));
  if (name === 'domains') return Array.from({ length: 27 }, (_, i) => `domain_${i}`);
  if (name === 'mutate') {
    const seed = cloneSeed(args[0]);
    seed.id = `${seed.id}_mutated`;
    seed.$name = `${seed.$name}_mutated`;
    seed.$hash = hashSeed(seed);
    seed.$lineage = { operation: 'gspl_mutate', parents: [args[0]?.id].filter(Boolean) };
    result.seeds.push(seed);
    return seed;
  }
  if (name === 'breed') {
    const child = cloneSeed(args[0]);
    child.id = `${args[0]?.id ?? 'a'}_${args[1]?.id ?? 'b'}_child`;
    child.$name = 'Child';
    child.$hash = hashSeed(child);
    child.$lineage = { operation: 'gspl_breed', parents: [args[0]?.id, args[1]?.id].filter(Boolean) };
    result.seeds.push(child);
    return child;
  }
  if (name === 'evolve') {
    const count = Number(args[1]) || 0;
    return Array.from({ length: count }, (_, i) => ({ ...cloneSeed(args[0]), id: `${args[0]?.id ?? 'seed'}_${i}` }));
  }
  if (name === 'grow') return { domain: args[0]?.$domain ?? 'unknown', seed: args[0]?.$name ?? 'seed' };
  const fn = env.get(name);
  if (fn?.kind === 'fn_decl') {
    const local = new Map(env);
    fn.params.forEach((param: string, index: number) => local.set(param, args[index]));
    const signal = runBlock(fn.body, local, result);
    return isReturn(signal) ? signal.value : signal;
  }
  throw new Error(`Unknown function: ${name}`);
}

function makeSeed(name: string, domain: string, genes: { name: string; value: Expr }[], env: Map<string, any>, result: GSPLExecutionResult): any {
  const geneValues: Record<string, any> = {};
  for (const gene of genes) {
    const value = evalExpr(gene.value, env, result);
    geneValues[gene.name] = { type: Array.isArray(value) ? 'vector' : typeof value === 'number' ? 'scalar' : 'categorical', value };
  }
  const seed = {
    id: `seed_${hashString(`${name}:${domain}`).slice(0, 8)}`,
    $domain: domain,
    $name: name,
    genes: geneValues,
    $fitness: { overall: Number(`0.${hashString(name).slice(0, 6)}`) },
  };
  return { ...seed, $hash: hashSeed(seed) };
}

function resolveIdentifier(path: string, env: Map<string, any>): any {
  const [head, ...tail] = path.split('.');
  let value = env.get(head) ?? env.get(path);
  for (const segment of tail) value = value?.[segment];
  return value;
}

function cloneSeed(seed: any): any {
  return JSON.parse(JSON.stringify(seed ?? {}));
}

function hashSeed(seed: any): string {
  return hashString(JSON.stringify(seed));
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
}

function formatOutput(value: any): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function isReturn(value: any): value is ReturnSignal {
  return value?.__return === true;
}
