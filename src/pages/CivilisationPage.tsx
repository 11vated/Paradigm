/**
 * Civilisation Command Center — Doctrine 16 GSPL Civilisation Playbook.
 *
 * Compose a civilisation by name + key + mode + tempo. Hits the live
 * /api/civilisation/compose endpoint and renders every stratum
 * artifact inline (audio plays in browser, form image draws to canvas,
 * story/culture/economy/ritual shown as prose + JSON).
 */
import React, { useEffect, useRef, useState } from 'react';

interface StratumArtifact {
  stratumId: string;
  contentHash: string;
  mime: string;
  size: number;
  rendererId: string;
  bytesRef: string;
  bytesB64?: string;
  predicateReport: Record<string, string>;
  metadata: Record<string, unknown>;
}

interface CivilisationBundle {
  id: string;
  hash: string;
  intent: any;
  intentHash: string;
  strata: Record<string, StratumArtifact | undefined>;
  conformance: {
    strataCovered: number;
    predicatesPassed: number;
    predicatesFailed: number;
    predicatesUnimplemented: number;
    perStratum: Array<{ stratumId: string; passed: number; failed: number; unimplemented: number }>;
  };
  lineage: { parents: string[]; depth: number };
  manifest: string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function FormCanvas({ artifact }: { artifact: StratumArtifact }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !artifact.bytesB64) return;
    const width = (artifact.metadata.width as number) || 384;
    const height = (artifact.metadata.height as number) || 256;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const bytes = b64ToBytes(artifact.bytesB64);
    const img = new ImageData(new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength), width, height);
    ctx.putImageData(img, 0, 0);
  }, [artifact]);
  return <canvas ref={ref} style={{ width: '100%', maxWidth: 640, borderRadius: 12, display: 'block', imageRendering: 'pixelated' }} />;
}

function AudioPlayer({ artifact }: { artifact: StratumArtifact }) {
  return (
    <audio controls preload="none" style={{ width: '100%' }}>
      <source src={artifact.bytesRef} type="audio/wav" />
    </audio>
  );
}


function WorldCanvas({ artifact }: { artifact: StratumArtifact }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!artifact.bytesB64 || !ref.current) return;
    const bytes = b64ToBytes(artifact.bytesB64);
    const meta = artifact.metadata as { width?: number; height?: number };
    const w = meta.width ?? 256;
    const h = meta.height ?? 256;
    if (bytes.length < w * h * 5) return;
    const c = ref.current;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    // Whittaker palette: ocean, beach, desert, grassland, forest, jungle, tundra, snow
    const PAL: Array<[number,number,number]> = [
      [20, 60, 120], [240, 220, 170], [220, 200, 120], [110, 170, 80],
      [40, 110, 50], [25, 80, 40], [180, 190, 200], [240, 240, 250],
    ];
    for (let i = 0; i < w * h; i++) {
      const biome = bytes[i*5 + 2];
      const elev = (bytes[i*5] | (bytes[i*5+1] << 8)) / 65535;
      const water = (bytes[i*5+3] | (bytes[i*5+4] << 8)) / 65535;
      const base = PAL[biome] ?? PAL[3];
      const shade = 0.6 + elev * 0.5;
      img.data[i*4]   = Math.min(255, base[0] * shade);
      img.data[i*4+1] = Math.min(255, base[1] * shade);
      img.data[i*4+2] = Math.min(255, base[2] * shade);
      // overlay water as blue
      if (water > 0.05) {
        img.data[i*4]   = Math.round(img.data[i*4] * 0.4 + 10);
        img.data[i*4+1] = Math.round(img.data[i*4+1] * 0.4 + 30);
        img.data[i*4+2] = Math.round(img.data[i*4+2] * 0.4 + 120);
      }
      img.data[i*4+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [artifact.bytesB64]);
  return <canvas ref={ref} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: 6 }} />;
}

function MotionSummary({ artifact }: { artifact: StratumArtifact }) {
  const meta = artifact.metadata as { fps?: number; duration?: number; keyframes?: number; boneLengthsPass?: boolean };
  return (
    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
      <div>🦴 <b>{meta.keyframes ?? 0}</b> keyframes @ <b>{meta.fps ?? 0}fps</b> · <b>{(meta.duration ?? 0).toFixed(1)}s</b></div>
      <div>{meta.boneLengthsPass ? '✓ bone-length constraints satisfied' : '✗ constraint violations'}</div>
      <div style={{ opacity: 0.55, fontSize: 11, marginTop: 4 }}>HUMANOID_SKELETON · 17 joints · procedural walk cycle</div>
    </div>
  );
}

