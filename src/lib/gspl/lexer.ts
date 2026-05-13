/**
 * @deprecated This adapter layer is no longer needed.
 * Use GsplLexer directly from `../kernel/gspl-lexer`.
 */

import { GsplLexer, TokenType as KernelTokenType, type Token } from '../kernel/gspl-lexer.js';

export const TokenType = {
  // Map kernel types to legacy names
  INT: KernelTokenType.INT,
  FLOAT: KernelTokenType.FLOAT,
  NUMBER: 'NUMBER', // Unified number type
  STRING: KernelTokenType.STRING,
  BOOLEAN: KernelTokenType.BOOLEAN,
  NULL: KernelTokenType.NULL,
  IDENT: KernelTokenType.IDENTIFIER, // Legacy name
  IDENTIFIER: KernelTokenType.IDENTIFIER,
  GENE_NAME: KernelTokenType.GENE_NAME,
  
  // Keywords
  SEED: KernelTokenType.SEED,
  BREED: KernelTokenType.BREED,
  MUTATE: KernelTokenType.MUTATE,
  COMPOSE: KernelTokenType.COMPOSE,
  EVOLVE: KernelTokenType.EVOLVE,
  GROW: KernelTokenType.GROW,
  EXPORT: KernelTokenType.EXPORT,
  IMPORT: KernelTokenType.IMPORT,
  LET: KernelTokenType.LET,
  FN: KernelTokenType.FN,
  IF: KernelTokenType.IF,
  ELSE: KernelTokenType.ELSE,
  MATCH: KernelTokenType.MATCH,
  FOR: KernelTokenType.FOR,
  WHILE: KernelTokenType.WHILE,
  RETURN: KernelTokenType.RETURN,
  TRUE: KernelTokenType.TRUE,
  FALSE: KernelTokenType.FALSE,
  TYPE: KernelTokenType.TYPE,
  TRAIT: KernelTokenType.TRAIT,
  IMPL: KernelTokenType.IMPL,
  WHERE: KernelTokenType.WHERE,
  GENE: KernelTokenType.GENE,
  DOMAIN: KernelTokenType.DOMAIN,
  IN: KernelTokenType.IN,
  SIGNED: KernelTokenType.SIGNED,
  
  // Operators
  PLUS: KernelTokenType.PLUS,
  MINUS: KernelTokenType.MINUS,
  STAR: KernelTokenType.STAR,
  SLASH: KernelTokenType.SLASH,
  PERCENT: KernelTokenType.PERCENT,
  DOUBLESTAR: KernelTokenType.DOUBLE_STAR,
  
  // Comparison (with legacy aliases)
  EQ: KernelTokenType.EQ,
  EQEQ: KernelTokenType.EQ, // Legacy alias
  NEQ: KernelTokenType.NEQ,
  BANGEQ: KernelTokenType.NEQ, // Legacy alias
  LT: KernelTokenType.LT,
  LTE: KernelTokenType.LTE,
  LTEQ: KernelTokenType.LTE, // Legacy alias
  GT: KernelTokenType.GT,
  GTE: KernelTokenType.GTE,
  GTEQ: KernelTokenType.GTE, // Legacy alias
  
  // Logical
  AND: KernelTokenType.AND,
  OR: KernelTokenType.OR,
  NOT: KernelTokenType.NOT,
  
  // Bitwise
  BIT_AND: KernelTokenType.BIT_AND,
  BIT_OR: KernelTokenType.BIT_OR,
  BIT_XOR: KernelTokenType.BIT_XOR,
  BIT_NOT: KernelTokenType.BIT_NOT,
  SHL: KernelTokenType.SHL,
  SHR: KernelTokenType.SHR,
  
  // Assignment
  ASSIGN: KernelTokenType.ASSIGN,
  
  // Pipe & Range
  PIPE: KernelTokenType.PIPE,
  RANGE: KernelTokenType.RANGE,
  
  // Access (with legacy aliases)
  DOT: KernelTokenType.DOT,
  LBRACKET: KernelTokenType.LBRACKET_SQUARE, // Legacy alias
  LBRACKET_SQUARE: KernelTokenType.LBRACKET_SQUARE,
  RBRACKET: KernelTokenType.RBRACKET_SQUARE, // Legacy alias
  RBRACKET_SQUARE: KernelTokenType.RBRACKET_SQUARE,
  
  // Arrow
  ARROW: KernelTokenType.ARROW,
  
  // Delimiters
  LPAREN: KernelTokenType.LPAREN,
  RPAREN: KernelTokenType.RPAREN,
  LBRACE: KernelTokenType.LBRACE,
  RBRACE: KernelTokenType.RBRACE,
  COMMA: KernelTokenType.COMMA,
  COLON: KernelTokenType.COLON,
  SEMICOLON: KernelTokenType.SEMICOLON,
  
  // Special
  EOF: KernelTokenType.EOF,
  UNKNOWN: KernelTokenType.UNKNOWN,
  ERROR: KernelTokenType.ERROR,
};

