import { Gamepad2 } from 'lucide-react';
import type { ViewportProps } from './types';

export default function GameViewport({ artifact }: ViewportProps) {
  const gamePath = artifact?.artifact?.filePath;
  return (
    <div className="flex flex-col items-center w-full h-full" data-testid="viewport-game">
      {gamePath && gamePath.endsWith('.html') ? (
        <iframe src={gamePath} className="w-full h-full border-0" title="Game Preview"
          sandbox="allow-scripts allow-same-origin" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 h-full text-neutral-500">
          <Gamepad2 className="w-16 h-16" />
          <span className="font-mono text-xs">Game preview requires HTML export</span>
          <div className="font-mono text-[10px] text-neutral-700">{artifact?.game?.genre || ''}</div>
        </div>
      )}
    </div>
  );
}
