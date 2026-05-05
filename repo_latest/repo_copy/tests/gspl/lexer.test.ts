import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from '../../src/lib/gspl/lexer.js';

describe('GSPL Lexer', () => {
  it('tokenizes seed declaration (editor format)', () => {
    const { tokens, errors } = tokenize('seed "Warrior" in character { strength: 0.8 }');
    expect(errors).toHaveLength(0);
    expect(tokens[0].type).toBe(TokenType.SEED);
    expect(tokens[1].type).toBe(TokenType.STRING);
    expect(tokens[1].value).toBe('Warrior');
    expect(tokens[2].type).toBe(TokenType.IN);
    expect(tokens[3].type).toBe(TokenType.IDENT);
    expect(tokens[3].value).toBe('character');
  });

  it('tokenizes numbers (int and float)', () => {
    const { tokens } = tokenize('42 3.14 0.001');
    expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: '42' });
    expect(tokens[1]).toMatchObject({ type: TokenType.NUMBER, value: '3.14' });
    expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: '0.001' });
  });

  it('tokenizes array literals', () => {
    const { tokens } = tokenize('[1, 2, 3]');
    expect(tokens[0].type).toBe(TokenType.LBRACKET);
    expect(tokens[1]).toMatchObject({ type: TokenType.NUMBER, value: '1' });
    expect(tokens[2].type).toBe(TokenType.COMMA);
    expect(tokens[6].type).toBe(TokenType.RBRACKET);
  });

  it('tokenizes keywords', () => {
    const { tokens } = tokenize('let fn if else for in return mutate compose grow breed evolve');
    const types = tokens.slice(0, -1).map(t => t.type);
    expect(types).toEqual([
      TokenType.LET, TokenType.FN, TokenType.IF, TokenType.ELSE,
      TokenType.FOR, TokenType.IN, TokenType.RETURN,
      TokenType.MUTATE, TokenType.COMPOSE, TokenType.GROW, TokenType.BREED, TokenType.EVOLVE
    ]);
  });

  it('tokenizes operators', () => {
    const { tokens } = tokenize('+ - * / == != < > <= >= && ||');
    const types = tokens.slice(0, -1).map(t => t.type);
    expect(types).toEqual([
      TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.SLASH,
      TokenType.EQEQ, TokenType.BANGEQ, TokenType.LT, TokenType.GT,
      TokenType.LTEQ, TokenType.GTEQ, TokenType.AND, TokenType.OR
    ]);
  });

  it('handles string escapes', () => {
    const { tokens } = tokenize('"hello\\"world"');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello"world');
  });

  it('skips single-line comments', () => {
    const { tokens } = tokenize('let x = 5 // this is a comment\nlet y = 10');
    const idents = tokens.filter(t => t.type === TokenType.IDENT);
    expect(idents).toHaveLength(2);
    expect(idents[0].value).toBe('x');
    expect(idents[1].value).toBe('y');
  });

  it('skips hash comments (GSPL library format)', () => {
    const { tokens } = tokenize('# comment\nlet x = 1');
    expect(tokens[0].type).toBe(TokenType.LET);
  });

  it('handles Std.Character.Seed identifiers', () => {
    const { tokens } = tokenize('seed Std.Character.Seed { name = "Hero" }');
    expect(tokens[0].type).toBe(TokenType.SEED);
    expect(tokens[1].type).toBe(TokenType.IDENT);
    expect(tokens[1].value).toBe('Std.Character.Seed');
  });

  it('tracks line and column numbers', () => {
    const { tokens } = tokenize('let x = 5\nlet y = 10');
    const yToken = tokens.find(t => t.value === 'y');
    expect(yToken?.line).toBe(2);
  });

  it('produces EOF as last token', () => {
    const { tokens } = tokenize('');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  it('reports errors for unexpected characters', () => {
    const { errors } = tokenize('let x = @');
    expect(errors.length).toBeGreaterThan(0);
  });
});
