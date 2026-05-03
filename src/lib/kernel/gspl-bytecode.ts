/**
 * GSPL Bytecode Compiler
 * Phase III.1: Compile GSPL AST to bytecode for PVM execution
 *
 * Bytecode format:
 * - 32-bit instructions
 * - Opcode (8 bits) + Operand (24 bits)
 * - String pool for identifiers/literals
 * - Constant pool for numbers
 */

import { GsplLexer, TokenType } from './gspl-lexer';
import { GsplParser, ASTNodeType, type ASTNode } from './gspl-parser';

// Opcodes
export enum Opcode {
  // Stack operations
  PUSH_CONST = 0x01,
  PUSH_VAR = 0x02,
  POP = 0x03,
  DUP = 0x04,
  SWAP = 0x05,

  // Arithmetic
  ADD = 0x10,
  SUB = 0x11,
  MUL = 0x12,
  DIV = 0x13,
  MOD = 0x14,
  POW = 0x15,
  NEG = 0x16,

  // Comparison
  EQ = 0x20,
  NEQ = 0x21,
  LT = 0x22,
  LTE = 0x23,
  GT = 0x24,
  GTE = 0x25,

  // Logical
  AND = 0x30,
  OR = 0x31,
  NOT = 0x32,

  // Bitwise
  BIT_AND = 0x40,
  BIT_OR = 0x41,
  BIT_XOR = 0x42,
  BIT_NOT = 0x43,
  SHL = 0x44,
  SHR = 0x45,

  // Control flow
  JUMP = 0x50,
  JUMP_IF_FALSE = 0x51,
  JUMP_IF_TRUE = 0x52,
  CALL = 0x53,
  RETURN = 0x54,
  CALL_BUILTIN = 0x55,

  // Load/Store
  LOAD_LOCAL = 0x60,
  STORE_LOCAL = 0x61,
  LOAD_GLOBAL = 0x62,
  STORE_GLOBAL = 0x63,
  LOAD_FIELD = 0x64,
  STORE_FIELD = 0x65,
  LOAD_INDEX = 0x66,
  STORE_INDEX = 0x67,

  // Seed operations
  SEED_CREATE = 0x70,
  SEED_GROW = 0x71,
  SEED_MUTATE = 0x72,
  SEED_CROSSOVER = 0x73,
  SEED_BREED = 0x74,

  // Type operations
  TYPE_CAST = 0x80,
  TYPE_CHECK = 0x81,

  // Special
  HALT = 0x90,
  NOP = 0x91,
  PRINT = 0x92,

  // Vectors/Structs
  VECTOR_CREATE = 0xA0,
  STRUCT_CREATE = 0xA1,
  GET_FIELD = 0xA2,
  SET_FIELD = 0xA3,
}

// Bytecode instruction
interface Instruction {
  opcode: Opcode;
  operand: number; // Index into constant pool or string pool
  line?: number;
}

// Compiled bytecode
export interface BytecodeProgram {
  version: number;
  constants: any[]; // Constant pool
  strings: string[]; // String pool
  instructions: Instruction[];
  entryPoint: number; // Index of first instruction
  functions: Map<string, { start: number; end: number; locals: string[] }>;
  debug?: { sourceMap: Map<number, number> }; // instruction index -> source line
}

// Compiler state
class CompilerState {
  constants: any[] = [];
  strings: string[] = [];
  instructions: Instruction[] = [];
  functions: Map<string, { start: number; end: number; locals: string[] }> = new Map();
  sourceMap: Map<number, number> = new Map();
  localVars: Map<string, number> = new Map(); // name -> index
  loopStack: number[] = []; // For break/continue

  addConstant(value: any): number {
    const idx = this.constants.length;
    this.constants.push(value);
    return idx;
  }

  addString(value: string): number {
    const idx = this.strings.indexOf(value);
    if (idx !== -1) return idx;
    this.strings.push(value);
    return this.strings.length - 1;
  }

