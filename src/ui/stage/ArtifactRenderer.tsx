import React, { useEffect, useState, useMemo } from 'react';
import { deriveCleanTitle } from '@/lib/kernel/types';

const ARTIFACT_BASE = '/artifacts';

interface Artifact {
  // V2-generator paths (relative on server)
  svgPath?: string;
  htmlPath?: string;
  wavPath?: string;
  midiPath?: string;
  pdbPath?: string;
  gltfPath?: string;
  jsonPath?: string;
  pngPath?: string;
  outputPath?: string;
  // Inline content (if returned)
  svg?: string;
  html?: string;
  json?: any;
  // Metadata
  type?: string;
  domain?: string;
  name?: string;
  seed_hash?: string;
  generation?: number;
  generation_quality?: string;
  render_hints?: { mode?: string; hasFile?: boolean };
  [k: string]: any;
}

interface Props {
  artifact: Artifact | null;
  seed: { id: string; domain: string; name?: string; hash?: string } | null;
}

function toUrl(serverPath: string | undefined): string | null {
  if (!serverPath) return null;
  // Strip leading `data/artifacts/` or `/data/artifacts/` since our static
  // route is mounted at `/artifacts`.
  const cleaned = serverPath
    .replace(/^\/?data\/artifacts\//, '')
    .replace(/^\/?artifacts\//, '');
  return `${ARTIFACT_BASE}/${cleaned}`;
}

export const ArtifactRenderer: React.FC<Props> = ({ artifact, seed }) => {
  const [svgInline, setSvgInline] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Decide which kind of artifact to render
  const kind = useMemo(() => {
    if (!artifact) return 'empty';
    if (artifact.svgPath || artifact.svg)   return 'svg';
    if (artifact.htmlPath || artifact.html) return 'html';
    if (artifact.wavPath || artifact.midiPath || artifact.audioDataURL) return 'audio';
    if (artifact.pdbPath)  return 'pdb';
    if (artifact.gltfPath) return 'gltf';
    if (artifact.pngPath)  return 'png';
    if (artifact.jsonPath || artifact.json) return 'json';
    if (artifact.storyData || artifact.manuscript) return 'story';
    if (artifact.previewData && (artifact.visual?.type === 'code' || artifact.visual?.type === 'glsl' || artifact.visual?.type === 'wgsl')) return 'code';
    if (artifact.structuredData || artifact.visual?.type === 'structured' || artifact.visual?.structuredData) return 'structured';
    if (artifact.outputPath) {
      const ext = artifact.outputPath.split('.').pop()?.toLowerCase();
      if (ext === 'svg')  return 'svg';
      if (ext === 'html') return 'html';
      if (ext === 'wav' || ext === 'mid') return 'audio';
      if (ext === 'pdb')  return 'pdb';
      if (ext === 'gltf' || ext === 'glb') return 'gltf';
      if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'png';
      if (ext === 'json') return 'json';
    }
    return 'metadata';
  }, [artifact]);

  // Fetch SVG inline (for animations, themability, embedded interactivity)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setSvgInline(null);
    setFetchError(null);
    if (kind !== 'svg' || !artifact) return;
    if (artifact.svg) {
      setSvgInline(artifact.svg);
      return;
    }
    const url = toUrl(artifact.svgPath || artifact.outputPath);
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => { if (!cancelled) setSvgInline(text); })
      .catch((e) => { if (!cancelled) setFetchError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [kind, artifact]);

  if (!artifact || kind === 'empty') {
    return (
      <div className="p-artifact-empty">
        <span className="p-artifact-empty-label">no artifact yet</span>
        <div className="p-artifact-loading-hint">Generating rich visual… (Atelier primary workspace for gene tools + strata)</div>
      </div>
    );
  }

  // ─── SVG: inline embed (best fidelity) ────────────────────────────────────
  if (kind === 'svg') {
    if (svgInline) {
      return (
        <div className="p-artifact p-artifact-svg" dangerouslySetInnerHTML={{ __html: svgInline }} />
      );
    }
    if (fetchError) {
      // Fallback to <img> when fetch is blocked or fails
      const url = toUrl(artifact.svgPath || artifact.outputPath);
      return (
        <div className="p-artifact p-artifact-svg">
          {url ? <img src={url} alt={artifact.name ?? seed?.name ?? 'svg'} /> : null}
        </div>
      );
    }
    return <div className="p-artifact-loading">Generating rich visual…</div>;
  }

  // ─── HTML: sandboxed iframe ───────────────────────────────────────────────
  if (kind === 'html') {
    const url = toUrl(artifact.htmlPath || artifact.outputPath);
    if (artifact.html) {
      return (
        <iframe
          className="p-artifact p-artifact-html"
          title={artifact.name ?? 'html'}
          srcDoc={artifact.html}
          sandbox="allow-scripts"
        />
      );
    }
    return url ? (
      <iframe
        className="p-artifact p-artifact-html"
        title={artifact.name ?? 'html'}
        src={url}
        sandbox="allow-scripts allow-same-origin"
      />
    ) : null;
  }

  // ─── AUDIO: native player ─────────────────────────────────────────────────
  if (kind === 'audio') {
    const wav = toUrl(artifact.wavPath) || artifact.audioDataURL;
    const mid = toUrl(artifact.midiPath);
    return (
      <div className="p-artifact p-artifact-audio">
        <div className="p-artifact-audio-glyph">≋</div>
        <div className="p-artifact-audio-name">{deriveCleanTitle(artifact.name ?? seed?.name ?? 'audio', (artifact as any).seed_hash)}</div>
        {wav ? <audio controls src={wav} preload="metadata" /> : null}
        {mid ? (
          <a className="p-artifact-audio-midi" href={mid} download>
            midi ↓
          </a>
        ) : null}
      </div>
    );
  }

  // ─── PNG: simple image ────────────────────────────────────────────────────
  if (kind === 'png') {
    const url = toUrl(artifact.pngPath || artifact.outputPath);
    return url ? (
      <div className="p-artifact p-artifact-png">
        <img src={url} alt={deriveCleanTitle(artifact.name ?? seed?.name ?? 'image', (artifact as any).seed_hash)} />
      </div>
    ) : null;
  }

  // ─── PDB: molecular structure (deferred to 3DMol when available) ───────
  if (kind === 'pdb') {
    const url = toUrl(artifact.pdbPath);
    return (
      <div className="p-artifact p-artifact-pdb">
        <div className="p-artifact-pdb-glyph">⊙</div>
        <div className="p-artifact-pdb-name">{artifact.name ?? 'molecule'}</div>
        <a className="p-artifact-pdb-link" href={url ?? '#'} target="_blank" rel="noreferrer">
          open .pdb ↗
        </a>
        <div className="p-artifact-pdb-hint">3DMol viewer ships with slice-7</div>
      </div>
    );
  }

  // ─── GLTF: 3D scene (deferred to Three.js when available) ─────────────
  if (kind === 'gltf') {
    const url = toUrl(artifact.gltfPath);
    return (
      <div className="p-artifact p-artifact-gltf">
        <div className="p-artifact-gltf-glyph">⬢</div>
        <div className="p-artifact-gltf-name">{artifact.name ?? '3d-object'}</div>
        <a className="p-artifact-gltf-link" href={url ?? '#'} target="_blank" rel="noreferrer">
          open .gltf ↗
        </a>
        <div className="p-artifact-gltf-hint">Three.js viewport ships with slice-7</div>
      </div>
    );
  }

  // ─── STORY / NARRATIVE: nice rendered view (not raw JSON dump) ─────────────
  if (kind === 'story') {
    const story = artifact.storyData || artifact.manuscript || artifact.json;
    const content = typeof story === 'string' ? story : JSON.stringify(story, null, 2);
    return (
      <div className="p-artifact p-artifact-story">
        <div className="p-artifact-story-header">Story / Narrative</div>
        <pre className="p-artifact-story-content">{content.slice(0, 2000)}{content.length > 2000 ? '...' : ''}</pre>
        <div className="p-artifact-story-hint">Full manuscript available in export / .gseed. (Live player in future slice.)</div>
      </div>
    );
  }

  // ─── CODE / SHADER: syntax view (not raw dump) ────────────────────────────
  if (kind === 'code') {
    const code = artifact.previewData || artifact.filePath || '';
    const content = typeof code === 'string' ? code : code.toString();
    return (
      <div className="p-artifact p-artifact-code">
        <div className="p-artifact-code-header">Shader / Code</div>
        <pre className="p-artifact-code-content">{content.slice(0, 1500)}{content.length > 1500 ? '...' : ''}</pre>
        <div className="p-artifact-code-hint">Full code in export / .gseed. (Live preview in future.)</div>
      </div>
    );
  }

  // ─── JSON: syntax-highlighted tree ────────────────────────────────────────
  if (kind === 'json') {
    const content = artifact.json
      ? typeof artifact.json === 'string'
        ? artifact.json
        : JSON.stringify(artifact.json, null, 2)
      : null;
    return (
      <div className="p-artifact p-artifact-json">
        <pre>{content ?? '// fetch deferred'}</pre>
      </div>
    );
  }

  // ─── STRUCTURED (ambitious rich for data domains): summary + metrics pills + collapsible data (lived quality) ─
  if (kind === 'structured') {
    const s = artifact.structuredData || artifact.visual?.structuredData || {};
    const sum = artifact.summary || artifact.visual?.summary || '';
    const m = artifact.metrics || artifact.visual?.metrics || {};
    const gsplSrc = (artifact as any).gsplSource || (artifact as any).canonicalGspl || (artifact as any).gspl;
    return (
      <div className="p-artifact p-artifact-structured">
        {sum && <div className="p-artifact-structured-summary">{sum}</div>}
        {Object.keys(m).length > 0 && (
          <div className="p-artifact-metrics">
            {Object.entries(m).map(([k, v]) => (
              <span key={k} className="p-metric-pill" title={k}>{k}: {typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
            ))}
          </div>
        )}
        {gsplSrc && (
          <details className="p-artifact-gspl-embed" style={{marginTop:4}}>
            <summary style={{fontSize:9, color:'#4ade80', cursor:'pointer'}}>GSPL source (orchestration from supremacy wave — click to load in editor)</summary>
            <pre style={{fontSize:8, maxHeight:80, overflow:'auto'}}>{String(gsplSrc).slice(0,600)}</pre>
            {/* Note: use GeneEditor "Load to GSPLEditor" or GSPLEditor +Strata for seamless edit; full wire via store in chat/panels */}
          </details>
        )}
        <details className="p-artifact-structured-details">
          <summary>Full structured data (for export/inspect)</summary>
          <pre>{JSON.stringify(s, null, 2).slice(0, 2000)}{JSON.stringify(s).length > 2000 ? '...' : ''}</pre>
        </details>
        <div className="p-artifact-structured-hint">Rich structured preview from QC synthesize. Full in .gseed/export. Strata live in HUD. GSPL-driven artifacts show source for hybrid seamlessness.</div>
      </div>
    );
  }

  // ─── METADATA: clean summary (no raw JSON dump in normal flow; debug only via toggle if needed)
  // Per UX doctrine: hide raw dumps from normal users; show beautiful/ loading state. Always surface strata + clean title.
  const metaName = deriveCleanTitle(artifact.name ?? seed?.name ?? 'Artifact', (artifact as any).seed_hash ?? seed?.hash);
  const artStrataPct = typeof (artifact as any)?.strataCompliance === 'number' ? Math.round((artifact as any).strataCompliance * 100) : typeof (artifact as any)?.strata?.overall === 'number' ? Math.round((artifact as any).strata.overall * 100) : null;
  return (
    <div className="p-artifact p-artifact-metadata">
      <div className="p-artifact-metadata-glyph">◇</div>
      <div className="p-artifact-metadata-name">{metaName}</div>
      <div className="p-artifact-metadata-type">
        {artifact.type ?? artifact.domain ?? 'metadata'}
        {typeof artifact.generation === 'number' ? ` · gen ${artifact.generation}` : ''}
        {artStrataPct != null && ` · strata ${artStrataPct}%`}
      </div>
      <div className="p-artifact-metadata-hint">
        Rich visual data not attached for this domain (or still generating). Use Atelier primary for gene tools + live 9-strata. Advanced raw view available in debug only.
      </div>
      {/* No full JSON pre by default - prevents "raw Crucible dumps" in normal UX */}
      {artStrataPct != null && <div className="p-strata-mini" style={{ marginTop: 4 }}>live 9-strata {artStrataPct}% (QC)</div>}
    </div>
  );
};
