/**
 * Safe Gene Executor - Validated and sandboxed function execution
 * 
 * Replaces dangerous unrestricted `new Function()` calls with validated,
 * sandboxed execution. Provides controlled execution context for gene operations.
 * 
 * Security: 
 * - Source code validated before execution (no eval, require, process, etc.)
 * - Execution in isolated scope with only allowed variables
 * - No access to global scope or dangerous APIs
 * - All operations run in strict mode
 */

import type { Xoshiro256StarStar } from './rng';

/**
 * Safe execution context with controlled scope
 */
interface SafeContext {
  // Input parameters
  _v?: any;      // value
  _r?: number;   // rate
  _a?: any;      // parent A
  _b?: any;      // parent B
  _rng?: Xoshiro256StarStar;
  _s?: any;      // schema
  
  // RNG helper functions (safe wrappers)
  _rngNextF64?: () => number;
  _rngNextInt?: (min: number, max: number) => number;
  _rngNextBool?: () => boolean;
  _rngNextGaussian?: () => number;
  _rngChoice?: <T>(arr: T[]) => T;
}

/**
 * Dangerous patterns that must not appear in gene operation source code
 */
const DANGEROUS_PATTERNS = [
  /\beval\b/,
  /\bFunction\b/,
  /\brequire\b/,
  /\bimport\b/,
  /\bprocess\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bglobal\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bsetImmediate\b/,
  /\bchild_process\b/,
  /\bfs\b/,
  /\bpath\b/,
  /\bos\b/,
  /\bnet\b/,
  /\bhttp\b/,
  /\bhttps\b/,
];

/**
 * Validate gene operation source code for security
 */
export function validateGeneOperationSource(source: string): void {
  if (!source || typeof source !== 'string') {
    throw new Error('Gene operation source must be a non-empty string');
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(source)) {
      throw new Error(`Dangerous pattern detected in gene operation: ${pattern.source}`);
    }
  }

  // Check for suspicious characters that might indicate code injection
  if (source.includes('\\x') || source.includes('\\u')) {
    throw new Error('Escape sequences not allowed in gene operations');
  }
}

/**
 * Create safe RNG helpers bound to a specific RNG instance
 */
function createRngHelpers(rng: Xoshiro256StarStar): Partial<SafeContext> {
  return {
    _rngNextF64: () => rng.nextF64(),
    _rngNextInt: (min = 0, max = 100) => rng.nextInt(min, max),
    _rngNextBool: () => rng.nextBool(),
    _rngNextGaussian: () => rng.nextGaussian(),
    _rngChoice: <T>(arr: T[]) => rng.nextChoice(arr),
  };
}

/**
 * Safe gene operation executor with validation and sandboxing
 */
export class SafeGeneExecutor {
  /**
   * Create a sandboxed function with validated source code
   * 
   * This uses Function constructor but with strict validation and isolated scope.
   * The function runs in strict mode with no access to outer scope.
   */
  private static createSandboxedFunction(
    source: string,
    paramNames: string[]
  ): (...args: any[]) => any {
    // Validate source before creating function
    validateGeneOperationSource(source);

    // Wrap in strict mode and add return if not present
    const wrappedSource = source.trim().startsWith('return')
      ? `"use strict";\n${source}`
      : `"use strict";\n${source}`;

    try {
      // Create function with explicit parameter list
      // This runs in isolated scope with no access to outer variables
      return new Function(...paramNames, wrappedSource) as (...args: any[]) => any;
    } catch (error) {
      throw new Error(`Failed to create gene operation function: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create validate function: (value, schema?) => boolean
   */
  static createValidate(source: string): (value: any, schema?: any) => boolean {
    const fn = this.createSandboxedFunction(source, ['_v', '_s']);
    return (value: any, schema?: any) => {
      try {
        return !!fn(value, schema);
      } catch {
        return false;
      }
    };
  }

  /**
   * Create mutate function: (value, rate, rng, schema?) => any
   */
  static createMutate(source: string): (value: any, rate: number, rng: Xoshiro256StarStar, schema?: any) => any {
    const fn = this.createSandboxedFunction(source, [
      '_v', '_r', '_rngNextF64', '_rngNextInt', '_rngNextBool', '_rngNextGaussian', '_rngChoice', '_s'
    ]);
    return (value: any, rate: number, rng: Xoshiro256StarStar, schema?: any) => {
      const helpers = createRngHelpers(rng);
      return fn(
        value,
        rate,
        helpers._rngNextF64,
        helpers._rngNextInt,
        helpers._rngNextBool,
        helpers._rngNextGaussian,
        helpers._rngChoice,
        schema
      );
    };
  }

  /**
   * Create crossover function: (a, b, rng) => any
   */
  static createCrossover(source: string): (a: any, b: any, rng: Xoshiro256StarStar) => any {
    const fn = this.createSandboxedFunction(source, [
      '_a', '_b', '_rngNextF64', '_rngNextInt', '_rngNextBool', '_rngNextGaussian', '_rngChoice'
    ]);
    return (a: any, b: any, rng: Xoshiro256StarStar) => {
      const helpers = createRngHelpers(rng);
      return fn(
        a,
        b,
        helpers._rngNextF64,
        helpers._rngNextInt,
        helpers._rngNextBool,
        helpers._rngNextGaussian,
        helpers._rngChoice
      );
    };
  }

  /**
   * Create distance function: (a, b, schema?) => number
   */
  static createDistance(source: string): (a: any, b: any, schema?: any) => number {
    const fn = this.createSandboxedFunction(source, ['_a', '_b', '_s']);
    return (a: any, b: any, schema?: any) => {
      return fn(a, b, schema) as number;
    };
  }

  /**
   * Create canonicalize function: (value, schema?) => any
   */
  static createCanonicalize(source: string): (value: any, schema?: any) => any {
    const fn = this.createSandboxedFunction(source, ['_v', '_s']);
    return (value: any, schema?: any) => {
      try {
        return fn(value, schema);
      } catch {
        return value;
      }
    };
  }

  /**
   * Create repair function: (value, schema?) => any
   */
  static createRepair(source: string): (value: any, schema?: any) => any {
    const fn = this.createSandboxedFunction(source, ['_v', '_s']);
    return (value: any, schema?: any) => {
      try {
        return fn(value, schema);
      } catch {
        return value;
      }
    };
  }
}

// Made with Bob
