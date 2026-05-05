/**
 * GSPL Parser — Recursive descent parser producing an AST.
 *
 * Supports both formats:
 *   - Editor: seed "Name" in domain { key: value }
 *   - Library: seed Std.Character.Seed { key = value, ... }
 *   - Full DSL: let x = ..., fn f(a) { ... }, if/else, for
 */

import { Token, TokenType, tokenize } from './lexer.js';

// ─── AST Node Types ──────────────────────────────────────────────────────────

export type Expr =
  | { kind: 'literal'; value: number | string | boolean }
  | { kind: 'identifier'; name: string }
  | { kind: 'array'; elements: Expr[] }
  | { kind: 'object'; entries: [string, Expr][] }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'unary'; op: string; operand: Expr }
  | { kind: 'call'; callee: string; args: Expr[] }
  | { kind: 'member'; object: Expr; property: string }
  | { kind: 'index'; object: Expr; index: Expr };

export interface GeneAssignment {
  name: string;
  geneType?: string;
  value: Expr;
}

export type Statement =
  | { kind: 'seed_decl'; name: Expr; domain: Expr; genes: GeneAssignment[] }
  | { kind: 'let_binding'; name: string; value: Expr }
  | { kind: 'fn_decl'; name: string; params: string[]; body: Statement[] }
  | { kind: 'if_stmt'; condition: Expr; then: Statement[]; else_branch?: Statement[] }
  | { kind: 'for_stmt'; variable: string; iterable: Expr; body: Statement[] }
  | { kind: 'while_stmt'; condition: Expr; body: Statement[] }
  | { kind: 'return_stmt'; value?: Expr }
  | { kind: 'expr_stmt'; expr: Expr };

export interface Program {
  kind: 'program';
  body: Statement[];
}

export interface ParseError {
  message: string;
  line: number;
  col: number;
}

