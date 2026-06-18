import { useRef, useState, useMemo } from 'react';
import { Play, Square } from 'lucide-react';
import type { ViewportProps } from './types';

export default function AudioViewport({ artifact }: ViewportProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrl = artifact?.artifact?.filePath;

  const waveform = useMemo(() => {
    const notes = artifact?.music?.melody || artifact?.melody || [];
    if (notes.length > 0) return notes.slice(0, 32);
    const music = artifact?.music;
    return music ? [60, 64, 67, 72, 69, 64, 67, 60] : [];
  }, [artifact]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full" data-testid="viewport-audio">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)}
          style={{ display: 'none' }} />
      )}
      <div className="flex items-end gap-1 h-28">
        {waveform.map((note: any, i: any) => (
          <div key={i} className="w-2 bg-primary/60 rounded-t-sm"
            style={{
              height: `${Math.max(8, ((note - 48) / 40) * 100)}%`,
              animation: playing ? `pulse 0.5s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
            }} />
        ))}
      </div>
      <button onClick={togglePlay}
        aria-pressed={playing}
        className="flex items-center gap-2 px-4 py-2 border border-primary/30 text-primary text-xs font-mono uppercase hover:bg-primary/10 transition-colors">
        {playing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        {playing ? 'Stop' : 'Play'}
      </button>
      <div className="text-center">
        <div className="font-mono text-xs text-neutral-500">{artifact?.music?.key || artifact?.audio?.type || ''}</div>
      </div>
    </div>
  );
}
