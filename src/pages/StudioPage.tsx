// @ts-nocheck — Phase 0: latent prop-type mismatches surfaced when neighbor
// components were re-typed. Pending props normalization in the Typing Sprint
// (see Documents/Paradigm-Vision/06_CLEANUP_PHASE0.md).

import React, { useState, useCallback, useEffect } from 'react';
import { type Seed, type Artifact as ArtifactType } from '@/lib/kernel/types';
import { useSeedStore } from '@/stores/seedStore';
import {
  MessageSquare, FileCode, Dna, Image as ImageIcon, Library, GitBranch, Network,
  Shuffle, TrendingUp, Heart, Download, Coins, Bot,
  Brain, Sparkles, Keyboard, Activity,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SeedChatIntegrated } from '@/components/studio/SeedChat-Integrated';
import { GsplRepl } from '@/components/studio/GsplRepl';
import PreviewViewport from '@/components/studio/PreviewViewport';
import GSPLEditor from '@/components/studio/GSPLEditor';
import GeneEditor from '@/components/studio/GeneEditor';
import GalleryGrid from '@/components/studio/GalleryGrid';
import SovereignAgentPanel from '@/components/studio/SovereignAgentPanel';
import { VirtualGalleryGrid } from '@/components/studio/VirtualGalleryGrid';
import SeedLibrary from '@/components/studio/SeedLibrary';
import CompositionPanel from '@/components/studio/CompositionPanel';
import BreedPanel from '@/components/studio/BreedPanel';
import EvolvePanel from '@/components/studio/EvolvePanel';
import ExportPanel from '@/components/studio/ExportPanel';
import MintPanel from '@/components/studio/MintPanel';
import AgentPanel from '@/components/studio/AgentPanel';
import SeedSimilarityList from '@/components/studio/SeedSimilarityList';
import LineageGraph from '@/components/studio/LineageGraph';
import LineageTree from '@/components/studio/LineageTree';
import TopologyViewer from '@/components/studio/TopologyViewer';
import PromptBar from '@/components/studio/PromptBar';
import { EvolutionTheater } from '@/components/studio/EvolutionUI';
import { SeedGlyph } from '@/components/shell/SeedGlyph';
import { GlassPanel } from '@/components/shell/GlassPanel';
import { HelixDivider } from '@/components/shell/HelixDivider';
import { HealthPulse } from '@/components/shell/HealthPulse';
import { HashPill } from '@/components/shell/HashPill';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type PanelTab = 'chat' | 'editor' | 'genes' | 'gallery' | 'library' | 'lineage' | 'topology';
type BottomTab = 'compose' | 'evolve' | 'breed' | 'export' | 'mint' | 'agent' | 'sovereign';

const LEFT_TABS: { id: PanelTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'chat',     label: 'Chat',     Icon: MessageSquare },
  { id: 'editor',   label: 'Editor',   Icon: FileCode },
  { id: 'genes',    label: 'Genes',    Icon: Dna },
  { id: 'gallery',  label: 'Gallery',  Icon: ImageIcon },
  { id: 'library',  label: 'Library',  Icon: Library },
  { id: 'lineage',  label: 'Lineage',  Icon: GitBranch },
  { id: 'topology', label: 'Topology', Icon: Network },
];

const BOTTOM_TABS: { id: BottomTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'compose', label: 'Compose', Icon: Shuffle },
  { id: 'evolve',  label: 'Evolve',  Icon: TrendingUp },
  { id: 'breed',   label: 'Breed',   Icon: Heart },
  { id: 'export',  label: 'Export',  Icon: Download },
  { id: 'mint',    label: 'Mint',    Icon: Coins },
  { id: 'agent',   label: 'Agent',     Icon: Bot },
  { id: 'sovereign', label: 'Sovereign', Icon: Brain },
];

interface Artifact {
  seed: Seed;
  output: ArtifactType | null;
  gspl: string;
}

