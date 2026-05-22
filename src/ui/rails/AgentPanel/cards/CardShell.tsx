import React from 'react';

interface CardShellProps {
  label: string;
  tone?: 'prism-core' | 'prism-resonant' | 'warm' | 'cool' | 'neutral';
  children?: React.ReactNode;
  aside?: React.ReactNode;
}

const TONE_VAR: Record<NonNullable<CardShellProps['tone']>, string> = {
  'prism-core':     'var(--r-prism-core)',
  'prism-resonant': 'var(--r-prism-resonant)',
  warm:             'var(--r-prism-warm)',
  cool:             'var(--r-prism-cool)',
  neutral:          'var(--r-ink-3)',
};

export const CardShell: React.FC<CardShellProps> = ({ label, tone = 'neutral', children, aside }) => (
  <div
    style={{
      borderLeft: `2px solid ${TONE_VAR[tone]}`,
      background: 'rgba(255,255,255,0.018)',
      borderTop: '1px solid var(--r-ink-4)',
      borderRight: '1px solid var(--r-ink-4)',
      borderBottom: '1px solid var(--r-ink-4)',
      borderRadius: '0 var(--r-radius-2) var(--r-radius-2) 0',
      margin: '8px 0',
    }}
  >
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid var(--r-ink-4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--r-font-display)',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: TONE_VAR[tone],
        }}
      >
        {label}
      </span>
      {aside}
    </header>
    <div style={{ padding: '10px 12px' }}>{children}</div>
  </div>
);