function MindSummary({ artifact }: { artifact: StratumArtifact }) {
  const meta = artifact.metadata as { archetype?: string; goals?: number; actions?: number; samplePlanOk?: boolean };
  const text = artifact.bytesB64 ? new TextDecoder().decode(b64ToBytes(artifact.bytesB64)) : '';
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  const p = parsed.personality ?? {};
  const plan = parsed.samplePlan?.steps ?? [];
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{meta.archetype}</div>
      <div style={{ marginBottom: 6, opacity: 0.7 }}>{meta.goals} goals · {meta.actions} actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, marginBottom: 8 }}>
        {(['logic','intuition','aggression','empathy','curiosity'] as const).map(k => (
          <div key={k}>{k}: <b style={{ color: '#a0d0ff' }}>{(p[k] ?? 0).toFixed(2)}</b></div>
        ))}
      </div>
      {plan.length > 0 && <div style={{ fontSize: 11, opacity: 0.65 }}>plan: {plan.join(' → ')}</div>}
    </div>
  );
}

function TimeSummary({ artifact }: { artifact: StratumArtifact }) {
  const meta = artifact.metadata as { daysPerYear?: number; festivals?: number; events?: number };
  const text = artifact.bytesB64 ? new TextDecoder().decode(b64ToBytes(artifact.bytesB64)) : '';
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  const cal = parsed.calendar ?? {};
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      <div>📅 <b>{cal.daysPerWeek}</b>-day weeks × <b>{cal.weeksPerMonth}</b> weeks/mo × <b>{cal.monthsPerYear}</b> mo = <b>{meta.daysPerYear} days/year</b></div>
      <div>{cal.hoursPerDay}h days · {meta.festivals} festivals · {meta.events} scheduled events</div>
      {Array.isArray(cal.monthNames) && (
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          months: {cal.monthNames.slice(0, 6).join(', ')}{cal.monthNames.length > 6 ? '…' : ''}
        </div>
      )}
      {Array.isArray(cal.festivals) && cal.festivals.slice(0, 2).map((f: any, i: number) => (
        <div key={i} style={{ fontSize: 11, opacity: 0.7 }}>· {f.name} (day {f.dayOfYear}, {f.durationDays}d, {f.significance})</div>
      ))}
    </div>
  );
}

function FieldSummary({ artifact }: { artifact: StratumArtifact }) {
  const meta = artifact.metadata as { rules?: number; globalLaws?: number; warnings?: number };
  const text = artifact.bytesB64 ? new TextDecoder().decode(b64ToBytes(artifact.bytesB64)) : '';
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  const laws = Array.isArray(parsed.globalLaws) ? parsed.globalLaws : [];
  const rules = Array.isArray(parsed.rules) ? parsed.rules.slice(0, 4) : [];
  return (
    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
      <div>⚖ <b>{meta.rules}</b> rules · <b>{meta.globalLaws}</b> conservation laws</div>
      {laws.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>
          conserves: {laws.map((l: any) => l.name).join(', ')}
        </div>
      )}
      {rules.map((r: any, i: number) => (
        <div key={i} style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
          <span style={{ color: '#a0d0ff' }}>{r.kind}</span> · {r.predicate}
        </div>
      ))}
    </div>
  );
}

