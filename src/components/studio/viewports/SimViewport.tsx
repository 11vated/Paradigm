import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { ViewportProps } from './types';

export default function SimViewport({ artifact }: ViewportProps) {
  const sim = artifact?.simulation || artifact?.ecosystem || artifact?.config;
  const dataPoints = useMemo(() => {
    if (!sim) return [];
    const entries = Object.entries(sim).filter(([, v]) => typeof v === 'number');
    return entries.slice(0, 12);
  }, [sim]);

  return (
    <div className="flex flex-col w-full h-full p-4" data-testid="viewport-sim">
      <div className="flex items-center gap-2 mb-2 text-neutral-500">
        <Activity className="w-4 h-4" />
        <span className="font-mono text-[10px] uppercase">{artifact?.domain} / simulation data</span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 auto-rows-min overflow-auto">
        {dataPoints.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between p-2 bg-black/30 border border-neutral-800 rounded">
            <span className="font-mono text-[10px] text-neutral-500">{key}</span>
            <span className="font-mono text-xs text-primary">{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
          </div>
        ))}
        {dataPoints.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center text-neutral-600 gap-2">
            <Activity className="w-8 h-8" />
            <span className="font-mono text-xs">No simulation data</span>
          </div>
        )}
      </div>
    </div>
  );
}
