import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useDomainColor } from '@/hooks/useDomainColor';

function highlightGspl(source: string): string {
  let s = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/(\/\/.*$)/gm, '<span class="t-c">$1</span>');
  s = s.replace(/"([^"]*)"/g, '<span class="t-s">"$1"</span>');
  const kw = /\b(seed|breed|mutate|compose|grow|fn|let|import|from|export|return|if|else|match|true|false|gene|in|domain)\b/g;
  s = s.replace(kw, '<span class="t-k">$1</span>');
  s = s.replace(/(\b\d+\.?\d*\b)/g, '<span class="t-n">$1</span>');
  s = s.replace(/(\b[A-Z][A-Za-z0-9_]*)/g, '<span class="t-t">$1</span>');
  return s;
}

function defaultGsplFor(seed: any | null): string {
  if (!seed) {
    return `// Paradigm seed declaration\n//\n// Press EXECUTE to grow a new seed from this source,\n// or pick a seed from the library and Codex will inline its GSPL.\n\nseed first_light {\n  domain: visual2d\n  hue: 240\n  saturation: 0.7\n  density: 0.5\n  symmetry: 0.6\n}\n\ngrow first_light\n`;
  }
  const name = (seed.name || seed.id || 'seed').replace(/[^a-z0-9_]/gi, '_').slice(0, 32);
  return `seed ${name} {\n  // ${seed.name ?? seed.id}\n  // ${seed.hash?.slice(0, 16) ?? ''}\n  domain: ${seed.domain}\n  generation: ${seed.generation ?? 0}\n}\n\ngrow ${name}\n`;
}

export const CodexMode: React.FC = () => {
  const { seed } = useActiveSeed();
  const setSeed = useActiveSeed((s: any) => s.setSeed);
  const accent = useDomainColor(seed?.domain);

  const [source, setSource] = useState<string>(() => defaultGsplFor(seed));
  const [busy, setBusy] = useState<'idle' | 'parse' | 'execute'>('idle');
  const [output, setOutput] = useState<{ kind: 'ast' | 'exec' | 'error' | null; payload?: any }>({ kind: null });

  // Sync source when seed changes (but preserve user's edits to a fresh seed)
  useEffect(() => { setSource(defaultGsplFor(seed)); setOutput({ kind: null }); }, [seed?.id]);

  const onParse = useCallback(async () => {
    setBusy('parse');
    try {
      const res = await fetch('/api/gspl/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }) });
      const data = await res.json();
      if (data.errors && data.errors.length > 0) setOutput({ kind: 'error', payload: data.errors });
      else setOutput({ kind: 'ast', payload: data });
    } catch (e) {
      setOutput({ kind: 'error', payload: [String(e)] });
    } finally { setBusy('idle'); }
  }, [source]);

  const onExecute = useCallback(async () => {
    setBusy('execute');
    try {
      const res = await fetch('/api/gspl/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }) });
      const data = await res.json();
      if (data.errors && data.errors.length > 0) setOutput({ kind: 'error', payload: data.errors });
      else {
        setOutput({ kind: 'exec', payload: data });
        // If the execution created seeds, set the first one as active
        if (data.seeds && data.seeds.length > 0) {
          const first = data.seeds[0];
          setSeed({
            id: first.id ?? first.$id ?? 'seed-' + Date.now(),
            name: first.name ?? first.$name ?? 'unnamed',
            domain: first.domain ?? first.$domain ?? 'unknown',
            hash: first.hash ?? first.$hash ?? '',
            generation: first.generation ?? 0,
          });
        }
      }
    } catch (e) {
      setOutput({ kind: 'error', payload: [String(e)] });
    } finally { setBusy('idle'); }
  }, [source, setSeed]);

  const highlighted = useMemo(() => highlightGspl(source), [source]);
  const lines = useMemo(() => source.split('\n').length, [source]);

  return (
    <div className="p-codex" style={{ '--p-accent': accent } as React.CSSProperties}>
      <header className="p-codex-header">
        <span className="p-codex-label">codex</span>
        <span className="p-codex-meta">GSPL · {lines} {lines === 1 ? 'line' : 'lines'}</span>
        <span className="p-codex-spacer" />
        <button className="p-codex-action" onClick={onParse} disabled={busy !== 'idle'}>
          {busy === 'parse' ? 'parsing…' : 'parse'}
        </button>
        <button className="p-codex-action p-codex-primary" onClick={onExecute} disabled={busy !== 'idle'}>
          {busy === 'execute' ? 'executing…' : 'execute'}
        </button>
      </header>

      <div className="p-codex-body">
        <div className="p-codex-edit">
          <pre className="p-codex-paint" aria-hidden dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} />
          <textarea
            className="p-codex-input"
            spellCheck={false}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <aside className="p-codex-output">
          {output.kind === null && (
            <div className="p-codex-empty">parse to see AST · execute to grow seeds</div>
          )}
          {output.kind === 'error' && (
            <div className="p-codex-errors">
              <span className="p-codex-output-label" data-state="error">errors · {output.payload.length}</span>
              {output.payload.map((e: string, i: number) => (
                <div key={i} className="p-codex-error-line">{e}</div>
              ))}
            </div>
          )}
          {output.kind === 'ast' && (
            <div className="p-codex-ast">
              <span className="p-codex-output-label" data-state="ok">AST · {output.payload.stats?.declarations ?? 0} decls · {output.payload.stats?.tokens ?? 0} tokens</span>
              <pre className="p-codex-tree">{JSON.stringify(output.payload.ast, null, 2)}</pre>
            </div>
          )}
          {output.kind === 'exec' && (
            <div className="p-codex-exec">
              <span className="p-codex-output-label" data-state="ok">
                executed · {output.payload.stats?.seeds_created ?? 0} seeds · {output.payload.output?.length ?? 0} ops
              </span>
              {output.payload.seeds && output.payload.seeds.map((s: any, i: number) => (
                <div key={i} className="p-codex-exec-seed">
                  <span className="p-codex-exec-domain">{s.domain ?? s.$domain ?? 'seed'}</span>
                  <span className="p-codex-exec-name">{s.name ?? s.$name ?? s.id}</span>
                </div>
              ))}
              {output.payload.output && output.payload.output.length > 0 && (
                <pre className="p-codex-exec-output">{JSON.stringify(output.payload.output, null, 2)}</pre>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
