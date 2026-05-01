import { describe, it, expect } from 'vitest';
import { parse } from '../../src/lib/gspl/parser.js';

describe('GSPL Parser', () => {
  describe('seed declarations', () => {
    it('parses editor format: seed "Name" in domain { ... }', () => {
      const { ast, errors } = parse('seed "Warrior" in character { strength: 0.8 }');
      expect(errors).toHaveLength(0);
      expect(ast.body).toHaveLength(1);
      const stmt = ast.body[0];
      expect(stmt.kind).toBe('seed_decl');
      if (stmt.kind === 'seed_decl') {
        expect(stmt.name).toMatchObject({ kind: 'literal', value: 'Warrior' });
        expect(stmt.domain).toMatchObject({ kind: 'literal', value: 'character' });
        expect(stmt.genes).toHaveLength(1);
        expect(stmt.genes[0].name).toBe('strength');
      }
    });

    it('parses library format: seed Std.Character.Seed { ... }', () => {
      const { ast, errors } = parse('seed Std.Character.Seed { name = "Hero", archetype = "warrior" }');
      expect(errors).toHaveLength(0);
      const stmt = ast.body[0];
      expect(stmt.kind).toBe('seed_decl');
      if (stmt.kind === 'seed_decl') {
        expect(stmt.genes.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('parses multiple genes with types', () => {
      const src = `seed "Dragon" in character {
        strength: 0.9
        palette: [0.8, 0.2, 0.1]
        archetype: "berserker"
      }`;
      const { ast, errors } = parse(src);
      expect(errors).toHaveLength(0);
      if (ast.body[0].kind === 'seed_decl') {
        expect(ast.body[0].genes).toHaveLength(3);
      }
    });
  });

  describe('let bindings', () => {
    it('parses let with number', () => {
      const { ast } = parse('let x = 42');
      expect(ast.body[0].kind).toBe('let_binding');
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].name).toBe('x');
        expect(ast.body[0].value).toMatchObject({ kind: 'literal', value: 42 });
      }
    });

    it('parses let with expression', () => {
      const { ast } = parse('let y = 2 + 3 * 4');
      expect(ast.body[0].kind).toBe('let_binding');
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].value.kind).toBe('binary');
      }
    });

    it('parses let with array', () => {
      const { ast } = parse('let colors = [0.8, 0.3, 0.1]');
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].value.kind).toBe('array');
      }
    });
  });

  describe('function declarations', () => {
    it('parses fn with body', () => {
      const { ast, errors } = parse('fn double(x) { return x * 2 }');
      expect(errors).toHaveLength(0);
      expect(ast.body[0].kind).toBe('fn_decl');
      if (ast.body[0].kind === 'fn_decl') {
        expect(ast.body[0].name).toBe('double');
        expect(ast.body[0].params).toEqual(['x']);
        expect(ast.body[0].body).toHaveLength(1);
      }
    });
  });

  describe('control flow', () => {
    it('parses if/else', () => {
      const { ast, errors } = parse('if x > 5 { print("big") } else { print("small") }');
      expect(errors).toHaveLength(0);
      expect(ast.body[0].kind).toBe('if_stmt');
      if (ast.body[0].kind === 'if_stmt') {
        expect(ast.body[0].then).toHaveLength(1);
        expect(ast.body[0].else_branch).toHaveLength(1);
      }
    });

    it('parses for loop', () => {
      const { ast, errors } = parse('for i in range(10) { print(i) }');
      expect(errors).toHaveLength(0);
      expect(ast.body[0].kind).toBe('for_stmt');
      if (ast.body[0].kind === 'for_stmt') {
        expect(ast.body[0].variable).toBe('i');
      }
    });
  });

  describe('expressions', () => {
    it('parses function calls', () => {
      const { ast } = parse('mutate(s, 0.1)');
      expect(ast.body[0].kind).toBe('expr_stmt');
      if (ast.body[0].kind === 'expr_stmt') {
        expect(ast.body[0].expr.kind).toBe('call');
        if (ast.body[0].expr.kind === 'call') {
          expect(ast.body[0].expr.callee).toBe('mutate');
          expect(ast.body[0].expr.args).toHaveLength(2);
        }
      }
    });

    it('parses dot-path identifiers (Std.X.Y format)', () => {
      const { ast } = parse('let x = Std.Character.Seed');
      if (ast.body[0].kind === 'let_binding') {
        // Dot-separated paths are single identifiers for library compatibility
        expect(ast.body[0].value.kind).toBe('identifier');
        if (ast.body[0].value.kind === 'identifier') {
          expect(ast.body[0].value.name).toBe('Std.Character.Seed');
        }
      }
    });

    it('respects operator precedence (multiply before add)', () => {
      const { ast } = parse('let x = 2 + 3 * 4');
      if (ast.body[0].kind === 'let_binding') {
        const expr = ast.body[0].value;
        expect(expr.kind).toBe('binary');
        if (expr.kind === 'binary') {
          expect(expr.op).toBe('+');
          expect(expr.right.kind).toBe('binary');
          if (expr.right.kind === 'binary') {
            expect(expr.right.op).toBe('*');
          }
        }
      }
    });

    it('parses unary negation', () => {
      const { ast } = parse('let x = -5');
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].value.kind).toBe('unary');
      }
    });

    it('parses object literals', () => {
      const { ast } = parse('let obj = { a: 1, b: "hello" }');
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].value.kind).toBe('object');
      }
    });

    it('parses boolean literals', () => {
      const { ast } = parse('let a = true; let b = false');
      expect(ast.body).toHaveLength(2);
      if (ast.body[0].kind === 'let_binding') {
        expect(ast.body[0].value).toMatchObject({ kind: 'literal', value: true });
      }
    });
  });

  describe('multi-statement programs', () => {
    it('parses a complete GSPL program', () => {
      const src = `
        let domain = "character"
        seed "Hero" in character {
          strength: 0.9
          agility: 0.7
        }
        let m = mutate(Hero, 0.1)
        grow(m)
      `;
      const { ast, errors } = parse(src);
      expect(errors).toHaveLength(0);
      expect(ast.body.length).toBeGreaterThanOrEqual(4);
    });
  });
});
