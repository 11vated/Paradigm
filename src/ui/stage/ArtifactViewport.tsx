import React from 'react';
import { SubstrateField } from './SubstrateField';
import {
  ThreeViewport,
  SvgViewport,
  AudioViewport,
  GameViewport,
  CodeViewport,
  SimViewport,
  AnimViewport,
  TwoDViewport,
  ArtifactInfo,
  getViewportType,
} from '@/components/studio/viewports';

interface ArtifactViewportProps {
  seed: any;
  artifact: any;
}

export const ArtifactViewport: React.FC<ArtifactViewportProps> = ({ seed, artifact }) => {
  if (!artifact) {
    return (
      <main aria-label="Living artifact" className="p-center">
        <SubstrateField />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-zinc-500">
            <p className="text-lg font-mono">No artifact</p>
            <p className="text-sm">Grow a seed to render</p>
          </div>
        </div>
      </main>
    );
  }

  const viewportType = getViewportType(artifact.domain);

  return (
    <main aria-label="Living artifact" className="p-center relative h-full w-full">
      {/* Substrate field (animated background) */}
      <SubstrateField />

      {/* Artifact content */}
      <div className="absolute inset-0" data-testid="artifact-viewport">
        {viewportType === '3d' ? (
          <div className="absolute inset-0" data-testid="viewport-3d-container">
            <ThreeViewport artifact={artifact} />
          </div>
        ) : viewportType === 'svg' ? (
          <div className="absolute inset-0" data-testid="viewport-svg-container">
            <SvgViewport artifact={artifact} />
          </div>
        ) : viewportType === 'audio' ? (
          <div className="absolute inset-0" data-testid="viewport-audio-container">
            <AudioViewport artifact={artifact} />
          </div>
        ) : viewportType === 'game' ? (
          <div className="absolute inset-0" data-testid="viewport-game-container">
            <GameViewport artifact={artifact} />
          </div>
        ) : viewportType === 'code' ? (
          <div className="absolute inset-0" data-testid="viewport-code-container">
            <CodeViewport artifact={artifact} />
          </div>
        ) : viewportType === 'sim' ? (
          <div className="absolute inset-0" data-testid="viewport-sim-container">
            <SimViewport artifact={artifact} />
          </div>
        ) : viewportType === 'anim' ? (
          <div className="absolute inset-0" data-testid="viewport-anim-container">
            <AnimViewport artifact={artifact} />
          </div>
        ) : viewportType === '2d' ? (
          <div className="absolute inset-0" data-testid="viewport-2d-container">
            <TwoDViewport artifact={artifact} seed={seed} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--p-canvas)]">
            <ArtifactInfo artifact={artifact} />
          </div>
        )}
      </div>

      {/* Minimal floating controls */}
      <div className="absolute bottom-6 right-6 flex gap-2 opacity-70 hover:opacity-100 transition-colors z-20">
        <button
          className="px-3 py-1.5 text-xs font-mono bg-zinc-900/80 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-200 transition-colors min-h-[44px] touch-manipulation"
          title="Mutate (M)"
          data-testid="mutate-btn"
        >
          Mutate
        </button>
        <button
          className="px-3 py-1.5 text-xs font-mono bg-zinc-900/80 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-200 transition-colors min-h-[44px] touch-manipulation"
          title="Export (E)"
          data-testid="export-btn"
        >
          Export
        </button>
        <button
          className="px-3 py-1.5 text-xs font-mono bg-zinc-900/80 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-200 transition-colors min-h-[44px] touch-manipulation"
          title="Fullscreen (F)"
          data-testid="fullscreen-btn"
        >
          Fullscreen
        </button>
      </div>
    </main>
  );
};

export default ArtifactViewport;