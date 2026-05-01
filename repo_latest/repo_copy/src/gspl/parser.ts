import { Token, TokenType, Lexer } from './lexer';

export enum ASTNodeType {
  PROGRAM = 'Program',
  FUNCTION_DECL = 'FunctionDecl',
  VARIABLE_DECL = 'VariableDecl',
  ASSIGNMENT = 'Assignment',
  IF_STATEMENT = 'IfStatement',
  FOR_STATEMENT = 'ForStatement',
  WHILE_STATEMENT = 'WhileStatement',
  BREAK_STATEMENT = 'BreakStatement',
  CONTINUE_STATEMENT = 'ContinueStatement',
  RETURN_STATEMENT = 'ReturnStatement',
  EXPRESSION_STMT = 'ExpressionStmt',
  BLOCK = 'Block',
  BINARY_EXPR = 'BinaryExpr',
  UNARY_EXPR = 'UnaryExpr',
  CALL_EXPR = 'CallExpr',
  INDEX_EXPR = 'IndexExpr',
  MEMBER_EXPR = 'MemberExpr',
  LITERAL = 'Literal',
  IDENTIFIER = 'Identifier',
  ARRAY_LITERAL = 'ArrayLiteral',
  OBJECT_LITERAL = 'ObjectLiteral',
  FUNCTION_EXPR = 'FunctionExpr',
  SEED_EXPR = 'SeedExpr',
  GENE_EXPR = 'GeneExpr',
  BREED_EXPR = 'BreedExpr'
}

export interface ASTNode {
  type: ASTNodeType;
  line: number;
  column: number;
}

export interface Program extends ASTNode {
  type: ASTNodeType.PROGRAM;
  body: ASTNode[];
}

export interface FunctionDecl extends ASTNode {
  type: ASTNodeType.FUNCTION_DECL;
  name: string;
  params: string[];
  body: ASTNode;
}

export interface VariableDecl extends ASTNode {
  type: ASTNodeType.VARIABLE_DECL;
  name: string;
  initializer: ASTNode;
}

export interface Assignment extends ASTNode {
  type: ASTNodeType.ASSIGNMENT;
  target: ASTNode;
  value: ASTNode;
}

export interface IfStatement extends ASTNode {
  type: ASTNodeType.IF_STATEMENT;
  condition: ASTNode;
  thenBranch: ASTNode;
  elseBranch: ASTNode | null;
}

export interface ForStatement extends ASTNode {
  type: ASTNodeType.FOR_STATEMENT;
  initializer: ASTNode | null;
  condition: ASTNode;
  increment: ASTNode;
  body: ASTNode;
}

export interface WhileStatement extends ASTNode {
  type: ASTNodeType.WHILE_STATEMENT;
  condition: ASTNode;
  body: ASTNode;
}

export interface BreakStatement extends ASTNode {
  type: ASTNodeType.BREAK_STATEMENT;
}

export interface ContinueStatement extends ASTNode {
  type: ASTNodeType.CONTINUE_STATEMENT;
}

export interface ReturnStatement extends ASTNode {
  type: ASTNodeType.RETURN_STATEMENT;
  value: ASTNode | null;
}

export interface ExpressionStmt extends ASTNode {
  type: ASTNodeType.EXPRESSION_STMT;
  expression: ASTNode;
}

export interface Block extends ASTNode {
  type: ASTNodeType.BLOCK;
  statements: ASTNode[];
}

export interface BinaryExpr extends ASTNode {
  type: ASTNodeType.BINARY_EXPR;
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpr extends ASTNode {
  type: ASTNodeType.UNARY_EXPR;
  operator: string;
  operand: ASTNode;
}

export interface CallExpr extends ASTNode {
  type: ASTNodeType.CALL_EXPR;
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface IndexExpr extends ASTNode {
  type: ASTNodeType.INDEX_EXPR;
  object: ASTNode;
  index: ASTNode;
}

export interface MemberExpr extends ASTNode {
  type: ASTNodeType.MEMBER_EXPR;
  object: ASTNode;
  property: string;
}

export interface Literal extends ASTNode {
  type: ASTNodeType.LITERAL;
  value: unknown;
}

export interface Identifier extends ASTNode {
  type: ASTNodeType.IDENTIFIER;
  name: string;
}

export interface ArrayLiteral extends ASTNode {
  type: ASTNodeType.ARRAY_LITERAL;
  elements: ASTNode[];
}

export interface ObjectLiteral extends ASTNode {
  type: ASTNodeType.OBJECT_LITERAL;
  properties: [string, ASTNode][];
}

export interface FunctionExpr extends ASTNode {
  type: ASTNodeType.FUNCTION_EXPR;
  params: string[];
  body: ASTNode;
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private locals: Map<string, number> = new Map();

