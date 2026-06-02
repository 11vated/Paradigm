import React, { useEffect, useState, useMemo } from 'react';

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
    if (artifact.wavPath || artifact.midiPath) return 'audio';
    if (artifact.pdbPath)  return 'pdb';
    if (artifact.gltfPath) return 'gltf';
    if (artifact.pngPath)  return 'png';
    if (artifact.jsonPath || artifact.json) return 'json';
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
    return <div className="p-artifact-loading">loading svg…</div>;
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
    const wav = toUrl(artifact.wavPath);
    const mid = toUrl(artifact.midiPath);
    return (
      <div className="p-artifact p-artifact-audio">
        <div className="p-artifact-audio-glyph">≋</div>
        <div className="p-artifact-audio-name">{artifact.name ?? seed?.name ?? 'audio'}</div>
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
        <img src={url} alt={artifact.name ?? seed?.name ?? 'image'} />
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

  // ─── METADATA: minimal info card for engines that return only metadata ──
  return (
    <div className="p-artifact p-artifact-metadata">
      <div className="p-artifact-metadata-glyph">◇</div>
      <div className="p-artifact-metadata-name">{artifact.name ?? seed?.name ?? 'artifact'}</div>
      <div className="p-artifact-metadata-type">
        {artifact.type ?? artifact.domain ?? 'metadata'}
        {typeof artifact.generation === 'number' ? ` · gen ${artifact.generation}` : ''}
      </div>
      <pre className="p-artifact-metadata-json">
        {JSON.stringify(
          Object.fromEntries(
            Object.entries(artifact).filter(([k]) => !k.startsWith('_') && k !== 'render_hints'),
          ),
          null,
          2,
        )}
      </pre>
    </div>
  );
};
