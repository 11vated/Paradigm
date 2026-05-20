import React, { useState, useMemo } from 'react';
import { diagnoseGspl, formatDiagnostic } from '@/lib/kernel/gspl-diagnose';
import { TopNav } from '@/components/TopNav';

const EXAMPLES = [
  { name: 'seed', src: `seed "midnight" {\n  domain: music\n}` },
  { name: 'breed', src: `seed a = "spark"\nseed b = "ember"\nbreed(a, b, salt: "v1")` },
  { name: 'broken', src: `seed broken { gene = }` },
];

export default function ReplPage() {
  const [src, setSrc] = useState(EXAMPLES[0].src);
  const result = useMemo(() => diagnoseGspl(src), [src]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">GSPL REPL</h1>
        <p className="text-sm text-neutral-400 mb-4">
          Generative Seed Programming Language — live diagnostics.
        </p>

        <div className="flex gap-2 mb-3 text-xs">
          {EXAMPLES.map(ex => (
            <button key={ex.name} onClick={() => setSrc(ex.src)} className="px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-800">
              {ex.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <textarea
            value={src}
            onChange={e => setSrc(e.target.value)}
            spellCheck={false}
            className="h-[420px] p-3 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-sm leading-relaxed"
          />

          <div className="h-[420px] overflow-auto bg-neutral-900 border border-neutral-800 rounded-lg p-3 font-mono text-sm">
            {result.ok ? (
              <div>
                <div className="text-emerald-400 mb-2">
                  ✓ parsed cleanly — {result.ast?.length ?? 0} top-level node(s)
                </div>
                <pre className="text-neutral-400 text-xs">{JSON.stringify(result.ast, null, 2)}</pre>
              </div>
            ) : (
              <div>
                {result.errors.map((e, i) => (
                  <pre key={i} className="text-red-300 mb-3 whitespace-pre-wrap">{formatDiagnostic(e)}</pre>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
