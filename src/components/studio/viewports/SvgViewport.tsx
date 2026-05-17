import { Image } from 'lucide-react';
import type { ViewportProps } from './types';

export default function SvgViewport({ artifact }: ViewportProps) {
  const svgPath = artifact?.svgPath || artifact?.artifact?.filePath;
  return (
    <div className="flex flex-col items-center gap-4 w-full h-full p-6" data-testid="viewport-svg">
      {svgPath ? (
        <object data={svgPath} type="image/svg+xml" className="w-full h-full max-h-full object-contain" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Image className="w-12 h-12" />
          <span className="font-mono text-xs">SVG preview unavailable</span>
        </div>
      )}
    </div>
  );
}
