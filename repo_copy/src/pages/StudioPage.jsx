import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedStore } from "@/stores/seedStore";
import { listSeeds, growSeed } from "@/services/api";
import {
  Dna,
  ArrowLeft,
  Terminal,
  GitBranch,
  Network,
  Shield,
  Bot,
} from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import PromptBar from "@/components/studio/PromptBar";
import GeneEditor from "@/components/studio/GeneEditor";
import PreviewViewport from "@/components/studio/PreviewViewport";
import GalleryGrid from "@/components/studio/GalleryGrid";
import LineageGraph from "@/components/studio/LineageGraph";
import EvolvePanel from "@/components/studio/EvolvePanel";
import BreedPanel from "@/components/studio/BreedPanel";
import ExportPanel from "@/components/studio/ExportPanel";
import GSPLEditor from "@/components/studio/GSPLEditor";
import CompositionPanel from "@/components/studio/CompositionPanel";
import SeedLibrary from "@/components/studio/SeedLibrary";
import AgentPanel from "@/components/studio/AgentPanel";

export default function StudioPage() {
  const navigate = useNavigate();
  const {
    currentSeed,
    gallery,
    artifact,
    loading,
    setGallery,
    setCurrentSeed,
    setArtifact,
    setLoading,
    addToGallery,
  } = useSeedStore();
  const [activeView, setActiveView] = useState("forge"); // forge, lineage, composition

  const loadGallery = useCallback(async () => {
    try {
      const seeds = await listSeeds({ limit: 50 });
      setGallery(seeds || []);
    } catch (e) {
      console.error(e);
    }
  }, [setGallery]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleSelectSeed = useCallback(
    async (seed) => {
      setCurrentSeed(seed);
      setLoading(true);
      try {
        const art = await growSeed(seed.id);
        setArtifact(art);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    },
    [setCurrentSeed, setArtifact, setLoading],
  );

  const handleSeedCreated = useCallback(
    async (seed) => {
      setCurrentSeed(seed);
      addToGallery(seed);
      setLoading(true);
      try {
        const art = await growSeed(seed.id);
        setArtifact(art);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    },
    [setCurrentSeed, addToGallery, setArtifact, setLoading],
  );

  return (
    <div
      className="h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden font-sans"
      data-testid="creation-studio"
    >
      {/* Top Bar - The Genetic Forge */}
      <div
        className="h-12 border-b border-neutral-800/80 bg-black/40 flex items-center px-4 gap-6 shrink-0"
        data-testid="studio-topbar"
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="studio-back-btn"
            onClick={() => navigate("/")}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Dna className="w-5 h-5 text-primary" />
          <span className="font-heading font-black text-sm tracking-tight text-white">
            PARADIGM
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-800" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("forge")}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider flex items-center gap-2 transition-colors ${activeView === "forge" ? "bg-primary/10 text-primary border border-primary/20" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <Terminal className="w-3 h-3" /> Forge
          </button>
          <button
            onClick={() => setActiveView("lineage")}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider flex items-center gap-2 transition-colors ${activeView === "lineage" ? "bg-secondary/10 text-secondary border border-secondary/20" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <GitBranch className="w-3 h-3" /> Lineage Forest
          </button>
          <button
            onClick={() => setActiveView("composition")}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider flex items-center gap-2 transition-colors ${activeView === "composition" ? "bg-accent/10 text-accent border border-accent/20" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <Network className="w-3 h-3" /> Composition Map
          </button>
        </div>

        <div className="flex-1" />

        {/* Sovereignty Badge */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-neutral-900/50 border border-neutral-800 rounded">
          <Shield className="w-3.5 h-3.5 text-purple-500" />
          <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
            Sovereignty
          </span>
          <div className="flex gap-2">
            <span
              className={`w-2 h-2 rounded-full ${currentSeed?.$sovereignty?.signature ? "bg-green-500" : "bg-neutral-700"}`}
              title="Signed"
            />
            <span
              className={`w-2 h-2 rounded-full ${currentSeed?.$sovereignty?.verified ? "bg-green-500" : "bg-neutral-700"}`}
              title="Verified"
            />
            <span
              className={`w-2 h-2 rounded-full ${currentSeed?.$sovereignty?.minted ? "bg-purple-500" : "bg-neutral-700"}`}
              title="Minted"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden relative">
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {activeView === "forge" && (
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
              <PanelGroup direction="horizontal">
                {/* Left: Seed Vault & Evolution */}
                <Panel
                  defaultSize={30}
                  minSize={20}
                  className="border-r border-neutral-800/50 flex flex-col bg-black/20"
                >
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      Seed Vault
                    </div>
                    <GalleryGrid
                      seeds={gallery}
                      onSelect={handleSelectSeed}
                      selectedId={currentSeed?.id}
                    />
                  </div>
                  <div className="h-1/3 border-t border-neutral-800/50 p-4 overflow-y-auto bg-black/40">
                    <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Evolution Controls
                    </div>
                    <EvolvePanel
                      seed={currentSeed}
                      onEvolved={(pop) => {
                        pop.forEach(addToGallery);
                        if (pop[0]) handleSelectSeed(pop[0]);
                      }}
                    />
                  </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-neutral-800/50 hover:bg-primary/50 transition-colors cursor-col-resize" />

                {/* Right: Preview & Gene Workbench */}
                <Panel
                  defaultSize={70}
                  minSize={30}
                  className="flex flex-col relative"
                >
                  <div className="flex-1 relative">
                    <PreviewViewport artifact={artifact} loading={loading} />
                    <PromptBar onSeedCreated={handleSeedCreated} />
                  </div>
                  <div className="h-1/3 border-t border-neutral-800/50 bg-black/40 flex flex-col">
                    <div className="px-4 py-2 border-b border-neutral-800/50 font-mono text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Gene Workbench
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <GeneEditor
                        seed={currentSeed}
                        onSeedUpdated={handleSeedCreated}
                      />
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>

            <PanelResizeHandle className="h-1 bg-neutral-800/50 hover:bg-primary/50 transition-colors cursor-row-resize" />

            {/* Bottom: GSPL Console & Agent Reasoning */}
            <Panel defaultSize={30} minSize={15}>
              <PanelGroup direction="horizontal">
                <Panel
                  defaultSize={50}
                  minSize={20}
                  className="border-r border-neutral-800/50 flex flex-col bg-black/60"
                >
                  <div className="px-4 py-2 border-b border-neutral-800/50 font-mono text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-primary" />
                    GSPL Console
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <GSPLEditor onSeedFromGSPL={handleSeedCreated} />
                  </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-neutral-800/50 hover:bg-primary/50 transition-colors cursor-col-resize" />

                <Panel
                  defaultSize={50}
                  minSize={20}
                  className="flex flex-col bg-black/60"
                >
                  <div className="px-4 py-2 border-b border-neutral-800/50 font-mono text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <Bot className="w-3 h-3 text-secondary" />
                    Agent Reasoning
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <AgentPanel onSeedCreated={handleSeedCreated} />
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )}

        {activeView === "lineage" && (
          <div className="w-full h-full p-4">
            <LineageGraph
              seeds={gallery}
              currentSeed={currentSeed}
              onSelect={handleSelectSeed}
            />
          </div>
        )}

        {activeView === "composition" && (
          <div className="w-full h-full p-4 flex gap-4">
            <div className="w-1/3 border border-neutral-800/50 bg-black/40 rounded p-4">
              <CompositionPanel
                seed={currentSeed}
                gallery={gallery}
                onComposed={handleSeedCreated}
              />
            </div>
            <div className="flex-1 border border-neutral-800/50 bg-black/40 rounded flex items-center justify-center">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                Composition Graph Visualization (WIP)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        className="h-6 border-t border-neutral-800/80 bg-black flex items-center px-4 gap-4 font-mono text-[9px] text-neutral-500 shrink-0"
        data-testid="studio-statusbar"
      >
        <span className="text-primary/70">PARADIGM v2.0</span>
        <span className="h-2 w-px bg-neutral-800" />
        {currentSeed ? (
          <>
            <span title={currentSeed.$hash}>
              ID: {currentSeed.$hash?.slice(0, 12)}...
            </span>
            <span>
              FITNESS: {currentSeed.$fitness?.overall?.toFixed(4) || "—"}
            </span>
            <span>GENERATION: {currentSeed.$lineage?.generation || 0}</span>
            <span className="text-primary/60 uppercase">
              {currentSeed.$domain}
            </span>
          </>
        ) : (
          <span>No seed loaded — type a prompt or select from vault</span>
        )}
      </div>
    </div>
  );
}
