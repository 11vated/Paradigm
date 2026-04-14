import { useState } from 'react';
import { updateGene } from '@/services/api';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TYPE_COLORS } from '@/lib/constants';
import ScalarGauge from './genes/ScalarGauge';
import VectorRadar from './genes/VectorRadar';
import CategoricalCarousel from './genes/CategoricalCarousel';
import ResonanceWave from './genes/ResonanceWave';

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

function GenericWidget({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const display = typeof value === 'object' ? JSON.stringify(value).slice(0, 60) : String(value).slice(0, 60);

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full h-20 bg-transparent border border-neutral-800 text-[10px] font-mono text-white p-1 resize-none"
          data-testid="gene-generic-textarea"
        />
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className="px-2 py-0.5 bg-neutral-800 text-white text-[8px] uppercase"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              try {
                const parsed = JSON.parse(editValue);
                onChange(parsed);
                setIsEditing(false);
              } catch (_) {
                // If it's not valid JSON, just save it as a string
                onChange(editValue);
                setIsEditing(false);
              }
            }}
            className="px-2 py-0.5 bg-primary text-black text-[8px] uppercase"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full group">
      <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[180px] block">{display}</span>
      <button
        onClick={() => {
          setEditValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
          setIsEditing(true);
        }}
        className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-neutral-800 text-white text-[8px] uppercase transition-opacity"
      >
        Edit
      </button>
    </div>
  );
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
                {updating === name && <span className="text-[8px] text-primary animate-pulse">...</span>}
              </div>
              <div className="pl-4">
                {gtype === 'scalar' && <ScalarGauge value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} color={color} />}
                {gtype === 'categorical' && <CategoricalCarousel value={gene.value} options={getCategoricalChoices(name)} onChange={(v) => handleUpdate(name, gtype, v)} color={color} />}
                {gtype === 'vector' && <VectorRadar value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {(gtype === 'resonance' || gtype === 'temporal') && <ResonanceWave value={gene.value} color={color} />}
                {!['scalar', 'categorical', 'vector', 'resonance', 'temporal'].includes(gtype) && <GenericWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
