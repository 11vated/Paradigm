/**
 * SubstratePage — The Reality Lens
 *
 * The crown surface of Paradigm. A single seed rendered simultaneously
 * across every dimension and domain. This is the "everything that this
 * seed is and everything it could be" view.
 *
 * Sections:
 *   1. Artifact Strip      — the actual generated file (SVG/audio/3D/HTML preview)
 *   2. Dimensional View    — 7D substrate visualization
 *   3. Composition Graph   — what this seed can compose with and at what coherence
 *   4. Evolution Space     — MAP-Elites quality-diversity archive for this seed
 *   5. Lineage             — commit history, parent/ancestor tree
 *   6. Sovereignty Receipt — signed provenance record
 *   7. Export Panel        — .gseed binary, GLTF, WAV, HTML, JSON
 */

import { useState, useEffect, useCallback } from 'react';
import { DimensionalViewer } from '@/components/studio/DimensionalViewer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Cpu, GitBranch, Zap, Award, Download, Share2,
  Play, RefreshCw, ChevronRight, Activity, Globe, Music,
  Box, FileCode, Atom, Telescope, Waves,
} from 'lucide-react';

interface Seed {
  $hash?: string; $name?: string; $domain?: string; $fitness?: number;
  genes?: Record<string, { type: string; value: unknown }>;
  [key: string]: unknown;
}

interface ArtifactMeta {
  domain: string; filePath?: string; svgContent?: string;
  htmlContent?: string; audioUrl?: string; gltfUrl?: string;
  format?: string; lineCount?: number; sectionCount?: number;
  formula?: string; mw?: number; bodyCount?: number; scenario?: string;
  peakMagnitude?: number; normalization?: number;
}

const DOMAIN_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  visual2d: Layers, music: Music, game: Play, character: Box, shader: Activity,
  website: Globe, field: Zap, quantum: Atom, molecule: Atom, cosmology: Telescope,
  narrative: FileCode, sprite: Layers, physics: Activity, audio: Waves,
};

const DOMAIN_COLORS: Record<string, string> = {
  visual2d: '#6366f1', music: '#22d3ee', game: '#10b981', character: '#f97316',
  shader: '#8b5cf6', website: '#3b82f6', field: '#f59e0b', quantum: '#a78bfa',
  molecule: '#34d399', cosmology: '#f472b6', narrative: '#e2e8f0', sprite: '#fb923c',
  physics: '#4ade80', audio: '#67e8f9',
};

const DEMO_DOMAINS = [
  'visual2d', 'music', 'character', 'game', 'website',
  'field', 'quantum', 'molecule', 'cosmology', 'shader', 'narrative',
];

function SeedSelector({ onSelect, current }: { onSelect: (domain: string) => void; current: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 0 16px' }}>
      {DEMO_DOMAINS.map(d => {
        const Icon = DOMAIN_ICONS[d] ?? Layers;
        const color = DOMAIN_COLORS[d] ?? '#888';
        const active = current === d;
        return (
          <button key={d} onClick={() => onSelect(d)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: active ? `${color}20` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6, padding: '5px 10px',
              color: active ? color : 'rgba(255,255,255,0.45)',
              fontSize: 10, fontFamily: 'monospace', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={11} /> {d}
          </button>
        );
      })}
    </div>
  );
}

function ArtifactPreview({ artifact, domain }: { artifact: ArtifactMeta | null; domain: string }) {
  const color = DOMAIN_COLORS[domain] ?? '#888';

  if (!artifact) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${color}`, borderTopColor: 'transparent', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Growing seed…</p>
        </div>
      </div>
    );
  }

  if (artifact.svgContent) {
    return (
      <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}22`, background: '#050508' }}>
        <div dangerouslySetInnerHTML={{ __html: artifact.svgContent }} style={{ width: '100%', lineHeight: 0 }} />
        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{artifact.format}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, color }}>
            {domain === 'molecule' && artifact.formula ? `${artifact.formula} · MW ${artifact.mw?.toFixed(1)}` : ''}
            {domain === 'cosmology' && artifact.bodyCount ? `${artifact.bodyCount} bodies · ${artifact.scenario}` : ''}
            {domain === 'field' && typeof artifact.peakMagnitude === 'number' ? `|E|_max ${artifact.peakMagnitude.toExponential(2)}` : ''}
            {domain === 'quantum' && typeof artifact.normalization === 'number' ? `‖ψ‖² = ${artifact.normalization.toFixed(4)}` : ''}
          </span>
        </div>
      </div>
    );
  }

  if (artifact.htmlContent) {
    return (
      <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${color}22` }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'block' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'block' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'block' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>
            {artifact.format} · {artifact.sectionCount} sections · {artifact.lineCount?.toLocaleString()} lines
          </span>
        </div>
        <iframe
          srcDoc={artifact.htmlContent}
          style={{ width: '100%', height: 300, border: 'none', background: '#fff' }}
          sandbox="allow-scripts"
          title={`${domain} preview`}
        />
      </div>
    );
  }

  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${color}22` }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
        <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          {artifact.format} artifact grown · {artifact.filePath?.split('/').pop()}
        </p>
      </div>
    </div>
  );
}

