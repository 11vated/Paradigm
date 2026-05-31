/**
 * Paradigm Infinite — Macro-Epoch Model (Engineering Grade, from Spec Part 1/2)
 * Reverse-engineered from the complete end-state closed loop.
 */

export interface MacroEpoch {
  id: number;
  name: string;
  goal: string;
  targetDomainsAtFullFidelity: number;
  keyContracts: string[];
  heroFlagships: string[];
  verificationGates: string[];
}

export const MACRO_EPOCHS: MacroEpoch[] = [
  {
    id: 1,
    name: "Substrate Honesty & Universal Contracts",
    goal: "Make kernel, 9-strata, GSPL, and all 27 contracts production-grade and honest.",
    targetDomainsAtFullFidelity: 7,
    keyContracts: ["QualityContract", "9-Strata", "GSPL-Core", "DeterminismBoundary"],
    heroFlagships: [],
    verificationGates: ["lint-no-evasion=0", "all-contracts-declared", "golden-hashes>=30"],
  },
  {
    id: 2,
    name: "First Sovereign Closed Loop + Multi-Flagship Proof",
    goal: "Deliver the minimal closed loop that makes 'Paradigm Infinite is real' demonstrable.",
    targetDomainsAtFullFidelity: 12,
    keyContracts: ["GSPL-Supremacy", "Inverse-Substrate", "ReproducibilityHarness", "Economics-Primitives-v0.5"],
    heroFlagships: ["Goku_Son", "DeepSovereignWorld", "FirstAdaptiveAlbum", "SelfContainedPlayableGame", "LongformNarrativeEpic"],
    verificationGates: ["5+ flagships@0.93+", "agent-reproducibility=0.95+", "federation-v0.5-demo"],
  },
  {
    id: 3,
    name: "Domain Elevation at Scale + 100k Corpus",
    goal: "Industrial application of the template. Massive corpus growth.",
    targetDomainsAtFullFidelity: 18,
    keyContracts: ["All 27 at 0.9+ on golden sets", "Cross-domain functors 500+"],
    heroFlagships: ["Additional 7 flagships across domains"],
    verificationGates: ["100k+ curated seeds", "18 domains @ target fidelity"],
  },
  {
    id: 4,
    name: "Economic Substrate & Federation v1",
    goal: "Royalties, licensing, and sovereign federation fully operational.",
    targetDomainsAtFullFidelity: 22,
    keyContracts: ["Lineage Royalties at Depth", "Universe Licensing", "Federation v1 Protocol"],
    heroFlagships: ["Economic flagship seeds"],
    verificationGates: ["Royalties calculable and payable", "Federation exchange between independent operators"],
  },
  {
    id: 5,
    name: "Hero Corpus & Public Surfaces",
    goal: "1M-game corpus foundations + production public surfaces.",
    targetDomainsAtFullFidelity: 25,
    keyContracts: ["Full public Studio + Maker CLI", "Public hero loop"],
    heroFlagships: ["Public corpus heroes"],
    verificationGates: ["1M-game corpus structure live", "Public surfaces @ production quality"],
  },
  {
    id: 6,
    name: "OS Shell & Recursive Closure",
    goal: "Paradigm as the UI layer of reality. Self-hosting and physical bridge.",
    targetDomainsAtFullFidelity: 27,
    keyContracts: ["GSPL∞", "Physical Bridge Instructions", "Full OS Shell"],
    heroFlagships: ["Reality-layer seeds"],
    verificationGates: ["Recursive self-hosting demo", "Physical synthesis paths"],
  },
];

export function getEpoch(id: number): MacroEpoch | undefined {
  return MACRO_EPOCHS.find(e => e.id === id);
}
