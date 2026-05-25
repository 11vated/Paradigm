/**
 * GSPL `engine` keyword — lexer + parser coverage.
 *
 * Added by paradigm-infinite/ws-23. Wires the 9-engine substrate into GSPL
 * v∞. The interpreter dispatch is a follow-up; this PR locks the surface
 * syntax + AST so the substrate has a stable language entry point.
 */
import { describe, it, expect } from 'vitest';
import { GsplLexer, TokenType } from '../../src/lib/kernel/gspl-lexer.js';
import { GsplParser, ASTNodeType } from '../../src/lib/kernel/gspl-parser.js';

describe('GSPL engine keyword', () => {
  it('lexes `engine` as a reserved keyword (TokenType.ENGINE)', () => {
    const tokens = new GsplLexer('engine play { kind: "platformer" }').tokenize();
    expect(tokens[0].type).toBe(TokenType.ENGINE);
    expect(tokens[0].value).toBe('engine');
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('play');
    expect(tokens[2].type).toBe(TokenType.LBRACE);
  });

  it('parses engine block into ENGINE_BLOCK AST node with entries', () => {
    const src = 'engine play { kind: "platformer", difficulty: 0.8 }';
    const tokens = new GsplLexer(src).tokenize();
    const ast = new GsplParser(tokens).parse();
    expect(ast.length).toBe(1);
    const node = ast[0] as any;
    expect(node.type).toBe(ASTNodeType.ENGINE_BLOCK);
    expect(node.engineId).toBe('play');
    expect(node.entries).toHaveLength(2);
    expect(node.entries[0].key).toBe('kind');
    expect(node.entries[1].key).toBe('difficulty');
  });

  it('parses each of the nine engine ids', () => {
    for (const id of ['form', 'motion', 'sound', 'world', 'mind', 'play', 'story', 'matter', 'field']) {
      const src = `engine ${id} { kind: "default" }`;
      const tokens = new GsplLexer(src).tokenize();
      const ast = new GsplParser(tokens).parse();
      const node = ast[0] as any;
      expect(node.type).toBe(ASTNodeType.ENGINE_BLOCK);
      expect(node.engineId).toBe(id);
    }
  });

  it('parses engine block with no entries (empty body)', () => {
    const tokens = new GsplLexer('engine form { }').tokenize();
    const ast = new GsplParser(tokens).parse();
    const node = ast[0] as any;
    expect(node.type).toBe(ASTNodeType.ENGINE_BLOCK);
    expect(node.engineId).toBe('form');
    expect(node.entries).toHaveLength(0);
  });

  it('parses multiple engine blocks in sequence', () => {
    const src = `
      engine matter { kind: "molecule" }
      engine field { kind: "electromagnetic" }
      engine play { kind: "game" }
    `;
    const tokens = new GsplLexer(src).tokenize();
    const ast = new GsplParser(tokens).parse();
    expect(ast.length).toBe(3);
    expect((ast[0] as any).engineId).toBe('matter');
    expect((ast[1] as any).engineId).toBe('field');
    expect((ast[2] as any).engineId).toBe('play');
  });
});
