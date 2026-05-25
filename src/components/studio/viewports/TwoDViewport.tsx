import { useMemo } from 'react';
import { Code2, Dna } from 'lucide-react';
import type { ViewportProps } from './types';

export default function TwoDViewport({ artifact, seed }: ViewportProps) {
  const svgPath = artifact?.svgPath || artifact?.artifact?.filePath;
  const svgContent = artifact?.svgContent || artifact?.artifact?.svgContent;
  const portraitSvg = artifact?.phenotype?.portraitSvg || artifact?.artifact?.phenotype?.portraitSvg;
  const shaderCode = artifact?.glslPath || artifact?.wgslPath || artifact?.hlslPath;
  const code = artifact?.code || artifact?.shader;
  const domain = artifact?.domain || artifact?.artifact?.domain || '2d';
  const name = artifact?.name || artifact?.artifact?.name || 'Unnamed';
  const generation = artifact?.generation || artifact?.artifact?.generation || 0;

  const inlineSvg = useMemo(() => {
    if (portraitSvg) {
      return portraitSvg.replace(
        / width="256" height="256"/,
        ' width="100%" height="100%" viewBox="0 0 256 256"',
      );
    }
    return null;
  }, [portraitSvg]);

  const displayCode = useMemo(() => {
    if (artifact?.glslPath) return `GLSL: ${artifact.glslPath}\nWGSL: ${artifact.wgslPath || 'N/A'}\nHLSL: ${artifact.hlslPath || 'N/A'}`;
    if (typeof code === 'string') return code;
    if (code && typeof code === 'object') return JSON.stringify(code, null, 2);
    return JSON.stringify(artifact, null, 2).slice(0, 3000);
  }, [artifact, code]);

  if (svgPath) {
    return (
      <div className="flex flex-col items-center gap-4 w-full h-full p-6" data-testid="viewport-2d">
        <object data={svgPath} type="image/svg+xml" className="w-full h-full max-h-full object-contain" />
      </div>
    );
  }

  if (svgContent || inlineSvg) {
    return (
      <div className="flex flex-col items-center gap-4 w-full h-full p-6" data-testid="viewport-2d">
        <div
          className="w-full h-full max-h-full object-contain flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svgContent || inlineSvg || '' }}
        />
      </div>
    );
  }

  if (shaderCode || code) {
    return (
      <div className="flex flex-col w-full h-full p-4" data-testid="viewport-2d">
        <div className="flex items-center gap-2 mb-2 text-neutral-500">
          <Code2 className="w-4 h-4" />
          <span className="font-mono text-[10px] uppercase">{domain} / code output</span>
        </div>
        <pre className="flex-1 overflow-auto p-3 bg-black/40 border border-neutral-800 rounded text-xs font-mono text-neutral-400 leading-relaxed whitespace-pre-wrap">
          {displayCode}
        </pre>
      </div>
    );
  }

  const domainColor = '#00E5FF';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6" data-testid="viewport-2d">
      <div className="w-24 h-24 border border-neutral-800 flex items-center justify-center"
        style={{ background: `${domainColor}10`, boxShadow: `0 0 60px ${domainColor}15` }}>
        <Dna className="w-10 h-10" style={{ color: `${domainColor}40` }} />
      </div>
      <div className="text-center mt-4">
        <div className="font-heading font-bold text-lg text-white">{name}</div>
        <div className="font-mono text-[10px] uppercase text-neutral-500">{domain} / Gen {generation}</div>
      </div>
    </div>
  );
}
