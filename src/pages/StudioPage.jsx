import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeedStore } from '@/stores/seedStore';
import { listSeeds, growSeed } from '@/services/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dna, ArrowLeft } from 'lucide-react';
import PromptBar from '@/components/studio/PromptBar';
import GeneEditor from '@/components/studio/GeneEditor';
import PreviewViewport from '@/components/studio/PreviewViewport';
import GalleryGrid from '@/components/studio/GalleryGrid';
import LineageGraph from '@/components/studio/LineageGraph';
import EvolvePanel from '@/components/studio/EvolvePanel';
import BreedPanel from '@/components/studio/BreedPanel';
import ExportPanel from '@/components/studio/ExportPanel';
import GSPLEditor from '@/components/studio/GSPLEditor';
import CompositionPanel from '@/components/studio/CompositionPanel';
import SeedLibrary from '@/components/studio/SeedLibrary';
import AgentPanel from '@/components/studio/AgentPanel';

export default function StudioPage() {
  const navigate = useNavigate();
  const { currentSeed, gallery, artifact, loading, setGallery, setCurrentSeed, setArtifact, setLoading, addToGallery } = useSeedStore();

  const loadGallery = useCallback(async () => {
    try {
      const seeds = await listSeeds({ limit: 50 });
      setGallery(seeds);
    } catch (e) { console.error(e); }
  }, [setGallery]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const handleSelectSeed = useCallback(async (seed) => {
    setCurrentSeed(seed);
    setLoading(true);
    try {
      const art = await growSeed(seed.id);
      setArtifact(art);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [setCurrentSeed, setArtifact, setLoading]);

  const handleSeedCreated = useCallback(async (seed) => {
    setCurrentSeed(seed);
    addToGallery(seed);
    setLoading(true);
    try {
      const art = await growSeed(seed.id);
      setArtifact(art);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [setCurrentSeed, addToGallery, setArtifact, setLoading]);

  return (
    <div className="studio-grid" data-testid="creation-studio">
      {/* Top Bar */}
      <div className="studio-topbar" data-testid="studio-topbar">
        <button data-testid="studio-back-btn" onClick={() => navigate('/')} className="text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Dna className="w-4 h-4 text-primary" />
        <span className="font-heading font-bold text-sm tracking-tight text-primary">PARADIGM</span>
        <div className="h-4 w-px bg-neutral-800" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Creation Studio</span>
        <div className="flex-1" />
        {currentSeed && (
          <>
            <span className="font-mono text-[10px] text-primary">{currentSeed.$domain}</span>
            <span className="font-heading text-xs text-neutral-300">{currentSeed.$name}</span>
            <span className="font-mono text-[10px] text-neutral-600 hidden lg:block">
              GEN:{currentSeed.$lineage?.generation || 0}
            </span>
          </>
        )}
      </div>

      {/* Left Sidebar: Gallery + Lineage + Library + Agent */}
      <div className="studio-sidebar-left" data-testid="studio-sidebar-left">
        <Tabs defaultValue="gallery" className="h-full flex flex-col">
          <TabsList className="w-full rounded-none bg-transparent border-b border-neutral-800 h-8 p-0 grid grid-cols-4">
            <TabsTrigger value="gallery" className="rounded-none text-[9px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-gallery">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="lineage" className="rounded-none text-[9px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-lineage">
              Lineage
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-none text-[9px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-library">
              Library
            </TabsTrigger>
            <TabsTrigger value="agent" className="rounded-none text-[9px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-agent">
              Agent
            </TabsTrigger>
          </TabsList>
          <TabsContent value="gallery" className="flex-1 m-0 overflow-y-auto">
            <GalleryGrid seeds={gallery} onSelect={handleSelectSeed} selectedId={currentSeed?.id} />
          </TabsContent>
          <TabsContent value="lineage" className="flex-1 m-0 overflow-hidden">
            <LineageGraph seeds={gallery} currentSeed={currentSeed} onSelect={handleSelectSeed} />
          </TabsContent>
          <TabsContent value="library" className="flex-1 m-0 overflow-y-auto">
            <SeedLibrary onImport={handleSeedCreated} activeSeed={currentSeed} />
          </TabsContent>
          <TabsContent value="agent" className="flex-1 m-0 overflow-hidden flex flex-col">
            <AgentPanel onSeedCreated={handleSeedCreated} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Center: Viewport + Prompt */}
      <div className="studio-center" data-testid="studio-center">
        <PreviewViewport artifact={artifact} loading={loading} />
        <PromptBar onSeedCreated={handleSeedCreated} />
      </div>

      {/* Right Sidebar: Gene Editor + Operations + Compose + GSPL */}
      <div className="studio-sidebar-right" data-testid="studio-sidebar-right">
        <Tabs defaultValue="genes" className="h-full flex flex-col">
          <TabsList className="w-full rounded-none bg-transparent border-b border-neutral-800 h-8 p-0 grid grid-cols-6">
            <TabsTrigger value="genes" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-genes">
              Genes
            </TabsTrigger>
            <TabsTrigger value="evolve" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-secondary data-[state=active]:border-b data-[state=active]:border-secondary h-full" data-testid="tab-evolve">
              Evolve
            </TabsTrigger>
            <TabsTrigger value="breed" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:border-b data-[state=active]:border-accent h-full" data-testid="tab-breed">
              Breed
            </TabsTrigger>
            <TabsTrigger value="compose" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:border-b data-[state=active]:border-accent h-full" data-testid="tab-compose">
              Compose
            </TabsTrigger>
            <TabsTrigger value="gspl" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-gspl">
              GSPL
            </TabsTrigger>
            <TabsTrigger value="export" className="rounded-none text-[8px] font-mono uppercase tracking-wider data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary h-full" data-testid="tab-export">
              Export
            </TabsTrigger>
          </TabsList>
          <TabsContent value="genes" className="flex-1 m-0 overflow-y-auto">
            <GeneEditor seed={currentSeed} onSeedUpdated={handleSeedCreated} />
          </TabsContent>
          <TabsContent value="evolve" className="flex-1 m-0 overflow-y-auto">
            <EvolvePanel seed={currentSeed} onEvolved={(pop) => { pop.forEach(addToGallery); if (pop[0]) handleSelectSeed(pop[0]); }} />
          </TabsContent>
          <TabsContent value="breed" className="flex-1 m-0 overflow-y-auto">
            <BreedPanel gallery={gallery} onBred={handleSeedCreated} />
          </TabsContent>
          <TabsContent value="compose" className="flex-1 m-0 overflow-y-auto">
            <CompositionPanel seed={currentSeed} gallery={gallery} onComposed={handleSeedCreated} />
          </TabsContent>
          <TabsContent value="gspl" className="flex-1 m-0 overflow-hidden flex flex-col">
            <GSPLEditor onSeedFromGSPL={handleSeedCreated} />
          </TabsContent>
          <TabsContent value="export" className="flex-1 m-0 overflow-y-auto">
            <ExportPanel seed={currentSeed} onSeedUpdated={handleSeedCreated} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Bar */}
      <div className="studio-statusbar relative" data-testid="studio-statusbar">
        {/* Subtle energy line at top of status bar */}
        <div className="absolute top-0 left-0 right-0 h-px energy-line opacity-30" />
        <span className="text-primary/40">PARADIGM <span className="text-primary/60">v2.0</span></span>
        <span className="h-2 w-px bg-neutral-800" />
        {currentSeed ? (
          <>
            <span className="text-neutral-600" title={currentSeed.$hash}>{currentSeed.$hash?.slice(0, 20)}...</span>
            <span>FIT: <span className="text-primary/80">{((currentSeed.$fitness?.overall || 0) * 100).toFixed(1)}%</span></span>
            <span>GEN: <span className="text-secondary/80">{currentSeed.$lineage?.generation || 0}</span></span>
            <span className="text-accent/60">{currentSeed.$domain}</span>
            {currentSeed.$sovereignty?.signature && <span className="text-primary animate-breathe">◆ SIGNED</span>}
          </>
        ) : <span className="text-neutral-700">No seed loaded — type a prompt or select from gallery</span>}
      </div>
    </div>
  );
}
