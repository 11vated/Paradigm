export enum TokenType {
  EOF = 'EOF',
  IDENT = 'IDENT',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  COLON = 'COLON',
  DOT = 'DOT',
  ARROW = 'ARROW',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQ = 'EQ',
  EQEQ = 'EQEQ',
  NEQ = 'NEQ',
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  AMP = 'AMP',
  PIPE = 'PIPE',
  QUESTION = 'QUESTION',
  AT = 'AT',
  DOLLAR = 'DOLLAR',
  BANG = 'BANG',
  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  WHILE = 'WHILE',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  RETURN = 'RETURN',
  FUNCTION = 'FUNCTION',
  SEED = 'SEED',
  GENE = 'GENE',
  BREED = 'BREED',
  MUTATE = 'MUTATE',
  CROSS = 'CROSS',
  EVOLVE = 'EVOLVE',
  SELECT = 'SELECT',
  EVAL = 'EVAL',
  PRINT = 'PRINT',
  LET = 'LET',
  CONST = 'CONST',
  VAR = 'VAR',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL_KW = 'NULL_KW',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  FROM = 'FROM',
  AS = 'AS',
  NEW = 'NEW',
  THIS = 'THIS',
  CLASS = 'CLASS',
  EXTENDS = 'EXTENDS',
  IMPLEMENTS = 'IMPLEMENTS',
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  PROTECTED = 'PROTECTED',
  STATIC = 'STATIC',
  GET = 'GET',
  SET = 'SET',
  SEMICOLON = 'SEMICOLON'
}

export const Keywords: Record<string, TokenType> = {
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'return': TokenType.RETURN,
  'function': TokenType.FUNCTION,
  'seed': TokenType.SEED,
  'gene': TokenType.GENE,
  'breed': TokenType.BREED,
  'mutate': TokenType.MUTATE,
  'cross': TokenType.CROSS,
  'evolve': TokenType.EVOLVE,
  'select': TokenType.SELECT,
  'eval': TokenType.EVAL,
  'print': TokenType.PRINT,
  'let': TokenType.LET,
  'const': TokenType.CONST,
  'var': TokenType.VAR,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL_KW,
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'from': TokenType.FROM,
  'as': TokenType.AS,
  'new': TokenType.NEW,
  'this': TokenType.THIS,
  'class': TokenType.CLASS,
  'extends': TokenType.EXTENDS,
  'implements': TokenType.IMPLEMENTS,
  'public': TokenType.PUBLIC,
  'private': TokenType.PRIVATE,
  'protected': TokenType.PROTECTED,
  'static': TokenType.STATIC,
  'get': TokenType.GET,
  'set': TokenType.SET
};

export interface Token {
  type: TokenType | string;
  value: string | number | boolean | null;
  line: number;
  column: number;
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const ch = this.source[this.pos];
      
      if (ch === '/' && this.peek() === '/') {
        this.skipComment();
        continue;
      }
      if (ch === '/' && this.peek() === '*') {
        this.skipBlockComment();
        continue;
      }

      if (this.isDigit(ch)) {
        this.readNumber();
        continue;
      }
      if (this.isAlpha(ch) || ch === '_') {
        this.readIdentifier();
        continue;
      }
      if (ch === '"' || ch === "'") {
        this.readString(ch);
        continue;
      }

