/**
 * EmptyState — the substrate before creation.
 * First thing users see. Must communicate: "this is a new kind of thing."
 */
import React, { useState, useEffect } from 'react';

interface EmptyStateProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

const GENESIS_PROMPTS = [
  { domain: 'world',     text: 'A ancient archipelago world with six warring factions' },
  { domain: 'music',     text: 'A generative jazz composition in D minor, 143 BPM' },
  { domain: 'visual2d',  text: 'A luminous geometric mandala in deep violet and gold' },
  { domain: 'molecule',  text: 'Caffeine: C8H10N4O2, optimized geometry' },
  { domain: 'quantum',   text: 'A double-well potential wavefunction, delocalized state' },
  { domain: 'website',   text: 'A brutalist portfolio site for a digital sculptor' },
  { domain: 'game',      text: 'A roguelike dungeon with procedural karma mechanics' },
  { domain: 'cosmology', text: 'A spiral galaxy collision, 200 bodies, Barnes-Hut' },
];

// Animated diamond glyph — the Paradigm mark in its latent state
const LatentMark: React.FC = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="mark-grd" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.9"/>
        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.3"/>
      </radialGradient>
    </defs>
    {/* Outer ring */}
    <path
      d="M36 4L68 36L36 68L4 36Z"
      stroke="#7C3AED"
      strokeWidth="1"
      fill="none"
      strokeDasharray="4 4"
      style={{ animation: 'r-spin-slow 20s linear infinite' }}
    />
    {/* Mid diamond */}
    <path d="M36 16L56 36L36 56L16 36Z" stroke="#7C3AED" strokeWidth="1" fill="none" opacity="0.5"/>
    {/* Core */}
    <path d="M36 24L48 36L36 48L24 36Z" fill="url(#mark-grd)"/>
    {/* Center void */}
    <circle cx="36" cy="36" r="5" fill="#030306"/>
    {/* Crosshairs */}
    <line x1="36" y1="2" x2="36" y2="70" stroke="#7C3AED" strokeWidth="0.5" opacity="0.15"/>
    <line x1="2" y1="36" x2="70" y2="36" stroke="#7C3AED" strokeWidth="0.5" opacity="0.15"/>
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({ suggestions, onPick }) => {
  const [tick, setTick] = useState(0);

  // Cycle the hint text
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const prompts = suggestions.length > 0
    ? suggestions.map(t => ({ domain: 'seed', text: t }))
    : GENESIS_PROMPTS;

  return (
    <div
      className="r-empty"
      style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124,58,237,0.07) 0%, transparent 70%)',
      }}
    >
      {/* Mark */}
      <div className="r-empty-glyph r-animate-scale-in">
        <style>{`
          @keyframes r-spin-slow { to { transform: rotate(360deg); transform-origin: center; } }
        `}</style>
        <LatentMark />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', display: 'grid', gap: 10 }} className="r-animate-fade-up">
        <h1 className="r-empty-title">
          The generative substrate<br/>awaits your first seed.
        </h1>
        <p className="r-empty-sub">
          Speak a creation into existence. Describe a world, a molecule, a website,
          a piece of music — anything digital. GSPL grows it deterministically from
          a single sovereign seed.
        </p>
      </div>

      {/* Prompt grid */}
      <div className="r-prompt-grid r-animate-fade-up" style={{ animationDelay: '100ms' }}>
        {prompts.slice(0, 8).map((p, i) => (
          <button
            key={i}
            className="r-prompt-card"
            onClick={() => onPick(p.text)}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="r-prompt-domain">{p.domain}</div>
            <div className="r-prompt-text">{p.text}</div>
          </button>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        fontFamily: 'var(--r-font-mono)', fontSize: 10,
        color: 'var(--r-ink-4)', letterSpacing: '0.1em',
        textAlign: 'center',
      }}>
        keys 1–{Math.min(9, prompts.length + 1)} switch modes · /grow · /mutate · /breed · /compose
      </div>
    </div>
  );
};
