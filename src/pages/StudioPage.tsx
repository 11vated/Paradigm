import React, { useState, useCallback, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { SeedChatIntegrated } from '@/components/studio/SeedChat-Integrated';
import { GsplRepl } from '@/components/studio/GsplRepl';
import PreviewViewport from '@/components/studio/PreviewViewport';
import GSPLEditor from '@/components/studio/GSPLEditor';
import GeneEditor from '@/components/studio/GeneEditor';
import GalleryGrid from '@/components/studio/GalleryGrid';
import SeedLibrary from '@/components/studio/SeedLibrary';
import InfiniteCanvas from '@/components/studio/InfiniteCanvas';
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
        {[
          { id: 'chat' as PanelTab, label: 'Chat', icon: '💬' },
          { id: 'editor' as PanelTab, label: 'Editor', icon: '📝' },
          { id: 'genes' as PanelTab, label: 'Genes', icon: '🧬' },
          { id: 'gallery' as PanelTab, label: 'Gallery', icon: '🖼️' },
          { id: 'library' as PanelTab, label: 'Library', icon: '📚' },
          { id: 'lineage' as PanelTab, label: 'Lineage', icon: '🌳' },
          { id: 'topology' as PanelTab, label: 'Topology', icon: '🔮' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            style={{
              ...styles.sidebarButton,
              ...(activePanel === tab.id ? styles.sidebarButtonActive : {}),
            }}
            title={tab.label}
          >
            <span style={styles.sidebarIcon}>{tab.icon}</span>
            <span style={styles.sidebarLabel}>{tab.label}</span>
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
      {currentArtifact ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={styles.artifactBar}>
            <h3 style={styles.artifactName}>
              {currentArtifact.seed?.$name || currentArtifact.seed?.name || 'Artifact'}
            </h3>
            <span style={styles.artifactDomain}>
              {currentArtifact.seed?.$domain || currentArtifact.seed?.domain || ''}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PreviewViewport
              artifact={currentArtifact.output}
              seed={currentArtifact.seed}
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
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✦</div>
          <p style={styles.emptyTitle}>Welcome to Paradigm Studio</p>
          <p style={styles.emptyText}>
            Use Chat or Editor to create seeds, then preview them here.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setActivePanel('chat')}
              style={{ ...styles.actionButton, backgroundColor: '#4a9eff' }}
            >
              Start Chatting
            </button>
            <button
              onClick={() => setActivePanel('editor')}
              style={{ ...styles.actionButton, backgroundColor: '#7c3aed' }}
            >
              Open GSPL Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const bottomPanel = (
    <div style={styles.panelContent}>
      <nav style={styles.bottomNav}>
        {[
          { id: 'compose' as BottomTab, label: 'Compose', icon: '🔀' },
          { id: 'evolve' as BottomTab, label: 'Evolve', icon: '📈' },
          { id: 'breed' as BottomTab, label: 'Breed', icon: '🧬' },
          { id: 'export' as BottomTab, label: 'Export', icon: '💾' },
          { id: 'mint' as BottomTab, label: 'Mint', icon: '⛓️' },
          { id: 'agent' as BottomTab, label: 'Agent', icon: '🤖' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveBottom(activeBottom === tab.id ? null : tab.id)}
            style={{
              ...styles.bottomButton,
              ...(activeBottom === tab.id ? styles.bottomButtonActive : {}),
            }}
          >
            <span>{tab.icon}</span>
            <span style={{ marginLeft: 4 }}>{tab.label}</span>
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

  return (
    <div style={styles.container}>
      <PanelGroup orientation="vertical" style={{ height: '100vh' }}>
        <Panel defaultSize={75} minSize={40}>
          <PanelGroup orientation="horizontal">
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              {leftPanel}
            </Panel>
            <PanelResizeHandle style={styles.resizeHandle} />
            <Panel defaultSize={75} minSize={30}>
              <PanelGroup orientation="vertical">
                <Panel defaultSize={70} minSize={30}>
                  {centerPanel}
                </Panel>
                <PanelResizeHandle style={styles.resizeHandle} />
                <Panel defaultSize={30} minSize={10} maxSize={60}>
                  {bottomPanel}
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', backgroundColor: '#0d1117',
    color: '#c9d1d9', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  panelContent: {
    height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  resizeHandle: {
    width: '4px', backgroundColor: '#21262d', cursor: 'col-resize',
    transition: 'background-color 0.2s',
  },
  sidebarNav: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    padding: '8px', backgroundColor: '#161b22', borderBottom: '1px solid #21262d',
  },
  sidebarButton: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', border: 'none', borderRadius: '6px',
    backgroundColor: 'transparent', color: '#8b949e',
    cursor: 'pointer', fontSize: '13px', textAlign: 'left' as const,
    transition: 'all 0.15s',
  },
  sidebarButtonActive: {
    backgroundColor: '#1f2937', color: '#58a6ff',
  },
  sidebarIcon: { fontSize: '16px' },
  sidebarLabel: { fontSize: '13px' },
  panelBody: {
    flex: 1, overflow: 'hidden',
    backgroundColor: '#0d1117',
  },
  artifactBar: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 16px', backgroundColor: '#161b22',
    borderBottom: '1px solid #21262d',
  },
  artifactName: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#e6edf3' },
  artifactDomain: {
    padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
    backgroundColor: '#1f2937', color: '#58a6ff',
  },
  promptBar: {
    padding: '8px 16px', backgroundColor: '#161b22',
    borderTop: '1px solid #21262d',
  },
  bottomNav: {
    display: 'flex', gap: '2px',
    padding: '4px 8px', backgroundColor: '#161b22',
    borderBottom: '1px solid #21262d',
  },
  bottomButton: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', border: 'none', borderRadius: '6px',
    backgroundColor: 'transparent', color: '#8b949e',
    cursor: 'pointer', fontSize: '12px',
    transition: 'all 0.15s',
  },
  bottomButtonActive: {
    backgroundColor: '#1f2937', color: '#58a6ff',
  },
  bottomBody: {
    flex: 1, overflow: 'auto',
    backgroundColor: '#0d1117',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    height: '100%', color: '#8b949e', padding: '40px',
    textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: '48px', marginBottom: '16px', color: '#58a6ff' },
  emptyTitle: { fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0', color: '#e6edf3' },
  emptyText: { fontSize: '14px', margin: 0, color: '#8b949e' },
  emptyHint: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100%', color: '#8b949e', fontSize: '13px',
  },
  actionButton: {
    padding: '10px 20px', border: 'none', borderRadius: '8px',
    color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
};
