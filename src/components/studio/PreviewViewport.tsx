import { useState, useEffect } from 'react';
import { GerminatingSpinner } from '@/components/shell/GerminatingSpinner';
import { Primordium } from '@/components/shell/Primordium';
import { GSeedHyperobject } from './GSeedHyperobject';
import { DOMAIN_COLORS as DOMAIN_COLORS_HEX } from '@/lib/constants';
import {
  ThreeViewport, SvgViewport, AudioViewport, GameViewport,
  CodeViewport, SimViewport, AnimViewport, TwoDViewport, ArtifactInfo, DomainIcon,
  getViewportType, AVAILABLE_VIEWS,
} from './viewports';

export default function PreviewViewport({ artifact, loading, seed, promptText = '' }: { artifact: any; loading: any; seed: any; promptText?: any }) {
  const defaultView = artifact ? getViewportType(artifact.domain) : '3d';
  const [view, setView] = useState(defaultView);
  const domainColor = DOMAIN_COLORS_HEX[artifact?.domain] || '#00E5FF';

  useEffect(() => {
    if (artifact) setView(getViewportType(artifact.domain));
  }, [artifact?.domain]);

  const availableViews = artifact ? ['hyperobject', ...AVAILABLE_VIEWS.slice(1)].filter(v =>
    v === 'hyperobject' || v === '3d' || v === getViewportType(artifact.domain) || v === '2d'
  ) : ['hyperobject', '3d'];

  return (
    <div className="relative overflow-hidden w-full h-full" data-testid="preview-viewport">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,229,255,0.4) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <GerminatingSpinner label="Growing seed" />
        </div>
      ) : artifact ? (
        <>
          <div className="absolute top-2 right-2 z-20 flex gap-1 flex-wrap max-w-[70%] justify-end">
            {availableViews.map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2 py-0.5 font-mono text-[8px] uppercase border transition-colors ${
                  view === v ? 'border-primary text-primary bg-primary/10' : 'border-neutral-800 text-neutral-600'
                }`}>
                {v}
              </button>
            ))}
          </div>

          <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-2">
            <DomainIcon domain={artifact.domain} className="w-4 h-4" />
            <div>
              <div className="font-mono text-[9px] text-neutral-600 uppercase">{artifact.domain} ENGINE</div>
              <div className="font-mono text-[8px] text-neutral-800">{artifact.seed_hash?.slice(0, 24)}</div>
            </div>
          </div>

          {/* Sovereign one-click "Export to Deployable App" for flagship domains (character rig + narrative player) */}
          {(artifact.domain === 'character' || artifact.domain === 'narrative') && (
            <button
              onClick={() => {
                // Triggers real app generator with interactiveDemo when wired to server
                const params = { archetype: 'tool', interactiveDemo: true, name: `${artifact.domain}-studio-export` };
                fetch('/api/seeds/grow', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ domain: 'app', prompt: `${artifact.domain} interactive demo`, genes: params, count: 1 })
                }).then(r => r.json()).then(() => {
                  window.alert('App generation started with interactiveDemo=true. Check Export panel or /apps for the deployable build containing the live rig/player.');
                }).catch(() => {
                  // Graceful fallback for local dev
                  window.open('/character-rig', '_blank');
                });
              }}
              className="absolute bottom-2 right-2 z-30 px-2 py-0.5 text-[8px] font-mono border border-primary/60 bg-black/60 hover:bg-primary/10 rounded"
            >
              EXPORT AS LIVE APP →
            </button>
          )}

          {view === 'hyperobject' ? (
            <div className="absolute inset-0" data-testid="viewport-hyperobject-container">
              <GSeedHyperobject seed={seed} width={800} height={600} autoRotate={true} showAllSystems={true} />
            </div>
          ) : view === '3d' ? (
            <div className="absolute inset-0" data-testid="viewport-3d-container">
              <ThreeViewport artifact={artifact} />
              {artifact.physics_summary && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/50 border border-neutral-800 backdrop-blur-sm rounded-full pointer-events-none">
                  <div className="font-mono text-[9px] text-primary/80">{artifact.physics_summary}</div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-[#000000] to-transparent pointer-events-none">
                <div className="font-heading font-bold text-sm text-white">{artifact.name}</div>
                <div className="font-mono text-[9px] text-neutral-500">{artifact.domain} / Gen {artifact.generation}</div>
              </div>
            </div>
          ) : view === 'svg' ? (
            <div className="absolute inset-0" data-testid="viewport-svg-container"><SvgViewport artifact={artifact} /></div>
          ) : view === 'audio' ? (
            <div className="absolute inset-0" data-testid="viewport-audio-container"><AudioViewport artifact={artifact} /></div>
          ) : view === 'game' ? (
            <div className="absolute inset-0" data-testid="viewport-game-container"><GameViewport artifact={artifact} /></div>
          ) : view === 'code' ? (
            <div className="absolute inset-0" data-testid="viewport-code-container"><CodeViewport artifact={artifact} /></div>
          ) : view === 'sim' ? (
            <div className="absolute inset-0" data-testid="viewport-sim-container"><SimViewport artifact={artifact} /></div>
          ) : view === 'anim' ? (
            <div className="absolute inset-0" data-testid="viewport-anim-container"><AnimViewport artifact={artifact} /></div>
          ) : view === '2d' ? (
            <div className="absolute inset-0" data-testid="viewport-2d-container"><TwoDViewport artifact={artifact} seed={seed} /></div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#000000]">
              <ArtifactInfo artifact={artifact} />
            </div>
          )}
        </>
      ) : (
        <Primordium prompt={promptText} />
      )}
    </div>
  );
}
