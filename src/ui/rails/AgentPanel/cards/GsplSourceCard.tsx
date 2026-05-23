import React, { useState, useCallback } from 'react';
import { CardShell } from './CardShell';

interface GsplSourceCardProps {
  payload: { kind?: string; seed?: any; gspl?: string };
}

// Minimal GSPL syntax highlighter — colors keywords, strings, numbers, comments
// inline using span wrapping. Determinism-safe (no RNG, no time-based picks).
function highlight(src: string): React.ReactNode[] {
  const TOKEN_RX = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b(?:seed|breed|mutate|compose|evolve|grow|fn|type|trait|impl|where|gene|domain|in|signed|from|as|let|if|else|match|for|while|return|true|false|import|export)\b)|(\b\d+(?:\.\d+)?\b)|([A-Z][A-Za-z0-9_]*)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of src.matchAll(TOKEN_RX)) {
    if (m.index! > last) out.push(src.slice(last, m.index));
    if (m[1])      out.push(<span key={`c${i++}`} style={{ color: 'var(--p-ink-4)', fontStyle: 'italic' }}>{m[0]}</span>);
    else if (m[2]) out.push(<span key={`s${i++}`} style={{ color: 'var(--p-domain-music, #a78bfa)' }}>{m[0]}</span>);
    else if (m[3]) out.push(<span key={`k${i++}`} style={{ color: 'var(--p-prism-core)' }}>{m[0]}</span>);
    else if (m[4]) out.push(<span key={`n${i++}`} style={{ color: 'var(--p-domain-quantum, #c084fc)' }}>{m[0]}</span>);
    else if (m[5]) out.push(<span key={`t${i++}`} style={{ color: 'var(--p-domain-world, #34d399)' }}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export const GsplSourceCard: React.FC<GsplSourceCardProps> = ({ payload }) => {
  const text = payload.gspl
    ? payload.gspl
    : payload.seed
      ? JSON.stringify(payload.seed, null, 2)
      : '';
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<string | null>(null);

  const onRun = useCallback(async () => {
    if (!text || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/gspl/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: text }),
      });
      const data = await res.json();
      setResult(data.error ? `error: ${data.error}` : `ok · ${data.result ? JSON.stringify(data.result).slice(0, 200) : 'no result'}`);
    } catch (e) {
      setResult(`error: ${String(e).slice(0, 200)}`);
    } finally {
      setRunning(false);
    }
  }, [text, running]);

  const onCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [text]);

  return (
    <CardShell label="GSPL Source" tone="prism-resonant">
      <pre
        style={{
          margin: 0,
          padding: 12,
          background: 'var(--p-deep, #050509)',
          border: '1px solid var(--p-line, #1d1d2a)',
          borderRadius: 'var(--p-radius-2, 4px)',
          fontFamily: 'var(--p-font-mono, ui-monospace, "DM Mono", monospace)',
          fontSize: 11,
          lineHeight: 1.55,
          color: 'var(--p-ink-1, #cfcfd9)',
          maxHeight: 260,
          overflow: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {text ? highlight(text) : '// no source emitted'}
      </pre>
      {text && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCopy}
            style={{
              fontFamily: 'var(--p-font-mono, monospace)',
              fontSize: 10,
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid var(--p-line, #1d1d2a)',
              borderRadius: 2,
              color: 'var(--p-ink-3, #777787)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
            title="Copy source"
          >copy</button>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            style={{
              fontFamily: 'var(--p-font-mono, monospace)',
              fontSize: 10,
              padding: '4px 10px',
              background: running ? 'transparent' : 'var(--p-prism-core, #7c47ff)',
              border: '1px solid var(--p-prism-core, #7c47ff)',
              borderRadius: 2,
              color: running ? 'var(--p-ink-3, #777787)' : 'var(--p-deep, #050509)',
              cursor: running ? 'wait' : 'pointer',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
            title="Execute via /api/gspl/execute"
          >{running ? 'running…' : 'run'}</button>
        </div>
      )}
      {result && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: 'rgba(124,71,255,0.06)',
            border: '1px solid var(--p-prism-core, #7c47ff)',
            borderRadius: 2,
            fontFamily: 'var(--p-font-mono, monospace)',
            fontSize: 10,
            color: 'var(--p-ink-1, #cfcfd9)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >{result}</div>
      )}
    </CardShell>
  );
};
