import { useState } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { Sparkles, Loader2 } from 'lucide-react';

type SeedLike = { $hash?: string; id?: string; [k: string]: unknown };
export default function PromptBar({ onSeedCreated, value: externalValue, onChange: externalOnChange }: { onSeedCreated?: (s: SeedLike) => void; value?: string; onChange?: (v: string) => void }) {
  const [internalPrompt, setInternalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateNewSeed = useSeedStore((s: unknown) => (s as any).generateNewSeed); // any: zustand store internal; justified same-line (no global, matches prior store usage)

  const isControlled = externalValue !== undefined;
  const prompt = isControlled ? externalValue : internalPrompt;
  const setPrompt = isControlled ? externalOnChange || (() => {}) : setInternalPrompt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    if (typeof performance !== 'undefined') {
      performance.mark('studio-prompt-submit'); // measurable timing start for studio prompt -> artifact (<60s claim)
    }
    setLoading(true);
    setError(null);
    try {
      if (onSeedCreated) {
        const seed = await generateNewSeed(prompt.trim());
        onSeedCreated(seed);
      }
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
        {loading && <Loader2 size={14} aria-hidden="true" style={{ color: 'var(--p-cyan)', animation: 'spin 1s linear infinite' }} className="motion-reduce:animate-none" />}
        {error && (
          <span role="alert" aria-live="assertive" style={{ 
            color: 'var(--p-rose)', fontSize: 11, fontFamily: 'var(--p-font-mono)',
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }} className="text-rose-400">
            {error}
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
      </form>
    </>
  );
}
