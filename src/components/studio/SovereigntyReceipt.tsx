/**
 * SovereigntyReceipt — Provenance & Ownership Display
 *
 * Shows the cryptographic sovereignty chain for a seed:
 *   - ECDSA P-256 signature status (verified / unsigned / invalid)
 *   - Public key fingerprint
 *   - Lineage chain (parent hashes with depth)
 *   - C2PA provenance claim summary
 *   - On-chain anchor status (if minted)
 *   - VCS commit history (last N commits)
 *
 * This is the "proof of origin" surface of Paradigm.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldX, Link, Hash, GitCommit, ExternalLink, Copy } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SovereigntyStatus {
  signed: boolean;
  valid: boolean | null;
  publicKeyFingerprint: string | null;
  algorithm: string;
  signedAt: string | null;
}

interface LineageEntry {
  hash: string;
  depth: number;
  domain: string;
  operation: 'create' | 'mutate' | 'breed' | 'compose' | 'evolve';
}

interface VcsCommit {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
}

interface OnChainAnchor {
  minted: boolean;
  tokenId?: string;
  txHash?: string;
  network?: string;
  contractAddress?: string;
}

interface ReceiptData {
  seedHash: string;
  domain: string;
  sovereignty: SovereigntyStatus;
  lineage: LineageEntry[];
  commits: VcsCommit[];
  anchor: OnChainAnchor;
  c2paClaim?: string;
}

interface SovereigntyReceiptProps {
  seed: Record<string, unknown>;
  seedId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function short(hash: string | null | undefined, n = 8): string {
  if (!hash) return '—';
  return hash.slice(0, n) + '…' + hash.slice(-4);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="ml-1 text-zinc-600 hover:text-zinc-300 transition-colors"
    >
      <Copy className="w-3 h-3" />
      {copied && <span className="ml-1 text-[9px] text-emerald-400">copied</span>}
    </button>
  );
}

const OP_COLOR: Record<LineageEntry['operation'], string> = {
  create:  'text-sky-400',
  mutate:  'text-yellow-400',
  breed:   'text-pink-400',
  compose: 'text-violet-400',
  evolve:  'text-emerald-400',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SovereigntyReceipt({ seed, seedId }: SovereigntyReceiptProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const seedHash = (seed as any).$hash ?? (seed as any).hash ?? 'unknown';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sovereignty/receipt?hash=${seedHash}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) setReceipt(await res.json());
        else setReceipt(buildLocal(seed, seedHash));
      } catch {
        setReceipt(buildLocal(seed, seedHash));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [seedHash, seed]);

  async function handleSign() {
    setSigning(true);
    try {
      const res = await fetch('/api/sovereignty/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ seed, seedId }),
      });
      if (res.ok) {
        const data = await res.json();
        setReceipt(prev => prev ? { ...prev, sovereignty: data.sovereignty } : null);
      }
    } finally {
      setSigning(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-mono">
      verifying sovereignty…
    </div>
  );

  if (!receipt) return null;

  const { sovereignty, lineage, commits, anchor } = receipt;

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        {sovereignty.signed && sovereignty.valid
          ? <ShieldCheck className="w-4 h-4 text-emerald-400" />
          : sovereignty.signed
          ? <ShieldX className="w-4 h-4 text-rose-400" />
          : <Shield className="w-4 h-4 text-zinc-500" />
        }
        <span className="font-semibold text-zinc-200">Sovereignty Receipt</span>
        <span className="ml-auto text-xs font-mono text-zinc-500">{short(seedHash, 12)}</span>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {/* Signature */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Signature</div>
          <div className="space-y-1">
            <Row label="Status">
              {sovereignty.signed
                ? <span className={sovereignty.valid ? 'text-emerald-400' : 'text-rose-400'}>
                    {sovereignty.valid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                : <span className="text-zinc-500">Unsigned</span>
              }
            </Row>
            <Row label="Algorithm">
              <span className="font-mono text-xs">{sovereignty.algorithm}</span>
            </Row>
            {sovereignty.publicKeyFingerprint && (
              <Row label="Key">
                <span className="font-mono text-xs">{short(sovereignty.publicKeyFingerprint, 12)}</span>
                <CopyButton text={sovereignty.publicKeyFingerprint} />
              </Row>
            )}
            {sovereignty.signedAt && (
              <Row label="Signed">
                <span className="text-xs">{new Date(sovereignty.signedAt).toLocaleString()}</span>
              </Row>
            )}
          </div>
          {!sovereignty.signed && (
            <button
              onClick={handleSign}
              disabled={signing}
              className="mt-3 w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors
                         text-xs font-medium text-zinc-300 disabled:opacity-50"
            >
              {signing ? 'Signing…' : 'Sign with Device Key'}
            </button>
          )}
        </div>

        {/* On-chain anchor */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">On-Chain Anchor</div>
          {anchor.minted ? (
            <div className="space-y-1">
              <Row label="Token ID">
                <span className="font-mono text-xs text-violet-400">#{anchor.tokenId}</span>
              </Row>
              <Row label="Network">
                <span className="font-mono text-xs">{anchor.network}</span>
              </Row>
              <Row label="Tx">
                <span className="font-mono text-xs">{short(anchor.txHash)}</span>
                <CopyButton text={anchor.txHash!} />
              </Row>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Not anchored on-chain</span>
              <button className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Mint NFT
              </button>
            </div>
          )}
        </div>

        {/* Lineage */}
        {lineage.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Lineage ({lineage.length} ancestors)
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {lineage.map((l, i) => (
                <motion.div
                  key={l.hash}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-zinc-700 font-mono w-4 text-right shrink-0">-{l.depth}</span>
                  <Hash className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                  <span className="font-mono text-zinc-400">{short(l.hash)}</span>
                  <span className="text-zinc-600">{l.domain}</span>
                  <span className={`ml-auto font-mono text-[10px] ${OP_COLOR[l.operation]}`}>
                    {l.operation}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* VCS commits */}
        {commits.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              History
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {commits.map((c, i) => (
                <div key={c.hash} className="flex items-center gap-2 text-xs">
                  <GitCommit className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                  <span className="font-mono text-zinc-500">{short(c.hash, 7)}</span>
                  <span className="text-zinc-400 truncate">{c.message}</span>
                  <span className="ml-auto text-zinc-600 shrink-0 text-[10px]">
                    {new Date(c.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-600 w-20 shrink-0">{label}</span>
      <span className="flex items-center gap-1 text-zinc-300">{children}</span>
    </div>
  );
}

// ─── Local fallback ───────────────────────────────────────────────────────────

function buildLocal(seed: Record<string, unknown>, hash: string): ReceiptData {
  const s = seed as any;
  return {
    seedHash: hash,
    domain: s.$domain ?? 'unknown',
    sovereignty: {
      signed: !!(s.$sovereignty?.signature),
      valid: s.$sovereignty?.signature ? null : null,
      publicKeyFingerprint: s.$sovereignty?.author_pubkey ?? null,
      algorithm: 'ECDSA P-256',
      signedAt: s.$sovereignty?.timestamp ?? null,
    },
    lineage: (s.$lineage ?? []).slice(0, 8).map((h: string, i: number) => ({
      hash: h, depth: i + 1,
      domain: s.$domain ?? 'unknown',
      operation: 'mutate' as const,
    })),
    commits: [],
    anchor: { minted: false },
  };
}
