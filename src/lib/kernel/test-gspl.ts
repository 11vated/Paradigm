/**
 * Quick GSPL Syntax Test
 * Run: npx tsx src/lib/kernel/test-gspl.ts
 */

import { GsplLexer, TokenType } from './gspl-lexer';
import { GsplParser } from './gspl-parser';

function testGspl() {
  console.log('=== GSPL Syntax Test ===\n');

  // Test 1: Simple seed declaration
  const source1 = `seed mySeed "test" in character {
  size: 1.75
}`;
  console.log('Test 1: Lexer tokenization');
  const lexer1 = new GsplLexer(source1);
  const tokens1 = lexer1.tokenize();
  console.log(`  Tokens: ${tokens1.length}`);
  tokens1.forEach(t => {
    console.log(`    ${t.type}: "${t.value}" (line ${t.line}, col ${t.column})`);
  });

  // Check if IN token is present
  const inToken = tokens1.find(t => t.type === TokenType.IN);
  console.log(`  IN token found: ${!!inToken}`);

  // Test 2: Parse the seed declaration.
  console.log('\nTest 2: Parser');
  try {
    const parser1 = new GsplParser(tokens1);
    const ast = parser1.parse();
    console.log(`  AST nodes: ${ast.length}`);
    if (ast.length > 0) {
      console.log(`  First node type: ${ast[0].type}`);
      console.log(`  Seed name: ${ast[0].seedName}`);
      console.log(`  Domain: ${ast[0].domain}`);
    }
    console.log('  ✓ Parse succeeded');
  } catch (e) {
    console.log(`  ✗ Parse failed: ${e instanceof Error ? e.message : e}`);
  }

  // Test 3: GSPL with expressions (single seed)
  console.log('\nTest 3: GSPL with Expressions');
  const source3 = `seed calc "Calculator" in math {
  result: 2 + 3 * 4,
  flag: true
}`;
  const lexer3 = new GsplLexer(source3);
  const tokens3 = lexer3.tokenize();
  console.log(`  Tokens: ${tokens3.length}`);
  try {
    const parser3 = new GsplParser(tokens3);
    const ast3 = parser3.parse();
    console.log(`  AST nodes: ${ast3.length}`);
    console.log('  ✓ Expression parse succeeded');
  } catch (e) {
    console.log(`  ✗ Expression parse failed: ${e instanceof Error ? e.message : e}`);
  }

  // Test 4: Multiple seed declarations (separated by semicolons)
  console.log('\nTest 4: Multiple Seeds');
  const source4 = `seed hero "Hero Character" in character {
  size: 1.85,
  strength: 0.9
};

seed music_gen "My Song" in music {
  tempo: 120
}`;
  const lexer4 = new GsplLexer(source4);
  const tokens4 = lexer4.tokenize();
  console.log(`  Tokens: ${tokens4.length}`);
  try {
    const parser4 = new GsplParser(tokens4);
    const ast4 = parser4.parse();
    console.log(`  AST nodes: ${ast4.length}`);
    console.log('  ✓ Multiple seeds parsed');
  } catch (e) {
    console.log(`  ✗ Multiple seeds failed: ${e instanceof Error ? e.message : e}`);
  }
}

testGspl();
