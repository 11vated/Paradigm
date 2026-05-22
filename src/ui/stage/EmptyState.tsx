/**
 * EmptyState — magic moment before the first seed exists.
 */
import React from 'react';
import { deriveSeedTheme } from '@/hooks/useSeedTheme';
import { getInstallGenesisHash } from '@/lib/ui/genesisSuggestions';
import { Resonant } from '@/ui/primitives/Resonant';

interface EmptyStateProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ suggestions, onPick }) => {
  const theme = deriveSeedTheme(getInstallGenesisHash());

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 32,
        background: `radial-gradient(ellipse 80% 60% at 50% 45%, color-mix(in oklab, ${theme.core} 12%, transparent), transparent)`,
      }}
    >
      <Resonant pulse={theme.resonanceHz}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${theme.core}, ${theme.resonant}, ${theme.gradA}, ${theme.gradB}, ${theme.core})`,
            opacity: 0.35,
            filter: 'blur(24px)',
          }}
        />
      </Resonant>

      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--r-font-prose)',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--r-ink-0)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        What should we make?
      </h2>

      <p
        style={{
          margin: 0,
          maxWidth: 420,
          textAlign: 'center',
          fontFamily: 'var(--r-font-prose)',
          fontSize: 13,
          color: 'var(--r-ink-2)',
          lineHeight: 1.5,
        }}
      >
        Describe anything — a character, world, song, game, logo, or building. Paradigm grows it from a deterministic seed.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          maxWidth: 560,
        }}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="r-chip"
            style={{
              cursor: 'pointer',
              fontFamily: 'var(--r-font-prose)',
              fontSize: 12,
              padding: '8px 14px',
              borderColor: 'color-mix(in oklab, var(--r-prism-core) 35%, var(--r-ink-4))',
              color: 'var(--r-ink-1)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
