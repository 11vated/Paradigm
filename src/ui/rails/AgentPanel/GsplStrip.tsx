/**
 * GsplStrip — a thin persistent strip showing the most recent GSPL code
 * emitted by the agent, anywhere in any thread. Click to expand inline.
 *
 * The GSPL language is the substrate's native seed-programming language; this
 * strip makes sure it's *visible* in the agent surface, not hidden behind
 * the "Source" lens.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useAgentThreads } from '@/stores/agentThreads';

interface GsplBlock {
  source: string;
  threadId: string;
  turnId: string;
  at: string;
}

function findLatestGspl(threads: ReturnType<typeof useAgentThreads.getState>['threads']): GsplBlock | null {
  for (let i = threads.length - 1; i >= 0; i--) {
    const t = threads[i];
    for (let j = t.turns.length - 1; j >= 0; j--) {
      const u = t.turns[j];
      for (let k = (u.cards?.length ?? 0) - 1; k >= 0; k--) {
        const c = u.cards![k];
        if (c.kind === 'gspl-source') {
          const p = c.payload as { gspl?: string; seed?: unknown };
          if (typeof p.gspl === 'string' && p.gspl.trim()) {
            return { source: p.gspl, threadId: t.id, turnId: u.id, at: u.at };
          }
        }
      }
    }
  }
  return null;
}

function tokenColor(tok: string, i: number): string {
  if (/^(\/\/|#)/.test(tok)) return 'rgba(255,255,255,0.35)';
  if (/^"(?:[^"\\]|\\.)*"$/.test(tok)) return '#a78bfa';
  if (/^\b(seed|breed|mutate|compose|evolve|grow|fn|type|trait|impl|where|gene|domain|signed|from|as|let|if|else|match|for|while|return|true|false|import|export|use|in|with)\b$/.test(tok)) return '#7c47ff';
  if (/^\d+(?:\.\d+)?$/.test(tok)) return '#c084fc';
  if (/^[A-Z][A-Za-z0-9_]*$/.test(tok)) return '#34d399';
  return 'rgba(255,255,255,0.7)';
}

function miniHighlight(src: string): React.ReactNode[] {
  // Single-line view: take only the first non-empty line and colorise
  const firstLine = src.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const tokens = firstLine.split(/(\s+|[(){}\],;:.])/g).filter(Boolean).slice(0, 40);
  return tokens.map((t, i) => (
    <span key={i} style={{ color: tokenColor(t, i) }}>{t}</span>
  ));
}

function fullHighlight(src: string): React.ReactNode[] {
  const TOKEN_RX = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b(?:seed|breed|mutate|compose|evolve|grow|fn|type|trait|impl|where|gene|domain|signed|from|as|let|if|else|match|for|while|return|true|false|import|export|use|in|with)\b)|(\b\d+(?:\.\d+)?\b)|([A-Z][A-Za-z0-9_]*)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of src.matchAll(TOKEN_RX)) {
    if (m.index! > last) out.push(src.slice(last, m.index));
    if (m[1])      out.push(<span key={`c${i++}`} style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{m[0]}</span>);
    else if (m[2]) out.push(<span key={`s${i++}`} style={{ color: '#a78bfa' }}>{m[0]}</span>);
    else if (m[3]) out.push(<span key={`k${i++}`} style={{ color: '#7c47ff' }}>{m[0]}</span>);
    else if (m[4]) out.push(<span key={`n${i++}`} style={{ color: '#c084fc' }}>{m[0]}</span>);
    else if (m[5]) out.push(<span key={`t${i++}`} style={{ color: '#34d399' }}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export const GsplStrip: React.FC = React.memo(() => {
  const threads = useAgentThreads((s) => s.threads);
  const [open, setOpen] = useState(false);

  const latest = useMemo(() => findLatestGspl(threads), [threads]);

  const onCopy = useCallback(() => {
    if (!latest) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(latest.source).catch(() => {});
    }
  }, [latest]);

  if (!latest) {
    return (
      <div
        className="r-gspl-strip r-gspl-strip-empty"
        title="GSPL strip — appears when the agent emits code"
        style={{
          fontFamily: 'var(--r-font-mono, monospace)',
          fontSize: 9,
          padding: '4px 12px',
          color: 'rgba(255,255,255,0.3)',
          borderTop: '1px solid var(--r-ink-5)',
          borderBottom: '1px solid var(--r-ink-5)',
          background: 'rgba(255,255,255,0.01)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: 'var(--r-prism-core, #7c47ff)' }}>▣</span>
        <span>gspl — waiting for first program</span>
      </div>
    );
  }

  return (
    <div className="r-gspl-strip" data-has-source="true" style={{ borderTop: '1px solid var(--r-ink-5)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Collapse' : 'Expand latest GSPL'}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '5px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--r-font-mono, monospace)',
          fontSize: 10,
          color: 'var(--r-ink-2, #cfcfd9)',
          background: 'rgba(124,71,255,0.05)',
        }}
      >
        <span style={{ color: 'var(--r-prism-core, #7c47ff)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ color: 'var(--r-prism-core, #7c47ff)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9 }}>gspl</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {open ? '// expand to see full program' : miniHighlight(latest.source)}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{latest.source.length}c</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCopy(); } }}
          style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          title="Copy GSPL source"
        >copy</span>
      </button>
      {open && (
        <pre
          style={{
            margin: 0,
            padding: '8px 12px',
            background: 'var(--r-void-0, #050509)',
            borderTop: '1px solid var(--r-ink-5)',
            fontFamily: 'var(--r-font-mono, monospace)',
            fontSize: 10,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.85)',
            maxHeight: 220,
            overflow: 'auto',
            whiteSpace: 'pre',
          }}
        >
          {fullHighlight(latest.source)}
        </pre>
      )}
    </div>
  );
});

export default GsplStrip;
