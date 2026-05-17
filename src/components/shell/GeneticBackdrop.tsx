import { useRef, useEffect } from 'react';
import { Xoshiro256StarStar } from '@/lib/kernel/rng';

interface GeneticBackdropProps {
  seed?: string;
  opacity?: number;
  fps?: number;
}

function generateFlowField(
  ctx: CanvasRenderingContext2D,
  rng: Xoshiro256StarStar,
  w: number,
  h: number,
  time: number,
) {
  const cols = Math.ceil(w / 48);
  const rows = Math.ceil(h / 48);
  const scale = 0.004;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const px = x * 48;
      const py = y * 48;
      const angle = rng.nextF64() * Math.PI * 2 + time * 0.0003;

      const nx = px + Math.cos(angle + px * scale + py * scale) * 16;
      const ny = py + Math.sin(angle + px * scale + py * scale) * 16;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

export function GeneticBackdrop({
  seed = 'paradigm-backdrop',
  opacity = 0.04,
  fps = 24,
}: GeneticBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rng = new Xoshiro256StarStar(seed);
    let animId = 0;
    let frameTime = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const interval = 1000 / fps;
    let last = performance.now();

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const delta = now - last;
      if (delta < interval) return;
      last = now - (delta % interval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      frameTime += delta;
      generateFlowField(ctx, rng, canvas.width, canvas.height, frameTime);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [seed, fps]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity }}
    />
  );
}
