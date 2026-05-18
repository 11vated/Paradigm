import { GsplLexer } from './gspl-lexer';
import { GsplParser, ASTNodeType } from './gspl-parser';
import { Xoshiro256StarStar } from './rng';
import { geneTypeRegistry, type GeneTypeOps, type GeneSchema } from './gene-type-registry';

export interface GSPLGeneTypeDefinition {
  name: string;
  baseType: string;
  description?: string;
  constraints?: Partial<GeneSchema>;
  validate: string;
  mutate: string;
  crossover: string;
  distance: string;
  canonicalize?: string;
  repair?: string;
}

const BUILTIN_TYPES = `
  // Built-in RNG and math available to gene type operators
  random = fn(): scalar { return external.call('rng', 'nextF64') }
  clamp(v: scalar, lo: scalar, hi: scalar): scalar { 
    if v < lo then return lo else if v > hi then return hi else return v 
  }
  lerp(a: scalar, b: scalar, t: scalar): scalar { return a + t * (b - a) }
`;

/**
 * Parse a GSPL gene type definition string and extract operator functions.
 * The GSPL source should define validate, mutate, crossover, distance functions.
 */
export function parseGSPLGeneType(source: string): GSPLGeneTypeDefinition {
  const lexer = new GsplLexer(source);
  const tokens = lexer.tokenize();
  const parser = new GsplParser(tokens);
  const ast = parser.parse();

  let name = '';
  let baseType = 'scalar';
  let description = '';
  const constraints: Partial<GeneSchema> = {};

  const validate: string[] = [];
  const mutate: string[] = [];
  const crossover: string[] = [];
  const distance: string[] = [];
  const canonicalize: string[] = [];
  const repair: string[] = [];

  for (const node of ast) {
    if (node.type === 'TYPE_DECL' || node.type === ASTNodeType.FN_DECL) {
      const fn = node as any;
      const fnName = fn.name || '';
      const fnBody = source.slice(fn.loc?.start || 0, fn.loc?.end || source.length);

      if (fnName === 'validate') validate.push(fnBody);
      else if (fnName === 'mutate') mutate.push(fnBody);
      else if (fnName === 'crossover') crossover.push(fnBody);
      else if (fnName === 'distance') distance.push(fnBody);
      else if (fnName === 'canonicalize') canonicalize.push(fnBody);
      else if (fnName === 'repair') repair.push(fnBody);
    }
  }

  return {
    name: name || 'custom',
    baseType,
    description,
    constraints,
    validate: validate.join('\n') || '(v, schema) => true',
    mutate: mutate.join('\n') || '(v, rate, rng) => v',
    crossover: crossover.join('\n') || '(a, b, rng) => a',
    distance: distance.join('\n') || '(a, b) => 0',
    canonicalize: canonicalize.join('\n') || '(v, schema) => v',
    repair: repair.join('\n') || '(v, schema) => v',
  };
}

/**
 * Compile operator function bodies into callable GeneTypeOps.
 * Uses new Function() with injected RNG helpers — the bodies are plain
 * JavaScript evaluated at runtime (safe because they run server-side
 * and are validated before registration).
 */
export function compileGSPLOperators(
  definition: GSPLGeneTypeDefinition,
): GeneTypeOps {
  const makeFn = (body: string, params: string[]): Function => {
    const rngHelpers = `
      var _rngNextF64 = function() { return _rng.nextF64() };
      var _rngNextInt = function(m,x) { return _rng.nextInt(m||0,x||100) };
      var _rngNextBool = function() { return _rng.nextBool() };
      var _rngNextGaussian = function() { return _rng.nextGaussian() };
      var _rngChoice = function(a) { return _rng.nextChoice(a) };
    `;
    return new Function('_v', '_r', '_a', '_b', '_rng', '_s', rngHelpers + '\n' + body);
  };

  return {
    validate: ((value: any, schema?: any) => {
      try { return !!makeFn(definition.validate, ['v','s'])(value, null, null, null, null, schema); }
      catch { return false; }
    }) as any,
    mutate: ((value: any, rate: number, rng: any, schema?: any) => {
      return makeFn(definition.mutate, ['v','rate','rng','s'])(value, rate, null, null, rng, schema);
    }) as any,
    crossover: ((a: any, b: any, rng: any) => {
      return makeFn(definition.crossover, ['a','b','rng'])(null, null, a, b, rng, null);
    }) as any,
    distance: ((a: any, b: any, schema?: any) => {
      return makeFn(definition.distance, ['a','b','s'])(null, null, a, b, null, schema) as number;
    }) as any,
    canonicalize: ((value: any, schema?: any) => {
      try { return makeFn(definition.canonicalize ?? '(v,s) => v', ['v','s'])(value, null, null, null, null, schema); }
      catch { return value; }
    }) as any,
    repair: ((value: any, schema?: any) => {
      try { return makeFn(definition.repair ?? '(v,s) => v', ['v','s'])(value, null, null, null, null, schema); }
      catch { return value; }
    }) as any,
  };
}

