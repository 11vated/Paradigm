/**
 * GSPL parse + execute routes — second slice of the modular router split.
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { GsplLexer } from '../../lib/kernel/gspl-lexer.js';
import { GsplParser } from '../../lib/kernel/gspl-parser.js';
import { GsplInterpreter } from '../../lib/kernel/gspl-interpreter.js';

export interface GsplDeps {
  validateBody: (schema: any) => any;
  optionalAuth: (req: any, res: any, next: any) => void;
  GsplParseSchema: unknown;
  GsplExecuteSchema: unknown;
  seeds: any[];
  saveSeeds: () => void;
}

/**
 * Adapter: map modern kernel AST to legacy response shape for UI compatibility during unification.
 * Progress: Main runtime unified to kernel (gspl-2.2). Legacy src/lib/gspl/ is now deprecated.
 * Next: Migrate GSPLEditor/REPL/SeedChat to native kernel AST shapes for full removal.
 */
function adaptLegacyAst(ast: any) {
  // Kernel uses ASTNode[] with ASTNodeType; legacy expected {body: [...] with kind}.
  // For minimal breakage, wrap and expose common fields.
  return {
    kind: 'program',
    body: Array.isArray(ast) ? ast.map((n: any) => ({ kind: n.type || 'expr', ...n })) : [],
  };
}

export function registerGsplRoutes(app: Express, deps: GsplDeps): void {
  app.post('/api/gspl/parse', deps.validateBody(deps.GsplParseSchema), (req: any, res: any) => {
    const source = req.body.source || req.body.code || req.body.program || '';
    const lexer = new GsplLexer(source);
    const tokens = lexer.tokenize();
    const parser = new GsplParser(tokens);
    const astNodes = parser.parse();
    const errors: any[] = []; // Parser throws on error in current impl; surface basic for now
    const declarations = (Array.isArray(astNodes) ? astNodes : []).filter(
      (n: any) => n.type === 'SEED_DECL' || n.type === 'LET_DECL' || n.type === 'FN_DECL',
    ).length;

    // === GSPL Canon Ownership: auto-resolve authoritative .gspl schemas for declared domains ===
    // This makes the "schema governs generation" contract visible and enforceable at authoring time.
    const schemas: Record<string, { content: string; path: string }> = {};
    try {
      const nodes = Array.isArray(astNodes) ? astNodes : [];
      const domains = new Set<string>();
      for (const n of nodes) {
        const node = n as any /* justified: AST from tolerant GSPL parser; shape varies (SEED_DECL has domain/in/name); full branded AST is later phase */;
        if (node.type === 'SEED_DECL') {
          const dom = node.domain || node.in || (node.name && typeof node.name === 'object' ? node.name.domain : null);
          if (dom && typeof dom === 'string') domains.add(dom.toLowerCase());
        }
      }
      // Also lightweight regex fallback for bare "seed X in Y" text (works even if AST shape varies)
      const regexDomains = [...source.matchAll(/seed\s+["']?[^"']+["']?\s+in\s+([a-zA-Z0-9_-]+)/gi)].map(m => m[1].toLowerCase());
      regexDomains.forEach(d => domains.add(d));

      const commonsRoot = path.join(process.cwd(), 'data', 'commons', 'libraries');
      for (const domain of domains) {
        const schemaPath = path.join(commonsRoot, `${domain}.gspl`);
        if (fs.existsSync(schemaPath)) {
          const content = fs.readFileSync(schemaPath, 'utf8');
          schemas[domain] = { content, path: `data/commons/libraries/${domain}.gspl` };
        }
      }
    } catch (e) {
      // Non-fatal — schema discovery is best-effort enhancement
    }

    res.json({
      ast: adaptLegacyAst(astNodes),
      errors: errors.map((e: any) => `Line ${e.line || 0}:${e.col || 0}: ${e.message || e}`),
      warnings: [],
      stats: { tokens: tokens.length, declarations },
      schemas,                    // ← NEW: real authoritative schemas now travel with every parse
      schemaCount: Object.keys(schemas).length,
    });
  });

  app.post(
    '/api/gspl/execute',
    deps.optionalAuth,
    deps.validateBody(deps.GsplExecuteSchema),
    async (req: any, res: any) => {
      const source = req.body.source || '';
      // Use kernel interpreter (wired to real breed/mutate/evolve/grow + UniversalSeed/GA/MAPElites)
      const interp = new GsplInterpreter();
      const result: any = await interp.execute(source); // any: execute returns dynamic {seeds, errors, output} from GSPL interp (carveout consistent with interpreter)
      const seedsOut = result?.seeds ? Array.from(result.seeds.values ? result.seeds.values() : []) : [];
      if (seedsOut.length > 0) {
        for (const s of seedsOut) deps.seeds.push(s);
        deps.saveSeeds();
      }
      // Carry schemas through execute as well (so RUN result still shows the governing contracts)
      const schemas: Record<string, any> = {};
      try {
        const src = source || '';
        const domains = new Set<string>([...src.matchAll(/seed\s+["']?[^"']+["']?\s+in\s+([a-zA-Z0-9_-]+)/gi)].map(m => m[1].toLowerCase()));
        const commonsRoot = path.join(process.cwd(), 'data', 'commons', 'libraries');
        for (const d of domains) {
          const p = path.join(commonsRoot, `${d}.gspl`);
          if (fs.existsSync(p)) schemas[d] = { content: fs.readFileSync(p, 'utf8'), path: `data/commons/libraries/${d}.gspl` };
        }
      } catch { /* swallow: best-effort gspl route cleanup */ }

      res.json({
        seeds: seedsOut,
        errors: result?.errors || [],
        output: result?.output || [],
        stats: {
          seeds_created: seedsOut.length,
          operations: seedsOut.length + (result?.output?.length || 0),
        },
        types: {},
        schemas,
        schemaCount: Object.keys(schemas).length,
      });
    },
  );
}
