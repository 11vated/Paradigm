import { useRef, useEffect, useCallback } from 'react';

/**
 * ResonanceWave — Canvas-based oscilloscope for resonance/temporal genes.
 * Renders a live waveform derived from gene values at 60fps.
 */
export default function ResonanceWave({ value = {}, color = '#00E5FF', height = 48 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  // Extract waveform parameters from gene value
  const frequency = typeof value === 'object' ? (value.frequency || value.fundamental || 440) : (typeof value === 'number' ? value : 440);
  const amplitude = typeof value === 'object' ? (value.amplitude || 0.8) : 0.8;
  const harmonics = typeof value === 'object' ? (value.harmonics || 3) : 3;
  const phase = typeof value === 'object' ? (value.phase || 0) : 0;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const mid = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    timeRef.current += 0.02;
    const t = timeRef.current;

    // Main waveform
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    for (let x = 0; x < w; x++) {
      const xNorm = x / w;
      let y = 0;
      // Sum harmonics
      for (let h = 1; h <= harmonics; h++) {
        const freq = (frequency / 1000) * h;
        const amp = amplitude / h;
        y += amp * Math.sin(2 * Math.PI * freq * xNorm + t * (2 + h * 0.5) + phase * h);
      }
      const py = mid + y * mid * 0.7;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle fill
    ctx.lineTo(w, mid);
    ctx.lineTo(0, mid);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, `${color}08`);
    gradient.addColorStop(0.5, `${color}15`);
    gradient.addColorStop(1, `${color}08`);
    ctx.fillStyle = gradient;
    ctx.fill();

    frameRef.current = requestAnimationFrame(draw);
  }, [frequency, amplitude, harmonics, phase, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = height * 2;
      canvas.style.width = '100%';
      canvas.style.height = `${height}px`;
    }
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw, height]);

  return (
    <div className="relative overflow-hidden rounded-sm border border-[#1a1a1a]">
      <canvas ref={canvasRef} className="block w-full" style={{ height: `${height}px` }} />
      {/* Frequency readout */}
      <div className="absolute bottom-1 right-2 font-mono text-[8px] text-neutral-600">
        {frequency.toFixed(0)} Hz / {harmonics}H
      </div>
    </div>
  );
}