export function StudioPage() {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [activePanel, setActivePanel] = useState<PanelTab>('chat');
  const [activeBottom, setActiveBottom] = useState<BottomTab | null>(null);
  const [selectedSeed, setSelectedSeed] = useState<any>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [promptText, setPromptText] = useState('');

  const gallery = useSeedStore((s: any) => s.gallery);
  const fetchSeeds = useSeedStore((s: any) => s.fetchSeeds);
  const addToGallery = useSeedStore((s: any) => s.addToGallery);

  useEffect(() => {
    fetchSeeds?.();
  }, []);

  const seeds = gallery && gallery.length > 0 ? gallery : [];

  // Server health probe
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch('/health', { cache: 'no-store' });
        if (!cancelled) setServerOk(res.ok);
      } catch {
        if (!cancelled) setServerOk(false);
      }
    };
    ping();
    const id = setInterval(ping, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘/Ctrl+K must work even when an input is focused
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if ((e.ctrlKey || e.metaKey) && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        setActivePanel(LEFT_TABS[parseInt(e.key, 10) - 1].id);
        return;
      }

      if (e.key === 'Escape' && activeBottom) {
        setActiveBottom(null);
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeBottom]);

  const handleArtifactGenerated = useCallback((artifact: Artifact) => {
    setCurrentArtifact(artifact);
    if (artifact.seed) {
      addToGallery?.(artifact.seed);
    }
  }, [addToGallery]);

  const handleSelectSeed = useCallback((seed: any) => {
    setSelectedSeed(seed);
    setCurrentArtifact(prev => prev ? { ...prev, seed } : null);
  }, []);

  const leftPanelContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activePanel === 'chat' && (
          <SeedChatIntegrated onArtifactGenerated={handleArtifactGenerated} />
        )}
        {activePanel === 'editor' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <GSPLEditor />
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <GsplRepl />
            </div>
          </div>
        )}
        {activePanel === 'genes' && (
          <GeneEditor seed={selectedSeed} onSeedUpdated={handleSelectSeed} />
        )}
        {activePanel === 'gallery' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <VirtualGalleryGrid
              seeds={seeds}
              onSelect={handleSelectSeed}
              onGrow={async (seed: any) => {
                try {
                  const artifact = await fetch(`/api/seeds/${seed.id}/grow`, { method: 'POST' }).then(r => r.json());
                  addToGallery?.(artifact.seed);
                  setCurrentArtifact({ seed: artifact.seed, output: artifact.artifact, gspl: '' });
                } catch (e) { console.error('Grow failed:', e); }
              }}
              onEvolve={async (seed: any) => {
                try {
                  const result = await fetch(`/api/seeds/${seed.id}/evolve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ algorithm: 'GA', populationSize: 50, generations: 100, mutationRate: 0.1 }),
                  }).then(r => r.json());
                  if (result.children) {
                    result.children.forEach((child: any) => addToGallery?.(child));
                  }
                } catch (e) { console.error('Evolve failed:', e); }
              }}
            />
          </div>
        )}
        {activePanel === 'library' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <SeedLibrary onImport={() => {}} activeSeed={selectedSeed} />
            <SeedSimilarityList seedId={selectedSeed?.id} onSelect={handleSelectSeed} />
          </div>
        )}
        {activePanel === 'lineage' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            {selectedSeed ? (
              <>
                <LineageGraph seeds={currentArtifact ? [currentArtifact.seed] : []} currentSeed={currentArtifact?.seed} onSelect={handleSelectSeed} />
                <LineageTree seed={selectedSeed} />
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--p-text-3)', fontSize: 13 }}>
                Select a seed to view lineage
              </div>
            )}
          </div>
        )}
        {activePanel === 'topology' && (
          <div style={{ height: '100%' }}>
            <TopologyViewer seed={selectedSeed} artifact={currentArtifact?.output} />
          </div>
        )}
      </div>
    </div>
  );

  const topBar = (
    <header
      className="p-glass"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 48, padding: '0 16px', flexShrink: 0, zIndex: 10,
        borderBottom: 'var(--p-glass-border)',
        borderRadius: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SeedGlyph animated size={22} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--p-text)', letterSpacing: 0.2 }}>
          Paradigm
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
            color: 'var(--p-cyan)', padding: '2px 8px', borderRadius: 4,
            background: 'rgba(0, 229, 255, 0.08)',
          }}
        >
          Absolute
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Lineage breadcrumb */}
      {currentArtifact?.seed?.$lineage && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.02)',
            fontSize: 10, fontFamily: 'var(--p-font-mono)',
            color: 'var(--p-text-3)',
          }}
        >
          <span>Gen {currentArtifact.seed.$lineage?.generation ?? 0}</span>
          {(currentArtifact.seed.$lineage as any)?.operators?.[0] && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ textTransform: 'capitalize' }}>{(currentArtifact.seed.$lineage as any).operators[0]}</span>
            </>
          )}
        </div>
      )}

      {currentArtifact?.seed?.$hash && (
        <HashPill hash={currentArtifact.seed.$hash} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <HealthPulse status={serverOk === null ? 'loading' : serverOk ? 'ok' : 'error'} />

        <button
          onClick={() => setCmdOpen(true)}
          className="p-glass"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
            color: 'var(--p-text-3)', fontSize: 10,
            fontFamily: 'var(--p-font-mono)',
            border: '1px solid var(--p-glass-border)',
            background: 'rgba(255,255,255,0.02)',
          }}
          title="Command palette (Ctrl+K)"
        >
          <Sparkles size={12} />
          <span>⌘K</span>
        </button>

        <button
          onClick={() => setShowHelp(v => !v)}
          className="p-glass"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, padding: 0, borderRadius: 6, cursor: 'pointer',
            color: 'var(--p-text-3)', border: '1px solid var(--p-glass-border)',
            background: 'rgba(255,255,255,0.02)',
          }}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={13} />
        </button>
      </div>
    </header>
  );

  const iconRail = (
    <TooltipProvider delayDuration={300}>
      <nav
        className="p-glass"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          width: 56, padding: '12px 0', flexShrink: 0, zIndex: 5,
          borderRight: 'var(--p-glass-border)',
          borderRadius: 0,
        }}
      >
        {LEFT_TABS.map((tab, i) => {
          const isActive = activePanel === tab.id;
          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePanel(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, padding: 0, border: 'none', borderRadius: 8,
                    cursor: 'pointer', position: 'relative',
                    background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                    color: isActive ? 'var(--p-cyan)' : 'var(--p-text-3)',
                    transition: 'all var(--p-dur-fast) var(--p-ease-organic)',
                  }}
                >
                  <tab.Icon size={16} />
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute', left: -8, top: '50%',
                        width: 3, height: 16, borderRadius: 2,
                        background: 'var(--p-cyan)',
                        transform: 'translateY(-50%)',
                        boxShadow: '0 0 6px var(--p-cyan)',
                      }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-glass" style={{ fontSize: 11, fontFamily: 'var(--p-font-mono)', padding: '4px 10px', border: '1px solid var(--p-glass-border)' }}>
                {tab.label}
                <span style={{ opacity: 0.4, marginLeft: 6 }}>⌘{i + 1}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );

  const healthStatus = serverOk === null ? 'loading' : serverOk ? 'ok' : 'error';

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'relative', zIndex: 1,
        color: 'var(--p-text)', fontFamily: 'var(--p-font-ui)',
        fontSize: 13,
      }}
    >
      {topBar}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {iconRail}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Center workspace + Preview */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
            {/* Work pane — chat / editor / genes / etc. */}
            <div style={{ flex: '1.6 1 0', minWidth: 0, display: 'flex', position: 'relative' }}>
              <GlassPanel padded={false} className="h-full w-full" style={{ borderRadius: 0, borderLeft: 'none', borderRight: '1px solid var(--p-glass-border)', borderTop: 'none', borderBottom: 'none', height: '100%', width: '100%' }}>
                {leftPanelContent}
              </GlassPanel>
              <div style={{ position: 'absolute', top: 0, right: -3, bottom: 0, width: 6, pointerEvents: 'none' }}>
                <HelixDivider orientation="vertical" />
              </div>
            </div>
            {/* Preview pane */}
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}>
              <GlassPanel padded={false} domain={currentArtifact?.seed?.$domain} className="h-full w-full" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none', height: '100%', width: '100%' }}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {currentArtifact && (
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 16px', flexShrink: 0,
                          borderBottom: '1px solid var(--p-glass-border)',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--p-text)' }}>
                          {currentArtifact.seed?.$name || currentArtifact.seed?.name || 'Artifact'}
                        </span>
                        {currentArtifact.seed?.$domain && (
                          <span
                            style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 10,
                              fontFamily: 'var(--p-font-mono)', textTransform: 'uppercase',
                              letterSpacing: 0.4, color: 'var(--p-cyan)',
                              background: 'rgba(0, 229, 255, 0.08)',
                            }}
                          >
                            {currentArtifact.seed.$domain}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                      <PreviewViewport
                        artifact={currentArtifact?.output ?? null}
                        seed={currentArtifact?.seed ?? selectedSeed ?? null}
                        loading={false}
                        promptText={promptText}
                      />
                    </div>
                  </div>
              </GlassPanel>
            </div>
          </div>

          {/* Prompt bar — full width glass */}
          <div
            className="p-glass"
            style={{
              padding: '8px 16px', flexShrink: 0, zIndex: 5,
              borderTop: '1px solid var(--p-glass-border)',
              borderBottom: activeBottom ? '1px solid var(--p-glass-border)' : 'none',
              borderRadius: 0,
            }}
          >
            <PromptBar
              value={promptText}
              onChange={setPromptText}
              onSeedCreated={(seed: any) => {
                handleArtifactGenerated({
                  seed,
                  output: null,
                  gspl: '',
                });
              }}
            />
          </div>

          {/* Bottom drawer tab strip */}
          <div
            className="p-glass"
            style={{
              display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, zIndex: 5,
              padding: '4px 8px', height: 36, borderRadius: 0,
              borderTop: '1px solid var(--p-glass-border)',
            }}
          >
            {BOTTOM_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveBottom(activeBottom === tab.id ? null : tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: activeBottom === tab.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                  color: activeBottom === tab.id ? 'var(--p-cyan)' : 'var(--p-text-3)',
                  fontSize: 11, fontFamily: 'var(--p-font-mono)',
                  transition: 'all var(--p-dur-fast) var(--p-ease-organic)',
                }}
              >
                <tab.Icon size={12} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom drawer — animated slide up */}
          <AnimatePresence>
            {activeBottom && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 320, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="p-glass"
                style={{ overflow: 'hidden', flexShrink: 0, borderRadius: 0, borderTop: '1px solid var(--p-glass-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--p-glass-border)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--p-font-mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--p-text-3)' }}>
                    {activeBottom}
                  </span>
                  <button
                    onClick={() => setActiveBottom(null)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4,
                      cursor: 'pointer', color: 'var(--p-text-3)',
                      background: 'rgba(255,255,255,0.04)',
                      fontSize: 12,
                    }}
                    title="Close (Esc)"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ height: 'calc(100% - 37px)', overflow: 'auto' }}>
                  {activeBottom === 'compose' && <CompositionPanel seed={selectedSeed} />}
                  {activeBottom === 'evolve' && (
                    <div style={{ display: 'flex', gap: 8, padding: 8 }}>
                      <div style={{ flex: 1 }}><EvolvePanel seed={selectedSeed} /></div>
                      <div style={{ flex: 1 }}>
                        <EvolutionTheater
                          config={{ algorithm: 'MAP_ELITES', generations: 100, populationSize: 50, mutationRate: 0.15, elitism: 2 }}
                          onEvolve={() => {}}
                          onSeedSelect={handleSelectSeed}
                        />
                      </div>
                    </div>
                  )}
                  {activeBottom === 'breed' && <BreedPanel seed={selectedSeed} />}
                  {activeBottom === 'export' && <ExportPanel seed={selectedSeed} />}
                  {activeBottom === 'mint' && <MintPanel seed={selectedSeed} />}
                  {activeBottom === 'agent' && (
                    <div style={{ display: 'flex', gap: 8, padding: 8 }}>
                      <div style={{ flex: 1 }}><AgentPanel onSeedCreated={handleSelectSeed} /></div>
                    </div>
                  )}
                  {activeBottom === 'sovereign' && (
                    <div style={{ display: 'flex', padding: 8, height: '100%' }}>
                      <div style={{ flex: 1, overflow: 'auto' }}><SovereignAgentPanel /></div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Command palette (⌘K) */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={(tab) => setActivePanel(tab as PanelTab)}
        onBottomNavigate={(tab) => setActiveBottom(tab as BottomTab)}
      />

      {/* Help side panel - slides from right */}
      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 40,
                background: 'rgba(0,0,0,0.3)',
              }}
              onClick={() => setShowHelp(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                right: 0, top: 48, bottom: 0, width: 320,
                zIndex: 50,
                padding: 20,
              }}
              className="p-glass"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--p-text)' }}>
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--p-text-3)', padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LEFT_TABS.map((t, i) => (
                  <li key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--p-text-2)' }}>
                    <span style={{ fontFamily: 'var(--p-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--p-cyan)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--p-glass-border)', background: 'rgba(0,0,0,0.3)' }}>
                      {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + {i + 1}
                    </span>
                    <span>{t.label}</span>
                  </li>
                ))}
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--p-text-2)' }}>
                  <span style={{ fontFamily: 'var(--p-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--p-cyan)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--p-glass-border)', background: 'rgba(0,0,0,0.3)' }}>
                    ⌘K
                  </span>
                  <span>Command palette</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--p-text-2)' }}>
                  <span style={{ fontFamily: 'var(--p-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--p-cyan)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--p-glass-border)', background: 'rgba(0,0,0,0.3)' }}>
                    Esc
                  </span>
                  <span>Close bottom panel</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--p-text-2)' }}>
                  <span style={{ fontFamily: 'var(--p-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--p-cyan)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--p-glass-border)', background: 'rgba(0,0,0,0.3)' }}>
                    ?
                  </span>
                  <span>Toggle this help</span>
                </li>
              </ul>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  marginTop: 24, width: '100%', padding: '10px 16px',
                  border: '1px solid var(--p-glass-border)', borderRadius: 8,
                  cursor: 'pointer', color: 'var(--p-text)', fontSize: 13,
                  background: 'var(--p-glass-hover)',
                }}
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
