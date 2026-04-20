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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] max-w-2xl z-20" data-testid="prompt-bar-container">
      <form onSubmit={handleSubmit} className="bg-[#0a0a0a]/90 backdrop-blur-md border border-[#222] shadow-2xl flex items-center gap-3 px-4 py-3 rounded-md">
        <Sparkles className="w-4 h-4 text-primary shrink-0 opacity-80" />
        <input
          data-testid="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your creation... (e.g., 'a menacing iron warrior')"
          className="flex-1 bg-transparent text-sm text-[#eee] placeholder-[#555] outline-none font-mono"
          disabled={loading}
        />
        <button
          data-testid="prompt-submit-btn"
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-sm font-mono text-[10px] uppercase tracking-widest hover:bg-primary/20 hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px]"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate'}
        </button>
      </form>
    </div>
  );
}
