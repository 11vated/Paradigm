import React, { useMemo } from "react";
import { useActiveSeed } from "@/stores/activeSeed";
import { rngFromHash } from "@/lib/kernel/rng";

const DIMENSIONS = [
  { key: "spatial", glyph: "\u22BB", label: "Spatial", desc: "3D extent" },
  { key: "temporal", glyph: "\u2248", label: "Temporal", desc: "Rhythm + decay" },
  { key: "spectral", glyph: "\u22EF", label: "Spectral", desc: "Frequency / EM" },
  { key: "modal", glyph: "\u25C8", label: "Modal", desc: "12D adjective space" },
  { key: "possible", glyph: "\u2042", label: "Possible", desc: "Counterfactual branches" },
  { key: "semantic", glyph: "\u2229", label: "Semantic", desc: "Meaning embedding" },
  { key: "structural", glyph: "\u22C8", label: "Structural", desc: "Graph topology" },
];

export const SubstrateMode: React.FC = () => {
  const seed = useActiveSeed(s => s.seed);
  const lanes = useMemo(() => {
    const rng = seed?.hash ? rngFromHash(seed.hash) : rngFromHash("void");
    return DIMENSIONS.map(d => {
      const occ = rng.nextF64();
      const pulse = Math.floor(rng.nextF64() * 20) + 5;
      const bars = Array.from({ length: 24 }, () => rng.nextF64());
      return { ...d, occ, pulse, bars };
    });
  }, [seed?.hash]);

  return (
    <div className="p-substrate-7d" data-has-seed={Boolean(seed)}>
      <div className="p-substrate-7d-head">
        <div className="p-substrate-7d-title">substrate · 7-dimensional projection</div>
        <div className="p-substrate-7d-sub">{seed ? seed.name : "no seed — showing void substrate"}</div>
      </div>
      <div className="p-substrate-7d-lanes">
        {lanes.map(l => (
          <div key={l.key} className="p-substrate-7d-lane" data-dim={l.key}>
            <div className="p-substrate-7d-lane-head">
              <span className="p-substrate-7d-glyph">{l.glyph}</span>
              <span className="p-substrate-7d-name">{l.label}</span>
              <span className="p-substrate-7d-desc">{l.desc}</span>
              <span className="p-substrate-7d-occ">{Math.round(l.occ * 100)}%</span>
            </div>
            <div className="p-substrate-7d-vis">
              <svg viewBox="0 0 480 64" preserveAspectRatio="none" width="100%" height="100%">
                {l.bars.map((b, i) => (
                  <rect
                    key={i}
                    x={i * 20 + 1}
                    y={32 - b * 30}
                    width={18}
                    height={Math.max(2, b * 60)}
                    rx={1.5}
                    fill="currentColor"
                    opacity={0.4 + b * 0.6}
                  />
                ))}
                <line x1="0" y1="32" x2="480" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};