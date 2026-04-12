import { useState } from 'react';
import { generateSeed } from '@/services/api';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PromptBar({ onSeedCreated }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const seed = await generateSeed(prompt.trim());
      onSeedCreated(seed);
      setPrompt('');
    } catch (err) {
      console.error('Generation failed:', err);
    }
    setLoading(false);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20" data-testid="prompt-bar-container">
      <form onSubmit={handleSubmit} className="prompt-glow bg-[#0a0a0a] border border-neutral-700 flex items-center gap-2 px-4 py-2" role="search" aria-label="Generate seed from prompt">
        <Sparkles className="w-4 h-4 text-orange-500 shrink-0" aria-hidden="true" />
        <input
          data-testid="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your creation... (e.g., 'a menacing iron warrior')"
          aria-label="Describe your creation"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 font-mono"
          disabled={loading}
        />
        <button
          data-testid="prompt-submit-btn"
          type="submit"
          disabled={loading || !prompt.trim()}
          aria-label={loading ? 'Generating seed...' : 'Generate seed'}
          className="px-4 py-1.5 bg-orange-500 text-black font-bold text-[10px] uppercase tracking-wider hover:bg-orange-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : 'Generate'}
        </button>
      </form>
    </div>
  );
}
