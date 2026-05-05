/**
 * GSPL Interpreter — Tree-walking interpreter for the Genetic Structured Programming Language.
 *
 * Executes GSPL AST nodes against the Paradigm kernel. All operations are deterministic:
 * randomness comes only from rngFromHash, never Math.random.
 *
 * Built-in functions: mutate, compose, grow, breed, evolve, distance, print, len, keys, domain_of, genes_of
 */

import crypto from 'crypto';
import { parse, type Program, type Statement, type Expr, type GeneAssignment } from './parser.js';
import { rngFromHash } from '../kernel/rng.js';
import { growSeed, getAllDomains } from '../kernel/engines.js';
import { composeSeed } from '../kernel/composition.js';
import { mutateGene, crossoverGene, distanceGene, GENE_TYPES } from '../kernel/gene_system.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Seed {
  id: string;
  $domain: string;
  $name: string;
  $lineage: { generation: number; operation: string; parents?: string[] };
  $hash: string;
  $fitness: { overall: number };
  genes: Record<string, { type: string; value: any }>;
  [key: string]: any;
}

export interface ExecutionResult {
  seeds: Seed[];
  output: string[];
  errors: string[];
  env: Record<string, any>;
}

const MAX_ITERATIONS = 1000;
const MAX_CALL_DEPTH = 50;

// ─── Environment (Lexical Scope) ─────────────────────────────────────────────

class Environment {
  private vars = new Map<string, any>();
  constructor(private parent?: Environment) {}

  get(name: string): any {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }

  set(name: string, value: any): void {
    this.vars.set(name, value);
  }