export interface ParseResult {
  ast: Program;
  errors: ParseError[];
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parse(source: string): ParseResult {
  const { tokens, errors: lexErrors } = tokenize(source);
  const errors: ParseError[] = lexErrors.map(e => ({ message: e, line: 0, col: 0 }));
  let pos = 0;

  function current(): Token { return tokens[pos] || { type: TokenType.EOF, value: '', line: 0, col: 0 }; }
  function peek(): TokenType { return current().type; }
  function advance(): Token { const t = current(); if (pos < tokens.length - 1) pos++; return t; }
  function expect(type: TokenType, context?: string): Token {
    if (peek() !== type) {
      const t = current();
      errors.push({ message: `Expected ${type}${context ? ' in ' + context : ''}, got ${t.type} ("${t.value}")`, line: t.line, col: t.col });
      return t;
    }
    return advance();
  }
  function match(type: TokenType): boolean {
    if (peek() === type) { advance(); return true; }
    return false;
  }
  function check(type: TokenType): boolean { return peek() === type; }

  // ─── Top-Level ─────────────────────────────────────────────────────────

  function parseProgram(): Program {
    const body: Statement[] = [];
    while (peek() !== TokenType.EOF) {
      try {
        body.push(parseStatement());
      } catch (e: any) {
        errors.push({ message: e.message || 'Parse error', line: current().line, col: current().col });
        // Recover by skipping to next semicolon or EOF
        while (!check(TokenType.SEMICOLON) && !check(TokenType.EOF)) {
          advance();
        }
        if (check(TokenType.SEMICOLON)) advance();
      }
    }
    return { kind: 'program', body };
  }

  // ─── Statements ────────────────────────────────────────────────────────

  function parseStatement(): Statement {
    if (check(TokenType.SEED)) return parseSeedDecl();
    if (check(TokenType.LET)) return parseLetBinding();
    if (check(TokenType.FN)) return parseFnDecl();
    if (check(TokenType.IF)) return parseIfStmt();
    if (check(TokenType.FOR)) return parseForStmt();
    if (check(TokenType.WHILE)) return parseWhileStmt();
    if (check(TokenType.RETURN)) return parseReturnStmt();
    return parseExprStmt();
  }

  function parseSeedDecl(): Statement {
    advance(); // consume 'seed'

    let name: Expr;
    let domain: Expr;

    // Format 1: seed "Name" in domain { ... }
    if (check(TokenType.STRING)) {
      name = { kind: 'literal', value: advance().value };
      expect(TokenType.IN, 'seed declaration');
      domain = { kind: 'literal', value: advance().value };
    }
    // Format 2: seed Std.Character.Seed { ... }  (library format)
    else if (check(TokenType.IDENT)) {
      const ident = advance().value;
      // Extract domain from Std.X.Seed pattern
      const parts = ident.split('.');
      if (parts.length >= 2) {
        domain = { kind: 'literal', value: parts[1].toLowerCase() };
        name = { kind: 'literal', value: ident };
      } else {
        // Simple: seed myDomain { ... }
        domain = { kind: 'literal', value: ident.toLowerCase() };
        name = { kind: 'literal', value: ident };
      }
    }
    // Format 3: seed variable_name in domain { ... }
    else {
      name = parseExpression();
      if (match(TokenType.IN)) {
        domain = parseExpression();
      } else {
        domain = { kind: 'literal', value: 'character' };
      }
    }

    const genes: GeneAssignment[] = [];
    if (match(TokenType.LBRACE)) {
      while (!check(TokenType.RBRACE) && !check(TokenType.EOF)) {
        try {
          genes.push(parseGeneAssignment());
          // Optional comma or semicolon separator
          match(TokenType.COMMA) || match(TokenType.SEMICOLON);
        } catch {
          // Skip to next line or closing brace
          while (!check(TokenType.RBRACE) && !check(TokenType.EOF) &&
                 !check(TokenType.COMMA) && !check(TokenType.SEMICOLON)) {
            advance();
          }
          match(TokenType.COMMA) || match(TokenType.SEMICOLON);
        }
      }
      expect(TokenType.RBRACE, 'seed declaration');
    }

    return { kind: 'seed_decl', name, domain, genes };
  }

  function parseGeneAssignment(): GeneAssignment {
    // Optionally skip 'gene' keyword prefix
    if (check(TokenType.IDENT) && current().value.toLowerCase() === 'gene') {
      advance();
    }

    const name = expect(TokenType.IDENT, 'gene assignment').value;

    // Optional type annotation: gene name: type = value
    let geneType: string | undefined;
    if (match(TokenType.COLON)) {
      if (check(TokenType.IDENT)) {
        const potentialType = current().value;
        // Check if this is a type annotation or just the value
        if (['scalar', 'categorical', 'vector', 'expression', 'struct', 'array',
             'graph', 'topology', 'temporal', 'regulatory', 'field', 'symbolic',
             'quantum', 'gematria', 'resonance', 'dimensional', 'sovereignty'].includes(potentialType)) {
          geneType = advance().value;
          expect(TokenType.EQ, 'typed gene assignment');
        } else {
          // It's just key: value (no type annotation)
        }
      }
    } else if (match(TokenType.EQ)) {
      // key = value format (library style)
    } else {
      // Fallback: might be key: value without explicit separator already consumed
    }

    const value = parseExpression();
    return { name, geneType, value };
  }

  function parseLetBinding(): Statement {
    advance(); // consume 'let'
    const name = expect(TokenType.IDENT, 'let binding').value;
    expect(TokenType.EQ, 'let binding');
    const value = parseExpression();
    match(TokenType.SEMICOLON);
    return { kind: 'let_binding', name, value };
  }

  function parseFnDecl(): Statement {
    advance(); // consume 'fn'
    const name = expect(TokenType.IDENT, 'function declaration').value;
    expect(TokenType.LPAREN, 'function params');
    const params: string[] = [];
    while (!check(TokenType.RPAREN) && !check(TokenType.EOF)) {
      params.push(expect(TokenType.IDENT, 'function param').value);
      if (!check(TokenType.RPAREN)) expect(TokenType.COMMA, 'function params');
    }
    expect(TokenType.RPAREN, 'function params');
    const body = parseBlock();
    return { kind: 'fn_decl', name, params, body };
  }

  function parseIfStmt(): Statement {
    advance(); // consume 'if'
    match(TokenType.LPAREN); // optional parens
    const condition = parseExpression();
    match(TokenType.RPAREN);
    const then = parseBlock();
    let else_branch: Statement[] | undefined;
    if (match(TokenType.ELSE)) {
      if (check(TokenType.IF)) {
        else_branch = [parseIfStmt()];
      } else {
        else_branch = parseBlock();
      }
    }
    return { kind: 'if_stmt', condition, then, else_branch };
  }

  function parseForStmt(): Statement {
    advance(); // consume 'for'
    match(TokenType.LPAREN);
    const variable = expect(TokenType.IDENT, 'for variable').value;
    expect(TokenType.IN, 'for statement');
    const iterable = parseExpression();
    match(TokenType.RPAREN);
    const body = parseBlock();
    return { kind: 'for_stmt', variable, iterable, body };
  }

  function parseWhileStmt(): Statement {
    advance(); // consume 'while'
    match(TokenType.LPAREN);
    const condition = parseExpression();
    match(TokenType.RPAREN);
    const body = parseBlock();
    return { kind: 'while_stmt', condition, body };
  }

  function parseReturnStmt(): Statement {
    advance(); // consume 'return'
    if (check(TokenType.SEMICOLON) || check(TokenType.RBRACE) || check(TokenType.EOF)) {
      match(TokenType.SEMICOLON);
      return { kind: 'return_stmt' };
    }
    const value = parseExpression();
    match(TokenType.SEMICOLON);
    return { kind: 'return_stmt', value };
  }

  function parseExprStmt(): Statement {
    const expr = parseExpression();
    match(TokenType.SEMICOLON);
    return { kind: 'expr_stmt', expr };
  }

  function parseBlock(): Statement[] {
    if (match(TokenType.LBRACE)) {
      const stmts: Statement[] = [];
      while (!check(TokenType.RBRACE) && !check(TokenType.EOF)) {
        try {
          stmts.push(parseStatement());
        } catch (e: any) {
          errors.push({ message: e.message || 'Parse error in block', line: current().line, col: current().col });
          // Recover by skipping to next semicolon or RBRACE
          while (!check(TokenType.SEMICOLON) && !check(TokenType.RBRACE) && !check(TokenType.EOF)) {
            advance();
          }
          if (check(TokenType.SEMICOLON)) advance();
        }
      }
      expect(TokenType.RBRACE, 'block');
      return stmts;
    }
    // Single-statement block
    try {
      return [parseStatement()];
    } catch (e: any) {
      errors.push({ message: e.message || 'Parse error in block', line: current().line, col: current().col });
      return [];
    }
  }

  // ─── Expressions (Pratt-style precedence) ──────────────────────────────

  function parseExpression(): Expr {
    return parseOr();
  }

  function parseOr(): Expr {
    let left = parseAnd();
    while (match(TokenType.OR)) {
      left = { kind: 'binary', op: '||', left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): Expr {
    let left = parseEquality();
    while (match(TokenType.AND)) {
      left = { kind: 'binary', op: '&&', left, right: parseEquality() };
    }
    return left;
  }

  function parseEquality(): Expr {
    let left = parseComparison();
    while (check(TokenType.EQEQ) || check(TokenType.BANGEQ)) {
      const op = advance().value;
      left = { kind: 'binary', op, left, right: parseComparison() };
    }
    return left;
  }

  function parseComparison(): Expr {
    let left = parseAdditive();
    while (check(TokenType.LT) || check(TokenType.GT) || check(TokenType.LTEQ) || check(TokenType.GTEQ)) {
      const op = advance().value;
      left = { kind: 'binary', op, left, right: parseAdditive() };
    }
    return left;
  }

  function parseAdditive(): Expr {
    let left = parseMultiplicative();
    while (check(TokenType.PLUS) || check(TokenType.MINUS)) {
      const op = advance().value;
      left = { kind: 'binary', op, left, right: parseMultiplicative() };
    }
    return left;
  }

  function parseMultiplicative(): Expr {
    let left = parseUnary();
    while (check(TokenType.STAR) || check(TokenType.SLASH) || check(TokenType.PERCENT)) {
      const op = advance().value;
      left = { kind: 'binary', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary(): Expr {
    if (check(TokenType.MINUS) || check(TokenType.BANG)) {
      const op = advance().value;
      return { kind: 'unary', op, operand: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix(): Expr {
    let expr = parsePrimary();
    while (true) {
      if (match(TokenType.DOT)) {
        const prop = expect(TokenType.IDENT, 'member access').value;
        expr = { kind: 'member', object: expr, property: prop };
      } else if (match(TokenType.LBRACKET)) {
        const idx = parseExpression();
        expect(TokenType.RBRACKET, 'index');
        expr = { kind: 'index', object: expr, index: idx };
      } else if (check(TokenType.LPAREN) && expr.kind === 'identifier') {
        // Function call
        advance();
        const args: Expr[] = [];
        while (!check(TokenType.RPAREN) && !check(TokenType.EOF)) {
          args.push(parseExpression());
          if (!check(TokenType.RPAREN)) match(TokenType.COMMA);
        }
        expect(TokenType.RPAREN, 'function call');
        expr = { kind: 'call', callee: (expr as any).name, args };
      } else if (check(TokenType.LPAREN) && expr.kind === 'member') {
        // Method call: obj.method(args)
        advance();
        const args: Expr[] = [];
        while (!check(TokenType.RPAREN) && !check(TokenType.EOF)) {
          args.push(parseExpression());
          if (!check(TokenType.RPAREN)) match(TokenType.COMMA);
        }
        expect(TokenType.RPAREN, 'method call');
        expr = { kind: 'call', callee: `${exprToString(expr)}`, args };
      } else {
        break;
      }
    }
    return expr;
  }

  function parsePrimary(): Expr {
    // Number
    if (check(TokenType.NUMBER)) {
      return { kind: 'literal', value: Number(advance().value) };
    }

    // String
    if (check(TokenType.STRING)) {
      return { kind: 'literal', value: advance().value };
    }

    // Boolean
    if (check(TokenType.TRUE)) { advance(); return { kind: 'literal', value: true }; }
    if (check(TokenType.FALSE)) { advance(); return { kind: 'literal', value: false }; }

    // Array literal
    if (check(TokenType.LBRACKET)) {
      advance();
      const elements: Expr[] = [];
      while (!check(TokenType.RBRACKET) && !check(TokenType.EOF)) {
        elements.push(parseExpression());
        if (!check(TokenType.RBRACKET)) match(TokenType.COMMA);
      }
      expect(TokenType.RBRACKET, 'array literal');
      return { kind: 'array', elements };
    }

    // Object literal
    if (check(TokenType.LBRACE)) {
      advance();
      const entries: [string, Expr][] = [];
      while (!check(TokenType.RBRACE) && !check(TokenType.EOF)) {
        const key = check(TokenType.STRING) ? advance().value : expect(TokenType.IDENT, 'object key').value;
        expect(TokenType.COLON, 'object entry');
        entries.push([key, parseExpression()]);
        if (!check(TokenType.RBRACE)) match(TokenType.COMMA);
      }
      expect(TokenType.RBRACE, 'object literal');
      return { kind: 'object', entries };
    }

    // Grouped expression
    if (check(TokenType.LPAREN)) {
      advance();
      const expr = parseExpression();
      expect(TokenType.RPAREN, 'grouped expression');
      return expr;
    }

    // Keyword builtins used as function names
    if (check(TokenType.MUTATE) || check(TokenType.COMPOSE) || check(TokenType.GROW) ||
        check(TokenType.BREED) || check(TokenType.EVOLVE) || check(TokenType.DISTANCE)) {
      const name = advance().value.toLowerCase();
      if (check(TokenType.LPAREN)) {
        advance();
        const args: Expr[] = [];
        while (!check(TokenType.RPAREN) && !check(TokenType.EOF)) {
          args.push(parseExpression());
          if (!check(TokenType.RPAREN)) match(TokenType.COMMA);
        }
        expect(TokenType.RPAREN, 'built-in call');
        return { kind: 'call', callee: name, args };
      }
      return { kind: 'identifier', name };
    }

    // Identifier
    if (check(TokenType.IDENT)) {
      return { kind: 'identifier', name: advance().value };
    }

    // Fallback
    const t = current();
    errors.push({ message: `Unexpected token ${t.type} ("${t.value}")`, line: t.line, col: t.col });
    advance();
    return { kind: 'literal', value: 0 };
  }

  function exprToString(expr: Expr): string {
    if (expr.kind === 'identifier') return expr.name;
    if (expr.kind === 'member') return `${exprToString(expr.object)}.${expr.property}`;
    return '<expr>';
  }

  const ast = parseProgram();
  return { ast, errors };
}
