/**
 * @deprecated This standalone interpreter is a stub.
 * Use the kernel-wired GSPL interpreter from `../kernel/gspl-interpreter` instead.
 *
 * The kernel interpreter wires all builtins (mutate, breed, evolve, compose, grow)
 * to the deterministic xoshiro256** RNG and real kernel operators.
 *
 * Migration: Use `executeGSPL` from `./index.ts` (which wraps the kernel interpreter)
 * or import `executeGspl` directly from `../kernel/gspl-interpreter`.
 */

import { executeGspl } from '../kernel/gspl-interpreter.js';

export interface GSPLExecutionResult {
  seeds: any[];
  output: string[];
  errors: string[];
}

export class GSPLInterpreter {
  async execute(source: string): Promise<GSPLExecutionResult> {
    return executeGSPL(source);
  }
}

export async function executeGSPL(source: string): Promise<GSPLExecutionResult> {
  try {
    // Auto-append semicolons for loose syntax compatibility
    const normalized = source.split('\n').map(line => {
      const trimmed = line.trimEnd();
      if (!trimmed.trim() || trimmed.endsWith('{') || trimmed.endsWith('}') || trimmed.endsWith(';')) {
        return line;
      }
      return line.trimEnd() + ';';
    }).join('\n');
    
    const result = await executeGspl(normalized);
    return {
      seeds: result?.seeds ?? [],
      output: result?.output ?? [],
      errors: result?.errors ?? [],
    };
  } catch (error) {
    return {
      seeds: [],
      output: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
