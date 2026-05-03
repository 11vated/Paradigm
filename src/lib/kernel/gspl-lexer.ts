/**
 * GSPL Language — Lexer (Tokenizer)
 * Converts GSPL source code into tokens
 * Phase 3: GSPL Language Completion
 */

export enum TokenType {
  // Literals
  INT = 'INT',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',

  // Identifiers
  IDENTIFIER = 'IDENTIFIER',
  GENE_NAME = 'GENE_NAME', // Gene names (can't start with $ or _)

  // Keywords (26 reserved words)
  SEED = 'SEED',
  BREED = 'BREED',
  MUTATE = 'MUTATE',
  COMPOSE = 'COMPOSE',
  EVOLVE = 'EVOLVE',
  GROW = 'GROW',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  LET = 'LET',
  FN = 'FN',
  IF = 'IF',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  FOR = 'FOR',
  WHILE = 'WHILE',
  RETURN = 'RETURN',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  TYPE = 'TYPE',
  TRAIT = 'TRAIT',
  IMPL = 'IMPL',
  WHERE = 'WHERE',
  GENE = 'GENE',
  DOMAIN = 'DOMAIN',
  IN = 'IN',
  SIGNED = 'SIGNED',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  DOUBLE_STAR = 'DOUBLE_STAR', // **

  // Comparison
  EQ = 'EQ',       // ==
  NEQ = 'NEQ',     // !=
  LT = 'LT',       // <
  LTE = 'LTE',     // <=
  GT = 'GT',       // >
  GTE = 'GTE',     // >=

  // Logical
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Bitwise
  BIT_AND = 'BIT_AND',
  BIT_OR = 'BIT_OR',
  BIT_XOR = 'BIT_XOR',
  BIT_NOT = 'BIT_NOT',
  SHL = 'SHL',     // <<
  SHR = 'SHR',     // >>

  // Assignment
  ASSIGN = 'ASSIGN', // =

  // Pipe
  PIPE = 'PIPE',   // |>

  // Range
  RANGE = 'RANGE', // ..

  // Access
  DOT = 'DOT',     // .
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]

  // Arrow
  ARROW = 'ARROW', // ->

  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET_SQUARE = 'LBRACKET_SQUARE',
  RBRACKET_SQUARE = 'RBRACKET_SQUARE',
  COMMA = 'COMMA',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',

  // Special
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  'seed': TokenType.SEED,
  'breed': TokenType.BREED,
  'mutate': TokenType.MUTATE,
  'compose': TokenType.COMPOSE,
  'evolve': TokenType.EVOLVE,
  'grow': TokenType.GROW,
  'export': TokenType.EXPORT,
  'import': TokenType.IMPORT,
  'let': TokenType.LET,
  'fn': TokenType.FN,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'match': TokenType.MATCH,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'while': TokenType.WHILE,
  'return': TokenType.RETURN,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'type': TokenType.TYPE,
  'trait': TokenType.TRAIT,
  'impl': TokenType.IMPL,
  'where': TokenType.WHERE,
  'gene': TokenType.GENE,
  'domain': TokenType.DOMAIN,
  'signed': TokenType.SIGNED
};

