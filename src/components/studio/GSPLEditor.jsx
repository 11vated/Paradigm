import { useState, useRef } from 'react';
import { Code2, Play, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';

// Removed unused GSPL_KEYWORDS

const DEFAULT_CODE = `// GSPL — Genetic Seed Programming Language
seed "Iron Warrior" in character {
  size: 1.75
  archetype: "warrior"
  strength: 0.82
  agility: 0.54
  palette: [0.2, 0.15, 0.1]
}

let variant = mutate(hero, rate: 0.1)
let sprite_form = compose(hero, to: "sprite")
let theme = compose(hero, to: "music")
`;

export default function GSPLEditor({ onSeedFromGSPL }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const handleParse = async () => {
    setLoading(true);
    try {
      const res = await api.post('/gspl/parse', { source: code });
      setResult(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await api.post('/gspl/execute', { source: code });
      setResult(res.data);
      if (res.data.seeds?.length > 0 && onSeedFromGSPL) {
        onSeedFromGSPL(res.data.seeds[0]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col" data-testid="gspl-editor">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-900">
        <Code2 className="w-3 h-3 text-primary" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">GSPL Editor</span>
        <div className="flex-1" />
        <button data-testid="gspl-parse-btn" onClick={handleParse} disabled={loading}
          className="px-2 py-0.5 border border-neutral-800 text-neutral-400 font-mono text-[9px] hover:border-neutral-600 transition-colors">
          Parse
        </button>
        <button data-testid="gspl-execute-btn" onClick={handleExecute} disabled={loading}
          className="px-2 py-0.5 bg-primary text-black font-bold text-[9px] hover:bg-primary/80 transition-colors flex items-center gap-1">
          <Play className="w-2.5 h-2.5" /> Run
        </button>
      </div>
      <textarea
        ref={textareaRef}
        data-testid="gspl-code-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 bg-black/30 p-3 text-[11px] font-mono text-neutral-300 resize-none outline-none leading-relaxed min-h-[200px]"
        spellCheck={false}
        placeholder="Write GSPL code..."
      />
      {result && (
        <div className="border-t border-neutral-900 p-2 max-h-[200px] overflow-y-auto">
          {result.errors?.length > 0 && (
            <div className="space-y-1 mb-2">
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 text-red-400 font-mono text-[9px]">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{e}
                </div>
              ))}
            </div>
          )}
          {result.warnings?.length > 0 && (
            <div className="space-y-1 mb-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="font-mono text-[9px] text-yellow-500/70">{w}</div>
              ))}
            </div>
          )}
          {result.stats && (
            <div className="flex gap-3 font-mono text-[9px] text-neutral-600">
              <span>Tokens: {result.stats.tokens}</span>
              <span>Decls: {result.stats.declarations}</span>
              {result.stats.seeds_created != null && <span className="text-emerald-500">Seeds: {result.stats.seeds_created}</span>}
            </div>
          )}
          {result.types && Object.keys(result.types).length > 0 && (
            <div className="mt-1 space-y-0.5">
              <span className="font-mono text-[8px] text-neutral-700 uppercase">Type Env</span>
              {Object.entries(result.types).slice(0, 8).map(([k, v]) => (
                <div key={k} className="font-mono text-[9px] text-neutral-500">
                  <span className="text-primary/70">{k}</span>: {v}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
