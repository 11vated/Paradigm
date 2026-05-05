import { Lexer } from './lexer';
import { Parser, Program, ASTNode, ASTNodeType, FunctionDecl, VariableDecl, Assignment, IfStatement, ForStatement, WhileStatement, BreakStatement, ContinueStatement, ReturnStatement, Block, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Literal, Identifier, ArrayLiteral, ObjectLiteral, FunctionExpr } from './parser';

export interface RuntimeValue {
  type: string;
  value: unknown;
}

export class GSPLRuntimeError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, line: number = 0, column: number = 0) {
    super(message);
    this.name = 'GSPLRuntimeError';
    this.line = line;
    this.column = column;
  }
}

export class Interpreter {
  private globals: Map<string, unknown> = new Map();
  private locals: Map<string, unknown>[] = [new Map()];
  private functions: Map<string, FunctionDecl> = new Map();
  private returnValue: unknown = null;
  private isBreak: boolean = false;
  private isContinue: boolean = false;

  constructor() {
    this.initializeBuiltins();
  }

  private initializeBuiltins(): void {
    this.globals.set('print', (...args: unknown[]) => {
      console.log(...args);
      return null;
    });

    this.globals.set('seed', (name: string, config?: object) => {
      return { _type: 'seed', name, config: config ?? {} };
    });

    this.globals.set('gene', (type: string, value: unknown) => {
      return { _type: 'gene', type, value };
    });

    this.globals.set('breed', (parentA: object, parentB: object) => {
      return { _type: 'seed', parents: [parentA, parentB], operation: 'breed' };
    });

    this.globals.set('mutate', (seed: object, intensity: number = 0.1) => {
      return { _type: 'seed', seed, operation: 'mutate', intensity };
    });

    this.globals.set('evolve', (population: object[], fitnessFn: (s: object) => number) => {
      const sorted = [...population].sort((a, b) => fitnessFn(b as object) - fitnessFn(a as object));
      return sorted;
    });

    this.globals.set('select', (population: object[], count: number) => {
      return population.slice(0, count);
    });

    this.globals.set('eval', (expr: string) => {
      const interp = new Interpreter();
      return interp.execute(expr);
    });

    this.globals.set('len', (arr: unknown[]) => arr?.length ?? 0);

    this.globals.set('range', (start: number, end?: number, step?: number) => {
      const s = end === undefined ? 0 : start;
      const e = end ?? start;
      const st = step ?? 1;
      const result = [];
      for (let i = s; i < e; i += st) result.push(i);
      return result;
    });

    this.globals.set('map', (arr: unknown[], fn: (v: unknown) => unknown) => arr.map(fn));

    this.globals.set('filter', (arr: unknown[], fn: (v: unknown) => boolean) => arr.filter(fn));

    this.globals.set('reduce', (arr: unknown[], fn: (acc: unknown, v: unknown) => unknown, init?: unknown) => 
      arr.reduce(fn as (acc: unknown, v: unknown, i: number) => unknown, init));

    this.globals.set('random', (min?: number, max?: number) => {
      if (min !== undefined && max !== undefined) {
        return Math.random() * (max - min) + min;
      }
      return Math.random();
    });

    this.globals.set('floor', Math.floor);
    this.globals.set('ceil', Math.ceil);
    this.globals.set('round', Math.round);
    this.globals.set('abs', Math.abs);
    this.globals.set('min', Math.min);
    this.globals.set('max', Math.max);
    this.globals.set('pow', Math.pow);
    this.globals.set('sqrt', Math.sqrt);

    this.globals.set('sin', Math.sin);
    this.globals.set('cos', Math.cos);
    this.globals.set('tan', Math.tan);
    this.globals.set('asin', Math.asin);
    this.globals.set('acos', Math.acos);
    this.globals.set('atan', Math.atan);

    this.globals.set('PI', Math.PI);
    this.globals.set('E', Math.E);
  }

  execute(source: string): unknown {
    try {
      const lexer = new Lexer(source);
      const parser = new Parser(lexer);
      const program = parser.parse();
      return this.evaluateProgram(program);
    } catch (error) {
      throw new GSPLRuntimeError(String(error));
    }
  }

