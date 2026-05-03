/**
 * GSPL Language — Interpreter
 * Executes GSPL AST (from parser)
 * Phase 3: GSPL Language Completion
 */

import type { Seed } from './engines';
import { GsplLexer, TokenType } from './gspl-lexer';
import { GsplParser, ASTNode, ASTNodeType } from './gspl-parser';
import { Xoshiro256StarStar, rngFromHash } from './rng';

export interface GSPLContext {
  seeds: Map<string, Seed>;
  functions: Map<string, ASTNode>;
  variables: Map<string, any>;
  types: Map<string, ASTNode>;
  rng: Xoshiro256StarStar;
  currentUser?: string;
}

export class GsplInterpreter {
  private context: GSPLContext;

  constructor(seedHash?: string) {
    this.context = {
      seeds: new Map(),
      functions: new Map(),
      variables: new Map(),
      types: new Map(),
      rng: rngFromHash(seedHash || Math.random().toString())
    };
  }

  /**
   * Execute GSPL source code
   */
  async execute(source: string): Promise<any> {
    const lexer = new GsplLexer(source);
    const tokens = lexer.tokenize();

    const parser = new GsplParser(tokens);
    const ast = parser.parse();

    let result: any = null;
    for (const node of ast) {
      result = await this.evaluateNode(node);
    }

    return result;
  }

  /**
   * Evaluate a single AST node
   */
  private async evaluateNode(node: ASTNode): Promise<any> {
    switch (node.type) {
      // Literals
      case ASTNodeType.INT_LITERAL:
      case ASTNodeType.FLOAT_LITERAL:
      case ASTNodeType.STRING_LITERAL:
      case ASTNodeType.BOOLEAN_LITERAL:
      case ASTNodeType.NULL_LITERAL:
        return node.value;

      case ASTNodeType.VECTOR_LITERAL:
        const elements = [];
        for (const e of node.elements) {
          elements.push(await this.evaluateNode(e));
        }
        return elements;

      case ASTNodeType.STRUCT_LITERAL:
        const struct: Record<string, any> = {};
        for (const [key, value] of Object.entries(node.fields)) {
          struct[key] = await this.evaluateNode(value);
        }
        return struct;

      // Identifiers
      case ASTNodeType.IDENTIFIER:
        if (this.context.variables.has(node.name)) {
          return this.context.variables.get(node.name);
        }
        throw new Error(`Undefined variable: ${node.name} at line ${node.loc?.line}`);

      // Gene access
      case ASTNodeType.GENE_ACCESS:
        const seed = await this.evaluateNode(node.object);
        if (!seed || !seed.genes) {
          throw new Error(`Cannot access genes of non-seed at line ${node.loc?.line}`);
        }
        return seed.genes[node.geneName]?.value;

      // Binary expressions
      case ASTNodeType.BINARY_EXPR:
        return this.evaluateBinary(node);

      // Unary expressions
      case ASTNodeType.UNARY_EXPR:
        return this.evaluateUnary(node);

      // Call expressions
      case ASTNodeType.CALL_EXPR:
        return this.evaluateCall(node);

      // Pipe expressions
      case ASTNodeType.PIPE_EXPR:
        return this.evaluatePipe(node);

      // Member access
      case ASTNodeType.MEMBER_ACCESS:
        const obj = await this.evaluateNode(node.object);
        return obj[node.property];

      // Array access
      case ASTNodeType.ARRAY_ACCESS:
        const arr = await this.evaluateNode(node.array);
        const idx = await this.evaluateNode(node.index);
        return arr[idx];

      // Seed declaration
      case ASTNodeType.SEED_DECL:
        return this.evaluateSeedDecl(node);

      // Let declaration
      case ASTNodeType.LET_DECL:
        const letValue = await this.evaluateNode(node.value);
        this.context.variables.set(node.name, letValue);
        return letValue;

      // Function declaration
      case ASTNodeType.FN_DECL:
        this.context.functions.set(node.name, node);
        return { type: 'function', name: node.name };

      // Return statement
      case ASTNodeType.RETURN_STMT:
        const retValue = node.value ? await this.evaluateNode(node.value) : undefined;
        throw new GSPLReturn(retValue);

      // If statement
      case ASTNodeType.IF_STMT:
        return this.evaluateIf(node);

      // Block
      case ASTNodeType.BLOCK:
        return this.evaluateBlock(node);

      // Expression statement
      case ASTNodeType.EXPR_STMT:
        return this.evaluateNode(node.expression);

      // Seed operations
      case ASTNodeType.BREED_OP:
        return this.evaluateBreed(node);

      case ASTNodeType.MUTATE_OP:
        return this.evaluateMutate(node);

      case ASTNodeType.COMPOSE_OP:
        return this.evaluateCompose(node);

      case ASTNodeType.EVOLVE_OP:
        return this.evaluateEvolve(node);

      case ASTNodeType.GROW_OP:
        return this.evaluateGrow(node);

      default:
        throw new Error(`Unimplemented AST node: ${node.type} at line ${node.loc?.line}`);
    }
  }