  emit(opcode: Opcode, operand: number = 0, line?: number): number {
    const idx = this.instructions.length;
    this.instructions.push({ opcode, operand, line });
    if (line !== undefined) {
      this.sourceMap.set(idx, line);
    }
    return idx;
  }

  patch(instructionIdx: number, operand: number): void {
    this.instructions[instructionIdx].operand = operand;
  }
}

/**
 * GSPL Bytecode Compiler
 */
export class GsplBytecodeCompiler {
  private state: CompilerState;

  constructor() {
    this.state = new CompilerState();
  }

  /**
   * Compile GSPL source to bytecode
   */
  compile(source: string): BytecodeProgram {
    const lexer = new GsplLexer(source);
    const tokens = lexer.tokenize();
    const parser = new GsplParser(tokens);
    const ast = parser.parse();

    this.compileProgram(ast);

    // Add halt instruction
    this.state.emit(Opcode.HALT);

    return {
      version: 1,
      constants: this.state.constants,
      strings: this.state.strings,
      instructions: this.state.instructions,
      entryPoint: 0,
      functions: this.state.functions,
      debug: { sourceMap: this.state.sourceMap },
    };
  }

  /**
   * Compile top-level program
   */
  private compileProgram(node: ASTNode): void {
    if (node.type === ASTNodeType.BLOCK && node.children) {
      for (const child of node.children) {
        this.compileNode(child);
      }
    } else {
      this.compileNode(node);
    }
  }

  /**
   * Compile a single AST node
   */
  private compileNode(node: ASTNode): void {
    if (!node) return;

    const line = (node as any).line || (node as any).token?.line;

    switch (node.type) {
      case ASTNodeType.INT_LITERAL:
        this.compileLiteral(node.value, 'int', line);
        break;

      case ASTNodeType.FLOAT_LITERAL:
        this.compileLiteral(node.value, 'float', line);
        break;

      case ASTNodeType.STRING_LITERAL:
        this.compileStringLiteral(node.value, line);
        break;

      case ASTNodeType.BOOLEAN_LITERAL:
        this.compileLiteral(node.value, 'bool', line);
        break;

      case ASTNodeType.NULL_LITERAL:
        this.compileNullLiteral(line);
        break;

      case ASTNodeType.IDENTIFIER:
        this.compileIdentifier(node.value, line);
        break;

      case ASTNodeType.BINARY_EXPR:
        this.compileBinaryExpr(node, line);
        break;

      case ASTNodeType.UNARY_EXPR:
        this.compileUnaryExpr(node, line);
        break;

      case ASTNodeType.CALL_EXPR:
        this.compileCallExpr(node, line);
        break;

      case ASTNodeType.LET_DECL:
        this.compileLetDecl(node, line);
        break;

      case ASTNodeType.FN_DECL:
        this.compileFnDecl(node, line);
        break;

      case ASTNodeType.SEED_DECL:
        this.compileSeedDecl(node, line);
        break;

      case ASTNodeType.GROW_OP:
        this.compileGrowOp(node, line);
        break;

      case ASTNodeType.EXPR_STMT:
        if (node.children && node.children[0]) {
          this.compileNode(node.children[0]);
        }
        break;

      case ASTNodeType.BLOCK:
        if (node.children) {
          for (const child of node.children) {
            this.compileNode(child);
          }
        }
        break;

      default:
        console.warn(`Unhandled node type: ${node.type}`);
    }
  }

  private compileLiteral(value: any, type: string, line?: number): void {
    const idx = this.state.addConstant({ type, value });
    this.state.emit(Opcode.PUSH_CONST, idx, line);
  }

  private compileStringLiteral(value: string, line?: number): void {
    const idx = this.state.addString(value);
    this.state.emit(Opcode.PUSH_CONST, idx, line);
  }

  private compileNullLiteral(line?: number): void {
    this.state.emit(Opcode.PUSH_CONST, this.state.addConstant(null), line);
  }

