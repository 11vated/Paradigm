import React, { useState, useCallback, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
  MessageSquare, FileCode, Dna, Image as ImageIcon, Library, GitBranch, Network,
  Shuffle, TrendingUp, Heart, Download, Coins, Bot, Sparkles, Keyboard, Activity,
} from 'lucide-react';
import { SeedChatIntegrated } from '@/components/studio/SeedChat-Integrated';
import { GsplRepl } from '@/components/studio/GsplRepl';
import PreviewViewport from '@/components/studio/PreviewViewport';
import GSPLEditor from '@/components/studio/GSPLEditor';
import GeneEditor from '@/components/studio/GeneEditor';
import GalleryGrid from '@/components/studio/GalleryGrid';
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

type PanelTab = 'chat' | 'editor' | 'genes' | 'gallery' | 'library' | 'lineage' | 'topology';
type BottomTab = 'compose' | 'evolve' | 'breed' | 'export' | 'mint' | 'agent';

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
  { id: 'agent',   label: 'Agent',   Icon: Bot },
];

interface Artifact {
  seed: any;
  output: any;
  gspl: string;
}

export function StudioPage() {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [activePanel, setActivePanel] = useState<PanelTab>('chat');
  const [activeBottom, setActiveBottom] = useState<BottomTab | null>(null);
  const [seeds, setSeeds] = useState<any[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<any>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Server health probe (every 15s)
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

  // Keyboard shortcuts: Ctrl/Cmd+1..7 → left tabs; Esc → close bottom; ? → help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      setSeeds(prev => [...prev, artifact.seed].slice(-200));
    }
  }, []);

  const handleSelectSeed = useCallback((seed: any) => {
    setSelectedSeed(seed);
    setCurrentArtifact(prev => prev ? { ...prev, seed } : null);
  }, []);

  const leftPanel = (
    <div style={styles.panelContent}>
      <nav style={styles.sidebarNav}>
        {LEFT_TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            style={{
              ...styles.sidebarButton,
              ...(activePanel === tab.id ? styles.sidebarButtonActive : {}),
            }}
            title={`${tab.label} (Ctrl+${i + 1})`}
          >
            <tab.Icon size={15} />
            <span style={styles.sidebarLabel}>{tab.label}</span>
            <span style={styles.sidebarKbd}>{i + 1}</span>
          </button>
        ))}
      </nav>

      <div style={styles.panelBody}>
        {activePanel === 'chat' && (
          <SeedChatIntegrated onArtifactGenerated={handleArtifactGenerated} />
        )}
        {activePanel === 'editor' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <GSPLEditor />
            </div>
            <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid #333' }}>
              <GsplRepl />
            </div>
          </div>
        )}
        {activePanel === 'genes' && (
          <GeneEditor seed={selectedSeed} onSeedUpdated={handleSelectSeed} />
        )}
        {activePanel === 'gallery' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <GalleryGrid seeds={seeds} onSelectSeed={handleSelectSeed} />
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
              <div style={styles.emptyHint}>Select a seed to view lineage</div>
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

  const centerPanel = (
    <div style={styles.panelContent}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {currentArtifact && (
          <div style={styles.artifactBar}>
            <h3 style={styles.artifactName}>
              {currentArtifact.seed?.$name || currentArtifact.seed?.name || 'Artifact'}
            </h3>
            <span style={styles.artifactDomain}>
              {currentArtifact.seed?.$domain || currentArtifact.seed?.domain || ''}
            </span>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <PreviewViewport
            artifact={currentArtifact?.output ?? null}
            seed={currentArtifact?.seed ?? selectedSeed ?? null}
            loading={false}
          />
        </div>
        <div style={styles.promptBar}>
          <PromptBar
            onSend={(text: string) => {
              handleArtifactGenerated({
                seed: { $name: text, phrase: text },
                output: null,
                gspl: '',
              });
            }}
          />
        </div>
      </div>
    </div>
  );

  const bottomPanel = (
    <div style={styles.panelContent}>
      <nav style={styles.bottomNav}>
        {BOTTOM_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveBottom(activeBottom === tab.id ? null : tab.id)}
            style={{
              ...styles.bottomButton,
              ...(activeBottom === tab.id ? styles.bottomButtonActive : {}),
            }}
          >
            <tab.Icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      {activeBottom && (
        <div style={styles.bottomBody}>
          {activeBottom === 'compose' && <CompositionPanel />}
          {activeBottom === 'evolve' && (
            <div style={{ display: 'flex', gap: 8, padding: 8 }}>
              <div style={{ flex: 1 }}><EvolvePanel /></div>
              <div style={{ flex: 1 }}>
                <EvolutionTheater
                  config={{ algorithm: 'MAP_ELITES', generations: 100, populationSize: 50, mutationRate: 0.15, elitism: 2 }}
                  onEvolve={() => {}}
                  onSeedSelect={handleSelectSeed}
                />
              </div>
            </div>
          )}
          {activeBottom === 'breed' && <BreedPanel />}
          {activeBottom === 'export' && <ExportPanel />}
          {activeBottom === 'mint' && <MintPanel />}
          {activeBottom === 'agent' && (
            <div style={{ display: 'flex', gap: 8, padding: 8 }}>
              <div style={{ flex: 1 }}><AgentPanel /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const topBar = (
    <header style={styles.topBar}>
      <div style={styles.brand}>
        <Sparkles size={14} style={{ color: '#58a6ff' }} />
        <span style={styles.brandName}>Paradigm</span>
        <span style={styles.brandTag}>Absolute</span>
      </div>
      <div style={styles.topBarSpacer} />
      <div style={styles.topBarRight}>
        <div
          style={styles.health}
          title={
            serverOk === null ? 'Checking server…' :
            serverOk ? 'Server connected' : 'Server unreachable'
          }
        >
          <Activity size={12} />
          <span
            style={{
              ...styles.healthDot,
              backgroundColor:
                serverOk === null ? '#8b949e' :
                serverOk ? '#3fb950' : '#f85149',
            }}
          />
          <span style={styles.healthLabel}>
            {serverOk === null ? '…' : serverOk ? 'online' : 'offline'}
          </span>
        </div>
        <button
          onClick={() => setShowHelp(v => !v)}
          style={styles.iconBtn}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={14} />
        </button>
      </div>
    </header>
  );

  return (
    <div style={styles.container}>
      {topBar}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PanelGroup orientation="vertical">
          <Panel defaultSize={75} minSize={40}>
            <PanelGroup orientation="horizontal">
              <Panel defaultSize={22} minSize={15} maxSize={40}>
                {leftPanel}
              </Panel>
              <PanelResizeHandle style={styles.resizeHandleV} />
              <Panel defaultSize={78} minSize={30}>
                <PanelGroup orientation="vertical">
                  <Panel defaultSize={70} minSize={30}>
                    {centerPanel}
                  </Panel>
                  <PanelResizeHandle style={styles.resizeHandleH} />
                  <Panel defaultSize={30} minSize={8} maxSize={60}>
                    {bottomPanel}
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {showHelp && (
        <div style={styles.helpOverlay} onClick={() => setShowHelp(false)}>
          <div style={styles.helpCard} onClick={e => e.stopPropagation()}>
            <h3 style={styles.helpTitle}>Keyboard Shortcuts</h3>
            <ul style={styles.helpList}>
              {LEFT_TABS.map((t, i) => (
                <li key={t.id} style={styles.helpRow}>
                  <span style={styles.kbd}>Ctrl/⌘ + {i + 1}</span>
                  <span>{t.label}</span>
                </li>
              ))}
              <li style={styles.helpRow}><span style={styles.kbd}>Esc</span><span>Close bottom panel</span></li>
              <li style={styles.helpRow}><span style={styles.kbd}>?</span><span>Toggle this help</span></li>
            </ul>
            <button onClick={() => setShowHelp(false)} style={styles.helpClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', backgroundColor: '#0d1117',
    color: '#c9d1d9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // Top app-bar
  topBar: {
    display: 'flex', alignItems: 'center',
    height: 40, padding: '0 12px',
    backgroundColor: '#0a0d12',
    borderBottom: '1px solid #21262d',
    flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 13, fontWeight: 700, color: '#e6edf3', letterSpacing: 0.2 },
  brandTag: {
    fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
    color: '#58a6ff', padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(88,166,255,0.1)',
  },
  topBarSpacer: { flex: 1 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  health: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px', borderRadius: 4, fontSize: 11,
    color: '#8b949e', backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid #21262d',
  },
  healthDot: {
    width: 6, height: 6, borderRadius: '50%',
    boxShadow: '0 0 6px currentColor',
  },
  healthLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, padding: 0, borderRadius: 4,
    border: '1px solid #21262d', backgroundColor: 'transparent',
    color: '#8b949e', cursor: 'pointer', transition: 'all 0.15s',
  },

  panelContent: {
    height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },

  // Resize handles (visible)
  resizeHandleV: {
    width: 6, backgroundColor: '#21262d', cursor: 'col-resize',
    transition: 'background-color 0.15s',
  },
  resizeHandleH: {
    height: 6, backgroundColor: '#21262d', cursor: 'row-resize',
    transition: 'background-color 0.15s',
  },

  // Left sidebar
  sidebarNav: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: 8, backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
  },
  sidebarButton: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 10px', border: 'none', borderRadius: 6,
    backgroundColor: 'transparent', color: '#8b949e',
    cursor: 'pointer', fontSize: 13, textAlign: 'left' as const,
    transition: 'all 0.15s',
  },
  sidebarButtonActive: {
    backgroundColor: '#1f2937', color: '#58a6ff',
  },
  sidebarLabel: { fontSize: 13, flex: 1 },
  sidebarKbd: {
    fontSize: 10, fontWeight: 600, color: '#6e7681',
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    padding: '1px 5px', borderRadius: 3, border: '1px solid #21262d',
  },
  panelBody: {
    flex: 1, overflow: 'hidden', backgroundColor: '#0d1117',
  },

  artifactBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 16px', backgroundColor: '#161b22',
    borderBottom: '1px solid #21262d', flexShrink: 0,
  },
  artifactName: { margin: 0, fontSize: 14, fontWeight: 600, color: '#e6edf3' },
  artifactDomain: {
    padding: '2px 8px', borderRadius: 4, fontSize: 11,
    backgroundColor: '#1f2937', color: '#58a6ff',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  promptBar: {
    padding: '8px 16px', backgroundColor: '#161b22',
    borderTop: '1px solid #21262d', flexShrink: 0,
  },

  bottomNav: {
    display: 'flex', gap: 2,
    padding: '4px 8px', backgroundColor: '#161b22',
    borderBottom: '1px solid #21262d',
  },
  bottomButton: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', border: 'none', borderRadius: 6,
    backgroundColor: 'transparent', color: '#8b949e',
    cursor: 'pointer', fontSize: 12,
    transition: 'all 0.15s',
  },
  bottomButtonActive: {
    backgroundColor: '#1f2937', color: '#58a6ff',
  },
  bottomBody: {
    flex: 1, overflow: 'auto', backgroundColor: '#0d1117',
  },

  // Help overlay
  helpOverlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  helpCard: {
    backgroundColor: '#161b22', border: '1px solid #21262d',
    borderRadius: 10, padding: 24, minWidth: 320, maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  helpTitle: {
    margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#e6edf3',
  },
  helpList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  helpRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 13, color: '#c9d1d9',
  },
  kbd: {
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontSize: 11, fontWeight: 600, color: '#58a6ff',
    padding: '2px 8px', borderRadius: 4,
    border: '1px solid #21262d', backgroundColor: '#0d1117',
  },
  helpClose: {
    marginTop: 20, width: '100%',
    padding: '8px 12px', border: 'none', borderRadius: 6,
    backgroundColor: '#1f2937', color: '#58a6ff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  emptyHint: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100%', color: '#8b949e', fontSize: 13,
  },
};
