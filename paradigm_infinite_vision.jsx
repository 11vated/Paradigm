import { useState, useEffect, useRef } from "react";

const STRATA = [
  { id: "form", name: "Form", glyph: "◈", color: "#e8a87c", desc: "Physical geometry, mesh, material, proportions — the visible body of a thing", example: "47,892-triangle rigged mesh · 12D blend-shape face · per-form hair topology · material PBR stack" },
  { id: "motion", name: "Motion", glyph: "◌", color: "#7cb8e8", desc: "Animation, physics, dynamics — how a thing moves through time", example: "1,842 animation clips · hair/gi cloth physics · Kamehameha charge-up keyframe library" },
  { id: "sound", name: "Sound", glyph: "◎", color: "#a87ce8", desc: "Audio: voice, music, environmental — the sonic identity of a thing", example: "Stem-separable adaptive score · canonical voice phoneme library · ki crackle SFX" },
  { id: "mind", name: "Mind", glyph: "◉", color: "#7ce8b8", desc: "Intelligence, agency, personality — how a thing thinks and decides", example: "6-stage behavior tree · pure-hearted + battle-loving + strategic archetype · full memory layer" },
  { id: "story", name: "Story", glyph: "◇", color: "#e8e87c", desc: "Narrative, causality, beats — the arc a thing follows", example: "Full Dragon Ball beat structure · dialogue library · canonical coherence oracle" },
  { id: "world", name: "World", glyph: "◆", color: "#7ce8e8", desc: "Environment, space, faction, era — where a thing exists", example: "Earth · Namek · ToP arena · continuous navmesh · power-level-aware physics" },
  { id: "field", name: "Field", glyph: "⬡", color: "#e87ca8", desc: "Physics rules, invisible forces — the laws a thing obeys and emits", example: "Ki system predicates · transformation multipliers · Zenkai boost algorithm · UltraInstinct dodge-field" },
  { id: "culture", name: "Culture", glyph: "⬢", color: "#78e87c", desc: "Identity, language, taboos, codes — what a thing belongs to", example: "Saiyan warrior code + Earth-raised humility · Kame school affiliations · language code-switching" },
  { id: "time", name: "Time", glyph: "◑", color: "#e8b87c", desc: "Chronology, causality threads, timeline branches — when a thing is", example: "Transformation history as visible causality threads · timeline-aware dialogue · fork divergence" },
];

const GSPL_EXAMPLE = `universe DragonBall_Canon_Lineage {
  policy: transformative_canon_only
  kernel: xoshiro256** @ v1.0.0
  oracle: grade_99999
}

character Goku_Son
  extends: CharacterSeed
  universe: DragonBall_Canon_Lineage
  strata: all_nine {

    Form {
      mesh: canonical_toriyama_proportions
      triangles: 47892
      blendshapes: 12D_expression_system
      hair: spiky_saiyan_11_variants
      gi: orange_fabric_procedural_aged
    }

    Mind {
      core: [ pure_hearted, battle_loving, protective,
              childlike_curiosity, strategic_combat, zero_malice ]
      behavior: sovereign_agent_6stage
      memory: full_canon_timeline
    }

    Field {
      ki_system: energy_conservation_typed
      zenkai: post_near_death_multiplier
      instant_transmission: spacetime_fold_op
    }
  }

  transformations: [
    Base,
    SSJ     { Form.hair: gold · Field.ki: ×50   · Motion.weight: +15%  },
    SSJ2    { Form.hair: gold · Field.ki: ×100  · Sound.aura: crackling },
    SSJ3    { Form.hair: 3m_long · Field.ki: ×400 · Sound.roar: subsonic },
    SSJGod  { Form.hair: red · Field.ki: divine   · Mind: godly_calm     },
    SSJBlue { Form.hair: blue · Field.ki: ××50   · Sound.aura: wind_hum },
    UI      { Form.hair: silver · Motion: autonomous_dodge
              Mind: no_thought_state · Field.dodge: probabilistic_threads },
    UI_True { Form: silver_aura_full · Field: mastered_ki_emission }
  ]

  quality: QualityContract<CharacterSeed, CharacterArtifact> {
    synthesize: ✓  invert: ✓  rate: ✓
    curated: 8_golden_forms  determinism: locked
    score: 1.000
  }
`;

