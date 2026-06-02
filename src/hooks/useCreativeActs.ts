/**
 * useCreativeActs — single-key creative + sovereign acts (g m b c s n l f e).
 */
import { useEffect } from 'react';
import { useMode } from '@/stores/modeStore';
import { useActiveSeed } from '@/stores/activeSeed';

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useCreativeActs(opts: { onCosmos: () => void }) {
  const setMode = useMode((s) => s.setMode);
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
        case 'm':
          ev.preventDefault();
          setMode('anatomy');
          return;
        case 'b':
          ev.preventDefault();
          setMode('atelier');
          return;
        case 'c':
          ev.preventDefault();
          setMode('atelier');
          return;
        case 'e':
          ev.preventDefault();
          setMode('atelier');
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
        case 'l':
          if (!seed) return;
          ev.preventDefault();
          return;
        case 'f':
          ev.preventDefault();
          return;
        default:
          return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opts is captured in closure; subscribing to its identity would re-bind keydown on every render
  }, [opts.onCosmos, setMode, seed, setSeed, patchSeed]);
}
