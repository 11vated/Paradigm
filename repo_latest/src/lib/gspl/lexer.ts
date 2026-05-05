/**
 * GSPL Lexer — Hand-rolled tokenizer for the Genetic Structured Programming Language.
 * Produces a token stream from GSPL source code. Pure function, no side effects.
 *
 * Supports both formats:
 *   - Editor format:  seed "Name" in domain { key: value }
 *   - Library format: seed Std.Character.Seed { key = value }
 */

// ─── Token Types ─────────────────────────────────────────────────────────────

export enum TokenType {
  // Keywords
  SEED = 'SEED', LET = 'LET', FN = 'FN', IF = 'IF', ELSE = 'ELSE',
  FOR = 'FOR', IN = 'IN', RETURN = 'RETURN', WHILE = 'WHILE',
  TRUE = 'TRUE', FALSE = 'FALSE',
  // Built-in kernel ops
  MUTATE = 'MUTATE', COMPOSE = 'COMPOSE', GROW = 'GROW',
  BREED = 'BREED', EVOLVE = 'EVOLVE', DISTANCE = 'DISTANCE',
  // Literals & identifiers
  IDENT = 'IDENT', STRING = 'STRING', NUMBER = 'NUMBER',
  // Delimiters
  LBRACE = 'LBRACE', RBRACE = 'RBRACE',
  LPAREN = 'LPAREN', RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET', RBRACKET = 'RBRACKET',
  // Punctuation
  COLON = 'COLON', COMMA = 'COMMA', DOT = 'DOT', SEMICOLON = 'SEMICOLON',
  EQ = 'EQ', ARROW = 'ARROW',
  // Operators
  PLUS = 'PLUS', MINUS = 'MINUS', STAR = 'STAR', SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  LT = 'LT', GT = 'GT', LTEQ = 'LTEQ', GTEQ = 'GTEQ',
  EQEQ = 'EQEQ', BANGEQ = 'BANGEQ',
  BANG = 'BANG', AND = 'AND', OR = 'OR', PIPE = 'PIPE',
  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// ─── Keyword Map ─────────────────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenType> = {
  seed: TokenType.SEED, let: TokenType.LET, fn: TokenType.FN,
  if: TokenType.IF, else: TokenType.ELSE, for: TokenType.FOR,
  in: TokenType.IN, return: TokenType.RETURN, while: TokenType.WHILE,
  true: TokenType.TRUE, false: TokenType.FALSE,
  mutate: TokenType.MUTATE, compose: TokenType.COMPOSE, grow: TokenType.GROW,
  breed: TokenType.BREED, evolve: TokenType.EVOLVE, distance: TokenType.DISTANCE,
  // Also match capitalized variants for GSPL library format
  gene: TokenType.IDENT, domain: TokenType.IDENT,
};

// ─── Lexer ───────────────────────────────────────────────────────────────────

export interface LexResult {
  tokens: Token[];
  errors: string[];
}

