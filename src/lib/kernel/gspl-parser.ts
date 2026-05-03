/**
 * GSPL Language — Parser
 * Parses tokens from lexer into AST
 * Phase 3: GSPL Language Completion
 */

import { Token, TokenType } from './gspl-lexer';

export enum ASTNodeType {
  // Literals
  INT_LITERAL = 'INT_LITERAL',
  FLOAT_LITERAL = 'FLOAT_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  BOOLEAN_LITERAL = 'BOOLEAN_LITERAL',
  NULL_LITERAL = 'NULL_LITERAL',
  VECTOR_LITERAL = 'VECTOR_LITERAL',
  STRUCT_LITERAL = 'STRUCT_LITERAL',

  // Expressions
  BINARY_EXPR = 'BINARY_EXPR',
  UNARY_EXPR = 'UNARY_EXPR',
  CALL_EXPR = 'CALL_EXPR',
  PIPE_EXPR = 'PIPE_EXPR',
  MEMBER_ACCESS = 'MEMBER_ACCESS',
  ARRAY_ACCESS = 'ARRAY_ACCESS',
  IDENTIFIER = 'IDENTIFIER',
  GENE_ACCESS = 'GENE_ACCESS',

  // Statements
  SEED_DECL = 'SEED_DECL',
  LET_DECL = 'LET_DECL',
  FN_DECL = 'FN_DECL',
  TYPE_DECL = 'TYPE_DECL',
  IMPL_DECL = 'IMPL_DECL',
  DOMAIN_DECL = 'DOMAIN_DECL',
  IMPORT_DECL = 'IMPORT_DECL',
  EXPORT_DECL = 'EXPORT_DECL',
  IF_STMT = 'IF_STMT',
  FOR_STMT = 'FOR_STMT',
  WHILE_STMT = 'WHILE_STMT',
  RETURN_STMT = 'RETURN_STMT',
  EXPR_STMT = 'EXPR_STMT',
  BLOCK = 'BLOCK',

  // Seed operations
  BREED_OP = 'BREED_OP',
  MUTATE_OP = 'MUTATE_OP',
  COMPOSE_OP = 'COMPOSE_OP',
  EVOLVE_OP = 'EVOLVE_OP',
  GROW_OP = 'GROW_OP',
  SIGNED_OP = 'SIGNED_OP',

  // Match expression
  MATCH_EXPR = 'MATCH_EXPR',
  MATCH_ARM = 'MATCH_ARM',

  // Types
  TYPE_REF = 'TYPE_REF',
  TYPE_PARAM = 'TYPE_PARAM' // Seed<domain>
}

export interface ASTNode {
  type: ASTNodeType;
  loc?: { line: number; column: number };
  [key: string]: any;
}

