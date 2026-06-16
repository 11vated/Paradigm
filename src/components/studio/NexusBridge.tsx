/**
 * Nexus Bridge - Seamless Transition Between Digital Creation and Simulation Layers
 * 
 * This component provides a bridge between the digital creation workspace
 * and the simulation environment, allowing artifacts to flow between layers
 * with smooth transitions and state preservation.
 * 
 * Features:
 * - Layer transition management
 * - State synchronization between creation and simulation
 * - Smooth visual transitions with morphing effects
 * - Real-time data flow monitoring
 * - GSPL-powered layer transformations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { type Seed } from '@/lib/kernel/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowRightLeft, Layers, Zap, Play, Pause, RotateCcw, Settings, Activity, Database, Cpu } from 'lucide-react';

type LayerType = 'creation' | 'simulation' | 'export' | 'archive';

interface LayerState {
  type: LayerType;
  name: string;
  active: boolean;
  data: Seed[];
  lastSync: number;
}

interface NexusBridgeProps {
  seeds: Seed[];
  onLayerTransition?: (from: LayerType, to: LayerType, seed: Seed) => void;
  onStateSync?: (layer: LayerType) => void;
}

const NexusBridge: React.FC<NexusBridgeProps> = ({
  seeds,
  onLayerTransition,
  onStateSync,
}) => {
  const [currentLayer, setCurrentLayer] = useState<LayerType>('creation');
  const [targetLayer, setTargetLayer] = useState<LayerType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<Record<LayerType, 'synced' | 'syncing' | 'error'>>({
    creation: 'synced',
    simulation: 'synced',
    export: 'synced',
    archive: 'synced',
  });
  const [layers, setLayers] = useState<LayerState[]>([
    { type: 'creation', name: 'Creation Layer', active: true, data: seeds, lastSync: Date.now() },
    { type: 'simulation', name: 'Simulation Layer', active: false, data: [], lastSync: Date.now() },
    { type: 'export', name: 'Export Layer', active: false, data: [], lastSync: Date.now() },
    { type: 'archive', name: 'Archive Layer', active: false, data: [], lastSync: Date.now() },
  ]);
  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5); // seconds
  
  const transitionRef = useRef<number | null>(null);

  // Auto-sync functionality
  useEffect(() => {
    if (!autoSync) return;
    
    const interval = setInterval(() => {
      layers.forEach(layer => {
        if (layer.active) {
          handleSync(layer.type);
        }
      });
    }, syncInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoSync, syncInterval, layers]);

  const handleTransition = useCallback(async (from: LayerType, to: LayerType, seed?: Seed) => {
    setIsTransitioning(true);
    setTargetLayer(to);
    setTransitionProgress(0);
    
    // Animate transition progress
    const duration = 1000; // 1 second transition
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setTransitionProgress(progress);
      
      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(animate);
      } else {
        // Complete transition
        setCurrentLayer(to);
        setTargetLayer(null);
        setIsTransitioning(false);
        
        // Update layer states
        setLayers(prev => prev.map(layer => ({
          ...layer,
          active: layer.type === to,
          data: layer.type === to ? (seed ? [...layer.data, seed] : layer.data) : layer.data,
          lastSync: Date.now(),
        })));
        
        if (seed && onLayerTransition) {
          onLayerTransition(from, to, seed);
        }
      }
    };
    
    transitionRef.current = requestAnimationFrame(animate);
  }, [onLayerTransition]);

  const handleSync = useCallback((layer: LayerType) => {
    setSyncStatus(prev => ({ ...prev, [layer]: 'syncing' }));
    
    // Simulate sync process
    setTimeout(() => {
      setSyncStatus(prev => ({ ...prev, [layer]: 'synced' }));
      setLayers(prev => prev.map(l => 
        l.type === layer ? { ...l, lastSync: Date.now() } : l
      ));
      
      if (onStateSync) {
        onStateSync(layer);
      }
    }, 500);
  }, [onStateSync]);

  const handleQuickTransition = useCallback((to: LayerType) => {
    if (isTransitioning || to === currentLayer) return;
    
    const seedToTransfer = selectedSeed || seeds[0];
    if (seedToTransfer) {
      handleTransition(currentLayer, to, seedToTransfer);
    }
  }, [isTransitioning, currentLayer, selectedSeed, seeds, handleTransition]);

  const handleReset = useCallback(() => {
    if (transitionRef.current) {
      cancelAnimationFrame(transitionRef.current);
    }
    setIsTransitioning(false);
    setTargetLayer(null);
    setTransitionProgress(0);
  }, []);

  const currentLayerData = layers.find(l => l.type === currentLayer);

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Nexus Bridge</h2>
          </div>
          <div className="flex items-center gap-2">
            {isTransitioning && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-red-400 hover:text-red-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoSync(!autoSync)}
              className={autoSync ? 'text-green-400' : 'text-slate-400'}
            >
              {autoSync ? <Activity className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              Auto Sync
            </Button>
          </div>
        </div>
        
        {/* Layer Navigation */}
        <div className="flex gap-2">
          {layers.map((layer) => (
            <button
              key={layer.type}
              onClick={() => !isTransitioning && handleQuickTransition(layer.type)}
              disabled={isTransitioning}
              className={`flex-1 p-3 rounded-lg border transition-all ${
                layer.active
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
              } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {layer.type === 'creation' && <Cpu className="w-4 h-4" />}
                {layer.type === 'simulation' && <Play className="w-4 h-4" />}
                {layer.type === 'export' && <Database className="w-4 h-4" />}
                {layer.type === 'archive' && <Settings className="w-4 h-4" />}
                <span className="text-xs font-medium">{layer.name}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {layer.data.length} items
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transition Progress */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 60 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 border-b border-cyan-900/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">
                Transitioning to {layers.find(l => l.type === targetLayer)?.name}
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {Math.round(transitionProgress * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${transitionProgress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Controls */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-300 font-medium">Sync Interval</span>
          <span className="text-xs font-mono text-cyan-400">{syncInterval}s</span>
        </div>
        <Slider
          value={[syncInterval]}
          onValueChange={([v]) => setSyncInterval(v)}
          min={1}
          max={30}
          step={1}
          className="w-full"
        />
      </div>

      {/* Layer Details */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {layers.map((layer) => (
            <motion.div
              key={layer.type}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-lg border transition-all ${
                layer.active
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-slate-800/30 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {layer.type === 'creation' && <Cpu className="w-4 h-4 text-cyan-400" />}
                  {layer.type === 'simulation' && <Play className="w-4 h-4 text-green-400" />}
                  {layer.type === 'export' && <Database className="w-4 h-4 text-purple-400" />}
                  {layer.type === 'archive' && <Settings className="w-4 h-4 text-orange-400" />}
                  <span className="text-sm font-semibold text-white">{layer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      syncStatus[layer.type] === 'synced'
                        ? 'bg-green-400'
                        : syncStatus[layer.type] === 'syncing'
                        ? 'bg-yellow-400 animate-pulse'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="text-xs text-slate-400">
                    {syncStatus[layer.type]}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Items:</span>
                  <span className="ml-2 text-white font-mono">{layer.data.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Last Sync:</span>
                  <span className="ml-2 text-white font-mono">
                    {Math.floor((Date.now() - layer.lastSync) / 1000)}s ago
                  </span>
                </div>
              </div>
              
              {layer.active && layer.data.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">Recent Items:</div>
                  <div className="space-y-1">
                    {layer.data.slice(0, 3).map((seed, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => setSelectedSeed(seed)}
                      >
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-xs text-slate-300 truncate">
                          {seed.$name || seed.name || 'Untitled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-cyan-900/30">
        <div className="flex gap-2">
          {layers
            .filter(l => l.type !== currentLayer)
            .map(layer => (
              <Button
                key={layer.type}
                variant="outline"
                size="sm"
                onClick={() => handleQuickTransition(layer.type)}
                disabled={isTransitioning}
                className="flex-1 border-cyan-900/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                To {layer.name}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default NexusBridge;
