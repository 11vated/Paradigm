/**
 * Seed output routes: export, import, render, preview, formats.
 * Slice 14 of the modular router split.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Server-side lazy loading: dynamic requires for fs, data store, and asset pipelines; ESM-bundled server routes intentionally use require() for runtime hot-reload and Node built-ins. */
import type { Express } from 'express';

function setC2PAHeaders(res: any, seed: any, domain: string | undefined, buildC2PAManifest: any, encodeC2PAManifest: any): void {
  if (!seed) return;
  try {
    const genName = domain ?? seed.$domain ?? 'paradigm';
    const manifest = buildC2PAManifest(seed, genName);
    const encoded = encodeC2PAManifest(manifest);
    const b64 = Buffer.from(encoded).toString('base64');
    res.setHeader('X-C2PA-Manifest', b64);
  } catch {
    // C2PA is best-effort; don't fail the export
  }
}

export interface SeedsOutputDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  ARTIFACTS_BASE: string;
  safeArtifactPath: (userPath: string) => string | null;
  log: (level: string, msg: string, meta?: any) => void;
  renderSeed: (seed: any, format?: 'glb' | 'gltf' | 'obj' | 'stl' | 'png' | 'svg' | 'wav' | 'mid' | 'html' | 'json' | 'yaml') => Promise<any>;
  getSupportedFormats: (domain: string) => string[];
  encodeGseed: (pkg: any) => Uint8Array;
  decodeGseed: (buf: Uint8Array) => any;
  packagePSeed: (seed: any) => any;
  buildC2PAManifest: (seed: any, generatorName: string) => any;
  encodeC2PAManifest: (manifest: any) => Uint8Array;
}

