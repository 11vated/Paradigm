/**
 * GSPL Module - Canonical Bridge to Kernel
 * 
 * This module bridges server.ts imports to the kernel's wired GSPL implementation.
 * All built-in functions (breed, mutate, evolve) actually invoke the deterministic
 * kernel genetic operators through the xoshiro256** RNG.
 * 
 * Canonical location: src/lib/gspl/
 * 
 * Architecture:
 * - lexer.ts → GsplLexer.tokenize()
 * - parser.ts → GsplParser.parse()  
 * - interpreter.ts → GsplInterpreter (wired to kernel genetic operators)
 */

import { GsplLexer as KernelLexer, TokenType } from '../kernel/gspl-lexer.js';
import { GsplParser as KernelParser, ASTNode, ASTNodeType } from '../kernel/gspl-parser.js';
import { GsplInterpreter, executeGspl } from '../kernel/gspl-interpreter.js';

// ─────────────────────────────────────────────────────────────────────────────
// LEXER - Tokenization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenize GSPL source code into tokens
 */
export function tokenize(source: string): { tokens: any[], errors: string[] } {
  try {
    const lexer = new KernelLexer(source);
    const tokens = lexer.tokenize();
    return { tokens, errors: [] };
  } catch (error) {
    return { 
      tokens: [], 
      errors: [`Lexer error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

export { TokenType };
export type { Token } from '../kernel/gspl-lexer.js';

// ─────────────────────────────────────────────────────────────────────────────
// PARSER - AST Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse GSPL source into AST
 */
export function parse(source: string): { ast: ASTNode[], errors: string[] } {
  try {
    const lexer = new KernelLexer(source);
    const tokens = lexer.tokenize();
    const parser = new KernelParser(tokens);
    const ast = parser.parse();
    return { ast, errors: [] };
  } catch (error) {
    return { 
      ast: [], 
      errors: [`Parser error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

export { ASTNodeType };
export type { ASTNode } from '../kernel/gspl-parser.js';
export type Program = ASTNode[];

// ─────────────────────────────────────────────────────────────────────────────
// INTERPRETER - Execution with Kernel Wiring
// ─────────────────────────────────────────────────────────────────────────────

export interface GSPLExecutionResult {
  seeds: any[];
  output: any[];
  errors: string[];
}

/**
 * Execute GSPL source code
 * 
 * IMPORTANT: This implementation is WIRED to the kernel:
 * - breed() actually calls Seed.cross() with deterministic RNG
 * - mutate() actually calls Seed.mutate() with deterministic RNG  
 * - evolve() actually runs GA/MAP-Elites/CMA-ES with deterministic RNG
 * - compose() calls cross-domain composition functors
 * - distance() calculates genetic distance between seeds
 * - grow() executes domain engines to generate artifacts
 * 
 * Same seed + same RNG = bit-identical output forever
 */
export function executeGSPL(source: string, context?: any): GSPLExecutionResult {
  const seeds: any[] = [];
  const output: any[] = [];
  const errors: string[] = [];
  
  try {
    // Use the kernel's wired interpreter
    const result = executeGspl(source, context?.seedPhrase);
    
    // Extract results
    if (result) {
      if (result.seeds) {
        seeds.push(...result.seeds);
      }
      if (result.output) {
        output.push(...result.output);
      }
      if (result.errors) {
        errors.push(...result.errors);
      }
    }
  } catch (error) {
    errors.push(`Execution error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return { seeds, output, errors };
}

// Also export the class for advanced usage
export { GsplInterpreter };

// ─────────────────────────────────────────────────────────────────────────────
// TYPE CHECKER (Optional)
// ─────────────────────────────────────────────────────────────────────────────

export function typeCheck(ast: ASTNode[]): { types: Record<string, string>, errors: string[] } {
  // Basic type checking - can be extended
  const types: Record<string, string> = {};
  const errors: string[] = [];
  
  // For now, return empty results - full type checking can be added later
  return { types, errors };
}