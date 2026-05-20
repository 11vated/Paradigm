/**
 * FriendStats — compact, dense readout of a Friend's gene state.
 *
 * Shows the 6 gene categories at a glance: body, face, voice, persona,
 * memory, bond. Field names match `src/lib/friend/types.ts` exactly.
 */

import React from 'react';
import type { FriendSeedData, FriendArtifact } from '@/lib/friend';

interface FriendStatsProps {
  seed: FriendSeedData | null;
  artifact: FriendArtifact | null;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 py-0.5">
    <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">{label}</span>
    <span className="font-mono text-[10px] text-neutral-200 text-right">{value}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-0.5">
    <div className="font-mono text-[9px] text-accent uppercase tracking-widest mb-1">{title}</div>
    <div>{children}</div>
  </div>
);

export const FriendStats: React.FC<FriendStatsProps> = ({ seed, artifact }) => {
  if (!seed) {
    return (
      <div className="p-3 text-center font-mono text-[10px] text-neutral-600">
        no friend
      </div>
    );
  }

  const g = seed.genes;
  const fmt = (n: number, decimals = 2) => n.toFixed(decimals);
  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
  const rgb = (c: [number, number, number]) => c.map((x) => Math.round(x * 255)).join(',');

  const derivation = seed.derivation;

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <div className="text-[12px] text-white tracking-wide">{seed.name}</div>
        <div className="text-[9px] text-neutral-600 mt-0.5">
          {seed.id} · G{derivation?.generation ?? 0} · {derivation?.operator ?? 'genesis'}
        </div>
      </div>

      <Section title="Body">
        <Row label="archetype" value={g.body.archetype} />
        <Row label="height"    value={`${fmt(g.body.heightScale)}x`} />
        <Row label="shoulders" value={`${fmt(g.body.shoulderRatio)}x`} />
        <Row label="muscle"    value={fmtPct(g.body.muscle)} />
        <Row label="softness"  value={fmtPct(g.body.softness)} />
        <Row label="skin"      value={
          <span style={{ color: `rgb(${rgb(g.body.skinTone)})` }}>
            rgb({rgb(g.body.skinTone)})
          </span>
        } />
      </Section>

      <Section title="Face">
        <Row label="eyes"       value={g.face.eyeShape} />
        <Row label="eye color"  value={
          <span style={{ color: `rgb(${rgb(g.face.eyeColor)})` }}>
            rgb({rgb(g.face.eyeColor)})
          </span>
        } />
        <Row label="nose"       value={g.face.noseShape} />
        <Row label="mouth"      value={g.face.mouthShape} />
        <Row label="jaw"        value={g.face.jawShape} />
        <Row label="roundness"  value={fmtPct(g.face.roundness)} />
        <Row label="cheekbones" value={fmtPct(g.face.cheekbones)} />
      </Section>

      <Section title="Voice">
        <Row label="pitch"      value={`${Math.round(g.voice.pitch)} Hz`} />
        <Row label="tempo"      value={`${Math.round(g.voice.tempo)} wpm`} />
        <Row label="warmth"     value={fmtPct(g.voice.warmth)} />
        <Row label="breath"     value={fmtPct(g.voice.breathiness)} />
        <Row label="inflection" value={fmtPct(g.voice.inflection)} />
        <Row label="accent"     value={g.voice.accent} />
      </Section>

      <Section title="Persona">
        <Row label="style"  value={g.persona.speechStyle} />
        <Row label="O" value={fmtPct(g.persona.bigFive.openness)} />
        <Row label="C" value={fmtPct(g.persona.bigFive.conscientiousness)} />
        <Row label="E" value={fmtPct(g.persona.bigFive.extraversion)} />
        <Row label="A" value={fmtPct(g.persona.bigFive.agreeableness)} />
        <Row label="N" value={fmtPct(g.persona.bigFive.neuroticism)} />
        <Row label="humor"     value={fmtPct(g.persona.humor)} />
        <Row label="curiosity" value={fmtPct(g.persona.curiosity)} />
        <Row label="interests" value={g.persona.interests.slice(0, 3).join(', ') || '—'} />
        <Row label="values"    value={g.persona.values.slice(0, 3).join(', ') || '—'} />
      </Section>

      <Section title="Memory">
        <Row label="episodic cap." value={g.memory.episodicCapacity} />
        <Row label="episodic decay" value={fmt(g.memory.episodicDecay, 3)} />
        <Row label="semantic cap." value={g.memory.semanticCapacity} />
        <Row label="reflect"   value={`${fmt(g.memory.reflectionCadenceDays, 1)} d`} />
      </Section>

      <Section title="Bond">
        <Row label="trust"    value={fmtPct(g.bond.initialTrust)} />
        <Row label="warmth"   value={fmtPct(g.bond.initialWarmth)} />
        <Row label="bonding"  value={`${g.bond.bondingDays} d`} />
      </Section>

      {artifact && (
        <Section title="Artifact">
          <Row label="hash"     value={artifact.seedHash.slice(0, 12) + '…'} />
          <Row label="height"   value={`${fmt(artifact.phenotype.body.heightM)} m`} />
          <Row label="vector"   value={`d=${artifact.personaVector.length}`} />
          <Row label="grew in"  value={`${artifact.meta.elapsedMs.toFixed(1)} ms`} />
        </Section>
      )}
    </div>
  );
};

export default FriendStats;