  private compileIdentifier(name: string, line?: number): void {
    // Check if it's a local variable
    if (this.state.localVars.has(name)) {
      const idx = this.state.localVars.get(name)!;
      this.state.emit(Opcode.LOAD_LOCAL, idx, line);
    } else {
      // Global variable or function
      const strIdx = this.state.addString(name);
      this.state.emit(Opcode.LOAD_GLOBAL, strIdx, line);
    }
  }

  private compileBinaryExpr(node: ASTNode, line?: number): void {
    const left = node.children?.[0];
    const right = node.children?.[1];
    const op = (node as any).operator;

    this.compileNode(left);
    this.compileNode(right);

    const opcodeMap: Record<string, Opcode> = {
      '+': Opcode.ADD,
      '-': Opcode.SUB,
      '*': Opcode.MUL,
      '/': Opcode.DIV,
      '%': Opcode.MOD,
      '**': Opcode.POW,
      '==': Opcode.EQ,
      '!=': Opcode.NEQ,
      '<': Opcode.LT,
      '<=': Opcode.LTE,
      '>': Opcode.GT,
      '>=': Opcode.GTE,
      '&&': Opcode.AND,
      '||': Opcode.OR,
      '&': Opcode.BIT_AND,
      '|': Opcode.BIT_OR,
      '^': Opcode.BIT_XOR,
      '<<': Opcode.SHL,
      '>>': Opcode.SHR,
    };

    const opcode = opcodeMap[op];
    if (opcode !== undefined) {
      this.state.emit(opcode, 0, line);
    } else {
      console.warn(`Unknown binary operator: ${op}`);
    }
  }

  private compileUnaryExpr(node: ASTNode, line?: number): void {
    const operand = node.children?.[0];
    const op = (node as any).operator;

    this.compileNode(operand);

    if (op === '-') {
      this.state.emit(Opcode.NEG, 0, line);
    } else if (op === '!') {
      this.state.emit(Opcode.NOT, 0, line);
    } else if (op === '~') {
      this.state.emit(Opcode.BIT_NOT, 0, line);
    }
  }

  private compileCallExpr(node: ASTNode, line?: number): void {
    const callee = node.children?.[0];
    const args = node.children?.[1]?.children || [];

    // Compile arguments in reverse order (for stack)
    for (let i = args.length - 1; i >= 0; i--) {
      this.compileNode(args[i]);
    }

    // Check if it's a builtin
    if (callee?.type === ASTNodeType.IDENTIFIER) {
      const builtins = ['random', 'print', 'mutate', 'crossover', 'select',
        'generate_character', 'generate_music', 'generate_visual2d',
        'generate_game', 'generate_geometry3d'];

      if (builtins.includes(callee.value)) {
        const strIdx = this.state.addString(callee.value);
        this.state.emit(Opcode.CALL_BUILTIN, strIdx, line);
        return;
      }
    }

    // Regular function call
    this.compileNode(callee);
    const argCount = this.state.addConstant(args.length);
    this.state.emit(Opcode.CALL, argCount, line);
  }

  private compileLetDecl(node: ASTNode, line?: number): void {
    const name = (node as any).name;
    const value = node.children?.[0];

    this.compileNode(value);

    const idx = this.state.localVars.size;
    this.state.localVars.set(name, idx);
    this.state.emit(Opcode.STORE_LOCAL, idx, line);
  }

