import { useState, useEffect } from 'react';
import { GerminatingSpinner } from '@/components/shell/GerminatingSpinner';
import { Primordium } from '@/components/shell/Primordium';
import { GSeedHyperobject } from './GSeedHyperobject';
import {
  ThreeViewport, SvgViewport, AudioViewport, GameViewport,
  CodeViewport, SimViewport, AnimViewport, TwoDViewport, ArtifactInfo, DomainIcon,
  getViewportType, AVAILABLE_VIEWS,
} from './viewports';
import { useSeedStore } from '@/stores/seedStore';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';

export default function PreviewViewport({ artifact, loading, seed, promptText = '' }: { artifact: any /* justified carveout: artifact from store/parent is dynamic (multi-domain Seed+Artifact union + runtime loaded); full branded types in strata sweep; no silent */; loading: boolean; seed: any /* justified: seed loose from caller */; promptText?: string }) {
  const defaultView = artifact ? getViewportType((artifact as any).domain) : '3d'; // any cast: artifact unknown from prop (loose from store); justified same-line
  const [view, setView] = useState(defaultView);

  // Wave 1: global live strata from store for hybrid seamlessness (top level hook)
  const storeStrata = useSeedStore((s: any) => s.strataConstraints || {});
  const previewConformance = useSeedStore((s: any) => s.getStrataPreviewConformance ? s.getStrataPreviewConformance() : { overall: 0.5, perStratum: {} });

  useEffect(() => {
    const art = artifact as Record<string, unknown> | null;
    if (art) setView(getViewportType(art.domain as string | undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to domain change; artifact reference may rotate
  }, [(artifact as Record<string, unknown> | null)?.domain]);

  const artForViews = artifact as Record<string, unknown> | null;
  const availableViews = artForViews ? ['hyperobject', ...AVAILABLE_VIEWS.slice(1)].filter(v =>
    v === 'hyperobject' || v === '3d' || v === getViewportType(artForViews.domain as string | undefined) || v === '2d'
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
          <div className="absolute top-2 right-2 z-20 flex gap-1 flex-wrap max-w-[70%] justify-end" role="tablist" aria-label="Viewport type selector">
            {availableViews.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} aria-label={`${v} viewport`} onClick={() => setView(v)}
                className={`px-2 py-0.5 font-mono text-[8px] uppercase border transition-colors min-h-[28px] touch-manipulation motion-reduce:transition-none focus-visible:ring-1 ${
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

          {/* Wave 1 global live strata HUD for zero-caveat hybrid (always visible in primary preview, sync with store for seamlessness across panels) */}
          {(() => {
            const activeStrata = Object.entries(storeStrata).filter(([,v]:any) => (v as number) > 0.1).map(([k]) => k);
            return (
              <div className="absolute top-2 right-2 z-20 text-[7px] font-mono bg-black/70 border border-emerald-900/50 rounded px-1 py-0.5 pointer-events-auto" role="region" aria-label="Global live strata HUD (hybrid seamlessness)">
                <div className="text-emerald-400">LIVE STRATA {Math.round(previewConformance.overall*100)}% ({activeStrata.join('+') || 'none'})</div>
                <div className="flex gap-0.5 mt-0.5">
                  {Object.keys(storeStrata).slice(0,5).map((k: string) => {
                    const v = (storeStrata as any)[k] || 0;
                    return <span key={k} className="text-[6px] text-[#888]">{k.slice(0,1)}:{Math.round(v*100)}</span>;
                  })}
                </div>
              </div>
            );
          })()}

          {/* Wave 1 Lived: live strata + GSPL source for zero-caveat hybrid seamlessness (no raw in normal flow) */}
          {(artifact.strata || artifact.gsplSource || artifact.canonicalGspl) && (
            <div className="absolute top-10 left-2 z-20 max-w-[60%] text-[8px] font-mono bg-black/60 border border-neutral-800 rounded px-2 py-0.5 pointer-events-auto" role="region" aria-label="Live strata and GSPL orchestration source (from supremacy + lived)">
              {artifact.strata && <span className="text-emerald-400">strata: {Array.isArray(artifact.strata) ? artifact.strata.join('+') : artifact.strata}</span>}
              {(artifact.gsplSource || artifact.canonicalGspl) && (
                <details className="mt-0.5">
                  <summary className="cursor-pointer text-primary/80 hover:text-primary">GSPL (edit in editor)</summary>
                  <pre className="text-[7px] max-h-20 overflow-auto mt-0.5 text-neutral-400 whitespace-pre-wrap">{(artifact.gsplSource || artifact.canonicalGspl || '').slice(0, 280)}</pre>
                  <button
                    onClick={() => {
                      const store = (window as any).__paradigmSeedStore || (window as any).useSeedStore?.getState?.();
                      if (store?.setGsplDraft) store.setGsplDraft(artifact.gsplSource || artifact.canonicalGspl);
                      if (store?.loadArtifactToGsplDraft) store.loadArtifactToGsplDraft(artifact);
                    }}
                    className="text-[7px] mt-0.5 px-1 border border-primary/40 text-primary hover:bg-primary/10"
                  >Load to GSPLEditor</button>
                </details>
              )}
            </div>
          )}

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
