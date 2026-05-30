import { useMemo, useState } from 'react';
import { Code2, Play, ExternalLink } from 'lucide-react';
import type { ViewportProps } from './types';

export default function CodeViewport({ artifact }: ViewportProps) {
  const story = artifact?.story || artifact?.circuit || artifact?.terrain;
  const isNarrative = artifact?.domain === 'narrative';
  const hasPlayer = !!(artifact?.storyPlayerPath || artifact?.playerHtml || (story && (story as any).storyPlayerPath));

  const [showPlayer, setShowPlayer] = useState(false);

  const content = useMemo(() => {
    if (story?.plot) return `Structure: ${story.structure}\nTone: ${story.tone}\nPlot: ${story.plot}\nCharacters: ${(story.characters || []).join(', ')}`;
    if (story) return JSON.stringify(story, null, 2);
    return JSON.stringify(artifact, null, 2).slice(0, 2200);
  }, [artifact, story]);

  // When we have a real generated Story Player (from narrative elevation), offer the live interactive preview
  if (isNarrative && hasPlayer) {
    return (
      <div className="flex flex-col w-full h-full p-4" data-testid="viewport-code">
        <div className="flex items-center justify-between mb-2 text-neutral-500">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase">NARRATIVE / INTERACTIVE STORY PLAYER</span>
          </div>
          <button
            onClick={() => setShowPlayer(!showPlayer)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border border-neutral-700 hover:border-primary rounded"
          >
            <Play className="w-3 h-3" /> {showPlayer ? 'HIDE PLAYER' : 'LAUNCH LIVE PLAYER'}
          </button>
        </div>

        {showPlayer ? (
          <div className="flex-1 overflow-hidden rounded border border-neutral-800 bg-black/60">
            <div className="h-full w-full flex items-center justify-center text-center p-8">
              <div>
                <div className="text-primary text-sm mb-2">LIVE STORY PLAYER</div>
                <div className="text-xs text-neutral-400 max-w-md">
                  The full interactive seeded Story Player (with gene-driven timing, emotional state, and auto-play) is available in the exported artifact.<br /><br />
                  Click <span className="font-mono text-primary">Export</span> → HTML or the generated <span className="font-mono">_player.html</span> to experience the complete self-contained reader.
                </div>
                <button
                  onClick={() => {
                    // In a real flow this would open the actual player HTML.
                    // For now we surface the existence of the rich artifact.
                    window.alert('Story Player artifact ready — use Export panel or the generated _player.html from grow.');
                  }}
                  className="mt-4 px-4 py-1.5 text-xs font-mono border border-primary/60 hover:bg-primary/10 rounded flex items-center gap-2 mx-auto"
                >
                  OPEN FULL PLAYER <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <pre className="flex-1 overflow-auto p-3 bg-black/40 border border-neutral-800 rounded text-xs font-mono text-neutral-400 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-4" data-testid="viewport-code">
      <div className="flex items-center gap-2 mb-2 text-neutral-500">
        <Code2 className="w-4 h-4" />
        <span className="font-mono text-[10px] uppercase">{artifact?.domain} / text output</span>
      </div>
      <pre className="flex-1 overflow-auto p-3 bg-black/40 border border-neutral-800 rounded text-xs font-mono text-neutral-400 leading-relaxed whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}