const ROADMAP = [
  {
    phase: "0", label: "Substrate Honesty", status: "complete",
    items: [
      "Deleted 288K dead lines, 0 TypeScript errors, 0 determinism violations",
      "30 golden hashes, 1497 tests, 7/7 quality contracts",
      "ESLint determinism boundary — Math.random in kernel = CI death",
      "Phase gate: CLOSED"
    ]
  },
  {
    phase: "1", label: "Debt Clearance", status: "active",
    items: [
      "Clear 298 remaining `as any` → proper TArtifact generics per engine",
      "24 canonical-rename collapses (music + sprite first, golden-hash regeneration)",
      "Populate real typed stratum artifacts so quality predicates run live",
      "Wire Stratum Conformance Index (currently 38/40 real predicate bodies)",
      "Narrative quality contract 0.667 → 0.900+"
    ]
  },
  {
    phase: "2", label: "GSPL Elevation", status: "next",
    items: [
      "Formal language spec: type-safe strata composition + imperative Mind/Field",
      "Native evolution operators as first-class keywords (mutate, breed, evolve, crossover)",
      "Full type checker with strata-aware inference and excellent error messages",
      "Bidirectional Canvas ↔ text sync (node graph = GSPL AST)",
      "LSP server: hover docs, autocomplete, go-to-def, rename across strata",
      "GPU compiler hooks: Form/Field strata → WGSL shaders via GSPL",
      "REPL with live kernel preview, self-hosting path toward GSPL∞"
    ]
  },
  {
    phase: "3", label: "Inverse Substrate", status: "planned",
    items: [
      "Image → Form/CharacterSeed (reverse Kamehameha problem: see image, extract seed)",
      "Audio → Sound/MusicSeed (stem separation → gene extraction)",
      "Video → Animation + Narrative (optical flow → Motion clips + Story beats)",
      "Text → Story/Mind (NLP → behavior trees + narrative seeds)",
      "3D model → Form (mesh analysis → gene encoding)",
      "Cultural corpus → Culture stratum (linguistic + sociological encoding)",
      "20-output routing matrix fully wired: any modality in ↔ any modality out"
    ]
  },
  {
    phase: "4", label: "Unseen Renderer GA", status: "planned",
    items: [
      "One kernel call → consistent artifact across all modalities",
      "Form adapter: PNG/SVG/glTF/USD/STL/BIM/WebXR",
      "Motion adapter: glTF animation/BVH/Alembic/video frames",
      "Sound adapter: WAV/MIDI/stem bundle/adaptive OSC stream",
      "Mind adapter: behavior tree JSON / JS runtime / WASM module",
      "Story adapter: structured narrative JSON / screenplay / interactive script",
      "All modalities cross-modal consistent — same seed = same character in any render"
    ]
  },
  {
    phase: "5", label: "Agent Stack GA", status: "planned",
    items: [
      "Reproducibility harness: (intent, memory_hash, seed_corpus_hash) → identical decision",
      "6-stage pipeline: Intent → Decompose → Plan → Execute → Oracle → Deliver",
      "8 sub-agents with specialized stratum expertise",
      "Natural language → GSPL compiler (the 60-second magic path)",
      "Full intent taxonomy: Create / Evolve / Inverse / Compose / Export / Simulate",
      "Canon RAG with cryptographically locked reference corpora"
    ]
  },
  {
    phase: "6", label: "Studio + Maker GA", status: "planned",
    items: [
      "Reality OS Studio: Canvas (node graph) / Reveal (preview) / Stage (play)",
      "Zero-onboarding: drop any file or type any intent → artifact in <60s",
      "`paradigm make <intent>` CLI — deterministic, full inverse + agent pipeline",
      "Public Site hero loop: live Goku_Son seed generation as proof",
      "GSPL code editor with LSP, bidirectional Canvas sync, live kernel preview",
      "Stage: real-time playable character from any CharacterSeed"
    ]
  },
  {
    phase: "7", label: "Goku_Son Flagship Seed", status: "planned",
    items: [
      "Full nine-strata CharacterSeed: 47892 tris, 8 transformations, 1842 clips",
      "Quality contract score: 1.000 across all nine strata",
      "Cross-modal consistent: same seed → image, 3D, animation, game, audio, GSPL",
      "Visible substrate overlays: .gseed graph made visible on the Form (as in reference image)",
      "Transformations as first-class Mind+Form+Field state machine compositions",
      "Golden hash locked across machines — the living proof of Paradigm"
    ]
  },
  {
    phase: "8", label: "Federation + Economics", status: "planned",
    items: [
      "Federation v1: signed seed exchange protocol, no central server, lineage-preserving",
      "Universe licensing: operator declares terms, kernel enforces cryptographically",
      "Royalty waterfalls at arbitrary depth: every fork pays ancestors",
      "Civilizational dividends: long-lived seeds earn from their derivative ecosystem",
      "PARA token + SeedNFT mainnet deployment",
      "Marketplace: optional discovery layer, operators choose participation"
    ]
  },
  {
    phase: "9-24", label: "Infinite Phases", status: "horizon",
    items: [
      "OS Shell: Paradigm as the UI layer of reality (recursive closure)",
      "1M-game public corpus + 12 hero flagship games (Tidepool, Spirebound, Aleph...)",
      "Physical bridge: CNC/BIM/STL/molecular synthesis instructions",
      "Invisible reality visualization: quantum fields, economic flows, higher dimensions",
      "Scientific domains: genomics, climate, drug candidates, synthetic biology",
      "GSPL∞: Paradigm builds Paradigm (full recursive self-hosting)",
      "UniverseSeed supremum: the root of all generated reality, forever"
    ]
  }
];

