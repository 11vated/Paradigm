/**
 * GSPL parse + execute routes — second slice of the modular router split.
 */
import type { Express, Request, Response } from 'express';

export interface GsplDeps {
  validateBody: (schema: any) => any;
  optionalAuth: (req: any, res: any, next: any) => void;
  GsplParseSchema: unknown;
  GsplExecuteSchema: unknown;
  seeds: any[];
  saveSeeds: () => void;
}

export function registerGsplRoutes(app: Express, deps: GsplDeps): void {
  app.post('/api/gspl/parse', deps.validateBody(deps.GsplParseSchema), (req: any, res: any) => {
    const { parse: parseGSPL } = require('../../lib/gspl/parser.js');
    const { tokenize } = require('../../lib/gspl/lexer.js');
    const source = req.body.source;
    const { tokens } = tokenize(source);
    const { ast, errors: parseErrors } = parseGSPL(source);
    const declarations = ast.body.filter(
      (s: any) => s.kind === 'seed_decl' || s.kind === 'let_binding' || s.kind === 'fn_decl',
    ).length;
    res.json({
      ast,
      errors: parseErrors.map((e: any) => `Line ${e.line}:${e.col}: ${e.message}`),
      warnings: [],
      stats: { tokens: tokens.length, declarations },
    });
  });

  app.post(
    '/api/gspl/execute',
    deps.optionalAuth,
    deps.validateBody(deps.GsplExecuteSchema),
    (req: any, res: any) => {
      const { executeGSPL } = require('../../lib/gspl/interpreter.js');
      const source = req.body.source || '';
      const result = executeGSPL(source, deps.seeds);
      if (result.seeds.length > 0) {
        for (const s of result.seeds) deps.seeds.push(s);
        deps.saveSeeds();
      }
      res.json({
        seeds: result.seeds,
        errors: result.errors,
        output: result.output,
        stats: {
          seeds_created: result.seeds.length,
          operations: result.seeds.length + result.output.length,
        },
        types: {},
      });
    },
  );
}
