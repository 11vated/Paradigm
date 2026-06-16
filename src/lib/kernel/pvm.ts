/**
 * Paradigm Virtual Machine (PVM)
 * Phase III.1: Execute GSPL bytecode
 *
 * Stack-based VM with:
 * - 32-bit instruction words
 * - Operand stack (32-bit values)
 * - Local/global variable storage
 * - Function call stack
 * - Seed/generation operations
 */

import { Opcode } from './gspl-bytecode';
import type { BytecodeProgram } from './gspl-bytecode';
import type { Seed } from './types';
import { growSeed, growSeedSync, type Artifact } from './engines';
import { Xoshiro256StarStar } from './rng';
import { kernelNow, kernelNowIso } from './clock';

// VM Configuration
export interface PVMConfig {
  stackSize: number;
  maxSteps: number; // Max instructions before timeout
  debug: boolean;
  rng: Xoshiro256StarStar;
}

// VM State
interface VMState {
  stack: any[];
  callStack: CallFrame[];
  globals: Map<string, any>;
  locals: Map<string, any>[];
  ip: number; // Instruction pointer
  running: boolean;
  steps: number;
  output: any[];
  rng: Xoshiro256StarStar;
}

interface CallFrame {
  returnAddr: number;
  locals: Map<string, any>;
}

// Execution result
export interface PVMResult {
  success: boolean;
  output: any[];
  artifacts: Artifact[];
  steps: number;
  error?: string;
  finalStack: any[];
}

/**
 * Paradigm Virtual Machine
 */
export class PVM {
  private config: PVMConfig;
  private state: VMState;
  private program: BytecodeProgram | null = null;
  private builtins: Map<string, (...args: any[]) => any> = new Map();

  constructor(config: Partial<PVMConfig> = {}) {
    this.config = {
      stackSize: 1024,
      maxSteps: 100000,
      debug: false,
      rng: new Xoshiro256StarStar(BigInt(1)),
      ...config,
    };

    this.state = this.createInitialState();
    this.registerBuiltins();
  }

  /**
   * Load and execute a bytecode program
   */
  async execute(program: BytecodeProgram, globals?: Record<string, any>): Promise<PVMResult> {
    this.program = program;
    this.state = this.createInitialState();

    // Load initial globals
    if (globals) {
      for (const [key, value] of Object.entries(globals)) {
        this.state.globals.set(key, value);
      }
    }

    // Set entry point
    this.state.ip = program.entryPoint;

    if (this.config.debug) {
      console.log('[PVM] Starting execution...');
      console.log(`  Instructions: ${program.instructions.length}`);
      console.log(`  Constants: ${program.constants.length}`);
      console.log(`  Strings: ${program.strings.length}`);
    }

    try {
      await this.run();

      // Collect artifacts from execution (seed_grow operations produce artifacts)
      const artifacts = this.collectArtifacts();

      return {
        success: true,
        output: this.state.output,
        artifacts,
        steps: this.state.steps,
        finalStack: [...this.state.stack],
      };
    } catch (e: any) {
      return {
        success: false,
        output: this.state.output,
        artifacts: [],
        steps: this.state.steps,
        error: e.message,
        finalStack: [...this.state.stack],
      };
    }
  }

  /**
   * Collect artifacts from execution output
   * Artifacts are produced by seed_grow operations and stored in the output array
   */
  private collectArtifacts(): Artifact[] {
    const artifacts: Artifact[] = [];
    
    // Scan output array for Artifact objects
    for (const item of this.state.output) {
      if (item && typeof item === 'object' && 'artifactType' in item) {
        artifacts.push(item as Artifact);
      }
    }
    
    return artifacts;
  }

  /**
   * Main execution loop
   */
  private async run(): Promise<void> {
    if (!this.program) return;

    while (this.state.running && this.state.ip < this.program.instructions.length) {
      // Check step limit
      if (this.state.steps++ > this.config.maxSteps) {
        throw new Error(`Max steps (${this.config.maxSteps}) exceeded`);
      }

      const inst = this.program.instructions[this.state.ip];
      const opcode = inst.opcode;
      const operand = inst.operand;

      if (this.config.debug) {
        this.debugInstruction(this.state.ip, inst);
      }

      // Execute instruction
      const result = await this.executeInstruction(opcode, operand);

      if (result === 'halt') {
        break;
      }

      if (result !== 'continue') {
        this.state.ip = result; // Jump
      } else {
        this.state.ip++;
      }
    }
  }

