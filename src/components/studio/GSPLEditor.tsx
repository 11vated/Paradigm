import React, { useState, useRef } from 'react';
import { Play, AlertCircle } from 'lucide-react';
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

const GSPLEditor = React.memo(function GSPLEditor({ onSeedFromGSPL }: { onSeedFromGSPL?: any }) {
  const gsplDraftFromStore = useSeedStore((s: any) => s.gsplDraft);
  const setGsplDraftInStore = useSeedStore((s: any) => s.setGsplDraft);
  const [code, setCode] = useState(gsplDraftFromStore || DEFAULT_CODE);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const parseGSPLInStore = useSeedStore((s: any) => s.parseGSPL);
  const executeGSPLInStore = useSeedStore((s: any) => s.executeGSPL);

  // Hybrid sync: when store draft changes (e.g. from GeneEditor strata controls), update editor. On local edit, push to store for seamlessness.
  React.useEffect(() => {
    if (gsplDraftFromStore && gsplDraftFromStore !== code) {
      setCode(gsplDraftFromStore);
    }
  }, [gsplDraftFromStore]);

  const updateCode = (newCode: string) => {
    setCode(newCode);
    setGsplDraftInStore(newCode);
  };

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
      setGsplDraftInStore(code); // keep hybrid draft in sync for seamlessness across panels
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
          <Play className="w-2.5 h-2.5" aria-hidden="true" /> RUN
        </button>
        <button
          onClick={() => {
            const frag = (useSeedStore.getState() as any).getStrataGsplFragment ? (useSeedStore.getState() as any).getStrataGsplFragment() : '';
            if (frag) {
              updateCode(code + '\n\n// inserted live strata constraints from GeneEditor preview\n' + frag);
            }
          }}
          className="px-2 py-1 text-[8px] border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950 uppercase tracking-widest"
          title="Insert current strata preview GSPL fragment (from GeneEditor visual controls) for hybrid seamlessness"
        >
          + Strata
        </button>
      </div>
      <textarea
        ref={textareaRef}
        data-testid="gspl-code-input"
        value={code}
        onChange={(e) => updateCode(e.target.value)}
        className="flex-1 bg-[#080808] p-4 text-[11px] font-mono text-[#ddd] resize-none outline-none leading-relaxed min-h-[200px]"
        spellCheck={false}
        placeholder="// Write GSPL code..."
        aria-label="GSPL code editor"
      />
      {result && (
        <div className="border-t border-[#1a1a1a] p-3 max-h-[240px] overflow-y-auto bg-[#0a0a0a]">
          {/* Real GSPL Schema Ownership — constraints now visible while authoring */}
          {result.schemas && Object.keys(result.schemas).length > 0 && (
            <div className="mb-3 border border-[#223] bg-[#111] rounded-sm p-2">
              <div className="text-[9px] uppercase tracking-[1.5px] text-emerald-400 mb-1.5 font-mono flex items-center gap-1.5">
                <span>GSPL SCHEMAS ACTIVE</span>
                <span className="text-[#555]">— constraints govern generation</span>
              </div>
              {Object.entries(result.schemas).map(([domain, info]: any) => {
                // Lightweight client validation against loaded schema (real GSPL ownership in Studio)
                const violations: string[] = [];
                try {
                  const schemaText: string = info.content || '';
                  const scalarRanges = new Map<string, {min:number,max:number}>();
                  const catOpts = new Map<string, string[]>();
                  const geneRe = /gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g;
                  let m;
                  while ((m = geneRe.exec(schemaText)) !== null) {
                    const nm = m[1];
                    if (m[2] === 'scalar' && m[3]) {
                      const nums = m[3].match(/[\d.]+/g);
                      if (nums && nums.length>=2) scalarRanges.set(nm, {min:parseFloat(nums[0]), max:parseFloat(nums[1])});
                    } else if (m[2] === 'categorical' && m[3]) {
                      const items = m[3].match(/"([^"]+)"|'([^']+)'/g);
                      if (items) catOpts.set(nm, items.map(s=>s.replace(/['"]/g,'')));
                    }
                  }
                  // Scan user code for simple gene: value
                  const codeLines = code.split('\n');
                  codeLines.forEach((line: string) => {
                    const assign = line.match(/(\w+)\s*[:=]\s*([^\s,]+)/);
                    if (assign) {
                      const [_, nm, valStr] = assign;
                      if (scalarRanges.has(nm)) {
                        const v = parseFloat(valStr);
                        const r = scalarRanges.get(nm)!;
                        if (!isNaN(v) && (v < r.min || v > r.max)) violations.push(`${nm}: ${v} outside [${r.min},${r.max}]`);
                      }
                      if (catOpts.has(nm)) {
                        const opts = catOpts.get(nm)!;
                        const clean = valStr.replace(/['"]/g,'');
                        if (!opts.includes(clean)) violations.push(`${nm}: "${clean}" not in [${opts.join(',')}]`);
                      }
                    }
                  });
                } catch { /* swallow: best-effort editor probe, autocomplete is non-critical */ }
                return (
                  <div key={domain} className="mb-2 last:mb-0">
                    <div className="text-[10px] font-mono text-[#8f8] mb-0.5">{domain}.gspl <span className="text-[#555] text-[8px]">({info.path})</span></div>
                    {violations.length > 0 && (
                      <div className="text-[8px] text-red-400 mb-1">⚠ {violations.join(' | ')}</div>
                    )}
                    <pre className="text-[9px] font-mono text-[#aaa] bg-black/40 p-1.5 rounded overflow-x-auto leading-tight max-h-[92px] whitespace-pre-wrap">{(info.content || '').slice(0, 900)}{info.content?.length > 900 ? '…' : ''}</pre>
                  </div>
                );
              })}
            </div>
          )}
          {result.errors?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {result.errors.map((e: any, i: any) => (
                <div key={i} className="flex items-start gap-2 text-red-500 font-mono text-[9px]">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{e}
                </div>
              ))}
            </div>
          )}
          {result.warnings?.length > 0 && (
            <div className="space-y-1 mb-2">
              {result.warnings.map((w: any, i: any) => (
                <div key={i} className="font-mono text-[9px] text-[#ffb800]">{w}</div>
              ))}
            </div>
          )}
          {result.stats && (
            <div className="flex gap-4 font-mono text-[9px] text-[#999] uppercase tracking-widest mb-2">
              <span>Tokens: <strong className="text-[#bbb]">{result.stats.tokens}</strong></span>
              <span>Decls: <strong className="text-[#bbb]">{result.stats.declarations}</strong></span>
              {result.stats.seeds_created != null && <span className="text-secondary">Seeds: {result.stats.seeds_created}</span>}
            </div>
          )}
          {result.types && Object.keys(result.types).length > 0 && (
            <div className="mt-2 space-y-1 border-t border-[#222] pt-2">
              <span className="font-mono text-[8px] text-[#777] uppercase tracking-widest">Type Env</span>
              {Object.entries(result.types).slice(0, 8).map(([k, v]) => (
                <div key={k} className="font-mono text-[9px] text-[#999]">
                  <span className="text-primary tracking-widest">{k}</span>: {v as any}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
})

export default GSPLEditor;