  private evaluateProgram(program: Program): unknown {
    let result: unknown = null;

    for (const stmt of program.body) {
      if (stmt.type === ASTNodeType.FUNCTION_DECL) {
        const fn = stmt as FunctionDecl;
        this.functions.set(fn.name, fn);
      } else if (stmt.type === ASTNodeType.VARIABLE_DECL) {
        const decl = stmt as VariableDecl;
        const value = this.evaluate(decl.initializer);
        this.locals[this.locals.length - 1].set(decl.name, value);
      } else {
        result = this.evaluate(stmt);
      }
    }

    return result;
  }

  private evaluate(node: ASTNode): unknown {
    switch (node.type) {
      case ASTNodeType.LITERAL:
        return (node as Literal).value;

      case ASTNodeType.IDENTIFIER:
        return this.resolveIdentifier(node as Identifier);

      case ASTNodeType.BINARY_EXPR:
        return this.evaluateBinaryExpr(node as BinaryExpr);

      case ASTNodeType.UNARY_EXPR:
        return this.evaluateUnaryExpr(node as UnaryExpr);

      case ASTNodeType.CALL_EXPR:
        return this.evaluateCallExpr(node as CallExpr);

      case ASTNodeType.INDEX_EXPR:
        return this.evaluateIndexExpr(node as IndexExpr);

      case ASTNodeType.MEMBER_EXPR:
        return this.evaluateMemberExpr(node as MemberExpr);

      case ASTNodeType.ARRAY_LITERAL:
        return this.evaluateArrayLiteral(node as ArrayLiteral);

      case ASTNodeType.OBJECT_LITERAL:
        return this.evaluateObjectLiteral(node as ObjectLiteral);

      case ASTNodeType.FUNCTION_EXPR:
        return this.wrapFunction(node as FunctionExpr);

      case ASTNodeType.BLOCK:
        return this.evaluateBlock(node as Block);

      case ASTNodeType.IF_STATEMENT:
        return this.evaluateIfStatement(node as IfStatement);

      case ASTNodeType.FOR_STATEMENT:
        return this.evaluateForStatement(node as ForStatement);

      case ASTNodeType.WHILE_STATEMENT:
        return this.evaluateWhileStatement(node as WhileStatement);

      case ASTNodeType.BREAK_STATEMENT:
        this.isBreak = true;
        return null;

      case ASTNodeType.CONTINUE_STATEMENT:
        this.isContinue = true;
        return null;

      case ASTNodeType.RETURN_STATEMENT:
        const ret = node as ReturnStatement;
        this.returnValue = ret.value ? this.evaluate(ret.value) : null;
        return this.returnValue;

      case ASTNodeType.ASSIGNMENT:
        return this.evaluateAssignment(node as Assignment);

      case ASTNodeType.EXPRESSION_STMT:
        return this.evaluate(node as any);

      default:
        throw new GSPLRuntimeError(`Unknown node type: ${node.type}`, node.line, node.column);
    }
  }

  private resolveIdentifier(ident: Identifier): unknown {
    for (let i = this.locals.length - 1; i >= 0; i--) {
      if (this.locals[i].has(ident.name)) {
        return this.locals[i].get(ident.name);
      }
    }
    if (this.globals.has(ident.name)) {
      return this.globals.get(ident.name);
    }
    throw new GSPLRuntimeError(`Undefined variable: ${ident.name}`, ident.line, ident.column);
  }