  private evaluateBinary(node: ASTNode): any {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);

    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '**': return Math.pow(left, right);
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  private evaluateUnary(node: ASTNode): any {
    const operand = this.evaluateNode(node.operand);

    switch (node.operator) {
      case '-': return -operand;
      case '!': return !operand;
      case '~': return ~operand;
      default: throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateCall(node: ASTNode): any {
    if (node.callee.type === ASTNodeType.IDENTIFIER) {
      return this.evaluateBuiltin(node.callee.name, node.arguments);
    }

    const callee = this.evaluateNode(node.callee);
    if (callee && callee.type === 'function') {
      const fnNode = this.context.functions.get(callee.name);
      if (!fnNode) throw new Error(`Function not found: ${callee.name}`);

      const args = node.arguments.map((arg: ASTNode) => this.evaluateNode(arg));

      const oldVars = new Map(this.context.variables);
      for (let i = 0; i < fnNode.params.length; i++) {
        this.context.variables.set(fnNode.params[i].name, args[i]);
      }

      try {
        return this.evaluateBlock(fnNode.body);
      } finally {
        this.context.variables = oldVars;
      }
    }

    throw new Error(`Cannot call ${JSON.stringify(node.callee)}`);
  }

  private evaluateBuiltin(name: string, args: ASTNode[]): any {
    switch (name) {
      case 'random': {
        if (args.length === 0) return this.context.rng.nextF64();
        if (args.length === 1) {
          const max = this.evaluateNode(args[0]);
          return this.context.rng.nextF64() * max;
        }
        const min = this.evaluateNode(args[0]);
        const max = this.evaluateNode(args[1]);
        return min + this.context.rng.nextF64() * (max - min);
      }
      case 'print':
        const value = args.length > 0 ? this.evaluateNode(args[0]) : '';
        console.log('[GSPL]', value);
        return value;
      default:
        throw new Error(`Unknown built-in: ${name}`);
    }
  }

  private evaluatePipe(node: ASTNode): any {
    let result = this.evaluateNode(node.left);
    const right = node.right;

    if (right.type === ASTNodeType.CALL_EXPR) {
      const args = [result, ...right.arguments.map((arg: ASTNode) => this.evaluateNode(arg))];
      return this.evaluateCall({ ...right, arguments: args.map((arg: any) => ({ type: ASTNodeType.IDENTIFIER, value: arg })) });
    }

    return this.evaluateCall({ ...right, type: ASTNodeType.CALL_EXPR, arguments: [{ type: ASTNodeType.IDENTIFIER, value: result }] });
  }

  private evaluateIf(node: ASTNode): any {
    const condition = this.evaluateNode(node.condition);

    if (condition) {
      return this.evaluateBlock(node.consequent);
    } else if (node.alternate) {
      if (node.alternate.type === ASTNodeType.IF_STMT) {
        return this.evaluateNode(node.alternate);
      }
      return this.evaluateBlock(node.alternate);
    }

    return undefined;
  }

  private evaluateBlock(node: ASTNode): any {
    for (const stmt of node.statements) {
      try {
        const result = this.evaluateNode(stmt);
        if (stmt.type === ASTNodeType.RETURN_STMT) {
          return result;
        }
      } catch (e) {
        if (e instanceof GSPLReturn) {
          return e.value;
        }
        throw e;
      }
    }
  }

  private evaluateSeedDecl(node: ASTNode): Seed {
    const seed: Seed = {
      $gst: '1.0',
      $domain: node.domain,
      $hash: this.context.rng.nextF64().toString(16),
      $name: node.seedName,
      $lineage: { operation: 'primordial', generation: 0 },
      genes: {}
    };

    for (const gene of node.genes) {
      const value = this.evaluateNode(gene.value);
      seed.genes[gene.geneName] = {
        type: this.inferGeneType(value),
        value
      };
    }

    this.context.seeds.set(node.name, seed);
    return seed;
  }

  private evaluateBreed(node: ASTNode): Seed {
    const parentA = this.evaluateNode(node.parentA);
    const parentB = this.evaluateNode(node.parentB);

    const child: Seed = {
      $gst: '1.0',
      $domain: parentA.$domain,
      $hash: this.context.rng.nextF64().toString(16),
      $name: `breed_${parentA.$name}_${parentB.$name}`,
      $lineage: {
        operation: 'breed',
        generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1,
        parents: [parentA.$hash, parentB.$hash]
      },
      genes: {}
    };

    const allGenes = new Set([
      ...Object.keys(parentA.genes || {}),
      ...Object.keys(parentB.genes || {})
    ]);

    for (const geneName of allGenes) {
      const geneA = parentA.genes?.[geneName];
      const geneB = parentB.genes?.[geneName];

      if (geneA && geneB) {
        if (typeof geneA.value === 'number' && typeof geneB.value === 'number') {
          child.genes[geneName] = {
            type: geneA.type,
            value: this.context.rng.nextF64() > 0.5 ? geneA.value : geneB.value
          };
        } else {
          child.genes[geneName] = this.context.rng.nextF64() > 0.5 ? geneA : geneB;
        }
      } else {
        child.genes[geneName] = geneA || geneB;
      }
    }

    this.context.seeds.set(`breed_${Date.now()}`, child);
    return child;
  }

  private evaluateMutate(node: ASTNode): Seed {
    const seed = this.evaluateNode(node.seed);
    const rate = node.options?.rate || 0.1;

    const mutated: Seed = {
      ...seed,
      $hash: this.context.rng.nextF64().toString(16),
      $name: `mutant_${seed.$name}`,
      $lineage: {
        ...seed.$lineage,
        operation: 'mutate',
        generation: (seed.$lineage?.generation || 0) + 1
      },
      genes: {}
    };

    for (const [name, gene] of Object.entries(seed.genes || {})) {
      if (this.context.rng.nextF64() < rate) {
        if (typeof gene.value === 'number') {
          const gaussian = () => {
            const u1 = this.context.rng.nextF64();
            const u2 = this.context.rng.nextF64();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          };
          mutated.genes[name] = {
            ...gene,
            value: gene.value + gaussian() * 0.1
          };
        } else if (Array.isArray(gene.value)) {
          mutated.genes[name] = {
            ...gene,
            value: gene.value.map((v: number) => v + (this.context.rng.nextF64() - 0.5) * 0.1)
          };
        } else {
          mutated.genes[name] = gene;
        }
      } else {
        mutated.genes[name] = gene;
      }
    }

    this.context.seeds.set(`mutant_${Date.now()}`, mutated);
    return mutated;
  }

  private evaluateCompose(node: ASTNode): Seed {
    const seed = this.evaluateNode(node.seed);
    return seed;
  }

  private evaluateEvolve(node: ASTNode): Seed[] {
    const options = this.evaluateNode(node.options);
    const population: Seed[] = options.population || [];
    return population.slice(0, 5);
  }

  private evaluateGrow(node: ASTNode): any {
    const seed = this.evaluateNode(node.seed);
    return {
      type: seed.$domain,
      name: seed.$name,
      seed_hash: seed.$hash
    };
  }

  private inferGeneType(value: any): string {
    if (typeof value === 'number') return 'scalar';
    if (typeof value === 'string') return 'categorical';
    if (typeof value === 'boolean') return 'scalar';
    if (Array.isArray(value)) return 'vector';
    if (typeof value === 'object') return 'struct';
    return 'scalar';
  }
}

class GSPLReturn {
  constructor(public value: any) {}
}

/**
 * Convenience function: execute GSPL source directly
 */
export function executeGspl(source: string, seedPhrase?: string): any {
  const interpreter = new GsplInterpreter(seedPhrase);
  return interpreter.execute(source);
}
