/**
 * Spectral Studio - EM-Spectrum Renderer for Unseen Dimensions
 * 
 * This component visualizes the electromagnetic spectrum of artifacts,
 * revealing unseen dimensions and materials through spectral analysis.
 * 
 * Features:
 * - Real-time EM spectrum visualization
 * - Multi-dimensional rendering
 * - Material analysis through spectral signatures
 * - Interactive frequency band exploration
 * - GSPL-powered spectral generation
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { type Seed } from '@/lib/kernel/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Radio, Waves, Zap, Eye, Layers, Activity, Thermometer, Droplets } from 'lucide-react';

interface SpectralStudioProps {
  seed: Seed | null;
  onSpectrumAnalyze?: (seed: Seed) => void;
}

interface SpectralBand {
  name: string;
  frequency: number;
  wavelength: number;
  energy: number;
  color: string;
  description: string;
}

const SPECTRAL_BANDS: SpectralBand[] = [
  { name: 'Radio', frequency: 1e6, wavelength: 300, energy: 4.1e-9, color: '#8b5cf6', description: 'Long wavelengths, low energy' },
  { name: 'Microwave', frequency: 1e9, wavelength: 0.3, energy: 4.1e-6, color: '#a855f7', description: 'Heating, communication' },
  { name: 'Infrared', frequency: 1e12, wavelength: 3e-4, energy: 4.1e-3, color: '#ec4899', description: 'Thermal radiation' },
  { name: 'Visible', frequency: 5e14, wavelength: 6e-7, energy: 2.0, color: '#f97316', description: 'Human vision range' },
  { name: 'Ultraviolet', frequency: 1e16, wavelength: 3e-8, energy: 41, color: '#eab308', description: 'High energy, ionizing' },
  { name: 'X-Ray', frequency: 1e18, wavelength: 3e-10, energy: 4100, color: '#22c55e', description: 'Medical imaging' },
  { name: 'Gamma', frequency: 1e20, wavelength: 3e-12, energy: 410000, color: '#06b6d4', description: 'Nuclear processes' },
];

const SpectralStudio: React.FC<SpectralStudioProps> = ({
  seed,
  onSpectrumAnalyze,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  
  const [selectedBand, setSelectedBand] = useState<number>(3); // Visible light
  const [intensity, setIntensity] = useState(0.5);
  const [frequency, setFrequency] = useState(0.5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [spectralData, setSpectralData] = useState<number[]>([]);
  const [dimensionalLayers, setDimensionalLayers] = useState<number[]>([0, 0, 0, 0, 0]);
  
  // Generate spectral data from seed
  useEffect(() => {
    if (seed) {
      const hash = seed.$hash || seed.id || 'default';
      const data = Array.from({ length: 256 }, (_, i) => {
        const seedValue = parseInt(hash.slice(i % hash.length), 16) / 15;
        const wave = Math.sin((i / 256) * Math.PI * 2 * frequency * 10);
        return (seedValue * 0.5 + wave * 0.5) * intensity;
      });
      setSpectralData(data);
      
      // Generate dimensional layers
      const layers = Array.from({ length: 5 }, (_, i) => {
        const layerHash = parseInt(hash.slice((i * 2) % hash.length), 16) / 15;
        return layerHash * intensity;
      });
      setDimensionalLayers(layers);
    }
  }, [seed, intensity, frequency]);
  
  // Main render loop
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const deltaTime = timestamp - timeRef.current;
    timeRef.current = timestamp;
    
    const { width, height } = canvas;
    
    // Clear with spectral background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    gradient.addColorStop(0.5, 'rgba(20, 30, 50, 0.95)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw spectral bands
    const bandHeight = height / SPECTRAL_BANDS.length;
    SPECTRAL_BANDS.forEach((band, index) => {
      const y = index * bandHeight;
      const isSelected = index === selectedBand;
      
      // Band background
      ctx.fillStyle = isSelected ? 'rgba(0, 229, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, y, width, bandHeight);
      
      // Spectral line
      ctx.beginPath();
      ctx.strokeStyle = band.color;
      ctx.lineWidth = isSelected ? 3 : 1;
      
      for (let i = 0; i < spectralData.length; i++) {
        const x = (i / spectralData.length) * width;
        const amplitude = spectralData[i] * (isSelected ? 1.5 : 1);
        const wave = Math.sin((i / spectralData.length) * Math.PI * 4 + timestamp * 0.001);
        const y_pos = y + bandHeight / 2 + wave * amplitude * 20;
        
        if (i === 0) {
          ctx.moveTo(x, y_pos);
        } else {
          ctx.lineTo(x, y_pos);
        }
      }
      ctx.stroke();
      
      // Band label
      ctx.fillStyle = isSelected ? '#fff' : band.color;
      ctx.font = `${isSelected ? 'bold' : 'normal'} 12px system-ui`;
      ctx.fillText(band.name, 10, y + 20);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui';
      ctx.fillText(band.description, 10, y + 35);
      
      // Frequency indicator
      ctx.fillStyle = isSelected ? '#fff' : '#475569';
      ctx.font = '10px monospace';
      ctx.fillText(`${band.frequency.toExponential(1)} Hz`, width - 100, y + 20);
    });
    
    // Draw dimensional layers visualization
    const layerCanvasX = width - 200;
    const layerCanvasY = 50;
    const layerCanvasSize = 150;
    
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(layerCanvasX, layerCanvasY, layerCanvasSize, layerCanvasSize);
    
    dimensionalLayers.forEach((layer, index) => {
      const layerY = layerCanvasY + (index / dimensionalLayers.length) * layerCanvasSize;
      const layerHeight = layerCanvasSize / dimensionalLayers.length;
      
      const layerIntensity = layer * intensity;
      const hue = (index / dimensionalLayers.length) * 360;
      
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${layerIntensity})`;
      ctx.fillRect(layerCanvasX + 2, layerY + 2, layerCanvasSize - 4, layerHeight - 4);
      
      // Layer label
      ctx.fillStyle = '#fff';
      ctx.font = '9px system-ui';
      ctx.fillText(`D${index + 1}`, layerCanvasX + 5, layerY + 12);
    });
    
    // Draw material signature
    const signatureX = 50;
    const signatureY = height - 100;
    const signatureWidth = width - 100;
    const signatureHeight = 80;
    
    // Signature background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(signatureX, signatureY, signatureWidth, signatureHeight);
    
    // Draw signature curve
    ctx.beginPath();
    ctx.strokeStyle = SPECTRAL_BANDS[selectedBand].color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < spectralData.length; i++) {
      const x = signatureX + (i / spectralData.length) * signatureWidth;
      const y = signatureY + signatureHeight / 2 - spectralData[i] * 30;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Signature label
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.fillText('Material Signature', signatureX, signatureY - 10);
    
    // Draw energy level
    const energyLevel = SPECTRAL_BANDS[selectedBand].energy * intensity;
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui';
    ctx.fillText(`Energy: ${energyLevel.toExponential(2)} eV`, signatureX, signatureY + signatureHeight + 20);
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [spectralData, selectedBand, intensity, frequency, dimensionalLayers]);
  
  // Start render loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      timeRef.current = timestamp;
      render(timestamp);
    });
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleAnalyze = useCallback(() => {
    if (seed && onSpectrumAnalyze) {
      setIsAnalyzing(true);
      setTimeout(() => {
        onSpectrumAnalyze(seed);
        setIsAnalyzing(false);
      }, 1000);
    }
  }, [seed, onSpectrumAnalyze]);
  
  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Spectral Studio</h2>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !seed}
            className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400"
          >
            {isAnalyzing ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Analyze Spectrum
              </>
            )}
          </Button>
        </div>
        
        {/* Selected Band Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-300">
              {SPECTRAL_BANDS[selectedBand].name} Band
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-300">
              {SPECTRAL_BANDS[selectedBand].frequency.toExponential(1)} Hz
            </span>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-4 border-b border-cyan-900/30 space-y-4">
        {/* Spectral Band Selection */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Spectral Band</label>
          <div className="flex gap-2">
            {SPECTRAL_BANDS.map((band, index) => (
              <button
                key={band.name}
                onClick={() => setSelectedBand(index)}
                className={`flex-1 p-2 rounded border transition-all ${
                  selectedBand === index
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-medium">{band.name}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Intensity Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Intensity</label>
            <span className="text-xs font-mono text-cyan-400">{(intensity * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[intensity * 100]}
            onValueChange={([v]) => setIntensity(v / 100)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Frequency Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Frequency Modulation</label>
            <span className="text-xs font-mono text-cyan-400">{(frequency * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[frequency * 100]}
            onValueChange={([v]) => setFrequency(v / 100)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ touchAction: 'none' }}
        />
        
        {/* Dimensional Layers Legend */}
        <div className="absolute top-4 right-4 p-3 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-cyan-900/30">
          <div className="text-xs text-cyan-400 font-semibold mb-2">Dimensional Layers</div>
          <div className="space-y-1">
            {dimensionalLayers.map((layer, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: `hsla(${(index / dimensionalLayers.length) * 360}, 70%, 50%, ${layer * intensity})`,
                  }}
                />
                <span className="text-xs text-slate-400">D{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Material Properties */}
        <div className="absolute bottom-4 left-4 p-3 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-cyan-900/30">
          <div className="text-xs text-cyan-400 font-semibold mb-2">Material Properties</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">Thermal: {(SPECTRAL_BANDS[selectedBand].energy * intensity * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Density: {(intensity * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400">Layers: {dimensionalLayers.filter(l => l > 0.3).length}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpectralStudio;