  private evaluateBinaryExpr(expr: BinaryExpr): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
      case '+':
        if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right);
        return (left as number) + (right as number);
      case '-': return (left as number) - (right as number);
      case '*': return (left as number) * (right as number);
      case '/': return (left as number) / (right as number);
      case '%': return (left as number) % (right as number);
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default:
        throw new GSPLRuntimeError(`Unknown operator: ${expr.operator}`, expr.line, expr.column);
    }
  }

  private evaluateUnaryExpr(expr: UnaryExpr): unknown {
    const operand = this.evaluate(expr.operand);

    switch (expr.operator) {
      case '!': return !operand;
      case '-': return -(operand as number);
      default:
        throw new GSPLRuntimeError(`Unknown unary operator: ${expr.operator}`, expr.line, expr.column);
    }
  }

  private evaluateCallExpr(expr: CallExpr): unknown {
    const callee = this.evaluate(expr.callee);
    const args = expr.arguments.map(arg => this.evaluate(arg));

    if (typeof callee === 'function') {
      return (callee as Function)(...args);
    }

    if (typeof callee === 'object' && callee !== null && (callee as any).__gsplFunction__) {
      return (callee as any).__gsplFunction__(this, args);
    }

    throw new GSPLRuntimeError(`Cannot call value of type ${typeof callee}`, expr.line, expr.column);
  }

  private evaluateIndexExpr(expr: IndexExpr): unknown {
    const obj = this.evaluate(expr.object);
    const idx = this.evaluate(expr.index);

    if (Array.isArray(obj)) return obj[idx as number];
    if (typeof obj === 'string') return obj.charAt(idx as number);
    if (typeof obj === 'object') return (obj as any)[idx as string];

    throw new GSPLRuntimeError(`Cannot index type ${typeof obj}`, expr.line, expr.column);
  }

  private evaluateMemberExpr(expr: MemberExpr): unknown {
    const obj = this.evaluate(expr.object);
    return (obj as any)[expr.property];
  }

  private evaluateArrayLiteral(arr: ArrayLiteral): unknown[] {
    return arr.elements.map(el => this.evaluate(el));
  }

  private evaluateObjectLiteral(obj: ObjectLiteral): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of obj.properties) {
      result[key] = this.evaluate(val);
    }
    return result;
  }

  private wrapFunction(expr: FunctionExpr): object {
    const self = this;
    return {
      __gsplFunction__: function(this: Interpreter, args: unknown[]) {
        return self.executeFunction(expr, args);
      }
    };
  }

  private executeFunction(expr: FunctionExpr, args: unknown[]): unknown {
    this.locals.push(new Map());

    for (let i = 0; i < expr.params.length; i++) {
      this.locals[this.locals.length - 1].set(expr.params[i], args[i]);
    }

    const result = this.evaluate(expr.body);
    this.locals.pop();

    return result;
  }

  private evaluateBlock(block: Block): unknown {
    let result: unknown = null;
    this.locals.push(new Map());

    for (const stmt of block.statements) {
      result = this.evaluate(stmt);
      if (this.isBreak || this.isContinue || this.returnValue !== null) break;
    }

    this.locals.pop();
    return result;
  }

  private evaluateIfStatement(stmt: IfStatement): unknown {
    const condition = this.evaluate(stmt.condition);
    if (this.isTruthy(condition)) {
      return this.evaluate(stmt.thenBranch);
    } else if (stmt.elseBranch) {
      return this.evaluate(stmt.elseBranch);
    }
    return null;
  }

  private evaluateForStatement(stmt: ForStatement): unknown {
    let result: unknown = null;
    this.locals.push(new Map());

    if (stmt.initializer?.type === ASTNodeType.VARIABLE_DECL) {
      const decl = stmt.initializer as VariableDecl;
      this.locals[this.locals.length - 1].set(decl.name, this.evaluate(decl.initializer));
    }

    while (this.isTruthy(this.evaluate(stmt.condition))) {
      result = this.evaluate(stmt.body);
      if (this.isBreak) {
        this.isBreak = false;
        break;
      }
      if (this.isContinue) {
        this.isContinue = false;
      }
      this.evaluate(stmt.increment);
    }

    this.locals.pop();
    return result;
  }

  private evaluateWhileStatement(stmt: WhileStatement): unknown {
    let result: unknown = null;
    this.locals.push(new Map());

    while (this.isTruthy(this.evaluate(stmt.condition))) {
      result = this.evaluate(stmt.body);
      if (this.isBreak) {
        this.isBreak = false;
        break;
      }
      if (this.isContinue) {
        this.isContinue = false;
      }
    }

    this.locals.pop();
    return result;
  }

  private evaluateAssignment(assign: Assignment): unknown {
    const value = this.evaluate(assign.value);
    const target = assign.target;

    if (target.type === ASTNodeType.IDENTIFIER) {
      for (let i = this.locals.length - 1; i >= 0; i--) {
        if (this.locals[i].has((target as Identifier).name)) {
          this.locals[i].set((target as Identifier).name, value);
          return value;
        }
      }
      this.globals.set((target as Identifier).name, value);
      return value;
    }

    if (target.type === ASTNodeType.INDEX_EXPR) {
      const indexExpr = target as IndexExpr;
      const obj = this.evaluate(indexExpr.object) as unknown[];
      const idx = this.evaluate(indexExpr.index) as number;
      obj[idx] = value;
      return value;
    }

    throw new GSPLRuntimeError(`Invalid assignment target`, assign.line, assign.column);
  }

  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}