function StratumCard({ sid, artifact }: { sid: string; artifact: StratumArtifact | undefined }) {
  if (!artifact) {
    return (
      <div style={{ padding: 16, borderRadius: 12, background: '#1a1a22', border: '1px solid #2a2a36' }}>
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>{sid}</div>
        <div style={{ marginTop: 8, opacity: 0.4, fontStyle: 'italic' }}>not requested</div>
      </div>
    );
  }
  let body: React.ReactNode = null;
  if (artifact.mime.startsWith('audio/wav')) body = <AudioPlayer artifact={artifact} />;
  else if (artifact.mime.startsWith('image/x-raw-rgba8')) body = <FormCanvas artifact={artifact} />;
  else if (artifact.mime.startsWith('application/x-raw-world5')) body = <WorldCanvas artifact={artifact} />;
  else if (sid === 'motion') body = <MotionSummary artifact={artifact} />;
  else if (sid === 'mind') body = <MindSummary artifact={artifact} />;
  else if (sid === 'time') body = <TimeSummary artifact={artifact} />;
  else if (sid === 'field') body = <FieldSummary artifact={artifact} />;
  else if (artifact.mime.startsWith('text/plain')) {
    const text = artifact.bytesB64 ? new TextDecoder().decode(b64ToBytes(artifact.bytesB64)) : '';
    body = <div style={{ fontSize: 14, lineHeight: 1.6, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{text}</div>;
  } else if (artifact.mime.startsWith('application/json')) {
    const text = artifact.bytesB64 ? new TextDecoder().decode(b64ToBytes(artifact.bytesB64)) : '';
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    body = <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#a0d090' }}>{JSON.stringify(parsed, null, 2)}</pre>;
  }
  const preds = Object.entries(artifact.predicateReport);
  const passCt = preds.filter(([,v]) => v === 'pass').length;
  return (
    <div style={{ padding: 18, borderRadius: 12, background: '#1a1a22', border: '1px solid #2a2a36' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.5 }}>{sid}</div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{(artifact.size / 1024).toFixed(1)}KB · {artifact.contentHash.slice(0, 12)}…</div>
      </div>
      {body}
      <div style={{ marginTop: 12, fontSize: 11, display: 'flex', gap: 12 }}>
        <span style={{ color: '#80c080' }}>{passCt} pass</span>
        <span style={{ color: '#888' }}>{preds.length - passCt} other</span>
        <span style={{ opacity: 0.5 }}>{artifact.rendererId}</span>
      </div>
    </div>
  );
}

export default function CivilisationPage() {
  const [name, setName] = useState('Aurelis');
  const [key, setKey] = useState('F#');
  const [mode, setMode] = useState('lydian');
  const [tempo, setTempo] = useState(88);
  const [bundle, setBundle] = useState<CivilisationBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function compose() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/civilisation/compose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, key, mode, tempo, formWidth: 384, formHeight: 256 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setBundle(j.bundle);
      setElapsedMs(j.composedInMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  useEffect(() => { compose(); }, []); // eslint-disable-line

  const strataOrder = ['form', 'sound', 'story', 'culture', 'economy', 'ritual', 'motion', 'mind', 'world', 'field', 'time'];

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c12', color: '#e8e8f0', padding: 32, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Civilisation Command Center</h1>
      <p style={{ opacity: 0.55, marginTop: 8, fontSize: 14, maxWidth: 720 }}>
        GSPL Civilisation Playbook · 11 strata · one bundle. Compose a civilisation by intent; every stratum is rendered locally, deterministically, signed, lineage-rooted, license-bound.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24, padding: 16, background: '#11111a', borderRadius: 12 }}>
        <label style={{ fontSize: 12 }}>Name<br/><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></label>
        <label style={{ fontSize: 12 }}>Key<br/><input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        <label style={{ fontSize: 12 }}>Mode<br/>
          <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle}>
            {['ionian','dorian','phrygian','lydian','mixolydian','aeolian','locrian'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>Tempo<br/><input type="number" value={tempo} onChange={e => setTempo(Number(e.target.value))} style={inputStyle} /></label>
        <button onClick={compose} disabled={loading} style={btnStyle}>
          {loading ? 'composing…' : 'Compose Civilisation'}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: '#ff8080' }}>error: {error}</div>}

      {bundle && (
        <>
          <div style={{ marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
            <span><span style={{ opacity: 0.5 }}>id</span> {bundle.id}</span>
            <span><span style={{ opacity: 0.5 }}>hash</span> {bundle.hash.slice(0, 24)}…</span>
            <span><span style={{ opacity: 0.5 }}>strata covered</span> {bundle.conformance.strataCovered}/11</span>
            <span><span style={{ opacity: 0.5 }}>predicates</span> {bundle.conformance.predicatesPassed} pass · {bundle.conformance.predicatesFailed} fail · {bundle.conformance.predicatesUnimplemented} unimpl</span>
            <span><span style={{ opacity: 0.5 }}>composed in</span> {elapsedMs}ms</span>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            {strataOrder.map(sid => (
              <StratumCard key={sid} sid={sid} artifact={bundle.strata[sid]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#0a0a12', color: '#e8e8f0', border: '1px solid #2a2a36', borderRadius: 6,
  padding: '6px 10px', fontSize: 13, marginTop: 4, width: 110,
};
const btnStyle: React.CSSProperties = {
  background: '#3030a0', color: 'white', border: 'none', borderRadius: 6,
  padding: '8px 18px', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end',
};
