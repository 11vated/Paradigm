import { describe, it, expect } from 'vitest';
import { executeGspl, GsplInterpreter } from '../../src/lib/kernel/gspl-interpreter.js';
import { GsplLexer } from '../../src/lib/kernel/gspl-lexer.js';
import { GsplParser, ASTNodeType } from '../../src/lib/kernel/gspl-parser.js';

describe('GSPL Extensions', () => {
  describe('Match Expression', () => {
    it('matches literal number values', async () => {
      const result = await executeGspl(`
        let x = 2;
        let y = match x { 1 -> 10; 2 -> 20; 3 -> 30; _ -> 0 };
        print(y)
      `);
      expect(result.output).toContain('20');
    });

    it('matches string values', async () => {
      const result = await executeGspl(`
        let x = "hello";
        let y = match x { "world" -> 1; "hello" -> 2; _ -> 0 };
        print(y)
      `);
      expect(result.output).toContain('2');
    });

    it('matches boolean values', async () => {
      const result = await executeGspl(`
        let x = true;
        let y = match x { true -> "yes"; false -> "no" };
        print(y)
      `);
      expect(result.output).toContain('yes');
    });

    it('matches null values', async () => {
      const result = await executeGspl(`
        let x = null;
        let y = match x { null -> "nothing"; _ -> "something" };
        print(y)
      `);
      expect(result.output).toContain('nothing');
    });

    it('wildcard catches unmatched values', async () => {
      const result = await executeGspl(`
        let x = 99;
        let y = match x { 1 -> "one"; 2 -> "two"; _ -> "other" };
        print(y)
      `);
      expect(result.output).toContain('other');
    });

    it('throws when no arm matches and no wildcard', async () => {
      const result = await executeGspl(`
        let x = 99;
        let y = match x { 1 -> "one"; 2 -> "two" };
      `);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('uses match as expression in let bindings', async () => {
      const result = await executeGspl(`
        let val = match 3 { 1 -> 100; 2 -> 200; 3 -> 300; _ -> 0 };
        print(val)
      `);
      expect(result.output).toContain('300');
    });

    it('match is a value-producing expression', async () => {
      const result = await executeGspl(`
        let x = 5;
        print(match x { 1 -> "a"; 5 -> "b"; _ -> "c" })
      `);
      expect(result.output).toContain('b');
    });
  });

  describe('Match Expression Parser (AST)', () => {
    it('produces MATCH_EXPR node type', () => {
      const lexer = new GsplLexer(`match x { 1 -> "one"; _ -> "other" }`);
      const tokens = lexer.tokenize();
      const parser = new GsplParser(tokens);
      const ast = parser.parse();
      // Match is an expression, wrapped in EXPR_STMT
      const exprStmt = ast.find(n => n.type === ASTNodeType.EXPR_STMT);
      expect(exprStmt).toBeDefined();
      const matchNode = exprStmt!.expression;
      expect(matchNode.type).toBe(ASTNodeType.MATCH_EXPR);
      expect(matchNode.subject).toBeDefined();
      expect(matchNode.arms).toHaveLength(2);
      expect(matchNode.arms[0].pattern.value).toBe(1);
      expect(matchNode.arms[1].pattern.name).toBe('_');
    });
  });

  describe('Type Declaration', () => {
    it('declares a type alias', async () => {
      const result = await executeGspl(`
        type Color = number;
        let x = 42;
        print(x)
      `);
      expect(result.errors).toHaveLength(0);
      expect(result.output).toContain('42');
    });

    it('type decl is stored in type registry', async () => {
      const interp = new GsplInterpreter('test-types');
      await interp.execute(`type Strength = number`);
      expect((interp as any).context.types.has('Strength')).toBe(true);
    });
  });

  describe('Trait and Impl', () => {
    it('declares a trait', async () => {
      const result = await executeGspl(`
        trait Describable {
          fn describe() -> string { return "a thing" }
        }
      `);
      expect(result.errors).toHaveLength(0);
    });

    it('declares a trait and impl', async () => {
      const result = await executeGspl(`
        trait Greeter {
          fn greet(name: string) -> string { return "Hello, " + name }
        }
        impl Greeter for string {
          fn greet(name: string) -> string { return "Hi, " + name }
        }
      `);
      expect(result.errors).toHaveLength(0);
    });

    it('registers trait implementations for a type', async () => {
      const interp = new GsplInterpreter('test-impl');
      await interp.execute(`
        trait Talker {
          fn talk(msg: string) -> string { return msg }
        }
        impl Talker for bot {
          fn talk(msg: string) -> string { return "BOT: " + msg }
        }
      `);
      expect((interp as any).context.types.has('Talker')).toBe(true);
      expect((interp as any).context.functions.has('bot.talk')).toBe(true);
    });
  });

  describe('Import and Export', () => {
    it('imports symbols from a module path', async () => {
      const result = await executeGspl(`
        import { strength, agility } from "std/character";
        print(strength)
      `);
      expect(result.errors).toHaveLength(0);
    });

    it('exports symbols', async () => {
      const result = await executeGspl(`
        let x = 42;
        export { x }
      `);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integrated Usage', () => {
    it('match with seed domain dispatch pattern', async () => {
      const result = await executeGspl(`
        let d = "character";
        let handler = match d { "character" -> "generateCharacter"; "music" -> "generateMusic"; "sprite" -> "generateSprite"; _ -> "generateUnknown" };
        print(handler)
      `);
      expect(result.output).toContain('generateCharacter');
    });

    it('type + match workflow', async () => {
      const result = await executeGspl(`
        type Status = number;
        let code = 200;
        let label = match code { 200 -> "OK"; 404 -> "Not Found"; 500 -> "Error"; _ -> "Unknown" };
        print(label)
      `);
      expect(result.output).toContain('OK');
    });
  });
});