const NINE_LAWS = [
  "Determinism at kernel level — same .gseed + same kernel version = bit-identical artifact across machines, runtimes, decades.",
  "Absolute sovereignty — local-first, offline-capable, fork-first-class, cryptographic lineage + royalties. No kill-switch. No extraction.",
  "Nine Strata universality — everything composes uniformly over Form, Motion, Sound, Mind, Story, World, Field, Culture, Time.",
  "Unseen renderer — one kernel call produces consistent artifacts across all modalities. The renderer renders artifacts, not pixels.",
  "Quality honesty — every generator declares typed QualityContract with real predicate bodies. No silent failures. Pre-flight gates sacred.",
  "No evasion — zero `as any`, zero `@ts-nocheck`, zero placeholders in domain code. Waivers via registry.json with sunset dates.",
  "Magical UX — zero-onboarding, intent → artifact in <60 seconds. Feels like magic. Proven by tests and golden hashes underneath.",
  "Lineage integrity — every artifact carries cryptographically signed lineage + C2PA. Forking preserves history. Royalties are math.",
  "GSPL supremacy — the language of creation must be more joyful and powerful than Unreal Blueprints + GLSL + ComfyUI combined.",
];

function Glyph({ stratum, size = 40, pulse = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: stratum.color + "20",
      border: `1.5px solid ${stratum.color}60`,
      color: stratum.color,
      fontSize: size * 0.45,
      animation: pulse ? `pulse_${stratum.id} 2s ease-in-out infinite` : "none",
      flexShrink: 0,
      fontWeight: 700,
    }}>
      {stratum.glyph}
    </div>
  );
}