  constructor(lexer: Lexer) {
    this.tokens = lexer.tokenize();
  }

  parse(): Program {
    const body: ASTNode[] = [];
    
    while (!this.isAtEnd()) {
      body.push(this.declaration());
    }

    return {
      type: ASTNodeType.PROGRAM,
      body,
      line: 1,
      column: 1
    };
  }

  private declaration(): ASTNode {
    if (this.check(TokenType.FUNCTION)) return this.functionDeclaration();
    if (this.check(TokenType.LET) || this.check(TokenType.CONST) || this.check(TokenType.VAR)) {
      return this.variableDeclaration();
    }
    return this.statement();
  }

  private functionDeclaration(): FunctionDecl {
    this.advance();
    const name = this.consume(TokenType.IDENT, 'Expected function name').value as string;
    this.consume(TokenType.LPAREN, "Expected '('");
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        params.push(this.consume(TokenType.IDENT, 'Expected parameter name').value as string);
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')'");
    this.consume(TokenType.LBRACE, "Expected '{'");
    const body = this.block();
    
    return {
      type: ASTNodeType.FUNCTION_DECL,
      name,
      params,
      body,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private variableDeclaration(): VariableDecl {
    const varType = this.previous().type as TokenType;
    const name = this.consume(TokenType.IDENT, 'Expected variable name').value as string;
    let initializer: ASTNode = { type: ASTNodeType.LITERAL, value: undefined, line: 0, column: 0 };
    
    if (this.match(TokenType.EQ)) {
      initializer = this.expression();
    }

    return {
      type: ASTNodeType.VARIABLE_DECL,
      name,
      initializer,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private statement(): ASTNode {
    if (this.check(TokenType.LBRACE)) return this.block();
    if (this.check(TokenType.IF)) return this.ifStatement();
    if (this.check(TokenType.FOR)) return this.forStatement();
    if (this.check(TokenType.WHILE)) return this.whileStatement();
    if (this.check(TokenType.BREAK)) return this.breakStatement();
    if (this.check(TokenType.CONTINUE)) return this.continueStatement();
    if (this.check(TokenType.RETURN)) return this.returnStatement();
    
    return this.expressionStatement();
  }

  private block(): Block {
    const statements: ASTNode[] = [];
    this.advance();
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    
    this.consume(TokenType.RBRACE, "Expected '}'");
    
    return {
      type: ASTNodeType.BLOCK,
      statements,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private ifStatement(): IfStatement {
    this.advance();
    this.consume(TokenType.LPAREN, "Expected '('");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expected ')'");
    const thenBranch = this.statement();
    let elseBranch: ASTNode | null = null;
    
    if (this.check(TokenType.ELSE)) {
      this.advance();
      elseBranch = this.statement();
    }
    
    return {
      type: ASTNodeType.IF_STATEMENT,
      condition,
      thenBranch,
      elseBranch,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private forStatement(): ForStatement {
    this.advance();
    this.consume(TokenType.LPAREN, "Expected '('");
    
    let initializer: ASTNode | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      initializer = this.variableDeclaration();
    } else {
      this.advance();
    }
    
    let condition: ASTNode = { type: ASTNodeType.LITERAL, value: true, line: 0, column: 0 };
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';'");
    
    let increment: ASTNode = { type: ASTNodeType.LITERAL, value: undefined, line: 0, column: 0 };
    if (!this.check(TokenType.RPAREN)) {
      increment = this.expression();
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    const body = this.statement();
    
    return {
      type: ASTNodeType.FOR_STATEMENT,
      initializer,
      condition,
      increment,
      body,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private whileStatement(): WhileStatement {
    this.advance();
    this.consume(TokenType.LPAREN, "Expected '('");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expected ')'");
    const body = this.statement();
    
    return {
      type: ASTNodeType.WHILE_STATEMENT,
      condition,
      body,
      line: this.previous().line,
      column: this.previous().column
    };
  }

  private breakStatement(): BreakStatement {
    const token = this.advance();
    return {
      type: ASTNodeType.BREAK_STATEMENT,
      line: token.line,
      column: token.column
    };
  }

  private continueStatement(): ContinueStatement {
    const token = this.advance();
    return {
      type: ASTNodeType.CONTINUE_STATEMENT,
      line: token.line,
      column: token.column
    };
  }

  private returnStatement(): ReturnStatement {
    const token = this.advance();
    let value: ASTNode | null = null;
    
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE)) {
      value = this.expression();
    }
    
    return {
      type: ASTNodeType.RETURN_STATEMENT,
      value,
      line: token.line,
      column: token.column
    };
  }

  private expressionStatement(): ExpressionStmt {
    const expr = this.expression();
    return {
      type: ASTNodeType.EXPRESSION_STMT,
      expression: expr,
      line: expr.line,
      column: expr.column
    };
  }

  private expression(): ASTNode {
    return this.assignment();
  }

  private assignment(): ASTNode {
    const expr = this.or();
    
    if (this.match(TokenType.EQ)) {
      const value = this.assignment();
      if (expr.type === ASTNodeType.IDENTIFIER) {
        return {
          type: ASTNodeType.ASSIGNMENT,
          target: expr,
          value,
          line: expr.line,
          column: expr.column
        };
      }
      if (expr.type === ASTNodeType.INDEX_EXPR) {
        return {
          type: ASTNodeType.ASSIGNMENT,
          target: expr,
          value,
          line: expr.line,
          column: expr.column
        };
      }
      if (expr.type === ASTNodeType.MEMBER_EXPR) {
        return {
          type: ASTNodeType.ASSIGNMENT,
          target: expr,
          value,
          line: expr.line,
          column: expr.column
        };
      }
    }
    
    return expr;
  }

  private or(): ASTNode {
    let left = this.and();
    
    while (this.match(TokenType.OR)) {
      const right = this.and();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator: '||',
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private and(): ASTNode {
    let left = this.equality();
    
    while (this.match(TokenType.AND)) {
      const right = this.equality();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator: '&&',
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private equality(): ASTNode {
    let left = this.comparison();
    
    while (this.match(TokenType.EQEQ, TokenType.NEQ)) {
      const operator = this.previous().value as string;
      const right = this.comparison();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private comparison(): ASTNode {
    let left = this.addition();
    
    while (this.match(TokenType.LT, TokenType.LTE, TokenType.GT, TokenType.GTE)) {
      const operator = this.previous().value as string;
      const right = this.addition();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private addition(): ASTNode {
    let left = this.multiplication();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as string;
      const right = this.multiplication();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private multiplication(): ASTNode {
    let left = this.unary();
    
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value as string;
      const right = this.unary();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right,
        line: left.line,
        column: left.column
      };
    }
    
    return left;
  }

  private unary(): ASTNode {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous().value as string;
      const operand = this.unary();
      return {
        type: ASTNodeType.UNARY_EXPR,
        operator,
        operand,
        line: operand.line,
        column: operand.column
      };
    }
    
    return this.call();
  }

  private call(): ASTNode {
    let expr = this.primary();
    
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        const args: ASTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')'");
        
        expr = {
          type: ASTNodeType.CALL_EXPR,
          callee: expr,
          arguments: args,
          line: expr.line,
          column: expr.column
        };
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.consume(TokenType.RBRACKET, "Expected ']'");
        
        expr = {
          type: ASTNodeType.INDEX_EXPR,
          object: expr,
          index,
          line: expr.line,
          column: expr.column
        };
      } else if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENT, 'Expected property name').value as string;
        
        expr = {
          type: ASTNodeType.MEMBER_EXPR,
          object: expr,
          property,
          line: expr.line,
          column: expr.column
        };
      } else {
        break;
      }
    }
    
    return expr;
  }

  private primary(): ASTNode {
    if (this.check(TokenType.NUMBER, TokenType.STRING, TokenType.BOOLEAN, TokenType.NULL)) {
      return {
        type: ASTNodeType.LITERAL,
        value: this.advance().value,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.check(TokenType.IDENT)) {
      return {
        type: ASTNodeType.IDENTIFIER,
        name: this.advance().value as string,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')'");
      return expr;
    }
    
    if (this.match(TokenType.LBRACKET)) {
      const elements: ASTNode[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACKET, "Expected ']'");
      
      return {
        type: ASTNodeType.ARRAY_LITERAL,
        elements,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.LBRACE)) {
      const properties: [string, ASTNode][] = [];
      if (!this.check(TokenType.RBRACE)) {
        do {
          const key = this.consume(TokenType.IDENT, 'Expected property name').value as string;
          this.consume(TokenType.COLON, "Expected ':'");
          const value = this.expression();
          properties.push([key, value]);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACE, "Expected '}'");
      
      return {
        type: ASTNodeType.OBJECT_LITERAL,
        properties,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.FUNCTION)) {
      this.consume(TokenType.LPAREN, "Expected '('");
      const params: string[] = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          params.push(this.consume(TokenType.IDENT, 'Expected parameter name').value as string);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
      this.consume(TokenType.LBRACE, "Expected '{'");
      const body = this.block();
      
      return {
        type: ASTNodeType.FUNCTION_EXPR,
        params,
        body,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  private check(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.checkType(type)) return true;
    }
    return false;
  }

  private checkType(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.checkType(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.checkType(type)) return this.advance();
    throw new Error(`${message} at line ${this.peek().line}`);
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }
}