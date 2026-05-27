/**
 * Stats, meta, and documentation routes.
 * Slice 11 of the modular router split.
 */
import type { Express } from 'express';

export interface StatsMetaDeps {
  seeds: any[];
  store: { getAuditLog: (limit: number) => Promise<any[]> };
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  RegisterGeneTypeSchema: any;
  GENE_TYPES: Record<string, unknown>;
  getAllDomains: () => string[];
  geneTypeRegistry: { getAll: () => { name: string; parent: string | null; category: string; description: string }[] };
  registerGSPLGeneType: (spec: any) => { success: boolean; errors?: string[]; name?: string };
  validateGeneWithDetails: (type: string, value: any, schema?: any) => { valid: boolean; errors: string[]; suggestion?: string };
  OPENAPI_SPEC: any;
  swaggerUIHTML: (url: string) => string;
  GSPL_GENE_TYPE_EXAMPLE: any;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
}

export function registerStatsMetaRoutes(app: Express, deps: StatsMetaDeps): void {
  const { seeds, store, optionalAuth, validateBody, RegisterGeneTypeSchema, GENE_TYPES, getAllDomains, geneTypeRegistry, registerGSPLGeneType, validateGeneWithDetails, OPENAPI_SPEC, swaggerUIHTML, GSPL_GENE_TYPE_EXAMPLE, log, audit } = deps;

  app.get('/api/audit', optionalAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));
    const entries = await store.getAuditLog(limit);
    res.json({ entries, count: entries.length });
  });

  app.get('/api/stats', (_req, res) => {
    const domainCounts: Record<string, number> = {};
    for (const seed of seeds) { domainCounts[seed.$domain] = (domainCounts[seed.$domain] || 0) + 1; }
    res.json({ total_seeds: seeds.length, domains: Object.keys(domainCounts).length, gene_types: Object.keys(GENE_TYPES).length, engines: getAllDomains().length, domain_counts: domainCounts, platform_version: '2.0.0 (Production)' });
  });

  app.get('/api/domains', (_req, res) => {
    const allDomains = getAllDomains();
    res.json({ domains: allDomains, count: allDomains.length });
  });

  app.get('/api/gene-types', (_req, res) => {
    const all = geneTypeRegistry.getAll();
    res.json({ types: all.map(t => ({ name: t.name, parent: t.parent, category: t.category, description: t.description })), count: all.length, can_register: true, example: GSPL_GENE_TYPE_EXAMPLE });
  });

  app.post('/api/gene-types/register', optionalAuth, validateBody(RegisterGeneTypeSchema), (req: any, res: any) => {
    const { name, base_type, description, constraints, validate, mutate, crossover, distance } = req.body;
    const result = registerGSPLGeneType({ name, baseType: base_type, description, constraints, validate, mutate, crossover, distance });
    if (!result.success) { return res.status(400).json({ error: 'Gene type registration failed', errors: result.errors }); }
    log('INFO', `Gene type registered: ${result.name}`, { user: req.user?.username });
    audit('gene_type.register', 'gene_type', result.name, { base_type }, req);
    res.json({ success: true, name: result.name, message: `Gene type "${result.name}" registered` });
  });

  app.post('/api/gene/validate', (req: any, res: any) => {
    const { gene_type, value, schema } = req.body;
    if (!gene_type) { return res.status(400).json({ error: 'Missing gene_type', message: 'The gene_type field is required', suggestion: 'Provide a valid gene type: scalar, categorical, vector, etc.', example: { gene_type: 'scalar', value: 0.5 }, docs: '/api/docs#genes' }); }
    const result = validateGeneWithDetails(gene_type, value, schema);
    if (result.valid) {
      res.json({ valid: true, message: 'Gene value is valid', gene_type, value_type: typeof value, docs: '/api/docs#genes' });
    } else {
      res.status(400).json({ valid: false, error: 'Gene validation failed', message: result.errors.join('. '), details: result.errors, suggestion: result.suggestion, example: getGeneExample(gene_type), docs: '/api/docs#genes' });
    }
  });

  app.get('/api/engines', (_req, res) => {
    const domains = getAllDomains();
    res.json({ engines: domains, count: domains.length });
  });

  app.get('/api-docs', (_req, res) => { res.json(OPENAPI_SPEC); });
  app.get('/api-docs/ui', (_req, res) => { res.type('html').send(swaggerUIHTML('/api-docs')); });
}

function getGeneExample(geneType: string): any {
  const examples: Record<string, any> = {
    scalar: { gene_type: 'scalar', value: 0.75, schema: { min: 0, max: 1 } },
    categorical: { gene_type: 'categorical', value: 'warrior', schema: { choices: ['warrior', 'mage', 'rogue'] } },
    vector: { gene_type: 'vector', value: [0.5, 0.3, 0.9], schema: { dimensions: 3 } },
    expression: { gene_type: 'expression', value: 'sin(x * PI) / 2' },
    struct: { gene_type: 'struct', value: { head: 0.5, torso: 0.8, limbs: 0.6 } },
    array: { gene_type: 'array', value: [1, 2, 3, 4, 5] },
    graph: { gene_type: 'graph', value: { nodes: [{ id: 1 }, { id: 2 }], edges: [{ from: 1, to: 2 }] } },
    topology: { gene_type: 'topology', value: { vertices: [[0, 0, 0], [1, 0, 0]], faces: [[0, 1, 2]] } },
    temporal: { gene_type: 'temporal', value: { keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] } },
    regulatory: { gene_type: 'regulatory', value: { activation_threshold: 0.5, inhibition_strength: 0.3 } },
    field: { gene_type: 'field', value: { resolution: 32, values: new Array(32).fill(0.5) } },
    symbolic: { gene_type: 'symbolic', value: { grammar: 'S -> NP VP', symbols: ['S', 'NP', 'VP'] } },
    quantum: { gene_type: 'quantum', value: { superposition: [0.7, 0.3], basis: ['A', 'B'] } },
    gematria: { gene_type: 'gematria', value: { word: 'PARADIGM', value: 123 } },
    resonance: { gene_type: 'resonance', value: { frequencies: [440, 880, 1760], amplitudes: [1, 0.5, 0.25] } },
    dimensional: { gene_type: 'dimensional', value: [0.1, 0.2, 0.3, 0.4, 0.5] },
    sovereignty: { gene_type: 'sovereignty', value: { author_pubkey: '0x...', timestamp: 0 } },
  };
  return examples[geneType] || { gene_type: 'scalar', value: 0.5 };
}
