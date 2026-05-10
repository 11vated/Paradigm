import { GsplLexer, TokenType as KernelTokenType, type Token } from '../kernel/gspl-lexer.js';

export const TokenType = {
  ...KernelTokenType,
  IDENT: KernelTokenType.IDENTIFIER,
  NUMBER: 'NUMBER',
  EQEQ: KernelTokenType.EQ,
  BANGEQ: KernelTokenType.NEQ,
  LTEQ: KernelTokenType.LTE,
  GTEQ: KernelTokenType.GTE,
};

export type { Token };

export function tokenize(source: string): { tokens: Token[]; errors: string[] } {
  const errors: string[] = [];
  try {
    const sanitized = source.replace(/^\s*#.*$/gm, '');
    if (/[^\s\w."'\[\]{}()+\-*/=!:,<>&|]/.test(sanitized)) {
      errors.push('Unexpected character');
    }
    const lexer = new GsplLexer(sanitized);
    const tokens = normalizeOperators(normalizeDottedIdentifiers(lexer.tokenize())).map(token => {
      if (token.type === KernelTokenType.INT || token.type === KernelTokenType.FLOAT) {
        return { ...token, type: TokenType.NUMBER as any };
      }
      if (token.type === KernelTokenType.LBRACKET_SQUARE) {
        return { ...token, type: KernelTokenType.LBRACKET };
      }
      if (token.type === KernelTokenType.RBRACKET_SQUARE) {
        return { ...token, type: KernelTokenType.RBRACKET };
      }
      return token;
    });
    return { tokens, errors };
  } catch (error) {
    return { tokens: [], errors: [error instanceof Error ? error.message : String(error)] };
  }
}

function normalizeOperators(tokens: Token[]): Token[] {
  const normalized: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === KernelTokenType.BIT_AND && tokens[i + 1]?.type === KernelTokenType.BIT_AND) {
      normalized.push({ ...token, type: KernelTokenType.AND });
      i++;
      continue;
    }
    if (token.type === KernelTokenType.BIT_OR && tokens[i + 1]?.type === KernelTokenType.BIT_OR) {
      normalized.push({ ...token, type: KernelTokenType.OR });
      i++;
      continue;
    }
    normalized.push(token);
  }
  return normalized;
}

function normalizeDottedIdentifiers(tokens: Token[]): Token[] {
  const normalized: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i];
    if (first.type === KernelTokenType.IDENTIFIER) {
      let value = first.value;
      let j = i;
      while (
        tokens[j + 1]?.type === KernelTokenType.DOT &&
        tokens[j + 2]?.type === KernelTokenType.IDENTIFIER
      ) {
        value += `.${tokens[j + 2].value}`;
        j += 2;
      }
      if (j !== i) {
        normalized.push({ ...first, value });
        i = j;
        continue;
      }
    }
    normalized.push(first);
  }
  return normalized;
}
