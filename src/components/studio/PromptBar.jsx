import { useState } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PromptBar({ onSeedCreated, value: externalValue, onChange: externalOnChange }) {
  const [internalPrompt, setInternalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const generateNewSeed = useSeedStore((s) => s.generateNewSeed);

  const isControlled = externalValue !== undefined;
  const prompt = isControlled ? externalValue : internalPrompt;
  const setPrompt = isControlled ? externalOnChange || (() => {}) : setInternalPrompt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (onSeedCreated) {
        const seed = await generateNewSeed(prompt.trim());
        onSeedCreated(seed);
      }
      if (!isControlled) setPrompt('');
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err.message || 'Generation failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3" data-testid="prompt-bar-container">
      <Sparkles size={14} style={{ color: 'var(--p-cyan)', opacity: 0.6, flexShrink: 0 }} />
      <input
        data-testid="prompt-input"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your creation... (e.g., 'a menacing iron warrior')"
        disabled={loading}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          fontSize: 13, color: 'var(--p-text)', fontFamily: 'var(--p-font-mono)',
        }}
        className="placeholder:text-[#555]"
      />
      {loading && <Loader2 size={14} style={{ color: 'var(--p-cyan)', animation: 'spin 1s linear infinite' }} />}
      {error && (
        <span style={{ 
          color: 'var(--p-rose)', fontSize: 11, fontFamily: 'var(--p-font-mono)',
          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {error}
        </span>
      )}
      <button
        data-testid="prompt-submit-btn"
        type="submit"
        disabled={loading || !prompt.trim()}
        style={{
          padding: '5px 16px', border: 'none', borderRadius: 6, cursor: 'pointer',
          fontFamily: 'var(--p-font-mono)', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.8,
          color: 'var(--p-cyan)', background: 'rgba(0, 229, 255, 0.1)',
          opacity: loading || !prompt.trim() ? 0.4 : 1,
          transition: 'all var(--p-dur-fast) var(--p-ease-organic)',
        }}
        onMouseEnter={(e) => { if (!loading && prompt.trim()) e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'; }}
      >
        Generate
      </button>
    </form>
  );
}
