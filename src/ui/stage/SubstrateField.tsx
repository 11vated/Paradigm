/**
 * SubstrateField — animated procedural background behind the CenterStage.
 *
 * Per spec §VIII.9. Reads active seed hash, derives a deterministic flow-field
 * via the kernel's xoshiro RNG, and animates 200 particles tracing it. The
 * background morphs when the active seed changes.
 *
 * Rendered into <canvas>. Uses requestAnimationFrame. Pauses when not visible.
 */
import React, { useEffect, useRef } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { rngFromHash } from '@/lib/kernel/rng';
import { useDomainColor } from '@/hooks/useDomainColor';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; }

const PARTICLE_COUNT = 220;
const PARTICLE_LIFE = 280; // frames

export const SubstrateField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const seed: any = useActiveSeed((s: any) => s.seed);
  const hash = seed?.hash ?? seed?.$hash ?? 'paradigm-substrate';
  const color = useDomainColor(seed?.domain ?? seed?.$domain ?? 'default');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.floor(r.width);
      H = Math.floor(r.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Derive parameters from active seed hash (deterministic)
    const rng = rngFromHash(hash);
    const noiseScale = 0.0035 + rng.nextF64() * 0.0045; // larger → more curves
    const flowSpeed = 0.6 + rng.nextF64() * 0.7;
    const rotationBias = (rng.nextF64() - 0.5) * 0.6; // global rotation tendency
    const symmetry = rng.nextChoice([1, 2, 3, 4, 6]);  // n-fold rotational symmetry

    // Seed-stable noise lookup via 2-octave value noise sampled at integer lattice
    const lattice: number[][] = [];
    const LATTICE = 32;
    for (let i = 0; i < LATTICE; i++) {
      const row: number[] = [];
      for (let j = 0; j < LATTICE; j++) row.push(rng.nextF64());
      lattice.push(row);
    }
    const sampleField = (x: number, y: number): number => {
      const u = ((x * noiseScale) % 1 + 1) % 1;
      const v = ((y * noiseScale) % 1 + 1) % 1;
      const i = Math.floor(u * LATTICE);
      const j = Math.floor(v * LATTICE);
      const i1 = (i + 1) % LATTICE;
      const j1 = (j + 1) % LATTICE;
      const fu = u * LATTICE - i;
      const fv = v * LATTICE - j;
      const a = lattice[i][j];
      const b = lattice[i1][j];
      const c = lattice[i][j1];
      const d = lattice[i1][j1];
      const ab = a * (1 - fu) + b * fu;
      const cd = c * (1 - fu) + d * fu;
      return ab * (1 - fv) + cd * fv;
    };

    // Initialize particles
    const particles: Particle[] = [];
    for (let k = 0; k < PARTICLE_COUNT; k++) {
      particles.push({
        x: rng.nextF64() * 1500,
        y: rng.nextF64() * 1000,
        vx: 0,
        vy: 0,
        life: rng.nextInt(0, PARTICLE_LIFE - 1),
      });
    }

    // Parse the prism color hex to RGB tuple for alpha-blended strokes
    let R = 124, G = 71, B = 239;
    const m = /^#([0-9a-fA-F]{6})$/.exec(color || '');
    if (m) {
      R = parseInt(m[1].slice(0, 2), 16);
      G = parseInt(m[1].slice(2, 4), 16);
      B = parseInt(m[1].slice(4, 6), 16);
    }

    let visible = true;
    const onVis = () => { visible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    const step = () => {
      animRef.current = requestAnimationFrame(step);
      if (!visible) return;

      // Trailing fade — paint a translucent black over the previous frame
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(3, 3, 6, 0.06)';
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.6;

      for (const p of particles) {
        // Flow direction from noise field + rotation bias + symmetry axis
        const n = sampleField(p.x, p.y);
        const baseAngle = n * Math.PI * 2 + rotationBias;
        // n-fold symmetry: project x,y to angular sector
        const cx = W / 2, cy = H / 2;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const theta = Math.atan2(dy, dx);
        const sector = (Math.PI * 2) / symmetry;
        const folded = theta - Math.floor(theta / sector) * sector;
        const ang = baseAngle + folded * 0.3;

        p.vx = Math.cos(ang) * flowSpeed;
        p.vy = Math.sin(ang) * flowSpeed;
        const nx = p.x + p.vx;
        const ny = p.y + p.vy;

        // Particle alpha: low — barely-there substrate
        const a = 0.10 + Math.min(0.20, (1 - Math.abs(0.5 - (p.life / PARTICLE_LIFE))));
        ctx.strokeStyle = `rgba(${R},${G},${B},${(a * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        p.x = nx;
        p.y = ny;
        p.life++;

        // Respawn at edges or end-of-life
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life > PARTICLE_LIFE) {
          p.x = rng.nextF64() * W;
          p.y = rng.nextF64() * H;
          p.life = 0;
        }
      }
    };

    // Prime background
    ctx.fillStyle = 'rgba(3, 3, 6, 1)';
    ctx.fillRect(0, 0, W, H);
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hash, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="p-substrate-canvas"
    />
  );
};