  private compileFnDecl(node: ASTNode, line?: number): void {
    const name = (node as any).name;
    const params = (node as any).params || [];
    const body = node.children?.[0];

    // Save current position
    const jumpIdx = this.state.emit(Opcode.JUMP, 0, line);

    // Function entry point
    const fnStart = this.state.instructions.length;

    // Setup local variables for parameters
    const locals = new Map<string, number>();
    params.forEach((param: string, i: number) => {
      locals.set(param, i);
    });

    // Store old locals and set new ones
    const oldLocals = new Map(this.state.localVars);
    this.state.localVars = locals;

    // Compile function body
    this.compileNode(body);

    // Ensure return
    if (this.state.instructions[this.state.instructions.length - 1].opcode !== Opcode.RETURN) {
      this.state.emit(Opcode.RETURN, 0, line);
    }

    const fnEnd = this.state.instructions.length;

    // Restore locals
    this.state.localVars = oldLocals;

    // Patch jump
    this.state.patch(jumpIdx, fnStart);

    // Store function metadata
    this.state.functions.set(name, {
      start: fnStart,
      end: fnEnd,
      locals: params,
    });

    // Load function as value
    const strIdx = this.state.addString(name);
    this.state.emit(Opcode.LOAD_GLOBAL, strIdx, line);
  }

  private compileSeedDecl(node: ASTNode, line?: number): void {
    const name = (node as any).name;
    const domain = (node as any).domain;
    const genes = node.children?.[0];

    // Push domain
    const domainIdx = this.state.addString(domain);
    this.state.emit(Opcode.PUSH_CONST, domainIdx, line);

    // Push genes (as struct)
    if (genes && genes.children) {
      const geneCount = this.state.addConstant(genes.children.length);
      this.state.emit(Opcode.STRUCT_CREATE, geneCount, line);

      for (const gene of genes.children) {
        const geneName = (gene as any).name;
        const geneValue = gene.children?.[0];

        this.compileNode(geneValue);
        const nameIdx = this.state.addString(geneName);
        this.state.emit(Opcode.SET_FIELD, nameIdx, line);
      }
    }

    // Create seed
    this.state.emit(Opcode.SEED_CREATE, 0, line);

    // Store in variable
    const nameIdx = this.state.addString(name);
    this.state.emit(Opcode.STORE_GLOBAL, nameIdx, line);
  }

  private compileGrowOp(node: ASTNode, line?: number): void {
    const seedExpr = node.children?.[0];
    const domain = (node as any).domain;

    this.compileNode(seedExpr);

    if (domain) {
      const domainIdx = this.state.addString(domain);
      this.state.emit(Opcode.PUSH_CONST, domainIdx, line);
    }

    this.state.emit(Opcode.SEED_GROW, domain ? 1 : 0, line);
  }
}

/**
 * Disassemble bytecode for debugging
 */
export function disassemble(program: BytecodeProgram): string {
  const lines: string[] = [];
  lines.push(`GSPL Bytecode v${program.version}`);
  lines.push(`Constants: ${program.constants.length}`);
  lines.push(`Strings: ${program.strings.length}`);
  lines.push(`Instructions: ${program.instructions.length}`);
  lines.push('');

  // Constants
  if (program.constants.length > 0) {
    lines.push('Constants:');
    program.constants.forEach((c, i) => {
      lines.push(`  ${i}: ${JSON.stringify(c)}`);
    });
    lines.push('');
  }

  // Strings
  if (program.strings.length > 0) {
    lines.push('Strings:');
    program.strings.forEach((s, i) => {
      lines.push(`  ${i}: "${s}"`);
    });
    lines.push('');
  }

  // Instructions
  lines.push('Instructions:');
  program.instructions.forEach((inst, i) => {
    const opcodeName = Opcode[inst.opcode] || `UNKNOWN_${inst.opcode}`;
    let operandStr = '';
    if (inst.operand !== 0) {
      if (inst.opcode === Opcode.PUSH_CONST) {
        operandStr = ` ${JSON.stringify(program.constants[inst.operand])}`;
      } else if (inst.opcode === Opcode.LOAD_GLOBAL || inst.opcode === Opcode.STORE_GLOBAL) {
        operandStr = ` "${program.strings[inst.operand]}"`;
      } else {
        operandStr = ` ${inst.operand}`;
      }
    }
    const line = inst.line ? ` (line ${inst.line})` : '';
    lines.push(`  ${i.toString().padStart(4)}: ${opcodeName}${operandStr}${line}`);
  });

  return lines.join('\n');
}
