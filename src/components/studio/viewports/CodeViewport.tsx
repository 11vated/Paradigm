import { useMemo } from 'react';
import { Code2 } from 'lucide-react';
import type { ViewportProps } from './types';

export default function CodeViewport({ artifact }: ViewportProps) {
  const story = artifact?.story || artifact?.circuit || artifact?.terrain;
  const content = useMemo(() => {
    if (story?.plot) return `Structure: ${story.structure}\nTone: ${story.tone}\nPlot: ${story.plot}\nCharacters: ${(story.characters || []).join(', ')}`;
    if (story) return JSON.stringify(story, null, 2);
    return JSON.stringify(artifact, null, 2).slice(0, 2000);
  }, [artifact]);

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