  /**
   * Execute a single instruction
   */
  private async executeInstruction(opcode: Opcode, operand: number): Promise<number | 'continue' | 'halt'> {
    if (!this.program) return 'halt';

    const stack = this.state.stack;

    switch (opcode) {
      // Stack operations
      case Opcode.PUSH_CONST: {
        const value = this.program.constants[operand];
        stack.push(value?.value ?? value);
        return 'continue';
      }

      case Opcode.PUSH_VAR: {
        const name = this.program.strings[operand];
        const value = this.getVariable(name);
        stack.push(value);
        return 'continue';
      }

      case Opcode.POP: {
        stack.pop();
        return 'continue';
      }

      case Opcode.DUP: {
        stack.push(stack[stack.length - 1]);
        return 'continue';
      }

      case Opcode.SWAP: {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(a);
        stack.push(b);
        return 'continue';
      }

      // Arithmetic
      case Opcode.ADD: {
        const b = stack.pop();
        const a = stack.pop();
        if (typeof a === 'number' && typeof b === 'number') {
          stack.push(a + b);
        } else if (typeof a === 'string' && typeof b === 'string') {
          stack.push(a + b);
        } else {
          throw new Error(`Invalid ADD operands: ${typeof a}, ${typeof b}`);
        }
        return 'continue';
      }

      case Opcode.SUB: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a - b);
        return 'continue';
      }

