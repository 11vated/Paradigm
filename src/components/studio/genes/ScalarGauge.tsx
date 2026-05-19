import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ScalarGauge — High-precision gauge for scalar genes [0,1].
 * Shows a horizontal bar with glowing fill, ghost trail of previous value,
 * and a numeric readout in JetBrains Mono.
 */
export default function ScalarGauge({ value = 0.5, onChange, label, color = '#00E5FF' }) {
  const [dragging, setDragging] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const [showGhost, setShowGhost] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    if (Math.abs(value - prevValue) > 0.01) {
      setShowGhost(true);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setShowGhost(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const handlePointerDown = (e) => {
    setDragging(true);
    updateFromPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    updateFromPointer(e);
  };

  const handlePointerUp = () => setDragging(false);

  const updateFromPointer = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange?.(+x.toFixed(3));
  };

  const pct = Math.max(0, Math.min(100, value * 100));
  const ghostPct = Math.max(0, Math.min(100, prevValue * 100));

  return (
    <div className="flex items-center gap-3 group">
      {/* Track */}
      <div
        ref={trackRef}
        className="flex-1 h-6 relative cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background track */}
        <div className="absolute inset-0 rounded-sm bg-[#111] border border-[#1a1a1a] overflow-hidden">
          {/* Ghost trail (previous value) */}
          {showGhost && (
            <div
              className="absolute top-0 bottom-0 left-0 opacity-30 transition-opacity duration-700"
              style={{ width: `${ghostPct}%`, background: color }}
            />
          )}

          {/* Active fill */}
          <motion.div
            className="absolute top-0 bottom-0 left-0"
            style={{ background: color }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          {/* Glow line at the edge */}
          <motion.div
            className="absolute top-0 bottom-0 w-px"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}, 0 0 16px ${color}40`,
            }}
            animate={{ left: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          {/* Scanline effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 animate-scanline" style={{
              background: `linear-gradient(transparent, ${color}10, transparent)`,
              height: '50%',
            }} />
          </div>
        </div>

        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-[1px] pointer-events-none">
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <div key={t} className="w-px h-1 bg-[#333] self-end" />
          ))}
        </div>
      </div>

      {/* Numeric readout */}
      <div className="w-14 text-right font-mono text-[11px] tabular-nums" style={{ color }}>
        <motion.span
          key={value.toFixed(3)}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {value.toFixed(3)}
        </motion.span>
      </div>
    </div>
  );
}
