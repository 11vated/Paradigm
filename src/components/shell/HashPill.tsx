import { useState } from 'react';

interface HashPillProps {
  hash: string;
  prefix?: string;
  short?: boolean;
  className?: string;
}

export function HashPill({
  hash,
  prefix = '$',
  short = true,
  className = '',
}: HashPillProps) {
  const [copied, setCopied] = useState(false);
  const display = short && hash.length > 12 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* silent */ }
  };

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] leading-none ${className}`}
      style={{
        fontFamily: 'var(--p-font-mono)',
        color: 'var(--p-text-mono)',
        background: 'rgba(88, 166, 255, 0.08)',
        border: '1px solid rgba(88, 166, 255, 0.12)',
        cursor: 'pointer',
        transition: 'background var(--p-dur-fast) var(--p-ease-organic)',
      }}
      title={`Click to copy: ${hash}`}
    >
      {copied ? (
        <span style={{ color: 'var(--p-emerald)' }}>copied!</span>
      ) : (
        <>
          <span style={{ opacity: 0.5 }}>{prefix}</span>
          <span>{display}</span>
        </>
      )}
    </button>
  );
}
