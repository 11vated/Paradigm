import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeedStore } from "@/stores/seedStore";
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
    error,
    fetchSeeds,
    setCurrentSeed,
    setArtifact,
    growCurrentSeed,
    growSeedById,
    addToGallery,
    generateNewSeed,
    clearError,
  } = useSeedStore();
  const [activeView, setActiveView] = useState("forge"); // forge, lineage, map
  const [inspectorTab, setInspectorTab] = useState("agent"); // agent, genes, gspl, forge

  useEffect(() => {
    fetchSeeds({ limit: 50 });
  }, [fetchSeeds]);

  const handleSelectSeed = useCallback(
    async (seed) => {
      setCurrentSeed(seed);
      await growCurrentSeed();
    },
    [setCurrentSeed, growCurrentSeed],
  );

  const handleSeedCreated = useCallback(
    async (seed) => {
      setCurrentSeed(seed);
      addToGallery(seed);
      await growCurrentSeed();
    },
    [setCurrentSeed, addToGallery, growCurrentSeed],
  );

  return (
    <div
      className="h-screen w-full bg-[#050505] text-[#ededed] flex flex-col overflow-hidden font-sans"
      data-testid="creation-studio"
    >
      {/* Top Bar - The Genetic Forge */}
      <div
        className="h-14 border-b border-[#1a1a1a] bg-[#050505] flex items-center px-5 gap-6 shrink-0 z-10"
        data-testid="studio-topbar"
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="studio-back-btn"
            onClick={() => navigate("/")}
            className="text-[#666] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded border border-[#333] flex items-center justify-center bg-[#0a0a0a]">
            <Dna className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-semibold text-sm tracking-widest text-[#ececec]">
            PARADIGM
          </span>
        </div>

        <div className="h-4 w-px bg-[#1a1a1a]" />

        <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-sm border border-[#1a1a1a]">
          <button
            onClick={() => setActiveView("forge")}
            className={`px-4 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeView === "forge"
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            <Terminal className="w-3 h-3" /> Forge
          </button>
          <button
            onClick={() => setActiveView("lineage")}
            className={`px-4 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeView === "lineage"
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            <GitBranch className="w-3 h-3" /> Lineage
          </button>
          <button
            onClick={() => setActiveView("composition")}
            className={`px-4 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeView === "composition"
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            <Network className="w-3 h-3" /> Map
          </button>
        </div>

        <div className="flex-1" />

        {/* Sovereignty Badge */}
        <div className="flex items-center gap-3 px-3 py-1.5 border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm">
          <Shield className="w-3 h-3 text-purple-400" />
          <span className="font-mono text-[9px] text-[#666] uppercase tracking-widest">
            Sovereignty
          </span>
          <div className="flex gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentSeed?.$sovereignty?.signature ? "bg-green-500" : "bg-[#222]"
              }`}
              title="Signed"
            />
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentSeed?.$sovereignty?.verified ? "bg-green-500" : "bg-[#222]"
              }`}
              title="Verified"
            />
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentSeed?.$sovereignty?.minted ? "bg-purple-500" : "bg-[#222]"
              }`}
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
          <PanelGroup direction="horizontal">
            {/* Left Column: Seed Vault */}
            <Panel defaultSize={20} minSize={15} className="flex flex-col bg-[#050505] border-r border-[#1a1a1a]">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="font-mono text-[10px] text-[#888] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                  Seed Vault
                </div>
                <GalleryGrid
                  seeds={gallery}
                  onSelect={handleSelectSeed}
                  selectedId={currentSeed?.id}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="w-[1px] bg-[#1a1a1a] hover:bg-primary/50 transition-colors cursor-col-resize" />

            {/* Center Column: Preview Viewport */}
            <Panel defaultSize={50} minSize={30} className="relative flex flex-col bg-[#0a0a0a]">
              <PreviewViewport artifact={artifact} loading={loading} />
            </Panel>

            <PanelResizeHandle className="w-[1px] bg-[#1a1a1a] hover:bg-primary/50 transition-colors cursor-col-resize" />

            {/* Right Column: Inspector Tabs */}
            <Panel defaultSize={30} minSize={20} className="flex flex-col bg-[#050505] border-l border-[#1a1a1a]">
              <div className="flex items-center gap-1 border-b border-[#1a1a1a] p-2 bg-[#0a0a0a]">
                {["agent", "genes", "gspl", "forge"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInspectorTab(tab)}
                    className={`flex-1 py-1.5 rounded-sm font-mono text-[9px] uppercase tracking-widest transition-all ${
                      inspectorTab === tab
                        ? "bg-[#1a1a1a] text-white shadow-sm"
                        : "text-[#666] hover:text-[#aaa] hover:bg-[#111]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto bg-[#080808]">
                {inspectorTab === "agent" && (
                  <AgentPanel onSeedCreated={handleSeedCreated} />
                )}
                {inspectorTab === "genes" && (
                  <GeneEditor
                    seed={currentSeed}
                    onSeedUpdated={handleSeedCreated}
                  />
                )}
                {inspectorTab === "gspl" && (
                  <GSPLEditor onSeedFromGSPL={handleSeedCreated} />
                )}
                {inspectorTab === "forge" && (
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-[#1a1a1a]">
                      <div className="font-mono text-[10px] text-[#888] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent" />
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
                    <div className="p-4">
                      <CompositionPanel
                        seed={currentSeed}
                        gallery={gallery}
                        onComposed={(child) => {
                          addToGallery(child);
                          handleSelectSeed(child);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
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
        className="h-7 border-t border-[#1a1a1a] bg-[#050505] flex items-center px-4 gap-4 font-mono text-[10px] text-[#666] shrink-0"
        data-testid="studio-statusbar"
      >
        <span className="text-primary tracking-widest font-semibold">PARADIGM v2.0</span>
        <span className="h-3 w-px bg-[#1a1a1a]" />
        {currentSeed ? (
          <>
            <span title={currentSeed.$hash} className="text-[#888]">
              ID: {currentSeed.$hash?.slice(0, 12)}...
            </span>
            <span className="text-[#888]">
              FITNESS: {currentSeed.$fitness?.overall?.toFixed(4) || "—"}
            </span>
            <span className="text-[#888]">GEN: {currentSeed.$lineage?.generation || 0}</span>
            <span className="text-primary/80 uppercase tracking-widest ml-auto">
              {currentSeed.$domain}
            </span>
          </>
        ) : (
          <span className="text-[#555]">Awaiting seed loading...</span>
        )}
      </div>
    </div>
  );
}