export function registerSeedsExportRoutes(app: Express, deps: SeedsOutputDeps): void {
  const { seeds, optionalAuth, ARTIFACTS_BASE, safeArtifactPath, log: _log, buildC2PAManifest, encodeC2PAManifest } = deps;

  app.get('/api/seeds/export', optionalAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { store } = require('../../lib/data/index.js');
    const s = await store.getAllSeeds();
    const exportData = { version: '2.0.0', exportedAt: new Date().toISOString(), seedCount: s.length, seeds: s };
    if (s.length > 0) setC2PAHeaders(res, s[0], s[0].$domain, buildC2PAManifest, encodeC2PAManifest);
    res.setHeader('Content-Disposition', `attachment; filename="paradigm-seeds-${Date.now()}.json"`);
    res.type('json').send(JSON.stringify(exportData, null, 2));
  });

  app.post('/api/seeds/export/json', optionalAuth, (req: any, res: any) => {
    const { seed } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.json"`);
    res.type('json').send(JSON.stringify(seed, null, 2));
  });

  app.post('/api/seeds/export/svg', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const svgPath = artifact?.svgPath as string | undefined;
    if (svgPath) {
      const safe = safeArtifactPath(svgPath);
      if (safe && require('fs').existsSync(safe)) {
        const svg = require('fs').readFileSync(safe, 'utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.svg"`);
        return res.type('image/svg+xml').send(svg);
      }
    }
    const h = (seed.$hash || 'aabbccdd').slice(0, 6);
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#${h}"/><text x="128" y="135" text-anchor="middle" fill="white" font-size="14" font-family="monospace">${h}</text></svg>`;
    res.setHeader('Content-Disposition', `attachment; filename="seed-${h}.svg"`);
    res.type('image/svg+xml').send(fallback);
  });

  app.post('/api/seeds/export/html', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const htmlPath = artifact?.htmlPath as string | undefined;
    if (htmlPath) {
      const safe = safeArtifactPath(htmlPath);
      if (safe && require('fs').existsSync(safe)) {
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.html"`);
        return res.type('text/html').send(require('fs').readFileSync(safe, 'utf-8'));
      }
    }
    const fallback = `<!DOCTYPE html><html><head><title>Paradigm Seed ${seed.$hash?.slice(0,8)}</title></head><body><pre>${JSON.stringify(seed,null,2)}</pre></body></html>`;
    res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.html"`);
    res.type('text/html').send(fallback);
  });

  app.post('/api/seeds/export/wav', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const wavPath = artifact?.wavPath as string | undefined;
    if (wavPath) {
      const safe = safeArtifactPath(wavPath);
      if (safe && require('fs').existsSync(safe)) {
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.wav"`);
        return res.type('audio/wav').send(require('fs').readFileSync(safe));
      }
    }
    return res.status(404).json({ error: 'WAV artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/markdown', optionalAuth, (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const story = artifact?.story ?? artifact?.narrative ?? JSON.stringify(seed, null, 2);
    res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.md"`);
    res.type('text/markdown').send(story);
  });

  app.post('/api/seeds/export/gltf', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const gltfPath = artifact?.gltfPath ?? artifact?.outputPath as string | undefined;
    if (gltfPath) {
      const safe = safeArtifactPath(gltfPath);
      if (safe && require('fs').existsSync(safe)) {
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.gltf"`);
        return res.type('model/gltf+json').send(require('fs').readFileSync(safe, 'utf-8'));
      }
    }
    return res.status(404).json({ error: 'GLTF artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/pdb', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const pdbPath = artifact?.pdbPath as string | undefined;
    if (pdbPath) {
      const safe = safeArtifactPath(pdbPath);
      if (safe && require('fs').existsSync(safe)) {
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.pdb"`);
        return res.type('chemical/x-pdb').send(require('fs').readFileSync(safe, 'utf-8'));
      }
    }
    return res.status(404).json({ error: 'PDB artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/glsl', optionalAuth, async (req: any, res: any) => {
    const { seed, artifact } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const glslPath = artifact?.glslPath ?? artifact?.fragPath as string | undefined;
    if (glslPath) {
      const safe = safeArtifactPath(glslPath);
      if (safe && require('fs').existsSync(safe)) {
        res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.glsl"`);
        return res.type('text/plain').send(require('fs').readFileSync(safe, 'utf-8'));
      }
    }
    return res.status(404).json({ error: 'GLSL artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/gspl/export', optionalAuth, async (req: any, res: any) => {
    const { seed, domain } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    setC2PAHeaders(res, seed, domain ?? seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const genes = (seed as any).genes ?? seed;
    const geneLines = Object.entries(genes).filter(([k]) => !k.startsWith('$')).map(([k, v]: [string, any]) => { const type = v?.gene_type ?? v?.type ?? 'scalar'; const value = JSON.stringify(v?.value ?? v); return `  gene ${k}: ${type} = ${value}`; }).join('\n');
    const gspl = `// Generated by Paradigm\nimport "std/core";\n\nseed ${(domain ?? seed.$domain ?? 'Unnamed').replace(/[^a-zA-Z0-9]/g,'_')} {\n${geneLines}\n}\n`;
    res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.gspl"`);
    res.type('text/plain').send(gspl);
  });

  app.post('/api/seeds/import', optionalAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { store } = require('../../lib/data/index.js');
    const { seeds: importSeeds, merge } = req.body;
    if (!Array.isArray(importSeeds)) { return res.status(400).json({ error: 'Body must contain a "seeds" array' }); }
    let imported = 0;
    let skipped = 0;
    for (const seed of importSeeds) {
      if (!seed.id || !seed.$domain) { skipped++; continue; }
      const existing = await store.getSeedById(seed.id);
      if (existing && !merge) { skipped++; continue; }
      if (existing) { await store.updateSeed(seed.id, seed); }
      else { await store.addSeed(seed); seeds.push(seed); }
      imported++;
    }
    res.json({ imported, skipped, total: importSeeds.length });
  });

  app.get('/api/seeds/:id/export/glb', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const smoothRaw = String(req.query?.smooth ?? '').toLowerCase();
    const smoothMesh = smoothRaw === '1' || smoothRaw === 'true' || smoothRaw === 'yes';
    try {
      const { ParadigmPipeline } = require('../../lib/pipeline/index.js');
      const { exportToGLB } = require('../../lib/asset_pipeline/gltf_exporter.js');
      const { generateMaterial } = require('../../lib/asset_pipeline/material_generator.js');
      const pipelineResult = await ParadigmPipeline.runEndToEnd(seed, { smoothMesh });
      const meshData = pipelineResult?.emergent_assets?.mesh;
      if (!meshData?.vertices?.length) { return res.status(422).json({ detail: 'Seed did not produce mesh data' }); }
      const material = generateMaterial(seed);
      const glb = exportToGLB(meshData, seed.$name || 'Paradigm Seed', material);
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('X-Paradigm-Mesh-Mode', smoothMesh ? 'smooth-mc' : 'blocky');
      res.setHeader('Content-Disposition', `attachment; filename="${(seed.$name || 'seed').replace(/[^a-zA-Z0-9_-]/g, '_')}.glb"`);
      res.send(Buffer.from(glb));
    } catch (err: any) { res.status(500).json({ detail: err.message || 'GLB export failed' }); }
  });

  app.get('/api/seeds/:id/preview/mesh', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    try {
      const { generatePreviewMesh } = require('../../lib/asset_pipeline/preview_generator.js');
      const artifact = { type: seed.$domain || 'default', id: seed.id, seed_id: seed.id, name: seed.$name || 'Paradigm Seed', visual: seed.visual, mesh: seed.mesh, building: seed.building, particles: seed.particles };
      const mesh = generatePreviewMesh(artifact);
      if (!mesh) return res.status(422).json({ detail: 'Unable to generate preview mesh' });
      res.json({ seedId: seed.id, vertexCount: mesh.vertices.length / 3, triangleCount: mesh.indices.length / 3, mesh });
    } catch (err: any) { res.status(500).json({ detail: err.message || 'Preview mesh failed' }); }
  });
}

export function registerSeedsRenderRoutes(app: Express, deps: SeedsOutputDeps): void {
  const { seeds, renderSeed, getSupportedFormats, encodeGseed, decodeGseed, packagePSeed, log, buildC2PAManifest, encodeC2PAManifest } = deps;

  app.get('/api/v1/render/:hash', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.$hash === req.params.hash || s.id === req.params.hash);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const format = req.query.format || 'json';
    const supportedFormats = getSupportedFormats(seed.$domain);
    if (format !== 'json' && !supportedFormats.includes(format)) { return res.status(400).json({ error: `Format '${format}' not supported for domain '${seed.$domain}'`, supported: supportedFormats }); }
    try {
      setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
      const result = await renderSeed(seed, format as any);
      res.set('Content-Type', result.mimeType);
      res.set('X-Seed-Hash', result.seedHash);
      res.set('X-Generation-Quality', result.quality);
      res.set('X-Cache', result.cached ? 'HIT' : 'MISS');
      res.send(result.data);
    } catch (err: any) { res.status(500).json({ error: 'Render failed', message: err.message }); }
  });

  app.get('/api/v1/formats/:domain', (req: any, res: any) => {
    const formats = getSupportedFormats(req.params.domain);
    res.json({ domain: req.params.domain, formats });
  });

  app.get('/api/seeds/:id/export/pseed', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
    const pkg = packagePSeed(seed);
    res.set('Content-Type', 'application/vnd.paradigm.seed');
    res.set('Content-Disposition', `attachment; filename="${seed.$name || 'seed'}.pseed"`);
    res.send(pkg);
  });

  app.post('/api/seeds/import/pseed', (req: any, res: any) => {
    try {
      const pkg = packagePSeed(Buffer.from(JSON.stringify(req.body)));
      const { parsePSeed } = require('../../lib/rendering/seed-render-service.js');
      const parsed = parsePSeed(pkg);
      if (!parsed.seed) return res.status(400).json({ error: 'Invalid .pseed file: missing seed' });
      seeds.push(parsed.seed);
      log('INFO', 'Seed imported from .pseed', { name: parsed.metadata.name });
      res.json({ success: true, seed: { id: parsed.seed.id, name: parsed.metadata.name, domain: parsed.metadata.domain } });
    } catch (err: any) { res.status(400).json({ error: 'Invalid .pseed file', message: err.message }); }
  });

  app.get('/api/seeds/:id/export.gseed', (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ error: 'Seed not found' });
      setC2PAHeaders(res, seed, seed.$domain, buildC2PAManifest, encodeC2PAManifest);
      const c2paManifest = buildC2PAManifest(seed, seed.$domain || 'unknown');
      const c2paEncoded = encodeC2PAManifest(c2paManifest);
      const output = seed.$lastOutput || { format: 'json' };
      const gseed = encodeGseed({ version: { major: 1, minor: 1 }, timestamp: Date.now(), flags: { hasC2PA: true, hasOutputs: !!output.mesh, encryptedSeed: false, royaltyEnabled: false, compressed: true }, seedHash: seed.$hash || seed.id, metadata: { schema: 'https://paradigm.ai/schema/gseed-metadata/v1', author: seed.$metadata?.author || 'Anonymous', title: seed.$name || 'Untitled Seed', generator: seed.$domain || 'unknown', created: new Date().toISOString(), license: 'CC0', c2pa: Array.from(c2paEncoded) }, outputs: output.mesh ? [{ type: 1, index: 0, data: new TextEncoder().encode(output.mesh) }] : undefined });
      res.set('Content-Type', 'application/x-paradigm-gseed');
      res.set('Content-Disposition', `attachment; filename="${seed.$name || 'seed'}.gseed"`);
      res.send(Buffer.from(gseed));
    } catch (err: any) { res.status(500).json({ error: 'Export failed', message: err.message }); }
  });

  app.post('/api/seeds/import.gseed', (req: any, res: any) => {
    try {
      const raw = req.body;
      if (!raw || !Buffer.isBuffer(raw) && typeof raw !== 'object') { return res.status(400).json({ error: 'Invalid .gseed: expected binary data' }); }
      const buffer = Buffer.isBuffer(raw) ? new Uint8Array(raw) : new Uint8Array(Buffer.from(JSON.stringify(raw)));
      const pkg = decodeGseed(buffer);
      const seed: any = { ...(pkg.params || {}), id: pkg.seedHash, $hash: pkg.seedHash, $name: pkg.metadata?.title || 'Imported Seed', $domain: pkg.metadata?.generator || 'unknown', $metadata: pkg.metadata || {} };
      seeds.push(seed);
      res.json({ success: true, seed: { id: seed.id, name: seed.$name, domain: seed.$domain, hash: seed.$hash } });
    } catch (err: any) { res.status(400).json({ error: 'Invalid .gseed file', message: err.message }); }
  });
}
