/**
 * Seed Forge - Visual Seed Editor with Live Preview and Gene Mutation Controls
 * 
 * This is the heart of the creation process where users can visually sculpt
 * seeds, mutate genes in real-time, and see immediate feedback in the preview.
 * 
 * Features:
 * - Visual gene editing with intuitive controls
 * - Real-time preview of seed mutations
 * - Gene mutation rate controls
 * - Live fitness and strata conformance feedback
 * - GSPL-powered generative mutations
 * - Holographic gene visualization
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { type Seed } from '@/lib/kernel/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Eye, Zap, Dna, Layers, Target } from 'lucide-react';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';
import { generateTheme } from '@/lib/studio/generative-theme';

interface SeedForgeProps {
  seed: Seed | null;
  onSeedUpdate: (seed: Seed) => void;
  onMutate: (rate: number) => void;
  onPreview?: (seed: Seed) => void;
}

const GENE_TYPES = [
  'name', 'description', 'attributes', 'skills', 'inventory', 'stats',
  'appearance', 'behavior', 'relationships', 'backstory', 'dialogue',
  'quest', 'location', 'timeline', 'metadata'
];

const MUTATION_PRESETS = [
  { label: 'Conservative', rate: 0.05, description: 'Minimal changes, high stability' },
  { label: 'Balanced', rate: 0.15, description: 'Moderate mutations, balanced exploration' },
  { label: 'Aggressive', rate: 0.35, description: 'High mutation rate, rapid evolution' },
  { label: 'Chaotic', rate: 0.65, description: 'Maximum mutations, experimental' },
];

const SeedForge: React.FC<SeedForgeProps> = ({
  seed,
  onSeedUpdate,
  onMutate,
  onPreview,
}) => {
  const [selectedGene, setSelectedGene] = useState<string | null>(null);
  const [mutationRate, setMutationRate] = useState(0.15);
  const [isMutating, setIsMutating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [strataScore, setStrataScore] = useState(0);
  const [geneValues, setGeneValues] = useState<Record<string, unknown>>({});

  // Calculate strata conformance
  useEffect(() => {
    if (seed) {
      try {
        const conformance = calculateStratumConformance([seed]);
        setStrataScore(Math.round(conformance.overall * 100));
      } catch {
        setStrataScore(0);
      }
    }
  }, [seed]);

  // Initialize gene values from seed
  useEffect(() => {
    if (seed?.genes) {
      setGeneValues(seed.genes);
    }
  }, [seed]);

  const handleGeneChange = useCallback((geneName: string, value: unknown) => {
    setGeneValues(prev => ({
      ...prev,
      [geneName]: value,
    }));
    
    if (seed) {
      const updatedSeed = {
        ...seed,
        genes: {
          ...seed.genes,
          [geneName]: { type: 'custom', value },
        },
      };
      onSeedUpdate(updatedSeed);
    }
  }, [seed, onSeedUpdate]);

  const handleMutate = useCallback(async () => {
    setIsMutating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onMutate(mutationRate);
    setIsMutating(false);
  }, [mutationRate, onMutate]);

  const handlePreview = useCallback(() => {
    if (seed && onPreview) {
      onPreview(seed);
      setPreviewMode(true);
    }
  }, [seed, onPreview]);

  const applyThemeFromSeed = useCallback(() => {
    if (seed) {
      const theme = generateTheme(seed);
      // Apply theme to document
      const root = document.documentElement;
      root.style.setProperty('--forge-primary', theme.colors.primary);
      root.style.setProperty('--forge-secondary', theme.colors.secondary);
      root.style.setProperty('--forge-accent', theme.colors.accent);
    }
  }, [seed]);

  useEffect(() => {
    applyThemeFromSeed();
  }, [applyThemeFromSeed]);

  const renderGeneEditor = (geneName: string) => {
    const value = geneValues[geneName];
    
    if (typeof value === 'number') {
      return (
        <div className="space-y-2">
          <label className="text-xs text-cyan-400 font-mono">{geneName}</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[value * 100]}
              onValueChange={([v]) => handleGeneChange(geneName, v / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="font-mono text-xs text-slate-400 w-12 text-right">
              {value.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    
    if (typeof value === 'string') {
      return (
        <div className="space-y-2">
          <label className="text-xs text-cyan-400 font-mono">{geneName}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleGeneChange(geneName, e.target.value)}
            className="w-full bg-slate-900/50 border border-cyan-900/30 rounded px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
        </div>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <label className="text-xs text-cyan-400 font-mono">{geneName}</label>
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-cyan-900/30 rounded px-2 py-1 text-xs text-slate-300"
              >
                {String(item)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <label className="text-xs text-cyan-400 font-mono">{geneName}</label>
        <textarea
          value={String(value || '')}
          onChange={(e) => handleGeneChange(geneName, e.target.value)}
          className="w-full bg-slate-900/50 border border-cyan-900/30 rounded px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none transition-colors resize-none"
          rows={3}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Dna className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Seed Forge</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={applyThemeFromSeed}
              className="text-purple-400 hover:text-purple-300"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Theme
            </Button>
          </div>
        </div>
        
        {/* Strata Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Strata Conformance</span>
              <span className="text-xs font-mono text-cyan-400">{strataScore}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${strataScore}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mutation Controls */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-300 font-medium">Mutation Rate</span>
          <span className="text-xs font-mono text-cyan-400">{(mutationRate * 100).toFixed(0)}%</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-4">
          {MUTATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setMutationRate(preset.rate)}
              className={`p-2 rounded border transition-all ${
                mutationRate === preset.rate
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="text-xs font-medium">{preset.label}</div>
              <div className="text-[10px] text-slate-400">{preset.rate * 100}%</div>
            </button>
          ))}
        </div>
        
        <Slider
          value={[mutationRate * 100]}
          onValueChange={([v]) => setMutationRate(v / 100)}
          max={100}
          step={1}
          className="w-full"
        />
        
        <Button
          onClick={handleMutate}
          disabled={isMutating || !seed}
          className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
        >
          {isMutating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Mutating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Mutate Seed
            </>
          )}
        </Button>
      </div>

      {/* Gene Editor */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {GENE_TYPES.map((geneName) => (
            <motion.div
              key={geneName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-slate-800/30 border border-cyan-900/20 rounded-lg hover:border-cyan-500/30 transition-colors"
            >
              {renderGeneEditor(geneName)}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Preview Mode Overlay */}
      <AnimatePresence>
        {previewMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-10"
            onClick={() => setPreviewMode(false)}
          >
            <div className="text-center">
              <Layers className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Preview Mode</h3>
              <p className="text-sm text-slate-400">Click anywhere to exit</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeedForge;
