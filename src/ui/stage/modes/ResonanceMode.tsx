import React, { useRef, useEffect } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';

export const ResonanceMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let id: number;

    const draw = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const freq = theme.resonanceHz / 100;
      const bands = 64;
      ctx.beginPath();
      for (let i = 0; i < bands; i++) {
        const x = (i / bands) * w;
        const phase = (i / bands) * Math.PI * 2 + frame * 0.02;
        const y = h / 2 + Math.sin(phase * freq) * (h / 4) + Math.sin(phase * freq * 2.3) * (h / 8);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = theme.core;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = theme.core;
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.shadowBlur = 0;
      for (let i = 0; i < bands; i += 4) {
        const x = (i / bands) * w;
        const phase = (i / bands) * Math.PI * 2 + frame * 0.02;
        const y = h / 2 + Math.sin(phase * freq) * (h / 4) + Math.sin(phase * freq * 2.3) * (h / 8);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = theme.resonant;
        ctx.fill();
      }

      id = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(id);
  }, [theme]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Resonance · Frequency Field</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>{theme.resonanceNote}</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-4)' }}>{theme.resonanceHz}Hz</span>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          style={{ width: '80%', maxWidth: 800, height: 400, borderRadius: 'var(--r-radius-2)', border: '1px solid var(--r-ink-4)', background: 'rgba(255,255,255,0.008)' }}
        />
        <div style={{ position: 'absolute', bottom: 'var(--r-px-5)', left: 'var(--r-px-5)', display: 'flex', gap: 12, fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-4)' }}>
          <span>core · {theme.core}</span>
          <span>resonant · {theme.resonant}</span>
          <span>hz · {theme.resonanceHz}</span>
        </div>
      </div>
    </div>
  );
};