export class GsplParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode[] {
    const ast: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const decl = this.parseTopLevelDecl();
      if (decl) ast.push(decl);
    }
    return ast;
  }

  private parseTopLevelDecl(): ASTNode | null {
    const token = this.peek();

    switch (token.type) {
      case 'SEED': return this.parseSeedDecl();
      case 'LET': return this.parseLetDecl();
      case 'FN': return this.parseFnDecl();
      case 'TYPE': return this.parseTypeDecl();
      case 'TRAIT': return this.parseTraitDecl();
      case 'IMPL': return this.parseImplDecl();
      case 'DOMAIN': return this.parseDomainDecl();
      case 'IMPORT': return this.parseImportDecl();
      case 'EXPORT': return this.parseExportDecl();
      case 'EOF': return null;
      default: {
        const expr = this.parseExpression();
        this.expect('SEMICOLON');
        return { type: ASTNodeType.EXPR_STMT, expression: expr, loc: expr.loc };
      }
    }
  }

  private parseSeedDecl(): ASTNode {
    const seedToken = this.advance(); // seed
    const name = this.expect('IDENTIFIER').value;
    const seedName = this.expect('STRING').value;
    this.expect('IN');
    const domain = this.expect('IDENTIFIER').value;

    this.expect('LBRACE'); // {

    const genes: ASTNode[] = [];
    while (!this.check('RBRACE')) {
      if (this.check('RBRACE')) break;
      genes.push(this.parseGeneDecl());
      // Expect semicolon after each gene declaration, but not if } is next
      if (!this.check('RBRACE') && !this.check('EOF')) {
        this.expect('SEMICOLON');
      }
    }

    this.expect('RBRACE'); // }

    return {
      type: ASTNodeType.SEED_DECL,
      name,
      seedName,
      domain,
      genes,
      loc: { line: seedToken.line, column: seedToken.column }
    };
  }

  private parseGeneDecl(): ASTNode {
    const nameToken = this.advance(); // gene name
    const name = nameToken.value;

    this.expect('COLON'); // :

    const value = this.parseExpression();

    // Semicolon is optional if } is next
    if (!this.check('RBRACE') && !this.check('EOF')) {
      this.expect('SEMICOLON'); // ;
    }

    return {
      type: ASTNodeType.GENE_ACCESS,
      geneName: name,
      value,
      loc: { line: nameToken.line, column: nameToken.column }
    };
  }

  private parseLetDecl(): ASTNode {
    const letToken = this.advance(); // let
    const name = this.expect('IDENTIFIER').value;

    let typeAnnotation = undefined;
    if (this.match('COLON')) {
      typeAnnotation = this.parseType();
    }

    this.expect('ASSIGN'); // =

    const value = this.parseExpression();

    this.expect('SEMICOLON'); // ;

    return {
      type: ASTNodeType.LET_DECL,
      name,
      typeAnnotation,
      value,
      loc: { line: letToken.line, column: letToken.column }
    };
  }

  private parseFnDecl(): ASTNode {
    const fnToken = this.advance(); // fn
    const name = this.expect('IDENTIFIER').value;

    this.expect('LPAREN'); // (

    const params: ASTNode[] = [];
    if (!this.check('RPAREN')) {
      do {
        const paramName = this.expect('IDENTIFIER').value;
        this.expect('COLON');
        const paramType = this.parseType();
        params.push({ name: paramName, type: paramType });
      } while (this.match('COMMA'));
    }

    this.expect('RPAREN'); // )

    let returnType = undefined;
    if (this.match('ARROW')) {
      returnType = this.parseType();
    }

    const body = this.parseBlock();

    return {
      type: ASTNodeType.FN_DECL,
      name,
      params,
      returnType,
      body,
      loc: { line: fnToken.line, column: fnToken.column }
    };
  }

  private parseType(): ASTNode {
    const token = this.peek();

    // Seed<T>
    if (token.type === 'SEED') {
      this.advance();
      this.expect('LT'); // <
      const domain = this.expect('IDENTIFIER').value;
      this.expect('GT'); // >
      return {
        type: ASTNodeType.TYPE_PARAM,
        baseType: 'Seed',
        param: domain
      };
    }

    // Other types
    if (token.type === 'IDENTIFIER') {
      this.advance();
      return {
        type: ASTNodeType.TYPE_REF,
        name: token.value
      };
    }

    throw new Error(`Expected type at line ${token.line}, col ${token.column}`);
  }

  private parseBlock(): ASTNode {
    this.expect('LBRACE'); // {

    const statements: ASTNode[] = [];
    while (!this.check('RBRACE')) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    this.expect('RBRACE'); // }

    return {
      type: ASTNodeType.BLOCK,
      statements
    };
  }

  private parseStatement(): ASTNode | null {
    const token = this.peek();

    switch (token.type) {
      case 'LET': return this.parseLetDecl();
      case 'IF': return this.parseIfStmt();
      case 'FOR': return this.parseForStmt();
      case 'WHILE': return this.parseWhileStmt();
      case 'RETURN': return this.parseReturnStmt();
      default: {
        const expr = this.parseExpression();
        this.expect('SEMICOLON');
        return { type: ASTNodeType.EXPR_STMT, expression: expr };
      }
    }
  }

  private parseIfStmt(): ASTNode {
    const ifToken = this.advance(); // if
    this.expect('LPAREN');
    const condition = this.parseExpression();
    this.expect('RPAREN');

    const consequent = this.parseBlock();
    let alternate = undefined;

    if (this.match('ELSE')) {
      if (this.check('IF')) {
        alternate = this.parseIfStmt(); // else if
      } else {
        alternate = this.parseBlock();
      }
    }

    return {
      type: ASTNodeType.IF_STMT,
      condition,
      consequent,
      alternate,
      loc: { line: ifToken.line, column: ifToken.column }
    };
  }

  private parseForStmt(): ASTNode {
    const forToken = this.advance(); // for
    this.expect('LPAREN');
    const variable = this.expect('IDENTIFIER').value;
    this.expect('IN');
    const iterable = this.parseExpression();
    this.expect('RPAREN');
    const body = this.parseBlock();

    return {
      type: ASTNodeType.FOR_STMT,
      variable,
      iterable,
      body,
      loc: { line: forToken.line, column: forToken.column }
    };
  }

  private parseWhileStmt(): ASTNode {
    const whileToken = this.advance(); // while
    this.expect('LPAREN');
    const condition = this.parseExpression();
    this.expect('RPAREN');
    const body = this.parseBlock();

    return {
      type: ASTNodeType.WHILE_STMT,
      condition,
      body,
      loc: { line: whileToken.line, column: whileToken.column }
    };
  }

  private parseReturnStmt(): ASTNode {
    const returnToken = this.advance(); // return
    let value = undefined;
    if (!this.check('SEMICOLON')) {
      value = this.parseExpression();
    }
    this.expect('SEMICOLON');
    return {
      type: ASTNodeType.RETURN_STMT,
      value,
      loc: { line: returnToken.line, column: returnToken.column }
    };
  }

  private parseExpression(): ASTNode {
    let left = this.parsePrimary();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];

      // Stop at comma, semicolon, closing brace, or EOF
      if (token.type === 'COMMA' || token.type === 'SEMICOLON' ||
          token.type === 'RBRACE' || token.type === 'EOF') {
        break;
      }

      if (token.type === 'PLUS' || token.type === 'MINUS' || token.type === 'STAR' ||
          token.type === 'SLASH' || token.type === 'PERCENT' || token.type === 'DOUBLE_STAR') {
        const op = this.advance().value;
        const right = this.parsePrimary();
        left = {
          type: ASTNodeType.BINARY_EXPR,
          operator: op,
          left,
          right,
          loc: { line: token.line, column: token.column }
        };
      } else if (token.type === 'PIPE') {
        const op = this.advance().value;
        const right = this.parsePrimary();
        left = {
          type: ASTNodeType.PIPE_EXPR,
          left,
          right,
          loc: { line: token.line, column: token.column }
        };
      } else {
        break;
      }
    }

    return left;
  }

  private parsePipeExpr(): ASTNode {
    let left = this.parseComparison();

    while (this.match('PIPE')) {
      const right = this.parseComparison();
      left = {
        type: ASTNodeType.PIPE_EXPR,
        left,
        right
      };
    }

    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddition();

    while (this.match('EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE')) {
      const operator = this.previous().value;
      const right = this.parseAddition();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();

    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous().value;
      const right = this.parseMultiplication();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();

    while (this.match('STAR', 'SLASH', 'PERCENT', 'DOUBLE_STAR')) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      left = {
        type: ASTNodeType.BINARY_EXPR,
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('MINUS', 'NOT', 'BIT_NOT')) {
      const operator = this.previous().value;
      const operand = this.parseUnary();
      return {
        type: ASTNodeType.UNARY_EXPR,
        operator,
        operand
      };
    }

    return this.parseCall();
  }

  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        this.expect('RPAREN');
        expr = {
          type: ASTNodeType.CALL_EXPR,
          callee: expr,
          arguments: args
        };
      } else if (this.match('DOT')) {
        const property = this.expect('IDENTIFIER').value;
        expr = {
          type: ASTNodeType.MEMBER_ACCESS,
          object: expr,
          property
        };
      } else if (this.match('LBRACKET_SQUARE')) {
        const index = this.parseExpression();
        this.expect('RBRACKET_SQUARE');
        expr = {
          type: ASTNodeType.ARRAY_ACCESS,
          array: expr,
          index
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Number literals
    if (token.type === 'INT' || token.type === 'FLOAT') {
      this.advance();
      return {
        type: token.type === 'INT' ? ASTNodeType.INT_LITERAL : ASTNodeType.FLOAT_LITERAL,
        value: token.value,
        loc: { line: token.line, column: token.column }
      };
    }

    // String literal
    if (token.type === 'STRING') {
      this.advance();
      return {
        type: ASTNodeType.STRING_LITERAL,
        value: token.value,
        loc: { line: token.line, column: token.column }
      };
    }

    // Boolean literals
    if (token.type === 'TRUE' || token.type === 'FALSE') {
      this.advance();
      return {
        type: ASTNodeType.BOOLEAN_LITERAL,
        value: token.type === 'TRUE',
        loc: { line: token.line, column: token.column }
      };
    }

    // Null literal
    if (token.type === 'NULL') {
      this.advance();
      return {
        type: ASTNodeType.NULL_LITERAL,
        value: null,
        loc: { line: token.line, column: token.column }
      };
    }

    // Vector literal
    if (token.type === 'LBRACKET_SQUARE') {
      const startToken = this.advance();
      const elements: ASTNode[] = [];
      if (!this.check('RBRACKET_SQUARE')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      this.expect('RBRACKET_SQUARE');
      return {
        type: ASTNodeType.VECTOR_LITERAL,
        elements,
        loc: { line: startToken.line, column: startToken.column }
      };
    }

    // Identifier or keyword that's an identifier
    if (token.type === 'IDENTIFIER' || token.type === 'GENE_NAME') {
      this.advance();
      return {
        type: ASTNodeType.IDENTIFIER,
        name: token.value,
        loc: { line: token.line, column: token.column }
      };
    }

    // Seed operations
    if (token.type === 'BREED') return this.parseBreedOp();
    if (token.type === 'MUTATE') return this.parseMutateOp();
    if (token.type === 'COMPOSE') return this.parseComposeOp();
    if (token.type === 'EVOLVE') return this.parseEvolveOp();
    if (token.type === 'GROW') return this.parseGrowOp();

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token ${token.type} at line ${token.line}, col ${token.column}`);
  }

  private parseBreedOp(): ASTNode {
    const token = this.advance(); // breed
    const parentA = this.parseExpression();
    const parentB = this.parseExpression();

    return {
      type: ASTNodeType.BREED_OP,
      parentA,
      parentB,
      loc: { line: token.line, column: token.column }
    };
  }

  private parseMutateOp(): ASTNode {
    const token = this.advance(); // mutate
    const seed = this.parseExpression();
    const options: Record<string, any> = {};

    if (this.match('LPAREN')) {
      // Parse options like rate: 0.1, genes: [...]
      this.expect('RPAREN');
    }

    return {
      type: ASTNodeType.MUTATE_OP,
      seed,
      options,
      loc: { line: token.line, column: token.column }
    };
  }

  private parseComposeOp(): ASTNode {
    const token = this.advance(); // compose
    const seed = this.parseExpression();

    let targetDomain = undefined;
    if (this.match('COMMA')) {
      targetDomain = this.expect('IDENTIFIER').value;
    }

    return {
      type: ASTNodeType.COMPOSE_OP,
      seed,
      targetDomain,
      loc: { line: token.line, column: token.column }
    };
  }

  private parseEvolveOp(): ASTNode {
    const token = this.advance(); // evolve
    const options: ASTNode = this.parseExpression(); // object with population, generations, etc.

    return {
      type: ASTNodeType.EVOLVE_OP,
      options,
      loc: { line: token.line, column: token.column }
    };
  }

  private parseGrowOp(): ASTNode {
    const token = this.advance(); // grow
    const seed = this.parseExpression();
    let engine = undefined;
    if (this.match('COMMA')) {
      engine = this.expect('IDENTIFIER').value;
    }

    return {
      type: ASTNodeType.GROW_OP,
      seed,
      engine,
      loc: { line: token.line, column: token.column }
    };
  }

  private parseTypeDecl(): ASTNode {
    const typeToken = this.advance(); // type
    const name = this.expect('IDENTIFIER').value;
    this.expect('ASSIGN'); // =
    const baseType = this.parseType();

    let whereClause = undefined;
    if (this.match('WHERE')) {
      whereClause = this.parseBlock(); // { predicates }
    }

    return {
      type: ASTNodeType.TYPE_DECL,
      name,
      baseType,
      whereClause,
      loc: { line: typeToken.line, column: typeToken.column }
    };
  }

  private parseTraitDecl(): ASTNode {
    const traitToken = this.advance(); // trait
    const name = this.expect('IDENTIFIER').value;

    this.expect('LBRACE'); // {
    const methods: ASTNode[] = [];
    while (!this.check('RBRACE')) {
      methods.push(this.parseFnDecl());
    }
    this.expect('RBRACE');

    return {
      type: ASTNodeType.TYPE_DECL,
      name,
      methods,
      isTrait: true,
      loc: { line: traitToken.line, column: traitToken.column }
    };
  }

  private parseImplDecl(): ASTNode {
    const implToken = this.advance(); // impl
    const traitName = this.expect('IDENTIFIER').value;
    this.expect('FOR'); // for
    const typeName = this.expect('IDENTIFIER').value;

    this.expect('LBRACE'); // {
    const methods: ASTNode[] = [];
    while (!this.check('RBRACE')) {
      methods.push(this.parseFnDecl());
    }
    this.expect('RBRACE');

    return {
      type: ASTNodeType.IMPL_DECL,
      traitName,
      typeName,
      methods,
      loc: { line: implToken.line, column: implToken.column }
    };
  }

  private parseDomainDecl(): ASTNode {
    const domainToken = this.advance(); // domain
    const name = this.expect('IDENTIFIER').value;

    this.expect('LBRACE'); // {
    const genes: ASTNode[] = [];
    while (!this.check('RBRACE')) {
      genes.push(this.parseGeneDecl());
    }
    this.expect('RBRACE');

    return {
      type: ASTNodeType.DOMAIN_DECL,
      name,
      genes,
      loc: { line: domainToken.line, column: domainToken.column }
    };
  }

  private parseImportDecl(): ASTNode {
    const importToken = this.advance(); // import
    this.expect('LBRACE'); // {
    const imports: string[] = [];
    do {
      imports.push(this.expect('IDENTIFIER').value);
    } while (this.match('COMMA'));
    this.expect('RBRACE');
    this.expect('FROM'); // from
    const path = this.expect('STRING').value;

    return {
      type: ASTNodeType.IMPORT_DECL,
      imports,
      path,
      loc: { line: importToken.line, column: importToken.column }
    };
  }

  private parseExportDecl(): ASTNode {
    const exportToken = this.advance(); // export
    this.expect('LBRACE'); // {
    const exports: string[] = [];
    do {
      exports.push(this.expect('IDENTIFIER').value);
    } while (this.match('COMMA'));
    this.expect('RBRACE');

    return {
      type: ASTNodeType.EXPORT_DECL,
      exports,
      loc: { line: exportToken.line, column: exportToken.column }
    };
  }

  // Utility methods
  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    const token = this.tokens[this.pos++];
    return token;
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private expect(type: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`Expected ${type} at line ${token.line}, col ${token.column}, got ${token.type}`);
  }
}