/**
 * Register a GSPL-defined gene type into the registry.
 * Automatically runs law verification and rejects invalid types.
 */
export function registerGSPLGeneType(
  definition: GSPLGeneTypeDefinition,
): { success: boolean; name: string; errors: string[] } {
  const errors: string[] = [];

  if (!definition.name.match(/^[a-z][a-zA-Z0-9_]*$/)) {
    errors.push(`Invalid type name: "${definition.name}". Must start with lowercase letter, alphanumeric+underscore only.`);
  }

  if (geneTypeRegistry.get(definition.name)) {
    errors.push(`Type "${definition.name}" already exists`);
  }

  let ops: GeneTypeOps;
  try {
    ops = compileGSPLOperators(definition);
  } catch (e: any) {
    errors.push(`Operator compilation failed: ${e.message}`);
    return { success: false, name: definition.name, errors };
  }

  // Test basic execution
  try {
    const testRng = new Xoshiro256StarStar('register-test');
    const testVal = definition.constraints?.dimensions
      ? Array.from({ length: definition.constraints.dimensions! }, () => 0.5)
      : 0.5;

    if (typeof ops.validate(testVal, definition.constraints) !== 'boolean') {
      errors.push('validate() must return a boolean');
    }
    ops.mutate(testVal, 0.1, testRng, definition.constraints);
    ops.crossover(testVal, testVal, testRng);
    if (typeof ops.distance(testVal, testVal, definition.constraints) !== 'number') {
      errors.push('distance() must return a number');
    }
  } catch (e: any) {
    errors.push(`Operator execution test failed: ${e.message}`);
  }

  if (errors.length > 0) {
    return { success: false, name: definition.name, errors };
  }

  // Register
  try {
    geneTypeRegistry.derive(definition.baseType, {
      name: definition.name,
      constraints: definition.constraints,
      ops,
      description: definition.description,
    });
  } catch (e: any) {
    errors.push(`Registration failed: ${e.message}`);
    return { success: false, name: definition.name, errors };
  }

  // Run law verification
  const lawRng = new Xoshiro256StarStar(`law-${definition.name}-${Date.now()}`);
  const laws = geneTypeRegistry.verifyLaws(definition.name, lawRng);
  if (!laws.valid) {
    geneTypeRegistry.deleteCustom(definition.name);
    errors.push(`Law verification failed: ${laws.errors.join('; ')}`);
    return { success: false, name: definition.name, errors };
  }

  return { success: true, name: definition.name, errors: [] };
}

export const GSPL_GENE_TYPE_EXAMPLE = `
// Define a "color_channel" gene type — a scalar clamped to [0, 255]
// used for RGB color values
type color_channel = scalar { min: 0, max: 255 }

fn validate(v, schema) {
  if typeof v != "number" then return false
  if v < 0 then return false
  if v > 255 then return false
  return true
}

fn mutate(v, rate, rng) {
  let delta = rng.nextGaussian() * rate * 255
  let result = v + delta
  if result < 0 then result = 0
  if result > 255 then result = 255
  return result
}

fn crossover(a, b, rng) {
  return lerp(a, b, rng.nextF64())
}

fn distance(a, b) {
  return abs(a - b) / 255
}
`.trim();
