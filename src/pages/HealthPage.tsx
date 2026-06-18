/**
 * HealthPage — Substrate Health Dashboard
 *
 * The /health surface for Paradigm Absolute. Polls /api/substrate/health
 * and renders a live, drill-down view of:
 *   • Phase gate status (Doctrine v2)
 *   • Determinism, lints, waivers, golden hashes
 *   • Strata adoption (per-stratum score, conformance index)
 *   • Predicate demo (real calculateStratumConformance output)
 *   • 15-engineering contracts manifest
 *   • Part 6 economics / federation / governance (real onchain + fed samples)
 *   • Zero-onboard timing
 *   • GSPL v∞ formal verifier v3 self-host demo
 *
 * Doctrine v2 §13b — observability surface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Cpu, Database, ExternalLink, GitBranch, Layers, RefreshCw, Shield,
  Sparkles, Wallet,
} from 'lucide-react';

interface PhaseGate {
  gsplInterpreter: string;
  lints: string;
  waivers: string;
  substrateHealth: string;
  docsAndMapping: string;
}

interface Metrics {
  determinism_violations: number;
  evasion_unwaived: number;
  canonical_rename_unwaived_siblings: number;
  waiver_count: number;
  ts_nocheck_count: number;
  golden_hashes_ok: boolean;
  contract_honesty: string;
  strata_adoption: string;
}

interface PredicateRow {
  stratum: string;
  score?: number;
  passed?: boolean;
}

interface PredicateDemo {
  available: boolean;
  results?: PredicateRow[];
  averageScore?: string;
  // NOTE: server returns this as a string like "56.4%" (not a number)
  conformancePercent?: number | string;
  conformanceIndex?: number;
  strataCovered?: number;
  note?: string;
  lastUpdated?: string;
  error?: string;
}

interface StratumSummary {
  totalContracts?: number;
  contractsWithStrata?: number;
  perStratum?: Array<{ stratum: string; contractCount: number }>;
}

interface ContractDetail {
  domain: string;
  version: string;
  strata: string[];
  hasManifest: boolean;
}

interface Part6 {
  economics: string;
  physicalBridge: string;
  osShell: string;
  federation: string;
  governance: string;
  status: string;
  econSample?: {
    toCreator?: number;
    civDividend?: number;
    onchainRecips?: number;
    durationMs?: number;
    realFedVerified?: boolean;
  } | null;
}

interface ZeroOnboard {
  target: string;
  achievedDemo: string;
  marks: string[];
  uiSurfaces: string[];
  surfacedInHealth: boolean;
  note: string;
}

interface SovPack {
  live: string;
  royaltyEstimator: string;
  c2pa: string;
  sig: string;
  selfHtml: string;
  surfaces: string;
  fed: string;
}

interface HealthResponse {
  status: string;
  doctrine: string;
  phase: string;
  phase0: { gates: PhaseGate; note: string };
  metrics: Metrics;
  predicateDemo: PredicateDemo;
  // optional Phase 1 deep enrichment (not always present)
  gsplVInftySelfHostDemo?: { overallPassed: boolean; claim: string; checks: number };
  realFedDemo?: unknown;
  strata: StratumSummary | null;
  zeroOnboardTiming: ZeroOnboard;
  sovereignProvenancePack: SovPack;
  engineeringContracts15: {
    total: number;
    domains: string[];
    domainDetails: ContractDetail[];
    fullManifestCount: number;
    strataCoverage: { nineStrata: string[]; note: string };
    part6: Part6;
    activation: string;
    verification: string;
    lastUpdated: string;
  };
  _perfMs?: number;
}

const STRATA_9 = ['Form', 'Motion', 'Sound', 'Mind', 'Story', 'World', 'Field', 'Culture', 'Time'];

function formatPercent(v: number | string | undefined | null): string {
  if (v == null) return '—';
  if (typeof v === 'number') return `${v.toFixed(1)}%`;
  // String: trim trailing % and parse to one decimal
  const s = String(v).trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)/);
  if (!m) return s;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return s;
  return `${n.toFixed(1)}%`;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 4,
        background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        color: ok ? '#34d399' : '#fca5a5',
        fontSize: 9,
        fontFamily: 'monospace',
        border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      {ok ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
      {label}
    </span>
  );
}

function Bar({ value, max = 1, color = '#10b981' }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ height: '100%', background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 3 }}
      />
    </div>
  );
}

function StrataBar({ name, score, passed }: { name: string; score?: number; passed?: boolean }) {
  const color = passed === false ? '#ef4444' : passed === true ? '#10b981' : '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', width: 60 }}>{name}</span>
      <div style={{ flex: 1 }}>
        <Bar value={score ?? 0} color={color} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 9, color, minWidth: 36, textAlign: 'right' }}>
        {typeof score === 'number' ? (score * 100).toFixed(0) + '%' : '—'}
      </span>
    </div>
  );
}

function MetricCard({ label, value, sub, color = '#10b981', icon: Icon }: { label: string; value: string | number; sub?: string; color?: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div style={{
      padding: 12,
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.06)',
      minWidth: 140,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={11} className="" />
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = true, badge, children }: { title: string; icon: React.ComponentType<{ size?: number }>; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={12} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.08em' }}>{title.toUpperCase()}</span>
          {badge}
        </div>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [pollMs] = useState(15000);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t0 = performance.now();
      const res = await fetch('/api/substrate/health', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as HealthResponse;
      j._perfMs = performance.now() - t0;
      setData(j);
      setLastFetch(Date.now());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, pollMs);
    return () => clearInterval(id);
  }, [fetchHealth, pollMs]);

  const strataByName = useMemo(() => {
    const m = new Map<string, PredicateRow>();
    if (data?.predicateDemo?.results) for (const r of data.predicateDemo.results) m.set(r.stratum, r);
    return m;
  }, [data]);

  const allPhaseGreen = useMemo(() => {
    if (!data) return false;
    const g = data.phase0.gates;
    return Object.values(g).every(v => typeof v === 'string' && v.toLowerCase().startsWith('green'));
  }, [data]);

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', color: 'white', padding: 24, fontFamily: 'monospace' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h1 style={{ fontSize: 18, color: '#fca5a5' }}>Substrate Health — connection failed</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{error}</p>
          <button onClick={fetchHealth} style={{ marginTop: 12, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: 'white', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
            <RefreshCw size={10} /> RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#050508', color: 'white', padding: 24, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Polling /api/substrate/health…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  const totalDomains = data.engineeringContracts15.total;
  const realFedVerified = data.engineeringContracts15.part6?.econSample?.realFedVerified;
  const econDuration = data.engineeringContracts15.part6?.econSample?.durationMs;
  const civ = data.engineeringContracts15.part6?.econSample?.civDividend;
  const pIndex = data.predicateDemo?.conformanceIndex ?? 0;
  const waiverCount = data.metrics.waiver_count;

  return (
    <div data-testid="health-page" style={{ minHeight: '100vh', background: '#050508', color: 'white', padding: 24, fontFamily: 'monospace' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)' }}>
              SUBSTRATE HEALTH
            </h1>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              Doctrine {data.doctrine} · {data.phase}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill ok={data.status === 'ok'} label={data.status.toUpperCase()} />
            <StatusPill ok={allPhaseGreen} label={allPhaseGreen ? 'PHASE 0 CLOSED' : 'PHASE 0 INCOMPLETE'} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
              last fetch: {new Date(lastFetch).toLocaleTimeString()} · {data._perfMs ? `${data._perfMs.toFixed(0)}ms` : '—'}
            </span>
            <button
              onClick={fetchHealth}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 9,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={9} className={loading ? 'spin' : ''} /> {loading ? 'FETCHING…' : 'REFRESH'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', maxWidth: 760, marginBottom: 20 }}>
          The substrate spine. Polls <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0 4px' }}>/api/substrate/health</code> every {pollMs / 1000}s.
          Determinism, lints, waivers, strata adoption, 15-engineering contracts, real Part 6 economics, real federation, GSPL v∞ self-host.
        </p>

        {/* Top metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
          <MetricCard label="Det violations" value={data.metrics.determinism_violations} sub="eslint + ci gate" color={data.metrics.determinism_violations === 0 ? '#10b981' : '#ef4444'} icon={Shield} />
          <MetricCard label="@ts-nocheck" value={data.metrics.ts_nocheck_count} sub="zero allowed" color={data.metrics.ts_nocheck_count === 0 ? '#10b981' : '#f59e0b'} icon={Code} />
          <MetricCard label="Waivers" value={waiverCount} sub="sunset-dated" color="#6366f1" icon={Database} />
          <MetricCard label="Evasion" value={data.metrics.evasion_unwaived} sub="unwaived matches" color={data.metrics.evasion_unwaived === 0 ? '#10b981' : '#f59e0b'} icon={AlertTriangle} />
          <MetricCard label="Canonical" value={data.metrics.canonical_rename_unwaived_siblings} sub="unwaived siblings" color={data.metrics.canonical_rename_unwaived_siblings < 20 ? '#10b981' : '#f59e0b'} icon={GitBranch} />
          <MetricCard label="Strata" value={data.metrics.strata_adoption} sub="adoption %" color="#22d3ee" icon={Layers} />
          <MetricCard label="Conformance" value={pIndex} sub={`${data.predicateDemo?.strataCovered ?? 0} / 9 strata`} color={pIndex >= 90 ? '#10b981' : pIndex >= 60 ? '#f59e0b' : '#ef4444'} icon={Activity} />
          <MetricCard label="Domains" value={totalDomains} sub="15-eng contracts" color="#a78bfa" icon={Cpu} />
        </div>

        {/* Phase 0 gates */}
        <CollapsibleSection title="Phase 0 Gates — Doctrine Collapse" icon={CheckCircle2} badge={<StatusPill ok={allPhaseGreen} label={allPhaseGreen ? 'ALL GREEN' : 'INCOMPLETE'} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {Object.entries(data.phase0.gates).map(([k, v]) => (
              <div key={k} style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 10, color: v.toLowerCase().includes('green') ? '#10b981' : '#fca5a5', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>{data.phase0.note}</p>
        </CollapsibleSection>

        {/* Strata conformance */}
        <CollapsibleSection title="Strata Conformance — 9-stratum real predicates" icon={Layers} badge={<StatusPill ok={(data.predicateDemo?.strataCovered ?? 0) >= 9} label={`${data.predicateDemo?.strataCovered ?? 0} / 9`} />}>
          {data.predicateDemo?.available ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, padding: 10, background: 'rgba(16,185,129,0.04)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.1)' }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>OVERALL INDEX</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: pIndex >= 90 ? '#10b981' : pIndex >= 60 ? '#f59e0b' : '#ef4444' }}>{pIndex}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <Bar value={pIndex / 100} color={pIndex >= 90 ? '#10b981' : pIndex >= 60 ? '#f59e0b' : '#ef4444'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    <span>avg score: {data.predicateDemo.averageScore ?? '—'}</span>
                    <span>{formatPercent(data.predicateDemo.conformancePercent)} conformance</span>
                  </div>
                </div>
              </div>
              <div>
                {STRATA_9.map(s => {
                  const row = strataByName.get(s);
                  return <StrataBar key={s} name={s} score={row?.score} passed={row?.passed} />;
                })}
              </div>
              {data.predicateDemo.note && (
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 10, lineHeight: 1.5 }}>{data.predicateDemo.note}</p>
              )}
            </>
          ) : (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 4, color: '#fca5a5', fontSize: 10 }}>
              predicate engine unavailable: {data.predicateDemo?.error ?? 'unknown'}
            </div>
          )}
        </CollapsibleSection>

        {/* 15-Engineering Contracts */}
        <CollapsibleSection title="15-Engineering Contracts — 27 domains + 9 strata" icon={Cpu} badge={<StatusPill ok={totalDomains >= 13} label={`${totalDomains} contracts`} />}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>DOMAINS COVERED ({data.engineeringContracts15.domains.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {data.engineeringContracts15.domains.map(d => (
                <span key={d} style={{ padding: '2px 7px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 3, color: '#c4b5fd', fontSize: 8 }}>{d}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
            <strong>Activation:</strong> {data.engineeringContracts15.activation}<br />
            <strong>Verification:</strong> {data.engineeringContracts15.verification}<br />
            <strong>Last update:</strong> {data.engineeringContracts15.lastUpdated}
          </div>
        </CollapsibleSection>

        {/* Part 6 economics + federation */}
        <CollapsibleSection title="Part 6 — Real economics + federation" icon={Wallet} badge={<StatusPill ok={!!realFedVerified} label={realFedVerified ? 'REAL FED OK' : 'FED DOWN'} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 10, background: 'rgba(34,211,238,0.05)', borderRadius: 4, border: '1px solid rgba(34,211,238,0.15)' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>ECON SAMPLE</div>
              <div style={{ fontSize: 14, color: '#22d3ee', marginTop: 2, fontWeight: 600 }}>{typeof econDuration === 'number' ? econDuration.toFixed(1) : '—'} ms</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                toCreator={typeof data.engineeringContracts15.part6?.econSample?.toCreator === 'number' ? data.engineeringContracts15.part6!.econSample!.toCreator!.toFixed(2) : '—'} PARA ·
                civ={civ ?? '—'}
              </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(16,185,129,0.05)', borderRadius: 4, border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>REAL FED EXCHANGE</div>
              <div style={{ fontSize: 14, color: realFedVerified ? '#10b981' : '#ef4444', marginTop: 2, fontWeight: 600 }}>
                {realFedVerified ? 'VERIFIED' : (data.engineeringContracts15.part6?.econSample ? 'PENDING' : 'NOT RUN')}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                ECDSA + merkle · 2-node (real, beyond sim)
              </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(99,102,241,0.05)', borderRadius: 4, border: '1px solid rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>PHYSICAL BRIDGE</div>
              <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 2 }}>completePhysicalBridge + materials DB</div>
            </div>
            <div style={{ padding: 10, background: 'rgba(245,158,11,0.05)', borderRadius: 4, border: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>GOVERNANCE</div>
              <div style={{ fontSize: 11, color: '#fcd34d', marginTop: 2 }}>canon-stewardship + waiver registry + hooks</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            <strong style={{ color: '#22d3ee' }}>FEDERATION:</strong> {data.engineeringContracts15.part6?.federation}
          </div>
          {data.engineeringContracts15.part6?.econSample == null && (
            <p style={{ fontSize: 9, color: 'rgba(252,165,165,0.7)', marginTop: 8, padding: 8, background: 'rgba(239,68,68,0.04)', borderRadius: 4, border: '1px solid rgba(239,68,68,0.1)' }}>
              ℹ Part 6 deep enrichment (econSample, realFedDemo) is best-effort and was not produced this cycle. The static part6 fields above still report module presence. See <code>/api/substrate/health</code> for raw output.
            </p>
          )}
        </CollapsibleSection>

        {/* Zero-onboard timing */}
        <CollapsibleSection title="Zero-onboard timing — <60s claim" icon={Clock} badge={<StatusPill ok={true} label="INSTRUMENTED" />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>TARGET</div>
              <div style={{ fontSize: 12, color: '#22d3ee', fontWeight: 600 }}>{data.zeroOnboardTiming.target}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>ACHIEVED (demo)</div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{data.zeroOnboardTiming.achievedDemo}</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            <strong>UI surfaces:</strong> {data.zeroOnboardTiming.uiSurfaces.join(' · ')}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            <strong>Marks:</strong> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0 3px' }}>{data.zeroOnboardTiming.marks.join(', ')}</code>
          </div>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>{data.zeroOnboardTiming.note}</p>
        </CollapsibleSection>

        {/* Sovereign provenance pack */}
        <CollapsibleSection title="Sovereign Provenance Pack" icon={Shield}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            <div><strong style={{ color: '#fcd34d' }}>Live:</strong> {data.sovereignProvenancePack.live}</div>
            <div><strong style={{ color: '#fcd34d' }}>Royalty:</strong> {data.sovereignProvenancePack.royaltyEstimator}</div>
            <div><strong style={{ color: '#fcd34d' }}>C2PA:</strong> {data.sovereignProvenancePack.c2pa}</div>
            <div><strong style={{ color: '#fcd34d' }}>Sig:</strong> {data.sovereignProvenancePack.sig}</div>
            <div><strong style={{ color: '#fcd34d' }}>Surfaces:</strong> {data.sovereignProvenancePack.surfaces}</div>
          </div>
        </CollapsibleSection>

        {/* Footer */}
        <div style={{ marginTop: 24, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            <Sparkles size={11} />
            <span>Live substrate spine · Doctrine v2 §13b · every {pollMs / 1000}s · auto-refresh</span>
            <a href="/api/substrate/health" target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#22d3ee', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              raw JSON <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline icon fallback (Code isn't imported above)
function Code(props: { size?: number; className?: string }) {
  return <span style={{ display: 'inline-block', width: props.size ?? 11, height: props.size ?? 11, fontFamily: 'monospace', fontSize: (props.size ?? 11) - 2, lineHeight: 1, color: 'currentColor' }}>{'<>'}</span>;
}