export interface NormalizedToken extends Omit<Token, 'type'> {
  type: string; // Allow string values for backward compatibility
}

export function tokenize(source: string): { tokens: NormalizedToken[]; errors: string[] } {
  const errors: string[] = [];
  try {
    // Remove hash comments (GSPL library format)
    const sanitized = source.replace(/^\s*#.*$/gm, '');
    const lexer = new GsplLexer(sanitized);
    let tokens = lexer.tokenize() as NormalizedToken[];
    
    // Check for unexpected characters (UNKNOWN tokens)
    for (const token of tokens) {
      if (token.type === KernelTokenType.UNKNOWN) {
        errors.push(`Unexpected character '${token.value}' at line ${token.line}, column ${token.column}`);
      }
    }
    
    // Normalize operators (convert & & to &&, | | to ||)
    tokens = normalizeOperators(tokens);
    
    // Normalize dotted identifiers (Std.Character.Seed)
    tokens = normalizeDottedIdentifiers(tokens);
    
    // Normalize number tokens (INT/FLOAT → NUMBER)
    tokens = normalizeNumbers(tokens);
    
    return { tokens, errors };
  } catch (error) {
    return { tokens: [], errors: [error instanceof Error ? error.message : String(error)] };
  }
}

function normalizeOperators(tokens: NormalizedToken[]): NormalizedToken[] {
  const normalized: NormalizedToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    
    // Convert & & to && (AND)
    if (token.type === KernelTokenType.BIT_AND && next?.type === KernelTokenType.BIT_AND) {
      normalized.push({ ...token, type: KernelTokenType.AND });
      i++;
      continue;
    }
    
    // Convert | | to || (OR)
    if (token.type === KernelTokenType.BIT_OR && next?.type === KernelTokenType.BIT_OR) {
      normalized.push({ ...token, type: KernelTokenType.OR });
      i++;
      continue;
    }
    
    normalized.push(token);
  }
  return normalized;
}

function normalizeDottedIdentifiers(tokens: NormalizedToken[]): NormalizedToken[] {
  const normalized: NormalizedToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i];
    if (first.type === KernelTokenType.IDENTIFIER) {
      let value = first.value;
      let j = i;
      
      // Collect dotted segments
      while (
        tokens[j + 1]?.type === KernelTokenType.DOT &&
        tokens[j + 2]?.type === KernelTokenType.IDENTIFIER
      ) {
        value += `.${tokens[j + 2].value}`;
        j += 2;
      }
      
      if (j !== i) {
        // Found dotted identifier
        normalized.push({ ...first, value });
        i = j;
        continue;
      }
    }
    normalized.push(first);
  }
  return normalized;
}

function normalizeNumbers(tokens: NormalizedToken[]): NormalizedToken[] {
  return tokens.map(token => {
    // Unify INT and FLOAT to NUMBER
    if (token.type === KernelTokenType.INT || token.type === KernelTokenType.FLOAT) {
      return { ...token, type: 'NUMBER' as any };
    }
    return token;
  });
}