      this.readOperator();
    }

    this.tokens.push({ type: TokenType.EOF, value: null, line: this.line, column: this.column });
    return this.tokens;
  }

  private peek(): string {
    return this.source[this.pos + 1] ?? '';
  }

  private isDigit(ch: string): boolean {
    return /[0-9]/.test(ch);
  }

  private isAlpha(ch: string): boolean {
    return /[a-zA-Z_$]/.test(ch);
  }

  private isAlphaNumeric(ch: string): boolean {
    return /[a-zA-Z0-9_$]/.test(ch);
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        if (ch === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.pos++;
      } else if (ch === '\\' && this.peek() === '\n') {
        this.pos += 2;
        this.line++;
        this.column = 1;
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.pos++;
    }
  }

  private skipBlockComment(): void {
    this.pos += 2;
    while (this.pos < this.source.length - 1) {
      if (this.source[this.pos] === '*' && this.source[this.pos + 1] === '/') {
        this.pos += 2;
        break;
      }
      if (this.source[this.pos] === '\n') {
        this.line++;
      }
      this.pos++;
    }
  }

  private readNumber(): void {
    const start = this.pos;
    let hasDot = false;
    let hasExponent = false;

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (this.isDigit(ch)) {
        this.pos++;
        this.column++;
      } else if (ch === '.' && !hasDot && !hasExponent) {
        hasDot = true;
        this.pos++;
        this.column++;
      } else if ((ch === 'e' || ch === 'E') && !hasExponent) {
        hasExponent = true;
        this.pos++;
        this.column++;
        if (this.source[this.pos] === '+' || this.source[this.pos] === '-') {
          this.pos++;
          this.column++;
        }
      } else {
        break;
      }
    }

    const value = parseFloat(this.source.slice(start, this.pos));
    this.tokens.push({ type: TokenType.NUMBER, value, line: this.line, column: this.column - (this.pos - start) });
  }

  private readIdentifier(): void {
    const start = this.pos;
    while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
      this.pos++;
      this.column++;
    }

    const value = this.source.slice(start, this.pos);
    const keywordToken = Keywords[value];
    
    if (keywordToken) {
      this.tokens.push({ type: keywordToken, value: value, line: this.line, column: this.column - (this.pos - start) });
    } else if (value === 'true') {
      this.tokens.push({ type: TokenType.BOOLEAN, value: true, line: this.line, column: this.column - (this.pos - start) });
    } else if (value === 'false') {
      this.tokens.push({ type: TokenType.BOOLEAN, value: false, line: this.line, column: this.column - (this.pos - start) });
    } else if (value === 'null') {
      this.tokens.push({ type: TokenType.NULL, value: null, line: this.line, column: this.column - (this.pos - start) });
    } else {
      this.tokens.push({ type: TokenType.IDENT, value, line: this.line, column: this.column - (this.pos - start) });
    }
  }

  private readString(quote: string): void {
    this.pos++;
    this.column++;
    const start = this.pos;

    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.pos += 2;
        this.column += 2;
        continue;
      }
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      }
      this.pos++;
      this.column++;
    }

    if (this.pos >= this.source.length) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }

    let value = this.source.slice(start, this.pos);
    value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    this.pos++;
    this.column++;

    this.tokens.push({ type: TokenType.STRING, value, line: this.line, column: this.column - (this.pos - start) });
  }

  private readOperator(): void {
    const ch = this.source[this.pos];
    const ops: Record<string, [TokenType, string]> = {
      '(': [TokenType.LPAREN, '('],
      ')': [TokenType.RPAREN, ')'],
      '{': [TokenType.LBRACE, '{'],
      '}': [TokenType.RBRACE, '}'],
      '[': [TokenType.LBRACKET, '['],
      ']': [TokenType.RBRACKET, ']'],
      ',': [TokenType.COMMA, ','],
      ':': [TokenType.COLON, ':'],
      '.': [TokenType.DOT, '.'],
      '+': [TokenType.PLUS, '+'],
      '-': [TokenType.MINUS, '-'],
      '*': [TokenType.STAR, '*'],
      '/': [TokenType.SLASH, '/'],
      '%': [TokenType.PERCENT, '%'],
      '=': [TokenType.EQ, '='],
      '<': [TokenType.LT, '<'],
      '>': [TokenType.GT, '>'],
      '!': [TokenType.NOT, '!'],
      '&': [TokenType.AMP, '&'],
      '|': [TokenType.PIPE, '|'],
      '?': [TokenType.QUESTION, '?'],
      '@': [TokenType.AT, '@'],
      '$': [TokenType.DOLLAR, '$']
    };

    if (ops[ch]) {
      this.pos++;
      this.column++;

      if (ch === '=' && this.pos < this.source.length && this.source[this.pos] === '=') {
        this.tokens.push({ type: TokenType.EQEQ, value: '==', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '<' && this.peek() === '=') {
        this.tokens.push({ type: TokenType.LTE, value: '<=', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '>' && this.peek() === '=') {
        this.tokens.push({ type: TokenType.GTE, value: '>=', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '-' && this.peek() === '>') {
        this.tokens.push({ type: TokenType.ARROW, value: '->', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '&' && this.peek() === '&') {
        this.tokens.push({ type: TokenType.AND, value: '&&', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '|' && this.peek() === '|') {
        this.tokens.push({ type: TokenType.OR, value: '||', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else if (ch === '!' && this.peek() === '=') {
        this.tokens.push({ type: TokenType.NEQ, value: '!=', line: this.line, column: this.column - 2 });
        this.pos++;
        this.column++;
      } else {
        this.tokens.push({ type: ops[ch][0], value: ops[ch][1], line: this.line, column: this.column - 1 });
      }
    } else {
      throw new Error(`Unknown character '${ch}' at line ${this.line}, column ${this.column}`);
    }
  }
}