import React, { useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';

export const AtelierMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const [gspl, setGspl] = useState('// write GSPL here\n');
  const [output, setOutput] = useState<string | null>(null);

  const evaluate = useCallback(() => {
    try {
      const result = { evaluated: true, source: gspl };
      setOutput(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setOutput(`error: ${e?.message ?? String(e)}`);
    }
  }, [gspl]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Atelier · GSPL Workspace</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>{seed?.hash.slice(0, 12) ?? '—'}</span>
        <div style={{ flex: 1 }} />
        <button className="r-btn" data-tone="primary" onClick={evaluate} style={{ height: 22, fontSize: 9, padding: '0 10px' }}>evaluate</button>
      </header>
      <div style={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
        <textarea
          value={gspl}
          onChange={(e) => setGspl(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.008)',
            border: 'none',
            borderRight: '1px solid var(--r-ink-4)',
            color: 'var(--r-ink-1)',
            fontFamily: 'var(--r-font-display)',
            fontSize: 12,
            lineHeight: 1.6,
            padding: 'var(--r-px-4)',
            resize: 'none',
          }}
        />
        <div style={{ flex: 1, padding: 'var(--r-px-4)', overflow: 'auto', background: 'rgba(255,255,255,0.008)' }}>
          {output ? (
            <pre style={{ margin: 0, fontSize: 11, color: 'var(--r-ink-1)', whiteSpace: 'pre-wrap' }}>{output}</pre>
          ) : (
            <span style={{ color: 'var(--r-ink-3)', fontSize: 11, fontStyle: 'italic' }}>output will appear here</span>
          )}
        </div>
      </div>
    </div>
  );
};