export class GsplLexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();

      if (this.pos >= this.source.length) break;

      const char = this.source[this.pos];

      // Number (int or float)
      if (this.isDigit(char)) {
        this.tokenizeNumber();
        continue;
      }

      // String literal
      if (char === '"') {
        this.tokenizeString();
        continue;
      }

      // Identifier or keyword
      if (this.isAlpha(char) || char === '_') {
        this.tokenizeIdentifier();
        continue;
      }

      // Operators and delimiters
      if (this.tokenizeOperator()) {
        continue;
      }

      // Unknown character
      this.addToken(TokenType.UNKNOWN, char);
      this.advance();
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
        continue;
      }

      if (char === '\n') {
        this.line++;
        this.column = 1;
        this.pos++;
        continue;
      }

      // Line comment
      if (char === '/' && this.peek() === '/') {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Block comment
      if (char === '/' && this.peek() === '*') {
        this.advance(); // /
        this.advance(); // *
        while (this.pos < this.source.length - 1) {
          if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          if (this.source[this.pos] === '\n') {
            this.line++;
            this.column = 1;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private tokenizeNumber(): void {
    const start = this.pos;
    const startLine = this.line;
    const startCol = this.column;

    while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
      this.advance();
    }

    // Check for decimal point
    if (this.pos < this.source.length && this.source[this.pos] === '.' && this.isDigit(this.peek())) {
      this.advance(); // .
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        this.advance();
      }

      // Check for exponent
      if (this.pos < this.source.length && (this.source[this.pos] === 'e' || this.source[this.pos] === 'E')) {
        this.advance(); // e or E
        if (this.pos < this.source.length && (this.source[this.pos] === '+' || this.source[this.pos] === '-')) {
          this.advance();
        }
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          this.advance();
        }
      }

      const value = this.source.slice(start, this.pos);
      this.tokens.push({
        type: TokenType.FLOAT,
        value,
        line: startLine,
        column: startCol
      });
    } else {
      const value = this.source.slice(start, this.pos);
      this.tokens.push({
        type: TokenType.INT,
        value,
        line: startLine,
        column: startCol
      });
    }
  }

  private tokenizeString(): void {
    const startLine = this.line;
    const startCol = this.column;

    this.advance(); // "

    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\') {
        this.advance(); // backslash
        const escaped = this.source[this.pos];
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          case 'u': {
            // Unicode escape \uXXXX
            this.advance();
            let hex = '';
            for (let i = 0; i < 4; i++) {
              hex += this.source[this.pos];
              this.advance();
            }
            value += String.fromCharCode(parseInt(hex, 16));
            continue; // advance was done in loop
          }
          default: value += escaped;
        }
      } else {
        value += this.source[this.pos];
      }
      this.advance();
    }

    this.advance(); // "

    this.tokens.push({
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startCol
    });
  }

  private tokenizeIdentifier(): void {
    const start = this.pos;
    const startLine = this.line;
    const startCol = this.column;

    while (this.pos < this.source.length && (this.isAlphaNum(this.source[this.pos]) || this.source[this.pos] === '_')) {
      this.advance();
    }

    const value = this.source.slice(start, this.pos);
    // Check if it's a keyword; if not, it's an identifier
    const type = KEYWORDS[value] || (value === 'in' ? TokenType.IN : TokenType.IDENTIFIER);

    this.tokens.push({ type, value, line: startLine, column: startCol });
  }

  private tokenizeOperator(): boolean {
    const char = this.source[this.pos];
    const next = this.peek();
    const startLine = this.line;
    const startCol = this.column;

    // Two-character operators
    if (char === '=' && next === '=') {
      this.addToken(TokenType.EQ, '==');
      this.advance(); this.advance();
      return true;
    }
    if (char === '!' && next === '=') {
      this.addToken(TokenType.NEQ, '!=');
      this.advance(); this.advance();
      return true;
    }
    if (char === '<' && next === '=') {
      this.addToken(TokenType.LTE, '<=');
      this.advance(); this.advance();
      return true;
    }
    if (char === '>' && next === '=') {
      this.addToken(TokenType.GTE, '>=');
      this.advance(); this.advance();
      return true;
    }
    if (char === '.' && next === '.') {
      this.addToken(TokenType.RANGE, '..');
      this.advance(); this.advance();
      return true;
    }
    if (char === '|' && next === '>') {
      this.addToken(TokenType.PIPE, '|>');
      this.advance(); this.advance();
      return true;
    }
    if (char === '*' && next === '*') {
      this.addToken(TokenType.DOUBLE_STAR, '**');
      this.advance(); this.advance();
      return true;
    }
    if (char === '-' && next === '>') {
      this.addToken(TokenType.ARROW, '->');
      this.advance(); this.advance();
      return true;
    }
    if (char === '<' && next === '<') {
      this.addToken(TokenType.SHL, '<<');
      this.advance(); this.advance();
      return true;
    }
    if (char === '>' && next === '>') {
      this.addToken(TokenType.SHR, '>>');
      this.advance(); this.advance();
      return true;
    }

    // Single-character operators
    switch (char) {
      case '+': this.addToken(TokenType.PLUS, '+'); break;
      case '-': this.addToken(TokenType.MINUS, '-'); break;
      case '*': this.addToken(TokenType.STAR, '*'); break;
      case '/': this.addToken(TokenType.SLASH, '/'); break;
      case '%': this.addToken(TokenType.PERCENT, '%'); break;
      case '==': this.addToken(TokenType.EQ, '=='); break;
      case '!': this.addToken(TokenType.NOT, '!'); break;
      case '&': this.addToken(TokenType.BIT_AND, '&'); break;
      case '|': this.addToken(TokenType.BIT_OR, '|'); break;
      case '^': this.addToken(TokenType.BIT_XOR, '^'); break;
      case '~': this.addToken(TokenType.BIT_NOT, '~'); break;
      case '.': this.addToken(TokenType.DOT, '.'); break;
      case ',': this.addToken(TokenType.COMMA, ','); break;
      case ':': this.addToken(TokenType.COLON, ':'); break;
      case ';': this.addToken(TokenType.SEMICOLON, ';'); break;
      case '(': this.addToken(TokenType.LPAREN, '('); break;
      case ')': this.addToken(TokenType.RPAREN, ')'); break;
      case '{': this.addToken(TokenType.LBRACE, '{'); break;
      case '}': this.addToken(TokenType.RBRACE, '}'); break;
      case '[': this.addToken(TokenType.LBRACKET_SQUARE, '['); break;
      case ']': this.addToken(TokenType.RBRACKET_SQUARE, ']'); break;
      case '<': this.addToken(TokenType.LT, '<'); break;
      case '>': this.addToken(TokenType.GT, '>'); break;
      case '=': this.addToken(TokenType.ASSIGN, '='); break;
      default: return false;
    }
    this.advance();
    return true;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, column: this.column });
  }

  private advance(): void {
    if (this.pos < this.source.length) {
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  private peek(): string {
    return this.pos + 1 < this.source.length ? this.source[this.pos + 1] : '\0';
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNum(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
