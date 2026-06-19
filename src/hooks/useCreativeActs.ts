import { useEffect } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useCreativeActs(opts: { onCosmos: () => void }) {
  const seed = useActiveSeed((s) => s.seed);
  const setSeed = useActiveSeed((s) => s.setSeed);
  const patchSeed = useActiveSeed((s) => s.patchSeed);

  useEffect(() => {
    const handler = async (ev: KeyboardEvent) => {
      if (isInputFocused() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const key = ev.key.toLowerCase();

      switch (key) {
        case 'g':
          ev.preventDefault();
          opts.onCosmos();
          return;
        case 's':
          if (!seed) return;
          ev.preventDefault();
          try {
            const res = await fetch(`/api/seeds/${encodeURIComponent(seed.id)}/sign`, { method: 'POST' });
            const j = await res.json();
            if (j.success) patchSeed({ signature: 'signed' });
          } catch { /* ignore */ }
          return;
        case 'n':
          if (!seed) return;
          ev.preventDefault();
          patchSeed({ anchor: 'prepared' });
          return;
        default:
          return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts.onCosmos, seed, setSeed, patchSeed]);
}