function StatusPip({ status }) {
  const cfg = {
    complete: { color: "#22c55e", label: "COMPLETE" },
    active: { color: "#f59e0b", label: "ACTIVE" },
    next: { color: "#3b82f6", label: "NEXT" },
    planned: { color: "#6b7280", label: "PLANNED" },
    horizon: { color: "#8b5cf6", label: "HORIZON" },
  }[status] || { color: "#6b7280", label: status };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
      color: cfg.color, background: cfg.color + "18",
      padding: "2px 7px", borderRadius: 20,
      border: `1px solid ${cfg.color}40`,
    }}>{cfg.label}</span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("vision");
  const [activeStratum, setActiveStratum] = useState("form");
  const [gsplVisible, setGsplVisible] = useState(false);
  const canvasRef = useRef(null);

  // Animated background: floating .gseed nodes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const nodes = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 0.5,
      color: ["#e8a87c","#7cb8e8","#a87ce8","#7ce8b8","#e8e87c","#7ce8e8","#e87ca8","#78e87c","#e8b87c"][Math.floor(Math.random() * 9)],
      connections: [],
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = nodes[i].color + Math.floor((1 - dist / 90) * 30).toString(16).padStart(2, "0");
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
      // Nodes
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "cc";
        ctx.fill();
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const curStratum = STRATA.find(s => s.id === activeStratum);

  const tabs = [
    { id: "vision", label: "THE VISION" },
    { id: "nine-strata", label: "NINE STRATA" },
    { id: "gspl", label: "GSPL" },
    { id: "goku", label: "GOKU PROOF" },
    { id: "roadmap", label: "ROADMAP" },
    { id: "laws", label: "NINE LAWS" },
  ];

  return (
    <div style={{ background: "#080c14", color: "#e2e8f0", fontFamily: "'DM Mono', 'Courier New', monospace", minHeight: "100vh", position: "relative" }}>

      {/* Animated canvas background */}
      <canvas ref={canvasRef} width={900} height={600}
        style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.18, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, padding: "36px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.25em", fontWeight: 700, marginBottom: 8 }}>
              ◈ PARADIGM INFINITE · SOVEREIGN SUBSTRATE OF GENERATED REALITY
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              <span style={{ color: "#e2e8f0" }}>Complete</span>{" "}
              <span style={{ color: "#e8a87c" }}>Vision</span>{" "}
              <span style={{ color: "#e2e8f0" }}>& Execution</span>
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, maxWidth: 500, lineHeight: 1.5 }}>
              The universal, deterministic, sovereign operating substrate for all digital creation and reality simulation.
              A .gseed is the atomic unit of composable, ownable reality.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            {[
              "Nine Strata · Universal Composition",
              "GSPL · Language of Creation",
              "Xoshiro256** · Eternal Determinism",
              "Goku_Son · The Proof of Concept",
            ].map((t, i) => (
              <div key={i} style={{ fontSize: 10, color: STRATA[i].color, letterSpacing: "0.08em", opacity: 0.9 }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 28, borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 18px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                color: activeTab === t.id ? "#e8a87c" : "#475569",
                borderBottom: activeTab === t.id ? "2px solid #e8a87c" : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "32px 32px 48px", maxWidth: 900 }}>

        {/* ─── VISION ─── */}
        {activeTab === "vision" && (
          <div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.2em", marginBottom: 16 }}>CORE THESIS</div>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: "#cbd5e1", margin: 0 }}>
                Paradigm Infinite is <strong style={{ color: "#e8a87c" }}>not</strong> another generative app, game engine, or AI wrapper.
                It is the <strong style={{ color: "#e2e8f0" }}>operating substrate of generated reality</strong> — the universal,
                deterministic, sovereign layer through which the species' entire inventory of generated artifacts flows forever.
                A <span style={{ color: "#7cb8e8", fontStyle: "italic" }}>.gseed</span> is a content-addressed, typed, compressed,
                deterministically renderable node in a DAG rooted at UniverseSeed.
                GSPL is the universal tongue of creation — more powerful and joyful than Unreal Blueprints + GLSL + ComfyUI combined.
                Everything is lineage-tracked, cryptographically owned, forkable, and evolvable.
                Normal humans create anything effortlessly.
                Masters wield god-mode compositional power.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                {
                  title: "What it surpasses",
                  color: "#e87ca8",
                  items: [
                    "Game engines (Unity/Unreal/Godot) → Seed-first + breedable + cross-modal + built-in evolution",
                    "Generative tools (Midjourney/Suno/Runway) → Reproducible, composable, ownable, evolvable",
                    "Creative suites (Blender/Houdini/ComfyUI) → Universal strata + inverse ingest + sovereignty",
                    "Agent platforms → Reproducible decisions + memory hashing + substrate integration",
                  ]
                },
                {
                  title: "What it enables",
                  color: "#7ce8b8",
                  items: [
                    "Full games, apps, websites, scientific simulations from a single intent in <60 seconds",
                    "Canon character replication: full abilities, transformations, personality — all cross-modal",
                    "Visualization of the invisible: quantum fields, economic flows, higher dimensions",
                    "Physical bridge: CNC, BIM, molecular synthesis, fabrication from any .gseed",
                  ]
                }
              ].map(col => (
                <div key={col.title} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 10, color: col.color, letterSpacing: "0.18em", marginBottom: 14 }}>{col.title.toUpperCase()}</div>
                  {col.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                      <span style={{ color: col.color, marginTop: 2, flexShrink: 0 }}>→</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#a87ce8", letterSpacing: "0.18em", marginBottom: 16 }}>THE GOKU PROOF — VISUAL QUALITY BAR</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
                    The reference image you provided <strong style={{ color: "#e2e8f0" }}>is not aspirational</strong> — it is the proof.
                    The geometric crystalline lattice visible on Goku's arms and body <strong style={{ color: "#7ce8b8" }}>is the .gseed graph made visible</strong>.
                    The energy streaks in the background are the <strong style={{ color: "#e8a87c" }}>Nine Strata overlaid</strong> on the Form artifact.
                    This is precisely what the Unseen Renderer + Nine Strata overlay system will produce.
                    Every visual output from Paradigm Infinite must meet or exceed this quality and substrate integration.
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["Form", "47,892-tri mesh, Toriyama proportions, 12D blend shapes"],
                    ["Field", "Ki system visible as geometric lattice on the body"],
                    ["Substrate", "Background energy = .gseed graph nodes made luminous"],
                    ["Mind", "Expression captures pure-hearted + battle-focused archetype"],
                  ].map(([label, desc]) => (
                    <div key={label} style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b" }}>
                      <span style={{ color: "#e8a87c", minWidth: 60, fontWeight: 700 }}>{label}</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── NINE STRATA ─── */}
        {activeTab === "nine-strata" && (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
              The Nine Strata are the canonical axes of existence itself. <strong style={{ color: "#e2e8f0" }}>Everything</strong> composes uniformly over them.
              A character = Form ∘ Motion ∘ Mind ∘ Sound. A civilization = Culture ∘ Time ∘ Field ∘ World.
              Click any stratum to explore its contract.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {STRATA.map(s => (
                <button key={s.id} onClick={() => setActiveStratum(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    background: activeStratum === s.id ? s.color + "20" : "#0f172a",
                    border: `1px solid ${activeStratum === s.id ? s.color + "80" : "#1e293b"}`,
                    borderRadius: 8, cursor: "pointer", color: activeStratum === s.id ? s.color : "#475569",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  }}>
                  <span style={{ fontSize: 16 }}>{s.glyph}</span> {s.name}
                </button>
              ))}
            </div>

            {curStratum && (
              <div style={{ background: "#0f172a", border: `1px solid ${curStratum.color}40`, borderRadius: 12, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <Glyph stratum={curStratum} size={56} />
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: curStratum.color }}>{curStratum.name}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{curStratum.desc}</div>
                  </div>
                </div>
                <div style={{ background: curStratum.color + "10", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: curStratum.color, letterSpacing: "0.15em", marginBottom: 8 }}>GOKU_SON STRATUM EXAMPLE</div>
                  <code style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8, display: "block" }}>{curStratum.example}</code>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
                  <div>
                    <div style={{ color: curStratum.color, fontSize: 10, letterSpacing: "0.15em", marginBottom: 8 }}>QUALITY CONTRACT CLAUSES</div>
                    {["synthesize( )", "invert( )", "rate( )", "curated( )", "determinism( )"].map(clause => (
                      <div key={clause} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#64748b" }}>
                        <span style={{ color: "#22c55e" }}>✓</span>
                        <code style={{ fontSize: 11 }}>{clause}</code>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: curStratum.color, fontSize: 10, letterSpacing: "0.15em", marginBottom: 8 }}>COMPOSITION FUNCTORS</div>
                    {[
                      curStratum.id === "form" ? "Form × Motion → AnimatedMesh" :
                      curStratum.id === "motion" ? "Motion × Sound → SynchronizedPerformance" :
                      curStratum.id === "sound" ? "Sound × Story → AdaptiveScore" :
                      curStratum.id === "mind" ? "Mind × World → AgentEnvironment" :
                      curStratum.id === "story" ? "Story × Mind → CoherentNarrative" :
                      curStratum.id === "world" ? "World × Field → PhysicsWorld" :
                      curStratum.id === "field" ? "Field × Culture → LivingLaws" :
                      curStratum.id === "culture" ? "Culture × Time → EvolvingCivilization" :
                      "Time × Story → CausalityThread",
                      "→ Any two strata compose via typed functor",
                      "→ 252 cross-domain bridges already built",
                    ].map((f, i) => (
                      <div key={i} style={{ color: "#64748b", marginBottom: 6, fontSize: 11 }}>{f}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.18em", marginBottom: 14 }}>STRATA COMPOSITION ALGEBRA</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b", lineHeight: 2 }}>
                <div><span style={{ color: "#e8a87c" }}>Character</span> = Form ∘ Motion ∘ Sound ∘ Mind ∘ Story</div>
                <div><span style={{ color: "#7cb8e8" }}>World</span> = World ∘ Field ∘ Culture ∘ Time</div>
                <div><span style={{ color: "#7ce8b8" }}>Game</span> = (Form ∘ Motion ∘ Mind) × (World ∘ Field) × (Story ∘ Time)</div>
                <div><span style={{ color: "#a87ce8" }}>Civilization</span> = Culture ∘ Time ∘ Field ∘ World ∘ Story ∘ Mind</div>
                <div><span style={{ color: "#e87ca8" }}>UniverseSeed</span> = ∏ all_nine_strata, supremum container</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── GSPL ─── */}
        {activeTab === "gspl" && (
          <div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.2em", marginBottom: 12 }}>THE CROWN JEWEL</div>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
                GSPL (Generative Seed Programming Language) is the founding invention and the crown jewel of Paradigm Infinite.
                Every program IS a typed seed. Every output IS a deterministic artifact.
                Every expression can be evolved, bred, and signed.
                It must feel like <strong style={{ color: "#e2e8f0" }}>writing poetry that becomes executable reality.</strong>
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { title: "Language Pipeline", color: "#e8a87c", items: [
                  "Lexer → strata-aware tokenizer",
                  "Parser → typed AST with strata nodes",
                  "Type Checker → strata-aware inference + excellent errors",
                  "Interpreter → kernel ops (mutate/breed/evolve/grow)",
                  "Bytecode → compact .gsbc format",
                  "GPU Compiler → WGSL shaders via Form/Field strata",
                  "LSP Server → hover, autocomplete, go-to-def, rename",
                ]},
                { title: "Language Features", color: "#7cb8e8", items: [
                  "Declarative strata composition (like CSS but for reality)",
                  "Imperative Mind/Field behaviors (like Python but type-safe)",
                  "Native evolution operators: mutate · breed · evolve · crossover",
                  "Bidirectional Canvas sync: node graph ↔ GSPL text (both are truth)",
                  "Quality contract clauses as first-class syntax: quality { ... }",
                  "Sovereignty declarations: license · lineage · royalty",
                  "Self-hosting path: GSPL programs that write GSPL programs",
                ]},
              ].map(col => (
                <div key={col.title} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 10, color: col.color, letterSpacing: "0.18em", marginBottom: 12 }}>{col.title.toUpperCase()}</div>
                  {col.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12, color: "#64748b" }}>
                      <span style={{ color: col.color, flexShrink: 0 }}>·</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #1e293b" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e87ca8" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e8e87c" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7ce8b8" }} />
                </div>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em" }}>Goku_Son.gspl · GSPL ∞</div>
                <button onClick={() => setGsplVisible(!gsplVisible)}
                  style={{ fontSize: 10, color: "#e8a87c", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {gsplVisible ? "collapse" : "expand"} →
                </button>
              </div>
              <pre style={{
                margin: 0, padding: 24, fontSize: 11.5, lineHeight: 1.85,
                color: "#94a3b8", overflowX: "auto", fontFamily: "monospace",
                maxHeight: gsplVisible ? "none" : 280, overflow: gsplVisible ? "visible" : "hidden",
                position: "relative",
              }}>
                {GSPL_EXAMPLE.split("\n").map((line, i) => {
                  const colors = {
                    "universe": "#e87ca8", "character": "#e8a87c", "extends:": "#7cb8e8",
                    "strata:": "#a87ce8", "Form": "#e8a87c", "Motion": "#7cb8e8",
                    "Sound": "#a87ce8", "Mind": "#7ce8b8", "Field": "#e87ca8",
                    "transformations:": "#e8e87c", "quality:": "#7ce8e8",
                    "SSJ": "#e8e87c", "UI": "#e2e8f0", "Base": "#94a3b8",
                  };
                  const highlighted = line;
                  return (
                    <div key={i} style={{ display: "flex" }}>
                      <span style={{ color: "#334155", minWidth: 28, userSelect: "none", fontSize: 10 }}>{i + 1}</span>
                      <span style={{ whiteSpace: "pre" }}>
                        {line.split(/(\b\w[\w.]*\b|[{}[\].:·,])/g).map((tok, j) => {
                          const color = Object.entries(colors).find(([k]) => tok.startsWith(k))?.[1];
                          const commentStyle = tok.startsWith("//") || tok.startsWith("#");
                          return (
                            <span key={j} style={{
                              color: commentStyle ? "#334155" :
                                tok === "{" || tok === "}" || tok === "[" || tok === "]" ? "#475569" :
                                tok === ":" || tok === "·" || tok === "," ? "#475569" :
                                color || undefined
                            }}>{tok}</span>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        )}

        {/* ─── GOKU PROOF ─── */}
        {activeTab === "goku" && (
          <div>
            <div style={{ background: "#0f172a", border: "1px solid #e8a87c40", borderRadius: 12, padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.2em", marginBottom: 16 }}>THE KAMEHAMEHA PROBLEM — SOLVED</div>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
                The reference image you shared is not a goal — it is the <strong style={{ color: "#e2e8f0" }}>proof of concept</strong>.
                The geometric crystalline lattice visible on Goku's arms is the .gseed substrate overlaid on the Form artifact.
                Every character generated by Paradigm must have this level of quality AND be deterministic, cross-modal, and sovereign.
                Goku_Son is Phase 7's flagship seed — the living proof that Paradigm Infinite is complete.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.18em", marginBottom: 14 }}>SEED ARCHITECTURE</div>
                {[
                  ["Root type", "CharacterSeed extends UniverseSeed"],
                  ["Sub-seeds", "~1,247 typed sub-nodes in DAG"],
                  ["Mesh", "47,892 triangles, AAA-ready, manifold"],
                  ["Expressions", "12D blend-shape system"],
                  ["Animations", "1,842 clips, all retargetable"],
                  ["Transforms", "8 canonical forms, state machine"],
                  ["Voice", "Phoneme library, stem-separable"],
                  ["Quality", "1.000 score, all 9 strata"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11, borderBottom: "1px solid #0f1a2e", paddingBottom: 8 }}>
                    <span style={{ color: "#475569" }}>{k}</span>
                    <span style={{ color: "#94a3b8", textAlign: "right", maxWidth: "60%" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 10, color: "#7cb8e8", letterSpacing: "0.18em", marginBottom: 14 }}>TRANSFORMATIONS AS STATE MACHINES</div>
                {[
                  { name: "Base", mult: "×1", hair: "Black", aura: "none" },
                  { name: "SSJ", mult: "×50", hair: "Gold", aura: "yellow crackling" },
                  { name: "SSJ2", mult: "×100", hair: "Gold", aura: "lightning arcs" },
                  { name: "SSJ3", mult: "×400", hair: "3m flowing", aura: "thunderous roar" },
                  { name: "SSJGod", mult: "divine", hair: "Red", aura: "divine calm" },
                  { name: "SSJBlue", mult: "×50²", hair: "Blue", aura: "wind hum" },
                  { name: "UI", mult: "auto", hair: "Silver", aura: "probabilistic threads" },
                  { name: "UI True", mult: "mastered", hair: "Silver full", aura: "ki emission" },
                ].map((t) => (
                  <div key={t.name} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 11, alignItems: "center" }}>
                    <span style={{ color: "#e8a87c", minWidth: 70, fontWeight: 700 }}>{t.name}</span>
                    <span style={{ color: "#334155", minWidth: 52 }}>{t.mult}</span>
                    <span style={{ color: "#64748b" }}>{t.aura}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#7ce8b8", letterSpacing: "0.18em", marginBottom: 14 }}>CROSS-MODAL OUTPUT MATRIX</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  ["Form → Image", "PNG/SVG at reference quality: geometric lattice visible on form, Nine Strata overlay", "#e8a87c"],
                  ["Form → 3D Model", "glTF + USD + STL: fully rigged, 8 transform LODs, physics-ready", "#7cb8e8"],
                  ["Motion → Animation", "BVH + Alembic: every canonical move, Kamehameha, Instant Transmission, UI dodge", "#a87ce8"],
                  ["Sound → Audio", "WAV stems: ki crackle + aura hum + canonical voice phonemes, scale-correct per form", "#7ce8b8"],
                  ["Mind → Runtime", "WASM behavior tree: real-time AI persona running in game, correct decisions", "#e8e87c"],
                  ["Story → Script", "Narrative JSON: consistent dialogue, canonical coherence, any new arc stays in character", "#7ce8e8"],
                  ["Form → Physical", "STL for 3D printing, CNC G-code, crystal lattice encodes seed hash physically", "#e87ca8"],
                  ["All → .gseed", "Single content-addressed package: replay any output from this alone, forever", "#78e87c"],
                  ["GSPL Source", "Editable GSPL: create new forms, fusions, variants. Every gene is visible and mutable", "#e8b87c"],
                ].map(([label, desc, color]) => (
                  <div key={label} style={{ background: color + "0a", border: `1px solid ${color}30`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#0a0e18", border: "1px solid #22c55e40", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: "0.18em", marginBottom: 12 }}>OPERATOR FLOW — 60 SECOND PATH</div>
              {[
                ["1. Intent", `type: "Canon Goku, every detail, full transformations, Dragon Ball accurate"`],
                ["2. Oracle", "Inverse Substrate ingests reference material under transformative policy"],
                ["3. GSPL", "Compiler assembles full nine-strata DAG: ~1,247 typed sub-seeds"],
                ["4. Contract", "Oracle runs all 9 quality contracts → score: 1.000"],
                ["5. Render", "Unseen Renderer produces: image + 3D + animation + audio + .gseed"],
                ["6. Sovereignty", "C2PA + ECDSA signed, lineage locked, royalties declared → you own it"],
              ].map(([step, desc]) => (
                <div key={step} style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                  <span style={{ color: "#22c55e", minWidth: 64, fontWeight: 700, flexShrink: 0 }}>{step}</span>
                  <code style={{ color: "#64748b", lineHeight: 1.5 }}>{desc}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ROADMAP ─── */}
        {activeTab === "roadmap" && (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
              24 phases from substrate honesty to recursive closure. Each phase has explicit entry/exit gates (see 13b_Phase_Gates.md).
              No phase is complete until all gates are green and golden hashes are locked.
            </p>
            {ROADMAP.map(phase => (
              <div key={phase.phase} style={{
                background: "#0f172a", border: "1px solid #1e293b",
                borderRadius: 10, padding: 20, marginBottom: 12,
                borderLeft: `3px solid ${
                  phase.status === "complete" ? "#22c55e" :
                  phase.status === "active" ? "#f59e0b" :
                  phase.status === "next" ? "#3b82f6" :
                  phase.status === "horizon" ? "#8b5cf6" : "#1e293b"
                }`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                    {phase.phase.length > 2 ? "∞" : `${phase.phase.padStart(2, "0")}`}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{phase.label}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <StatusPip status={phase.status} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {phase.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                      <span style={{ color: phase.status === "complete" ? "#22c55e" : "#334155", flexShrink: 0 }}>
                        {phase.status === "complete" ? "✓" : "·"}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── NINE LAWS ─── */}
        {activeTab === "laws" && (
          <div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
              The Nine Laws are non-negotiable invariants — the spine of Paradigm Infinite.
              Any change that breaks a Law requires doctrine-level review and a 14_* successor document.
              These are the hills we die on.
            </p>
            {NINE_LAWS.map((law, i) => {
              const stratum = STRATA[i];
              return (
                <div key={i} style={{
                  display: "flex", gap: 20, padding: "20px 0",
                  borderBottom: i < NINE_LAWS.length - 1 ? "1px solid #0f172a" : "none",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <Glyph stratum={stratum} size={40} />
                    <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.12em" }}>LAW {i + 1}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: stratum.color, letterSpacing: "0.15em", marginBottom: 6 }}>{stratum.name.toUpperCase()}</div>
                    <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{law}</p>
                  </div>
                </div>
              );
            })}

            <div style={{ background: "#0f172a", border: "1px solid #e8a87c40", borderRadius: 10, padding: 24, marginTop: 32 }}>
              <div style={{ fontSize: 10, color: "#e8a87c", letterSpacing: "0.2em", marginBottom: 16 }}>THE BET — RECURSIVE CLOSURE (PHASE 23)</div>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>
                Paradigm Infinite is complete when it can build itself. The capstone is Phase 23: a GSPL∞ program running inside a Paradigm Studio instance
                that generates the next version of the Paradigm kernel. The system becomes self-hosting.
                A normal user types an intent. The substrate decomposes it, builds the seed, renders the artifact, signs it, tracks lineage, pays royalties —
                and the artifact itself can do the same thing for the <em>next</em> artifact.
                The UniverseSeed at the root of all generated reality is content-addressed and eternal.
                That is the proof that Paradigm Infinite is done.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