      case Opcode.MUL: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a * b);
        return 'continue';
      }

      case Opcode.DIV: {
        const b = stack.pop();
        const a = stack.pop();
        if (b === 0) throw new Error('Division by zero');
        stack.push(a / b);
        return 'continue';
      }

      case Opcode.MOD: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a % b);
        return 'continue';
      }

      case Opcode.POW: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(Math.pow(a, b));
        return 'continue';
      }

      case Opcode.NEG: {
        const a = stack.pop();
        stack.push(-a);
        return 'continue';
      }

      // Comparison
      case Opcode.EQ: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a === b);
        return 'continue';
      }

      case Opcode.NEQ: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a !== b);
        return 'continue';
      }

      case Opcode.LT: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a < b);
        return 'continue';
      }

      case Opcode.LTE: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a <= b);
        return 'continue';
      }

      case Opcode.GT: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a > b);
        return 'continue';
      }

      case Opcode.GTE: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a >= b);
        return 'continue';
      }

      // Logical
      case Opcode.AND: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a && b);
        return 'continue';
      }

      case Opcode.OR: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a || b);
        return 'continue';
      }

      case Opcode.NOT: {
        const a = stack.pop();
        stack.push(!a);
        return 'continue';
      }

      // Control flow
      case Opcode.JUMP: {
        return operand;
      }

      case Opcode.JUMP_IF_FALSE: {
        const cond = stack.pop();
        if (!cond) {
          return operand;
        }
        return 'continue';
      }

      case Opcode.JUMP_IF_TRUE: {
        const cond = stack.pop();
        if (cond) {
          return operand;
        }
        return 'continue';
      }

      case Opcode.CALL: {
        const argCount = this.program.constants[operand] || operand;
        const func = stack.pop();

        if (typeof func === 'function') {
          const args = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(stack.pop());
          }
          const result = func(...args);
          stack.push(result);
        } else if (typeof func === 'string' && this.program.functions.has(func)) {
          // Call GSPL function
          const fnInfo = this.program.functions.get(func)!;
          const frame: CallFrame = {
            returnAddr: this.state.ip + 1,
            locals: new Map(),
          };
          this.state.callStack.push(frame);
          return fnInfo.start;
        } else {
          throw new Error(`Cannot call: ${typeof func}`);
        }
        return 'continue';
      }

      case Opcode.RETURN: {
        if (this.state.callStack.length === 0) {
          return 'halt';
        }
        const frame = this.state.callStack.pop()!;
        return frame.returnAddr;
      }

      case Opcode.CALL_BUILTIN: {
        const name = this.program.strings[operand];
        const builtin = this.builtins.get(name);

        if (!builtin) {
          throw new Error(`Unknown builtin: ${name}`);
        }

        // Find arg count (peek at stack to determine)
        // For simplicity, we'll use a marker or the builtin knows its arity
        const result = builtin();
        stack.push(result);
        return 'continue';
      }

      // Load/Store
      case Opcode.LOAD_LOCAL: {
        const frame = this.state.callStack[this.state.callStack.length - 1];
        const locals = frame?.locals || this.state.locals[0] || new Map();
        const value = locals.get(operand.toString());
        stack.push(value);
        return 'continue';
      }

      case Opcode.STORE_LOCAL: {
        const frame = this.state.callStack[this.state.callStack.length - 1];
        const locals = frame?.locals || this.state.locals[0] || new Map();
        const value = stack.pop();
        locals.set(operand.toString(), value);
        return 'continue';
      }

      case Opcode.LOAD_GLOBAL: {
        const name = this.program.strings[operand];
        const value = this.state.globals.get(name);
        stack.push(value);
        return 'continue';
      }

      case Opcode.STORE_GLOBAL: {
        const name = this.program.strings[operand];
        const value = stack.pop();
        this.state.globals.set(name, value);
        return 'continue';
      }

      // Seed operations
      case Opcode.SEED_CREATE: {
        const genes = stack.pop(); // Struct/object
        const domain = stack.pop(); // String

        const seed: Seed = {
          phrase: `seed_${kernelNow()}`,
          hash: '',
          rng: this.state.rng,
          $domain: domain,
          $name: 'PVM Generated',
          ...genes,
        } as Seed;

        stack.push(seed);
        return 'continue';
      }

      case Opcode.SEED_GROW: {
        const _domain = operand > 0 ? stack.pop() : undefined;
        const seed = stack.pop();

        try {
          const artifact = await growSeed(seed);
          stack.push(artifact);
        } catch (e: any) {
          stack.push(null);
        }
        return 'continue';
      }

      // Special
      case Opcode.HALT: {
        this.state.running = false;
        return 'halt';
      }

      case Opcode.NOP: {
        return 'continue';
      }

      case Opcode.PRINT: {
        const value = stack.pop();
        this.state.output.push(value);
        if (this.config.debug) {
          console.log('[PVM Output]', value);
        }
        return 'continue';
      }

      // Bitwise operations
      case Opcode.BIT_AND: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a & b);
        return 'continue';
      }

      case Opcode.BIT_OR: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a | b);
        return 'continue';
      }

      case Opcode.BIT_XOR: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a ^ b);
        return 'continue';
      }

      case Opcode.BIT_NOT: {
        const a = stack.pop();
        stack.push(~a);
        return 'continue';
      }

      case Opcode.SHL: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a << b);
        return 'continue';
      }

      case Opcode.SHR: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a >> b);
        return 'continue';
      }

      // Load/Store field and index
      case Opcode.LOAD_FIELD: {
        const fieldName = this.program.strings[operand];
        const obj = stack.pop();
        stack.push(obj?.[fieldName]);
        return 'continue';
      }

      case Opcode.STORE_FIELD: {
        const fieldName = this.program.strings[operand];
        const value = stack.pop();
        const obj = stack.pop();
        if (obj && typeof obj === 'object') {
          obj[fieldName] = value;
        }
        stack.push(value);
        return 'continue';
      }

      case Opcode.LOAD_INDEX: {
        const index = stack.pop();
        const arr = stack.pop();
        stack.push(arr?.[index]);
        return 'continue';
      }

      case Opcode.STORE_INDEX: {
        const index = stack.pop();
        const value = stack.pop();
        const arr = stack.pop();
        if (Array.isArray(arr)) {
          arr[index] = value;
        }
        stack.push(value);
        return 'continue';
      }

      // Additional seed operations
      case Opcode.SEED_MUTATE: {
        const rate = operand > 0 ? stack.pop() : 0.15;
        const seed = stack.pop();
        // Use seed's built-in mutate method
        if (seed && typeof seed.mutate === 'function') {
          const mutated = seed.mutate(this.state.rng, rate);
          stack.push(mutated);
        } else {
          stack.push(seed);
        }
        return 'continue';
      }

      case Opcode.SEED_CROSSOVER: {
        const seedB = stack.pop();
        const seedA = stack.pop();
        // Use seed's built-in cross method
        if (seedA && typeof seedA.cross === 'function') {
          const child = seedA.cross(seedB, this.state.rng);
          stack.push(child);
        } else {
          stack.push(seedA);
        }
        return 'continue';
      }

      case Opcode.SEED_BREED: {
        const seedB = stack.pop();
        const seedA = stack.pop();
        // Use seed's built-in cross method for breeding
        if (seedA && typeof seedA.cross === 'function') {
          const child = seedA.cross(seedB, this.state.rng);
          stack.push(child);
        } else {
          stack.push(seedA);
        }
        return 'continue';
      }

      // Type operations
      case Opcode.TYPE_CAST: {
        const targetType = this.program.strings[operand];
        const value = stack.pop();
        let casted: any;
        switch (targetType) {
          case 'string':
            casted = String(value);
            break;
          case 'number':
            casted = Number(value);
            break;
          case 'boolean':
            casted = Boolean(value);
            break;
          default:
            casted = value;
        }
        stack.push(casted);
        return 'continue';
      }

      case Opcode.TYPE_CHECK: {
        const expectedType = this.program.strings[operand];
        const value = stack.pop();
        let isMatch = false;
        switch (expectedType) {
          case 'string':
            isMatch = typeof value === 'string';
            break;
          case 'number':
            isMatch = typeof value === 'number';
            break;
          case 'boolean':
            isMatch = typeof value === 'boolean';
            break;
          case 'object':
            isMatch = typeof value === 'object' && value !== null;
            break;
          case 'array':
            isMatch = Array.isArray(value);
            break;
          default:
            isMatch = false;
        }
        stack.push(isMatch);
        return 'continue';
      }

      // Vector/Struct operations
      case Opcode.VECTOR_CREATE: {
        const count = operand;
        const elements = [];
        for (let i = 0; i < count; i++) {
          elements.unshift(stack.pop());
        }
        stack.push(elements);
        return 'continue';
      }

      case Opcode.STRUCT_CREATE: {
        const fieldCount = operand;
        const struct: Record<string, any> = {};
        for (let i = 0; i < fieldCount; i++) {
          const value = stack.pop();
          const fieldName = this.program.strings[stack.pop()];
          struct[fieldName] = value;
        }
        stack.push(struct);
        return 'continue';
      }

      case Opcode.GET_FIELD: {
        const fieldName = this.program.strings[operand];
        const obj = stack.pop();
        stack.push(obj?.[fieldName]);
        return 'continue';
      }

      case Opcode.SET_FIELD: {
        const fieldName = this.program.strings[operand];
        const value = stack.pop();
        const obj = stack.pop();
        if (obj && typeof obj === 'object') {
          obj[fieldName] = value;
        }
        stack.push(obj);
        return 'continue';
      }

      default:
        throw new Error(`Unknown opcode: ${opcode}`);
    }
  }

  /**
   * Get variable value (check locals, then globals)
   */
  private getVariable(name: string): any {
    // Check current call frame locals
    const frame = this.state.callStack[this.state.callStack.length - 1];
    if (frame && frame.locals.has(name)) {
      return frame.locals.get(name);
    }

    // Check globals
    if (this.state.globals.has(name)) {
      return this.state.globals.get(name);
    }

    return undefined;
  }

  /**
   * Register builtin functions
   */
  private registerBuiltins(): void {
    this.builtins.set('random', () => {
      return this.state.rng.nextF64();
    });

    this.builtins.set('print', (...args: any[]) => {
      this.state.output.push(args);
      return undefined;
    });

    this.builtins.set('generate_character', (seed: Seed) => {
      return growSeedSync({ ...seed, $domain: 'character' });
    });

    this.builtins.set('generate_music', (seed: Seed) => {
      return growSeedSync({ ...seed, $domain: 'music' });
    });
  }

  /**
   * Create initial VM state
   */
  private createInitialState(): VMState {
    return {
      stack: [],
      callStack: [],
      globals: new Map(),
      locals: [],
      ip: 0,
      running: true,
      steps: 0,
      output: [],
      rng: this.config.rng,
    };
  }

  /**
   * Debug: Print instruction
   */
  private debugInstruction(ip: number, inst: any): void {
    const opcodeName = Opcode[inst.opcode] || `UNKNOWN_${inst.opcode}`;
    let operandStr = '';
    if (inst.operand !== 0 && this.program) {
      if (inst.opcode === Opcode.PUSH_CONST) {
        operandStr = ` ${JSON.stringify(this.program.constants[inst.operand])}`;
      } else if (inst.opcode === Opcode.LOAD_GLOBAL || inst.opcode === Opcode.STORE_GLOBAL) {
        operandStr = ` "${this.program.strings[inst.operand]}"`;
      } else {
        operandStr = ` ${inst.operand}`;
      }
    }
    console.log(`  ${ip}: ${opcodeName}${operandStr} | stack: [${this.state.stack.map(s => JSON.stringify(s)).join(', ')}]`);
  }

  /**
   * Get current VM state (for debugging)
   */
  getState() {
    return {
      stack: [...this.state.stack],
      globals: Object.fromEntries(this.state.globals),
      ip: this.state.ip,
      steps: this.state.steps,
      running: this.state.running,
    };
  }
}

/**
 * Helper: Compile and run GSPL source in PVM
 */
export async function runGsplInPVM(source: string, config?: Partial<PVMConfig>): Promise<PVMResult> {
  const { GsplBytecodeCompiler } = await import('./gspl-bytecode');
  const compiler = new GsplBytecodeCompiler();
  const program = compiler.compile(source);

  const pvm = new PVM(config);
  return pvm.execute(program);
}
