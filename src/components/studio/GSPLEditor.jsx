import { useState, useRef } from 'react';
import { Code2, Play, AlertCircle } from 'lucide-react';
import { useSeedStore } from '@/stores/seedStore';

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
  const parseGSPLInStore = useSeedStore((s) => s.parseGSPL);
  const executeGSPLInStore = useSeedStore((s) => s.executeGSPL);

  const handleParse = async () => {
    setLoading(true);
    try {
      const res = await parseGSPLInStore(code);
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await executeGSPLInStore(code);
      setResult(res);
      if (res?.seeds?.length > 0 && onSeedFromGSPL) {
        onSeedFromGSPL(res.seeds[0]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#050505]" data-testid="gspl-editor">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a]">
        <div className="flex-1" />
        <button data-testid="gspl-parse-btn" onClick={handleParse} disabled={loading}
          className="px-3 py-1 bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-[#ccc] hover:border-[#555] font-mono text-[9px] uppercase tracking-widest transition-colors rounded-sm">
          Parse
        </button>
        <button data-testid="gspl-execute-btn" onClick={handleExecute} disabled={loading}
          className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 font-mono font-bold text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1.5 rounded-sm">
          <Play className="w-2.5 h-2.5" /> RUN
        </button>
      </div>
      <textarea
        ref={textareaRef}
        data-testid="gspl-code-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 bg-[#080808] p-4 text-[11px] font-mono text-[#ddd] resize-none outline-none leading-relaxed min-h-[200px]"
        spellCheck={false}
        placeholder="// Write GSPL code..."
      />
      {result && (
        <div className="border-t border-[#1a1a1a] p-3 max-h-[200px] overflow-y-auto bg-[#0a0a0a]">
          {result.errors?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-red-500 font-mono text-[9px]">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{e}
                </div>
              ))}
            </div>
          )}
          {result.warnings?.length > 0 && (
            <div className="space-y-1 mb-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="font-mono text-[9px] text-[#ffb800]">{w}</div>
              ))}
            </div>
          )}
          {result.stats && (
            <div className="flex gap-4 font-mono text-[9px] text-[#555] uppercase tracking-widest mb-2">
              <span>Tokens: <strong className="text-[#888]">{result.stats.tokens}</strong></span>
              <span>Decls: <strong className="text-[#888]">{result.stats.declarations}</strong></span>
              {result.stats.seeds_created != null && <span className="text-secondary">Seeds: {result.stats.seeds_created}</span>}
            </div>
          )}
          {result.types && Object.keys(result.types).length > 0 && (
            <div className="mt-2 space-y-1 border-t border-[#222] pt-2">
              <span className="font-mono text-[8px] text-[#444] uppercase tracking-widest">Type Env</span>
              {Object.entries(result.types).slice(0, 8).map(([k, v]) => (
                <div key={k} className="font-mono text-[9px] text-[#666]">
                  <span className="text-primary tracking-widest">{k}</span>: {v}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
