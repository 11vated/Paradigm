import { useState } from 'react';
import { updateGene } from '@/services/api';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TYPE_COLORS } from '@/lib/constants';

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
    <div className="flex items-center gap-3 w-full">
      <Slider data-testid="gene-editor-slider" value={[numVal * 100]} onValueChange={([v]) => onChange(v / 100)} max={100} step={1} className="flex-1" />
      <span className="font-mono text-[9px] text-[#666] w-10 text-right tabular-nums">{numVal.toFixed(2)}</span>
    </div>
  );
}

function CategoricalWidget({ value, geneName, onChange }) {
  const choices = getCategoricalChoices(geneName);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-[10px] font-mono bg-[#050505] border-[#1a1a1a] rounded-sm text-[#ccc]" data-testid="gene-categorical-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#050505] border-[#1a1a1a]">
        {choices.map(c => <SelectItem key={c} value={c} className="text-[10px] font-mono border-b border-[#111] last:border-0 hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white cursor-pointer transition-colors text-[#ccc]">{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function VectorWidget({ value, onChange }) {
  if (!Array.isArray(value)) return <span className="font-mono text-[10px] text-[#555]">—</span>;
  return (
    <div className="flex justify-between gap-2">
      {value.map((v, i) => (
        <input
          key={i}
          type="number"
          step="0.01"
          value={typeof v === 'number' ? v.toFixed(2) : 0}
          onChange={(e) => { const nv = [...value]; nv[i] = parseFloat(e.target.value) || 0; onChange(nv); }}
          className="flex-1 min-w-0 bg-[#050505] border border-[#1a1a1a] focus:border-primary/50 text-[10px] font-mono text-center py-1 text-[#ccc] rounded-sm transition-colors outline-none"
          data-testid={`gene-vector-input-${i}`}
        />
      ))}
    </div>
  );
}

function GenericWidget({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const display = typeof value === 'object' ? JSON.stringify(value).slice(0, 50) + '...' : String(value).slice(0, 50);

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full h-24 bg-[#050505] border border-[#1a1a1a] focus:border-primary/50 text-[10px] font-mono text-[#ccc] p-2 resize-none rounded-sm outline-none transition-colors"
          data-testid="gene-generic-textarea"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 bg-[#1a1a1a] text-[#888] hover:text-[#ccc] text-[9px] uppercase tracking-widest rounded-sm transition-colors"
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
                onChange(editValue);
                setIsEditing(false);
              }
            }}
            className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-[9px] uppercase tracking-widest rounded-sm transition-colors"
          >
            Commit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full group py-1">
      <span className="font-mono text-[10px] text-[#555] truncate max-w-[200px] block">{display}</span>
      <button
        onClick={() => {
          setEditValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
          setIsEditing(true);
        }}
        className="opacity-0 group-hover:opacity-100 px-3 py-1 border border-[#1a1a1a] bg-[#050505] text-[#888] hover:text-white text-[9px] uppercase tracking-widest rounded-sm transition-all"
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
    <div data-testid="gene-editor" className="divide-y divide-[#1a1a1a]">
      <div className="px-4 py-2 flex items-center justify-between bg-[#050505]">
        <span className="font-mono text-[9px] text-[#666] uppercase tracking-widest">Gene Map</span>
        <span className="font-mono text-[9px] text-[#444]">{geneEntries.length} locus points</span>
      </div>
      {geneEntries.map(([name, gene]) => {
        const gtype = gene.type;
        const color = TYPE_COLORS[gtype] || '#525252';
        return (
          <div key={name} className="px-4 py-3 flex flex-col gap-2 hover:bg-[#0a0a0a] transition-colors" data-testid={`gene-row-${name}`}>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
                <span className="font-mono text-[11px] text-[#eee] tracking-wider uppercase truncate">{name}</span>
                <span className="px-1.5 py-0.5 border border-[#333] rounded-sm font-mono text-[8px] text-[#888] tracking-widest uppercase">{gtype}</span>
                {updating === name && <span className="text-[8px] text-primary animate-pulse ml-auto">SYNTHESIZING...</span>}
              </div>
              <div className="pl-3 w-full">
                {gtype === 'scalar' && <ScalarWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {gtype === 'categorical' && <CategoricalWidget value={gene.value} geneName={name} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {gtype === 'vector' && <VectorWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
                {!['scalar', 'categorical', 'vector'].includes(gtype) && <GenericWidget value={gene.value} onChange={(v) => handleUpdate(name, gtype, v)} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
