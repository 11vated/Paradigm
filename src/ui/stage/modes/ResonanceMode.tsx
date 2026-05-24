import React, { useMemo } from "react";
import { useActiveSeed } from "@/stores/activeSeed";
import { SeedGlyph } from "@/ui/primitives/SeedGlyph";
import { rngFromHash } from "@/lib/kernel/rng";

const DIMENSIONS = [
  { key: "spatial",    glyph: "▣", label: "SPATIAL",    desc: "physical 3D space" },
  { key: "temporal",   glyph: "≡", label: "TEMPORAL",   desc: "time, rhythm, duration" },
  { key: "spectral",   glyph: "≋", label: "SPECTRAL",   desc: "frequency · light · sound" },
  { key: "modal",      glyph: "◆", label: "MODAL",      desc: "emotional · adjective" },
  { key: "possible",   glyph: "⌬", label: "POSSIBLE",   desc: "counterfactual · latent" },
  { key: "semantic",   glyph: "⌘", label: "SEMANTIC",   desc: "meaning · embedding" },
  { key: "structural", glyph: "⊞", label: "STRUCTURAL", desc: "relational topology" },
];

export const ResonanceMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);

  const dims = useMemo(() => {
    const rng = rngFromHash(seed?.hash ?? "deadbeef");
    return DIMENSIONS.map((d) => ({
      ...d,
      occupation: 0.18 + rng.nextF64() * 0.82,
      frequency: 32 + rng.nextF64() * 1024,
      bars: Array.from({ length: 48 }, () => rng.nextF64()),
    }));
  }, [seed?.hash]);

  if (!seed) return (
    <div className="p-resonance-empty">
      <div className="p-resonance-empty-title">7-dimensional spectrum awaits a seed</div>
      <div className="p-resonance-empty-sub">spatial · temporal · spectral · modal · possible · semantic · structural</div>
    </div>
  );

  return (
    <div className="p-resonance">
      <header className="p-resonance-head">
        <SeedGlyph hash={seed.hash} domain={seed.domain} size={32} />
        <div className="p-resonance-id">
          <div className="p-resonance-name">{seed.name}</div>
          <div className="p-resonance-meta">{seed.domain} · 7 dimensions</div>
        </div>
      </header>
      <div className="p-resonance-grid">
        {dims.map((d) => (
          <div key={d.key} className="p-dim-band">
            <div className="p-dim-head">
              <span className="p-dim-glyph" aria-hidden>{d.glyph}</span>
              <span className="p-dim-label">{d.label}</span>
              <span className="p-dim-desc">{d.desc}</span>
              <span className="p-dim-occ" style={{ "--occ": d.occupation } as React.CSSProperties}>{(d.occupation * 100).toFixed(0)}%</span>
            </div>
            <div className="p-dim-signal">
              {d.bars.map((h, i) => (
                <div key={i} className="p-dim-bar" style={{ height: `${(h * d.occupation * 100).toFixed(1)}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <footer className="p-resonance-foot">
        <span>fundamental {(dims[0].frequency).toFixed(0)} Hz</span>
        <span>·</span>
        <span>occupation Σ {(dims.reduce((s, d) => s + d.occupation, 0)).toFixed(2)} / 7.00</span>
      </footer>
    </div>
  );
};
