import { useState } from 'react';
import { updateGene } from '@/services/api';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TYPE_COLORS = {
  scalar: '#F97316', categorical: '#10B981', vector: '#06B6D4', expression: '#8B5CF6',
  struct: '#EC4899', array: '#F59E0B', graph: '#EF4444', topology: '#14B8A6',
  temporal: '#A855F7', regulatory: '#F43F5E', field: '#22D3EE', symbolic: '#D946EF',
  quantum: '#6366F1', gematria: '#FB923C', resonance: '#2DD4BF', dimensional: '#818CF8',
  sovereignty: '#FBBF24',
};

const ARCHETYPE_CHOICES = ['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'bard', 'cleric', 'dark_knight', 'monk', 'necromancer'];
const SCALE_CHOICES = ['major', 'minor', 'pentatonic', 'blues', 'dorian', 'mixolydian', 'chromatic'];
const KEY_CHOICES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Cm', 'Dm', 'Em'];
const BIOME_CHOICES = ['temperate', 'tropical', 'arctic', 'desert', 'volcanic', 'oceanic', 'mountain'];
const STYLE_CHOICES = ['abstract', 'realistic', 'impressionist', 'cubist', 'surreal', 'minimalist', 'baroque'];
const SYMMETRY_CHOICES = ['bilateral', 'radial', 'none', 'rotational'];

function getCategoricalChoices(geneName) {
  const map = { archetype: ARCHETYPE_CHOICES, scale: SCALE_CHOICES, key: KEY_CHOICES, biome: BIOME_CHOICES, style: STYLE_CHOICES, symmetry: SYMMETRY_CHOICES };
  return map[geneName] || ['option_a', 'option_b', 'option_c'];
}

function ScalarWidget({ value, onChange }) {
  const numVal = typeof value === 'number' ? value : 0.5;
  return (
    <div className="flex items-center gap-2 w-full">
      <Slider data-testid="gene-editor-slider" value={[numVal * 100]} onValueChange={([v]) => onChange(v / 100)} max={100} step={1} className="flex-1" />
      <span className="font-mono text-[10px] text-neutral-500 w-10 text-right">{numVal.toFixed(2)}</span>
    </div>
  );
}

function CategoricalWidget({ value, geneName, onChange }) {
  const choices = getCategoricalChoices(geneName);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 text-[10px] font-mono bg-transparent border-neutral-800 rounded-none" data-testid="gene-categorical-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#0a0a0a] border-neutral-800">
        {choices.map(c => <SelectItem key={c} value={c} className="text-[10px] font-mono">{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function VectorWidget({ value, onChange }) {
  if (!Array.isArray(value)) return <span className="font-mono text-[10px] text-neutral-600">—</span>;
  return (
    <div className="flex gap-1">
      {value.map((v, i) => (
        <input
          key={i}
          type="number"
          step="0.01"
          value={typeof v === 'number' ? v.toFixed(2) : 0}
          onChange={(e) => { const nv = [...value]; nv[i] = parseFloat(e.target.value) || 0; onChange(nv); }}
          className="w-12 bg-transparent border border-neutral-800 text-[10px] font-mono text-center py-0.5 text-white"
          data-testid={`gene-vector-input-${i}`}
        />
      ))}
    </div>
  );
}

function GenericWidget({ value }) {
  const display = typeof value === 'object' ? JSON.stringify(value).slice(0, 60) : String(value).slice(0, 60);
  return <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[180px] block">{display}</span>;
}

export default function GeneEditor({ seed, onSeedUpdated }) {
  const [updating, setUpdating] = useState(null);

  if (!seed) {
    return (
      <div className="flex items-center justify-center h-full p-8" data-testid="gene-editor-empty">
        <p className="font-mono text-[10px] text-neutral-600 text-center">
          No seed selected. Generate one with the prompt bar or select from gallery.
        </p>
      </div>
    );
  }

  const genes = seed.genes || {};
  const geneEntries = Object.entries(genes);

  const handleUpdate = async (name, type, value) => {
    setUpdating(name);
    try {
      const updated = await updateGene(seed.id, name, type, value);
      onSeedUpdated(updated);
    } catch (e) { console.error(e); }
    setUpdating(null);
  };

  return (
    <div data-testid="gene-editor" className="divide-y divide-neutral-900">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Gene Map</span>
        <span className="font-mono text-[10px] text-neutral-700">{geneEntries.length} genes</span>
      </div>
      {geneEntries.map(([name, gene]) => {
        const gtype = gene.type;
        const color = TYPE_COLORS[gtype] || '#525252';
        return (
          <div key={name} className="gene-row" data-testid={`gene-row-${name}`}>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="gene-label truncate">{name}</span>
                <span className="gene-type-badge">{gtype}</span>
                {updating === name && <span className="text-[8px] text-orange-500 animate-pulse">...</span>}
              </div>
              <div className="pl-4">
                {gtype === 'scalar' && <ScalarWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {gtype === 'categorical' && <CategoricalWidget value={gene.value} geneName={name} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {gtype === 'vector' && <VectorWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {!['scalar', 'categorical', 'vector'].includes(gtype) && <GenericWidget value={gene.value} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
