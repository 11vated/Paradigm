import { useState } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { Sparkles, Loader2 } from 'lucide-react';

type SeedLike = { $hash?: string; id?: string; [k: string]: unknown };
export default function PromptBar({ onSeedCreated, value: externalValue, onChange: externalOnChange }: { onSeedCreated?: (s: SeedLike) => void; value?: string; onChange?: (v: string) => void }) {
  const [internalPrompt, setInternalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateNewSeed = useSeedStore((s: unknown) => (s as any).generateNewSeed);
  const executeGSPL = useSeedStore((s: unknown) => (s as any).executeGSPL);
  const setGsplDraft = useSeedStore((s: unknown) => (s as any).setGsplDraft);
  const loadArtifactToGsplDraft = useSeedStore((s: unknown) => (s as any).loadArtifactToGsplDraft);
  const getHybridStatus = useSeedStore((s: unknown) => (s as any).getHybridStatus);

  const isControlled = externalValue !== undefined;
  const prompt = isControlled ? externalValue : internalPrompt;
  const setPrompt = isControlled ? externalOnChange || (() => {}) : setInternalPrompt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    if (typeof performance !== 'undefined') {
      performance.mark('studio-prompt-submit');
    }
    setLoading(true);
    setError(null);
    try {
      const p = prompt.trim();
      const looksGspl = /seed\s|grow\s|mutate\s|breed\s|strata:/i.test(p);
      let result: any;
      if (looksGspl && executeGSPL) {
        // Wave 1: direct GSPL path for seamlessness (execute then load to hybrid editor)
        result = await executeGSPL(p);
        setGsplDraft(p);
        if (result && loadArtifactToGsplDraft) loadArtifactToGsplDraft(result);
      } else {
        result = await generateNewSeed(p);
        // post-gen: auto-load any gsplSource/canonical for hybrid (supremacy + lived)
        if (result && loadArtifactToGsplDraft) loadArtifactToGsplDraft(result);
      }
      if (onSeedCreated) onSeedCreated(result);
      if (!isControlled) setPrompt('');
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      setError((err as Error)?.message || 'Generation failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-center gap-3" data-testid="prompt-bar-container" aria-label="Studio prompt to create seed (first artifact target &lt;60s)">
        <Sparkles size={14} aria-hidden="true" style={{ color: 'var(--p-cyan)', opacity: 0.6, flexShrink: 0 }} />
        <input
          data-testid="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your creation... (e.g., 'a menacing iron warrior')"
          aria-label="Creation prompt input. Submit to grow first rich artifact."
          disabled={loading}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--p-text)', fontFamily: 'var(--p-font-mono)',
          }}
          className="placeholder:text-zinc-600 min-h-[44px] touch-manipulation focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-400"
        />
        {loading && <><Loader2 size={14} aria-hidden="true" style={{ color: 'var(--p-cyan)', animation: 'spin 1s linear infinite' }} className="motion-reduce:animate-none" /> <span style={{fontSize:10,color:'var(--p-cyan)'}}>Evolving seed…</span></>}
        {error && (
          <span role="alert" aria-live="assertive" style={{ 
            color: 'var(--p-rose)', fontSize: 11, fontFamily: 'var(--p-font-mono)',
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }} className="text-rose-400">
            {error}
            <button onClick={() => {
              const gsplFix = `seed s1 in character { strata: Form + Mind; } grow s1; // suggested GSPL fix for error: ${error}`;
              const store = (window as any).useSeedStore?.getState?.();
              if (store?.setGsplDraft) store.setGsplDraft(gsplFix);
            }} className="ml-1 text-[8px] underline">Try GSPL</button>
          </span>
        )}
        <button
          data-testid="prompt-submit-btn"
          type="submit"
          disabled={loading || !prompt.trim()}
          aria-label="Submit prompt to generate seed and first artifact"
          style={{
            padding: '5px 16px', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--p-font-mono)', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.8,
            color: 'var(--p-cyan)', background: 'rgba(0, 229, 255, 0.1)',
            opacity: loading || !prompt.trim() ? 0.4 : 1,
            transition: 'all var(--p-dur-fast) var(--p-ease-organic)',
          }}
          className="min-h-[44px] touch-manipulation motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          onMouseEnter={(e) => { if (!loading && prompt.trim()) e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'; }}
        >
          Generate
        </button>
        {/* small surgical OS exposure per task: note for recursive .gseed + paradigmOSShell (Part 6 / Phases 22-23); option via CLI --recursive too */}
        <div role="note" aria-label="Recursive .gseed compose option for OS shell" className="text-[9px] text-zinc-500 mt-1 font-mono">Tip: prefix intent with "recursive .gseed compose of ..." (or --recursive in CLI) to invoke paradigmOSShell recursive .gseed (Fed/Econ/OS Part6)</div>

        {/* Wave 1/2 extension: full quick strata (all 9) for global live hybrid seamlessness + GSPL frag in PromptBar (any intent primary) */}
        <div className="flex gap-1 text-[7px] font-mono mt-1 flex-wrap" aria-label="Quick strata constraints (all 9) for hybrid GSPL seamlessness — sets live preview % + frag ready">
          {['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'].map(s => (
            <button key={s} onClick={() => {
              const store = (window as any).useSeedStore?.getState?.();
              if (store?.setStrataConstraint) store.setStrataConstraint(s, 0.85);
            }} className="px-0.5 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/60" title={`Boost ${s} stratum (live % preview + GSPL frag)`}>+{s}</button>
          ))}
          <button onClick={() => {
            const store = (window as any).useSeedStore?.getState?.();
            if (store?.getStrataGsplFragment && store?.setGsplDraft) {
              const frag = store.getStrataGsplFragment();
              store.setGsplDraft((store.gsplDraft || '') + '\n\n' + frag);
            }
          }} className="px-1 border border-primary/40 text-primary hover:bg-primary/10" title="Insert current strata as GSPL fragment (hybrid seamlessness)">+GSPL frag</button>
        </div>
      </form>
    </>
  );
}