  has(name: string): boolean {
    if (this.vars.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  toRecord(): Record<string, any> {
    const result: Record<string, any> = this.parent ? this.parent.toRecord() : {};
    for (const [k, v] of this.vars) result[k] = v;
    return result;
  }
}

// ─── Return Signal ───────────────────────────────────────────────────────────

class ReturnSignal {
  constructor(public value: any) {}
}

// ─── Interpreter ─────────────────────────────────────────────────────────────

export class GSPLInterpreter {
  private seeds: Seed[] = [];
  private output: string[] = [];
  private errors: string[] = [];
  private callDepth = 0;
  private functions = new Map<string, { params: string[]; body: Statement[] }>();

  constructor(private contextSeeds: Seed[] = []) {
    this.seeds = [...contextSeeds];
  }

  execute(source: string): ExecutionResult;
  execute(ast: Program): ExecutionResult;
  execute(input: string | Program): ExecutionResult {
    const ast = typeof input === 'string' ? parse(input).ast : input;

    const env = new Environment();
    this.bindBuiltins(env);

    // Make context seeds available
    for (let i = 0; i < this.seeds.length; i++) {
      env.set(`seed_${i}`, this.seeds[i]);
    }
    env.set('seeds', [...this.seeds]);

    try {
      this.execBlock(ast.body, env);
    } catch (e: any) {
      if (!(e instanceof ReturnSignal)) {
        this.errors.push(e.message || String(e));
      }
    }

    return {
      seeds: this.seeds.filter(s => !this.contextSeeds.find(cs => cs.id === s.id)),
      output: this.output,
      errors: this.errors,
      env: env.toRecord(),
    };
  }

  // ─── Built-in Functions ──────────────────────────────────────────────

  private bindBuiltins(env: Environment) {
    env.set('print', (...args: any[]) => {
      this.output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    });

    env.set('len', (v: any) => {
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'string') return v.length;
      if (typeof v === 'object' && v !== null) return Object.keys(v).length;
      return 0;
    });

    env.set('keys', (v: any) => {
      if (typeof v === 'object' && v !== null) return Object.keys(v);
      return [];
    });

    env.set('domain_of', (seed: any) => seed?.$domain ?? 'unknown');
    env.set('genes_of', (seed: any) => seed?.genes ? Object.keys(seed.genes) : []);
    env.set('domains', () => getAllDomains());
    env.set('gene_types', () => Object.keys(GENE_TYPES));

    env.set('range', (start: number, end?: number) => {
      if (end === undefined) { end = start; start = 0; }
      const result = [];
      for (let i = start; i < end && result.length < MAX_ITERATIONS; i++) result.push(i);
      return result;
    });

    env.set('abs', Math.abs);
    env.set('floor', Math.floor);
    env.set('ceil', Math.ceil);
    env.set('round', Math.round);
    env.set('min', Math.min);
    env.set('max', Math.max);
    env.set('sqrt', Math.sqrt);
    env.set('sin', Math.sin);
    env.set('cos', Math.cos);

    // Kernel operations
    env.set('mutate', (seed: any, rate?: number) => this.builtinMutate(seed, rate ?? 0.1));
    env.set('compose', (seed: any, target: string) => this.builtinCompose(seed, target));
    env.set('grow', (seed: any) => this.builtinGrow(seed));
    env.set('breed', (a: any, b: any) => this.builtinBreed(a, b));
    env.set('evolve', (seed: any, popSize?: number) => this.builtinEvolve(seed, popSize ?? 8));
    env.set('distance', (a: any, b: any) => this.builtinDistance(a, b));
  }

  private makeSeed(name: string, domain: string, genes: Record<string, { type: string; value: any }>): Seed {
    const rng = rngFromHash(name + domain + JSON.stringify(genes));
    const seed: Seed = {
      id: crypto.randomUUID(),
      $domain: domain,
      $name: name,
      $lineage: { generation: 0, operation: 'gspl' },
      $hash: crypto.createHash('sha256').update(JSON.stringify({ name, domain, genes })).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };
    this.seeds.push(seed);
    return seed;
  }

  private builtinMutate(seed: any, rate: number): Seed | null {
    if (!seed?.genes || !seed.$hash) { this.errors.push('mutate: invalid seed'); return null; }
    const rng = rngFromHash(seed.$hash + 'mutate' + rate);
    const newGenes: Record<string, any> = {};
    for (const [name, gene] of Object.entries(seed.genes as Record<string, any>)) {
      const gtype = gene.type || 'scalar';
      newGenes[name] = { type: gtype, value: mutateGene(gtype, gene.value, rate, rng) };
    }
    const mutated: Seed = {
      id: crypto.randomUUID(),
      $domain: seed.$domain,
      $name: seed.$name + '_mutated',
      $lineage: { generation: (seed.$lineage?.generation ?? 0) + 1, operation: 'gspl_mutate', parents: [seed.$hash] },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes: newGenes,
    };
    this.seeds.push(mutated);
    return mutated;
  }

  private builtinCompose(seed: any, target: string): Seed | null {
    if (!seed?.genes) { this.errors.push('compose: invalid seed'); return null; }
    const result = composeSeed(seed, target);
    if (result) {
      this.seeds.push(result as Seed);
      return result as Seed;
    }
    this.errors.push(`compose: no path from ${seed.$domain} to ${target}`);
    return null;
  }

  private builtinGrow(seed: any): any {
    if (!seed?.genes) { this.errors.push('grow: invalid seed'); return null; }
    return growSeed(seed);
  }

  private builtinBreed(a: any, b: any): Seed | null {
    if (!a?.genes || !b?.genes) { this.errors.push('breed: need two valid seeds'); return null; }
    const rng = rngFromHash(a.$hash + b.$hash + 'breed');
    const newGenes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(a.genes), ...Object.keys(b.genes)]);
    for (const key of allKeys) {
      const geneA = a.genes[key];
      const geneB = b.genes[key];
      if (geneA && geneB && geneA.type === geneB.type) {
        newGenes[key] = { type: geneA.type, value: crossoverGene(geneA.type, geneA.value, geneB.value, rng) };
      } else if (geneA) {
        newGenes[key] = { ...geneA };
      } else if (geneB) {
        newGenes[key] = { ...geneB };
      }
    }
    const offspring: Seed = {
      id: crypto.randomUUID(),
      $domain: a.$domain,
      $name: `${a.$name}_x_${b.$name}`,
      $lineage: { generation: Math.max(a.$lineage?.generation ?? 0, b.$lineage?.generation ?? 0) + 1, operation: 'gspl_breed', parents: [a.$hash, b.$hash] },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes: newGenes,
    };
    this.seeds.push(offspring);
    return offspring;
  }

  private builtinEvolve(seed: any, popSize: number): Seed[] {
    if (!seed?.genes) { this.errors.push('evolve: invalid seed'); return []; }
    const population: Seed[] = [];
    for (let i = 0; i < Math.min(popSize, 50); i++) {
      const rate = 0.05 + (i / popSize) * 0.3;
      const mutated = this.builtinMutate(seed, rate);
      if (mutated) population.push(mutated);
    }
    population.sort((a, b) => (b.$fitness?.overall ?? 0) - (a.$fitness?.overall ?? 0));
    return population;
  }

  private builtinDistance(a: any, b: any): number {
    if (!a?.genes || !b?.genes) return -1;
    let totalDist = 0;
    let count = 0;
    for (const key of Object.keys(a.genes)) {
      if (b.genes[key] && a.genes[key].type === b.genes[key].type) {
        totalDist += distanceGene(a.genes[key].type, a.genes[key].value, b.genes[key].value);
        count++;
      }
    }
    return count > 0 ? totalDist / count : 0;
  }

  // ─── Statement Execution ───────────────────────────────────────────

  private execBlock(stmts: Statement[], env: Environment): any {
    let result: any = undefined;
    for (const stmt of stmts) {
      result = this.execStmt(stmt, env);
      if (result instanceof ReturnSignal) throw result;
    }
    return result;
  }

  private execStmt(stmt: Statement, env: Environment): any {
    switch (stmt.kind) {
      case 'seed_decl': return this.execSeedDecl(stmt, env);
      case 'let_binding': return this.execLetBinding(stmt, env);
      case 'fn_decl': return this.execFnDecl(stmt, env);
      case 'if_stmt': return this.execIfStmt(stmt, env);
      case 'for_stmt': return this.execForStmt(stmt, env);
      case 'while_stmt': return this.execWhileStmt(stmt, env);
      case 'return_stmt': throw new ReturnSignal(stmt.value ? this.evalExpr(stmt.value, env) : undefined);
      case 'expr_stmt': return this.evalExpr(stmt.expr, env);
    }
  }

  private execSeedDecl(stmt: Extract<Statement, { kind: 'seed_decl' }>, env: Environment): Seed {
    const rawName = this.evalExpr(stmt.name, env);
    const name = typeof rawName === 'string' ? rawName : 'Unnamed';
    const rawDomain = this.evalExpr(stmt.domain, env);
    const domain = typeof rawDomain === 'string' ? rawDomain : 'character';
    const genes: Record<string, { type: string; value: any }> = {};

    for (const g of stmt.genes) {
      const val = this.evalExpr(g.value, env);
      const gtype = g.geneType || this.inferGeneType(val);
      genes[g.name] = { type: gtype, value: val };
    }

    const seed = this.makeSeed(name, domain, genes);
    env.set(name.replace(/[^a-zA-Z0-9_]/g, '_'), seed);
    return seed;
  }

  private inferGeneType(val: any): string {
    if (typeof val === 'number') return 'scalar';
    if (typeof val === 'string') return 'categorical';
    if (typeof val === 'boolean') return 'categorical';
    if (Array.isArray(val)) return 'vector';
    if (typeof val === 'object' && val !== null) return 'struct';
    return 'categorical';
  }

  private execLetBinding(stmt: Extract<Statement, { kind: 'let_binding' }>, env: Environment): void {
    env.set(stmt.name, this.evalExpr(stmt.value, env));
  }

  private execFnDecl(stmt: Extract<Statement, { kind: 'fn_decl' }>, env: Environment): void {
    this.functions.set(stmt.name, { params: stmt.params, body: stmt.body });
    env.set(stmt.name, `<fn ${stmt.name}>`);
  }

  private execIfStmt(stmt: Extract<Statement, { kind: 'if_stmt' }>, env: Environment): any {
    if (this.isTruthy(this.evalExpr(stmt.condition, env))) {
      return this.execBlock(stmt.then, new Environment(env));
    } else if (stmt.else_branch) {
      return this.execBlock(stmt.else_branch, new Environment(env));
    }
  }

  private execForStmt(stmt: Extract<Statement, { kind: 'for_stmt' }>, env: Environment): void {
    const iterable = this.evalExpr(stmt.iterable, env);
    const items = Array.isArray(iterable) ? iterable : [];
    let iterations = 0;
    for (const item of items) {
      if (++iterations > MAX_ITERATIONS) {
        this.errors.push(`for loop exceeded ${MAX_ITERATIONS} iterations`);
        break;
      }
      const loopEnv = new Environment(env);
      loopEnv.set(stmt.variable, item);
      try {
        this.execBlock(stmt.body, loopEnv);
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;
      }
    }
  }

  private execWhileStmt(stmt: Extract<Statement, { kind: 'while_stmt' }>, env: Environment): void {
    let iterations = 0;
    while (this.isTruthy(this.evalExpr(stmt.condition, env))) {
      if (++iterations > MAX_ITERATIONS) {
        this.errors.push(`while loop exceeded ${MAX_ITERATIONS} iterations`);
        break;
      }
      try {
        this.execBlock(stmt.body, new Environment(env));
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;
      }
    }
  }

  // ─── Expression Evaluation ─────────────────────────────────────────

  private evalExpr(expr: Expr, env: Environment): any {
    switch (expr.kind) {
      case 'literal': return expr.value;
      case 'identifier': return env.get(expr.name);
      case 'array': return expr.elements.map(e => this.evalExpr(e, env));
      case 'object': {
        const obj: Record<string, any> = {};
        for (const [k, v] of expr.entries) obj[k] = this.evalExpr(v, env);
        return obj;
      }
      case 'binary': return this.evalBinary(expr, env);
      case 'unary': return this.evalUnary(expr, env);
      case 'call': return this.evalCall(expr, env);
      case 'member': {
        const obj = this.evalExpr(expr.object, env);
        if (obj === null || obj === undefined) return undefined;
        return obj[expr.property];
      }
      case 'index': {
        const obj = this.evalExpr(expr.object, env);
        const idx = this.evalExpr(expr.index, env);
        if (obj === null || obj === undefined) return undefined;
        return obj[idx];
      }
    }
  }

  private evalBinary(expr: Extract<Expr, { kind: 'binary' }>, env: Environment): any {
    const left = this.evalExpr(expr.left, env);
    const right = this.evalExpr(expr.right, env);
    switch (expr.op) {
      case '+': return typeof left === 'string' || typeof right === 'string' ? String(left) + String(right) : (left as number) + (right as number);
      case '-': return (left as number) - (right as number);
      case '*': return (left as number) * (right as number);
      case '/': return right !== 0 ? (left as number) / (right as number) : 0;
      case '%': return right !== 0 ? (left as number) % (right as number) : 0;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '&&': return this.isTruthy(left) ? right : left;
      case '||': return this.isTruthy(left) ? left : right;
      default: return 0;
    }
  }

  private evalUnary(expr: Extract<Expr, { kind: 'unary' }>, env: Environment): any {
    const val = this.evalExpr(expr.operand, env);
    if (expr.op === '-') return -(val as number);
    if (expr.op === '!') return !this.isTruthy(val);
    return val;
  }

  private evalCall(expr: Extract<Expr, { kind: 'call' }>, env: Environment): any {
    const args = expr.args.map(a => this.evalExpr(a, env));
    const callee = env.get(expr.callee);

    // Native JS function (built-in)
    if (typeof callee === 'function') {
      return callee(...args);
    }

    // User-defined GSPL function
    const fn = this.functions.get(expr.callee);
    if (fn) {
      if (this.callDepth >= MAX_CALL_DEPTH) {
        this.errors.push(`call stack overflow at ${expr.callee}`);
        return undefined;
      }
      this.callDepth++;
      try {
        const fnEnv = new Environment(env);
        for (let i = 0; i < fn.params.length; i++) {
          fnEnv.set(fn.params[i], args[i]);
        }
        this.execBlock(fn.body, fnEnv);
        return undefined;
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      } finally {
        this.callDepth--;
      }
    }

    this.errors.push(`Unknown function: ${expr.callee}`);
    return undefined;
  }

  private isTruthy(val: any): boolean {
    if (val === null || val === undefined || val === false || val === 0 || val === '') return false;
    return true;
  }
}

// ─── Convenience ─────────────────────────────────────────────────────────────

export function executeGSPL(source: string, contextSeeds: Seed[] = []): ExecutionResult {
  const interpreter = new GSPLInterpreter(contextSeeds);
  return interpreter.execute(source);
}
