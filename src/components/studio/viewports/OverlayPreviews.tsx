import { useEffect, useRef } from 'react';
import { Dna } from 'lucide-react';
import { DOMAIN_COLORS as DOMAIN_COLORS_HEX } from '@/lib/constants';
import type { ViewportProps } from './types';

export function CharacterPreview({ artifact }: ViewportProps) {
  const domainColor = DOMAIN_COLORS_HEX[artifact?.domain] || '#00E5FF';
  return (
    <div className="flex flex-col items-center gap-6" data-testid="preview-character">
      <div className="w-24 h-32 rounded-sm border border-neutral-800"
        style={{ background: `${domainColor}20`, boxShadow: `0 0 40px ${domainColor}33` }} />
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] text-primary uppercase tracking-wider">{artifact.domain}</div>
      </div>
    </div>
  );
}

export function MusicPreview({ artifact }: ViewportProps) {
  const melody = Array.isArray(artifact?.preview_slice) ? artifact.preview_slice : [];
  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-music">
      <div className="w-56 h-28 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-neutral-800 flex items-center justify-center">
        <div className="flex items-end gap-1 h-20">
          {(melody.length > 0 ? melody.slice(0, 12) : [60, 64, 67, 72, 69, 64, 67, 60]).map((note, i) => (
            <div key={i} className="w-3 bg-primary/60 rounded-t-sm"
              style={{ height: `${Math.max(10, ((note - 48) / 40) * 100)}%` }} />
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] text-neutral-500">{artifact.domain}</div>
      </div>
    </div>
  );
}

export function SpritePreview({ artifact }: ViewportProps) {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-sprite">
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-12 h-12 border border-neutral-800 rounded"
            style={{ background: `hsl(${(i * 45 + (artifact?.seed_hash?.charCodeAt(0) || 0)) % 360}, 60%, ${30 + i * 5}%)` }} />
        ))}
      </div>
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] text-neutral-500">Sprite / {artifact?.visual?.resolution || 32}px</div>
      </div>
    </div>
  );
}

export function GenericPreview({ artifact }: ViewportProps) {
  const c = DOMAIN_COLORS_HEX[artifact?.domain] || '#00E5FF';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!artifact?.preview_slice || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const slice = artifact.preview_slice;
    const size = Math.sqrt(slice.length);
    if (!Number.isInteger(size) || size === 0) return;
    canvas.width = size; canvas.height = size;
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < slice.length; i++) {
      const val = Math.max(0, Math.min(1, slice[i]));
      imgData.data[i * 4] = Math.min(255, val * 255 * 5);
      imgData.data[i * 4 + 1] = Math.min(255, (val * 5 - 0.5) * 255);
      imgData.data[i * 4 + 2] = Math.max(0, 255 - val * 255 * 2);
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }, [artifact?.preview_slice]);

  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-generic">
      {artifact?.preview_slice ? (
        <div className="w-32 h-32 border border-neutral-800 p-1 bg-black">
          <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>
      ) : (
        <div className="w-24 h-24 border border-neutral-800 flex items-center justify-center"
          style={{ background: `${c}10`, boxShadow: `0 0 60px ${c}15` }}>
          <Dna className="w-10 h-10" style={{ color: `${c}40` }} />
        </div>
      )}
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact?.name}</div>
        <div className="font-mono text-[10px] uppercase" style={{ color: c }}>{artifact?.domain} / Gen {artifact?.generation}</div>
      </div>
    </div>
  );
}

export function ArtifactInfo({ artifact }: ViewportProps) {
  if (!artifact) return null;
  const type = artifact.type || artifact.domain;
  if (type === 'character' || type === 'agent') return <CharacterPreview artifact={artifact} />;
  if (type === 'music') return <MusicPreview artifact={artifact} />;
  if (type === 'sprite') return <SpritePreview artifact={artifact} />;
  return <GenericPreview artifact={artifact} />;
}
