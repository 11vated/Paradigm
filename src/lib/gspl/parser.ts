export type Expr =
  | { kind: 'literal'; value: any }
  | { kind: 'identifier'; name: string }
  | { kind: 'array'; elements: Expr[] }
  | { kind: 'object'; properties: { name: string; value: Expr }[] }
  | { kind: 'unary'; op: string; expr: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'call'; callee: string; args: Expr[] };

export type Statement =
  | { kind: 'seed_decl'; name: Expr; domain: Expr; strata?: string[]; genes: { name: string; value: Expr }[] }
  | { kind: 'let_binding'; name: string; value: Expr }
  | { kind: 'fn_decl'; name: string; params: string[]; body: Statement[] }
  | { kind: 'if_stmt'; condition: Expr; then: Statement[]; else_branch: Statement[] }
  | { kind: 'for_stmt'; variable: string; iterable: Expr; body: Statement[] }
  | { kind: 'return_stmt'; value: Expr }
  | { kind: 'expr_stmt'; expr: Expr };

export interface Program {
  kind: 'program';
  body: Statement[];
}

export const ASTNodeType = {};

export function parse(source: string): { ast: Program; errors: string[] } {
  const body: Statement[] = [];
  const errors: string[] = [];
  const src = source.trim();
  if (!src) return { ast: { kind: 'program', body }, errors };
  try {
    for (const statement of splitTopLevel(src)) {
      const parsed = parseStatement(statement.trim());
      if (parsed) body.push(parsed);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return { ast: { kind: 'program', body }, errors };
}

function splitTopLevel(source: string): string[] {
  const out: string[] = [];
  let current = '';
  let depth = 0;
  let quote = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' && source[i - 1] !== '\\') quote = !quote;
    if (!quote) {
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      if (ch === '}' || ch === ']' || ch === ')') depth--;
      if ((ch === '\n' || ch === ';') && depth === 0) {
        if (current.trim()) out.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function parseStatement(source: string): Statement | null {
  const seedEditor = source.match(/^seed\s+"([^"]+)"\s+in\s+([\w.-]+)\s*(?:strata:\s*([^{]+))?\s*\{([\s\S]*)\}$/);
  if (seedEditor) {
    const strata = seedEditor[3] ? seedEditor[3].trim().split('+').map(s => s.trim()) : [];
    return { kind: 'seed_decl', name: literal(seedEditor[1]), domain: literal(seedEditor[2]), strata, genes: parseGenes(seedEditor[4]) };
  }
  const seedLibrary = source.match(/^seed\s+([\w.]+)\s*(?:strata:\s*([^{]+))?\s*\{([\s\S]*)\}$/);
  if (seedLibrary) {
    const strata = seedLibrary[2] ? seedLibrary[2].trim().split('+').map(s => s.trim()) : [];
    return { kind: 'seed_decl', name: ident(seedLibrary[1]), domain: ident(seedLibrary[1]), strata, genes: parseGenes(seedLibrary[3]) };
  }
  const fn = source.match(/^fn\s+(\w+)\(([^)]*)\)\s*\{([\s\S]*)\}$/);
  if (fn) {
    return { kind: 'fn_decl', name: fn[1], params: fn[2].split(',').map(s => s.trim()).filter(Boolean), body: splitTopLevel(fn[3]).map(s => parseStatement(s)!).filter(Boolean) };
  }
  const ifMatch = source.match(/^if\s+([\s\S]+?)\s*\{([\s\S]*)\}\s*else\s*\{([\s\S]*)\}$/);
  if (ifMatch) {
    return { kind: 'if_stmt', condition: parseExpr(ifMatch[1]), then: splitTopLevel(ifMatch[2]).map(s => parseStatement(s)!).filter(Boolean), else_branch: splitTopLevel(ifMatch[3]).map(s => parseStatement(s)!).filter(Boolean) };
  }
  const forMatch = source.match(/^for\s+(\w+)\s+in\s+([\s\S]+?)\s*\{([\s\S]*)\}$/);
  if (forMatch) {
    return { kind: 'for_stmt', variable: forMatch[1], iterable: parseExpr(forMatch[2]), body: splitTopLevel(forMatch[3]).map(s => parseStatement(s)!).filter(Boolean) };
  }
  const letMatch = source.match(/^let\s+(\w+)\s*=\s*([\s\S]+)$/);
  if (letMatch) return { kind: 'let_binding', name: letMatch[1], value: parseExpr(letMatch[2]) };
  const returnMatch = source.match(/^return\s+([\s\S]+)$/);
  if (returnMatch) return { kind: 'return_stmt', value: parseExpr(returnMatch[1]) };
  return { kind: 'expr_stmt', expr: parseExpr(source) };
}

function parseGenes(source: string): { name: string; value: Expr }[] {
  const compact = source.replace(/\n\s*(?=\w+\s*[:=])/g, ',');
  return splitArgs(compact).map(part => {
    const [name, ...rest] = part.split(/[:=]/);
    return { name: name.trim(), value: parseExpr(rest.join(':').trim()) };
  }).filter(g => g.name);
}

export function parseExpr(source: string): Expr {
  const s = source.trim();
  for (const group of [['>', '<'], ['+', '-'], ['*', '/']]) {
    for (const op of group) {
      const idx = findOperator(s, op);
      if (idx > 0) return { kind: 'binary', op, left: parseExpr(s.slice(0, idx)), right: parseExpr(s.slice(idx + 1)) };
    }
  }
  if (s.startsWith('-')) return { kind: 'unary', op: '-', expr: parseExpr(s.slice(1)) };
  if (/^\d+(\.\d+)?$/.test(s)) return literal(Number(s));
  if (s === 'true') return literal(true);
  if (s === 'false') return literal(false);
  if (s.startsWith('"') && s.endsWith('"')) return literal(s.slice(1, -1));
  if (s.startsWith('[') && s.endsWith(']')) return { kind: 'array', elements: splitArgs(s.slice(1, -1)).map(parseExpr) };
  if (s.startsWith('{') && s.endsWith('}')) return { kind: 'object', properties: parseGenes(s.slice(1, -1)) };
  const call = s.match(/^([\w.]+)\(([\s\S]*)\)$/);
  if (call) return { kind: 'call', callee: call[1], args: call[2].trim() ? splitArgs(call[2]).map(parseExpr) : [] };
  return ident(s);
}

function splitArgs(source: string): string[] {
  const out: string[] = [];
  let current = '';
  let depth = 0;
  let quote = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' && source[i - 1] !== '\\') quote = !quote;
    if (!quote) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (ch === ',' && depth === 0) {
        out.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function findOperator(source: string, op: string): number {
  let depth = 0;
  let quote = false;
  for (let i = source.length - 1; i >= 0; i--) {
    const ch = source[i];
    if (ch === '"' && source[i - 1] !== '\\') quote = !quote;
    if (quote) continue;
    if (ch === ')' || ch === ']') depth++;
    if (ch === '(' || ch === '[') depth--;
    if (depth === 0 && ch === op && !(op === '-' && i === 0)) return i;
  }
  return -1;
}

const literal = (value: any): Expr => ({ kind: 'literal', value });
const ident = (name: string): Expr => ({ kind: 'identifier', name });