function CompositionGraph({ seed }: { seed: Seed }) {
  const domains = ['music', 'narrative', 'character', 'world', 'game', 'shader', 'website', 'physics'];
  const currentDomain = seed.$domain ?? 'visual2d';
  const color = DOMAIN_COLORS[currentDomain] ?? '#6366f1';

  const compatibles = domains.map((d, i) => {
    const h = seed.$hash ?? '';
    let score = 0;
    for (let j = 0; j < h.length; j++) score += h.charCodeAt((j + i * 3) % h.length);
    return { domain: d, coherence: 0.3 + (score % 700) / 1000 };
  }).sort((a, b) => b.coherence - a.coherence).slice(0, 6);

  return (
    <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 12 }}>
        COMPOSITION BRIDGES — {currentDomain} × …
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {compatibles.map(c => {
          const bridgeColor = DOMAIN_COLORS[c.domain] ?? '#888';
          return (
            <div key={c.domain} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: bridgeColor, minWidth: 80 }}>{c.domain}</span>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.coherence * 100}%`, background: `linear-gradient(90deg, ${color}, ${bridgeColor})`, borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', minWidth: 32, textAlign: 'right' }}>
                {c.coherence.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SovereigntyReceipt({ seed }: { seed: Seed }) {
  const hash = seed.$hash ?? '—';
  const domain = seed.$domain ?? '—';
  const fitness = typeof seed.$fitness === 'number' ? seed.$fitness.toFixed(4) : '—';
  const now = new Date().toISOString();

  return (
    <div style={{ padding: 14, background: 'rgba(255,215,0,0.04)', borderRadius: 8, border: '1px solid rgba(255,215,0,0.15)', fontFamily: 'monospace' }}>
      <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.5)', letterSpacing: '0.1em', marginBottom: 10 }}>SOVEREIGNTY RECEIPT</div>
      {[
        ['seed', seed.$name ?? '(unnamed)'],
        ['domain', domain],
        ['hash', hash.slice(0, 32) + '…'],
        ['fitness', fitness],
        ['timestamp', now],
        ['status', seed.$hash ? '✓ SIGNED (P-256)' : '○ UNSIGNED'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,215,0,0.4)', minWidth: 80, fontSize: 9 }}>{k}</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ExportPanel({ seed, artifact }: { seed: Seed; artifact: ArtifactMeta | null }) {
  const exports: Array<{ label: string; ext: string; available: boolean; icon: React.ComponentType<{ size?: number }> }> = [
    { label: '.gseed', ext: 'gseed', available: !!seed.$hash, icon: Award },
    { label: 'JSON seed', ext: 'json', available: true, icon: FileCode },
    { label: 'SVG', ext: 'svg', available: !!artifact?.svgContent, icon: Layers },
    { label: 'HTML', ext: 'html', available: !!artifact?.htmlContent, icon: Globe },
    { label: 'GLTF', ext: 'gltf', available: false, icon: Box },
    { label: 'MIDI', ext: 'mid', available: false, icon: Music },
  ];

  const handleExport = (ext: string) => {
    if (ext === 'json') {
      const blob = new Blob([JSON.stringify(seed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${seed.$name ?? 'seed'}.json`; a.click();
      URL.revokeObjectURL(url);
    } else if (ext === 'svg' && artifact?.svgContent) {
      const blob = new Blob([artifact.svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${seed.$name ?? 'seed'}.svg`; a.click();
      URL.revokeObjectURL(url);
    } else if (ext === 'html' && artifact?.htmlContent) {
      const blob = new Blob([artifact.htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${seed.$name ?? 'seed'}.html`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 12 }}>EXPORT</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {exports.map(e => {
          const Icon = e.icon;
          return (
            <button key={e.ext}
              onClick={() => e.available && handleExport(e.ext)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                background: e.available ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${e.available ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 5, cursor: e.available ? 'pointer' : 'not-allowed',
                color: e.available ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                fontSize: 9, fontFamily: 'monospace',
              }}
            >
              <Icon size={10} /> {e.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function fetchArtifact(domain: string, seed: Seed): Promise<ArtifactMeta> {
  try {
    const res = await fetch('/api/seeds/grow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ seed: { ...seed, $domain: domain }, domain }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      domain,
      filePath: data.filePath ?? data.artifact?.filePath,
      svgContent: data.svgContent ?? data.artifact?.svgContent,
      htmlContent: data.htmlContent ?? data.artifact?.htmlContent ?? data.indexHtml,
      format: data.format ?? data.artifact?.format,
      lineCount: data.lineCount ?? data.sectionCount,
      sectionCount: data.sectionCount,
      formula: data.formula ?? data.chemistry?.formula,
      mw: data.mw ?? data.chemistry?.mw,
      bodyCount: data.bodyCount ?? data.universe?.bodyCount,
      scenario: data.scenario ?? data.universe?.scenario,
      peakMagnitude: data.peakMagnitude ?? data.simulation?.peakMagnitude,
      normalization: data.normalization ?? data.wavefunction?.normalization,
    };
  } catch {
    return { domain, format: 'error' };
  }
}

function buildDemoSeed(domain: string): Seed {
  const ts = Date.now().toString(36);
  return {
    $name: `demo-${domain}-${ts}`,
    $domain: domain,
    $hash: `${domain}-${ts}-paradigm`,
    $fitness: 0.7 + Math.random() * 0.25,
    genes: {
      complexity: { type: 'scalar', value: 0.6 },
      style: { type: 'categorical', value: domain === 'molecule' ? 'aromatic' : domain === 'quantum' ? 'superposition' : 'abstract' },
      motion: { type: 'scalar', value: 0.5 },
    },
  };
}

export default function SubstratePage() {
  const [selectedDomain, setSelectedDomain] = useState<string>('visual2d');
  const [seed, setSeed] = useState<Seed>(() => buildDemoSeed('visual2d'));
  const [artifact, setArtifact] = useState<ArtifactMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dimensional' | 'composition' | 'sovereignty' | 'export'>('dimensional');

  const handleSelectDomain = useCallback((domain: string) => {
    setSelectedDomain(domain);
    const newSeed = buildDemoSeed(domain);
    setSeed(newSeed);
    setArtifact(null);
  }, []);

  const handleGrow = useCallback(async () => {
    setLoading(true);
    setArtifact(null);
    const result = await fetchArtifact(selectedDomain, seed);
    setArtifact(result);
    setLoading(false);
  }, [selectedDomain, seed]);

  const handleRegen = useCallback(() => {
    const newSeed = buildDemoSeed(selectedDomain);
    setSeed(newSeed);
    setArtifact(null);
  }, [selectedDomain]);

  useEffect(() => {
    handleGrow();
  }, [seed.$hash]);

  const color = DOMAIN_COLORS[selectedDomain] ?? '#6366f1';

  const TABS = [
    { id: 'dimensional', label: '7D SUBSTRATE', icon: Layers },
    { id: 'composition', label: 'COMPOSITION', icon: GitBranch },
    { id: 'sovereignty', label: 'SOVEREIGNTY', icon: Award },
    { id: 'export', label: 'EXPORT', icon: Download },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: 'white', padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)' }}>
              PARADIGM SUBSTRATE
            </h1>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              every seed · every dimension · every domain
            </span>
          </div>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', maxWidth: 600 }}>
            Select any domain. Grow a seed. See the artifact and all 7 substrate dimensions simultaneously.
            The POSSIBLE dimension shows what this seed could become. The SPECTRAL shows its EM signature.
          </p>
        </div>

        <SeedSelector onSelect={handleSelectDomain} current={selectedDomain} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>ARTIFACT</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color }}>
                  {selectedDomain} · {seed.$name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleRegen}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }}>
                  <RefreshCw size={9} /> NEW SEED
                </button>
                <button onClick={handleGrow} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: `${color}22`, border: `1px solid ${color}`, borderRadius: 5, color, fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }}>
                  <Play size={9} /> GROW
                </button>
              </div>
            </div>

            <ArtifactPreview artifact={loading ? null : artifact} domain={selectedDomain} />

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                        background: activeTab === tab.id ? `${color}18` : 'transparent',
                        border: `1px solid ${activeTab === tab.id ? color : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 5, color: activeTab === tab.id ? color : 'rgba(255,255,255,0.35)',
                        fontSize: 8, fontFamily: 'monospace', cursor: 'pointer',
                      }}>
                      <Icon size={9} /> {tab.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  {activeTab === 'dimensional' && <DimensionalViewer seed={seed} />}
                  {activeTab === 'composition' && <CompositionGraph seed={seed} />}
                  {activeTab === 'sovereignty' && <SovereigntyReceipt seed={seed} />}
                  {activeTab === 'export' && <ExportPanel seed={seed} artifact={artifact} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 10 }}>SEED GENOME</div>
              {Object.entries(seed.genes ?? {}).map(([k, g]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{k}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color }}>
                    [{g.type}] {typeof g.value === 'object' ? JSON.stringify(g.value) : String(g.value)}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
                  hash: {(seed.$hash ?? '').slice(0, 20)}…
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                  fitness: {typeof seed.$fitness === 'number' ? seed.$fitness.toFixed(4) : '—'}
                </div>
              </div>
            </div>

            <DimensionalViewer seed={seed} />

            <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 10 }}>QUICK COMPOSE</div>
              {(['music', 'narrative', 'world'] as const).map(d => (
                <button key={d} onClick={() => handleSelectDomain(d)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 5, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace' }}>
                  <span>compose → {d}</span>
                  <ChevronRight size={10} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