export function tokenize(source: string): LexResult {
  const tokens: Token[] = [];
  const errors: string[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(): string { return pos < source.length ? source[pos] : '\0'; }
  function peekNext(): string { return pos + 1 < source.length ? source[pos + 1] : '\0'; }
  function advance(): string {
    const ch = source[pos++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }
  function emit(type: TokenType, value: string, startLine: number, startCol: number) {
    tokens.push({ type, value, line: startLine, col: startCol });
  }

  while (pos < source.length) {
    const startLine = line;
    const startCol = col;
    const ch = peek();

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // Single-line comment
    if (ch === '/' && peekNext() === '/') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // Block comment
    if (ch === '/' && peekNext() === '*') {
      advance(); advance();
      while (pos < source.length && !(peek() === '*' && peekNext() === '/')) advance();
      if (pos < source.length) { advance(); advance(); }
      continue;
    }

    // Hash comment (GSPL library format)
    if (ch === '#') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // String literal (double or single quote)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let str = '';
      while (pos < source.length && peek() !== quote) {
        if (peek() === '\\') {
          advance();
          const esc = advance();
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '\\') str += '\\';
          else if (esc === quote) str += quote;
          else str += esc;
        } else {
          str += advance();
        }
      }
      if (pos < source.length) advance(); // closing quote
      emit(TokenType.STRING, str, startLine, startCol);
      continue;
    }

    // Number literal (int and float)
    if ((ch >= '0' && ch <= '9') || (ch === '.' && peekNext() >= '0' && peekNext() <= '9')) {
      let num = '';
      if (ch === '-') num += advance();
      while (pos < source.length && peek() >= '0' && peek() <= '9') num += advance();
      if (peek() === '.' && peekNext() >= '0' && peekNext() <= '9') {
        num += advance(); // the dot
        while (pos < source.length && peek() >= '0' && peek() <= '9') num += advance();
      }
      // Scientific notation
      if (peek() === 'e' || peek() === 'E') {
        num += advance();
        if (peek() === '+' || peek() === '-') num += advance();
        while (pos < source.length && peek() >= '0' && peek() <= '9') num += advance();
      }
      emit(TokenType.NUMBER, num, startLine, startCol);
      continue;
    }

    // Negative number (minus followed by digit)
    // Handled as MINUS token — parser handles unary negation

    // Identifier / keyword
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$') {
      let ident = '';
      while (pos < source.length && (
        (peek() >= 'a' && peek() <= 'z') || (peek() >= 'A' && peek() <= 'Z') ||
        (peek() >= '0' && peek() <= '9') || peek() === '_' || peek() === '$' || peek() === '.'
      )) {
        ident += advance();
      }
      const kw = KEYWORDS[ident.toLowerCase()];
      if (kw && kw !== TokenType.IDENT) {
        emit(kw, ident, startLine, startCol);
      } else {
        emit(TokenType.IDENT, ident, startLine, startCol);
      }
      continue;
    }

    // Two-character operators
    if (ch === '=' && peekNext() === '=') { advance(); advance(); emit(TokenType.EQEQ, '==', startLine, startCol); continue; }
    if (ch === '!' && peekNext() === '=') { advance(); advance(); emit(TokenType.BANGEQ, '!=', startLine, startCol); continue; }
    if (ch === '<' && peekNext() === '=') { advance(); advance(); emit(TokenType.LTEQ, '<=', startLine, startCol); continue; }
    if (ch === '>' && peekNext() === '=') { advance(); advance(); emit(TokenType.GTEQ, '>=', startLine, startCol); continue; }
    if (ch === '=' && peekNext() === '>') { advance(); advance(); emit(TokenType.ARROW, '=>', startLine, startCol); continue; }
    if (ch === '-' && peekNext() === '>') { advance(); advance(); emit(TokenType.ARROW, '->', startLine, startCol); continue; }
    if (ch === '&' && peekNext() === '&') { advance(); advance(); emit(TokenType.AND, '&&', startLine, startCol); continue; }
    if (ch === '|' && peekNext() === '|') { advance(); advance(); emit(TokenType.OR, '||', startLine, startCol); continue; }

    // Single-character tokens
    const singles: Record<string, TokenType> = {
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET, ']': TokenType.RBRACKET,
      ':': TokenType.COLON, ',': TokenType.COMMA, '.': TokenType.DOT,
      ';': TokenType.SEMICOLON, '=': TokenType.EQ,
      '+': TokenType.PLUS, '-': TokenType.MINUS,
      '*': TokenType.STAR, '/': TokenType.SLASH, '%': TokenType.PERCENT,
      '<': TokenType.LT, '>': TokenType.GT,
      '!': TokenType.BANG, '|': TokenType.PIPE,
    };

    if (singles[ch]) {
      advance();
      emit(singles[ch], ch, startLine, startCol);
      continue;
    }

    // Unknown character
    errors.push(`Unexpected character '${ch}' at line ${line}:${col}`);
    advance();
  }

  emit(TokenType.EOF, '', line, col);
  return { tokens, errors };
}
