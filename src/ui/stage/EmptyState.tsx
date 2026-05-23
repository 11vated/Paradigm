/**
 * EmptyState — the substrate before creation.
 *
 * First thing users see. Must communicate, in 30 seconds:
 *  1. This is where you make digital things from typed seeds.
 *  2. Every thing has a unique visual identity.
 *  3. The substrate is alive.
 *
 * Per `06_Frontend_Redesign_And_Completion_Spec.md` §V.1 (Crucible empty state)
 * and §IX (identity acceptance criteria).
 */
import React from 'react';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';

interface EmptyStateProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

interface Prompt {
  domain: string;
  text: string;
}

const GENESIS_PROMPTS: Prompt[] = [
  { domain: 'character', text: 'A melancholy ocean character at twilight' },
  { domain: 'world',     text: 'A volcanic archipelago with six warring factions' },
  { domain: 'music',     text: 'Generative jazz composition in D minor, 143 BPM' },
  { domain: 'visual2d',  text: 'Luminous geometric mandala in deep violet and gold' },
  { domain: 'molecule',  text: 'Caffeine (C8H10N4O2) at optimized geometry' },
  { domain: 'quantum',   text: 'Double-well potential wavefunction, delocalized state' },
  { domain: 'website',   text: 'A brutalist portfolio site for a digital sculptor' },
  { domain: 'cosmology', text: 'Spiral galaxy collision, 200 bodies, Barnes-Hut' },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ suggestions, onPick }) => {
  const prompts: Prompt[] =
    suggestions.length > 0
      ? suggestions.map((t) => ({ domain: 'seed', text: t }))
      : GENESIS_PROMPTS;

  return (
    <div className="p-empty">
      <div className="p-empty-inner p-fade-up">
        {/* Mark — the latent glyph of the substrate */}
        <SeedGlyph
          hash="paradigm:genesis"
          domain="character"
          size={120}
          breathing
          className="p-empty-glyph"
        />

        <h1 className="p-empty-title">
          The substrate awaits<br />your first seed.
        </h1>

        <p className="p-empty-sub">
          Speak a creation into existence. Describe a world, a molecule, a website,
          a piece of music — anything digital. GSPL grows it deterministically from
          a single sovereign seed.
        </p>

        <div className="p-empty-prompts">
          {prompts.slice(0, 8).map((p, i) => (
            <button
              key={i}
              className="p-prompt-card"
              onClick={() => onPick(p.text)}
              type="button"
            >
              <span className="p-prompt-card-domain">{p.domain}</span>
              <span className="p-prompt-card-text">{p.text}</span>
            </button>
          ))}
        </div>

        <div
          style={{
            fontFamily: 'var(--p-font-mono)',
            fontSize: 'var(--p-text-1)',
            color: 'var(--p-ink-3)',
            letterSpacing: '0.08em',
            textAlign: 'center',
            marginTop: 'var(--p-space-3)',
          }}
        >
          keys 1–{Math.min(9, prompts.length + 1)} switch modes · /grow · /mutate · /breed · /compose
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
