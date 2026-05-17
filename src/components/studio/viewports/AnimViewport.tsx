import { useState, useEffect } from 'react';
import { Dna } from 'lucide-react';
import { DOMAIN_COLORS as DOMAIN_COLORS_HEX } from '@/lib/constants';
import type { ViewportProps } from './types';

export default function AnimViewport({ artifact }: ViewportProps) {
  const anim = artifact?.animation || artifact?.dance;
  const frameCount = anim?.frame_count || anim?.moveCount || 8;
  const fps = anim?.fps || 12;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % frameCount);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [frameCount, fps]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4" data-testid="viewport-anim">
      <div className="relative w-48 h-48 border border-neutral-800 rounded bg-black/40 flex items-center justify-center">
        {Array.from({ length: frameCount }).map((_, i) => (
          <div key={i} className="absolute inset-0 flex items-center justify-center transition-opacity duration-100"
            style={{ opacity: i === frame ? 1 : 0 }}>
            <Dna className="w-20 h-20" style={{ color: `${DOMAIN_COLORS_HEX[artifact?.domain] || '#00E5FF'}${Math.max(20, 100 - i * 8)}` }} />
          </div>
        ))}
        <div className="absolute bottom-2 left-2 right-2 flex gap-0.5">
          {Array.from({ length: Math.min(frameCount, 16) }).map((_, i) => (
            <div key={i} className={`flex-1 h-0.5 rounded ${i === frame ? 'bg-primary' : 'bg-neutral-800'}`} />
          ))}
        </div>
      </div>
      <div className="font-mono text-[10px] text-neutral-500">{frame + 1}/{frameCount} frames @ {fps}fps</div>
      <div className="font-mono text-[10px] text-neutral-600">{anim?.motion_type || anim?.style || ''}</div>
    </div>
  );
}
