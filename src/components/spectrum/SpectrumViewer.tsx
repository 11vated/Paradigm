/**
 * Spectrum Viewer Component — Phase 3 Implementation
 * 
 * Interactive electromagnetic spectrum viewer with:
 * - Wavelength slider
 * - Spectrum-specific rendering modes
 * - Real-world examples
 * - Scientific annotations
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EMSpectrumRenderer, EM_BANDS, type EMBand, type SpectrumConfig } from '@/lib/spectrum/em-spectrum-renderer';

interface SpectrumViewerProps {
  className?: string;
  onWavelengthChange?: (wavelength: number) => void;
  initialWavelength?: number;
  showControls?: boolean;
  seed?: {
    genes?: Record<string, { value?: any }>;
    $hash?: string;
  };
}

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
  className = '',
  onWavelengthChange,
  initialWavelength = 550e-9,
  showControls = true,
  seed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EMSpectrumRenderer | null>(null);
  
  const [wavelength, setWavelength] = useState(initialWavelength);
  const [intensity, setIntensity] = useState(0.8);
  const [renderingMode, setRenderingMode] = useState<EMBand['renderingMode']>('visible');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showRealWorldExamples, setShowRealWorldExamples] = useState(true);
  const [selectedBand, setSelectedBand] = useState<EMBand | null>(null);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new EMSpectrumRenderer({
      wavelength,
      intensity,
      renderingMode,
      showAnnotations,
      showRealWorldExamples,
    });
    
    renderer.attach(canvasRef.current);
    renderer.render();
    rendererRef.current = renderer;
    
    return () => {
      renderer.destroy();
    };
  }, []);

  // Update renderer when config changes
  useEffect(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.setWavelength(wavelength);
    rendererRef.current.setIntensity(intensity);
    rendererRef.current.setRenderingMode(renderingMode);
    
    const band = rendererRef.current.getBandForWavelength(wavelength);
    setSelectedBand(band);
    
    if (onWavelengthChange) {
      onWavelengthChange(wavelength);
    }
  }, [wavelength, intensity, renderingMode, onWavelengthChange]);

  // Extract spectral signature from seed genes if available
  const seedSpectralSignature = useMemo(() => {
    if (!seed?.genes) return null;
    
    // Map seed genes to spectral properties
    const colorGene = seed.genes.color?.value;
    const brightnessGene = seed.genes.brightness?.value;
    const warmthGene = seed.genes.warmth?.value;
    
    if (colorGene !== undefined) {
      // Convert color gene to wavelength approximation
      // This is a simplified mapping - in production would use proper color science
      const hue = typeof colorGene === 'number' ? colorGene : 0;
      const wavelengthFromHue = 380 + (hue / 360) * (700 - 380);
      return wavelengthFromHue * 1e-9;
    }
    
    return null;
  }, [seed]);

  // Apply seed spectral signature when available
  useEffect(() => {
    if (seedSpectralSignature !== null) {
      setWavelength(seedSpectralSignature);
      
      // Set rendering mode based on wavelength
      if (seedSpectralSignature < 380e-9) {
        setRenderingMode('uv-film');
      } else if (seedSpectralSignature > 700e-9) {
        setRenderingMode('thermal');
      } else {
        setRenderingMode('visible');
      }
    }
  }, [seedSpectralSignature]);

  const handleWavelengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const minWavelength = 0; // Gamma rays
    const maxWavelength = 1000; // Radio waves (meters)
    
    // Logarithmic scale for better UX across huge range
    const logMin = Math.log10(1e-12);
    const logMax = Math.log10(1000);
    const logValue = logMin + (value / 100) * (logMax - logMin);
    const newWavelength = Math.pow(10, logValue);
    
    setWavelength(newWavelength);
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIntensity(parseFloat(e.target.value) / 100);
  };

  const handleBandClick = (band: EMBand) => {
    const midWavelength = (band.lo + band.hi) / 2;
    setWavelength(midWavelength);
    setRenderingMode(band.renderingMode);
  };

  const wavelengthInNm = wavelength * 1e9;
  const frequency = 3e8 / wavelength;
  const energy = 6.626e-34 * frequency;

  return (
    <div className={`spectrum-viewer ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, background: '#0a0a14', borderRadius: 8, border: '1px solid #1a1a2e' }}>
      {/* Main spectrum display */}
      <div style={{ position: 'relative' }}>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={400}
          style={{ width: '100%', height: 'auto', borderRadius: 4, background: '#080812' }}
        />
      </div>

      {showControls && (
        <>
          {/* Wavelength slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
                Wavelength: {wavelengthInNm < 1 ? wavelength.toExponential(2) : `${wavelengthInNm.toFixed(2)} nm`}
              </label>
              <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
                Frequency: {frequency.toExponential(2)} Hz
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.log10(wavelength) / Math.log10(1000) * 100}
              onChange={handleWavelengthChange}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#606070', fontFamily: 'monospace' }}>
              <span>γ-ray</span>
              <span>X-ray</span>
              <span>UV</span>
              <span>Visible</span>
              <span>IR</span>
              <span>Radio</span>
            </div>
          </div>

          {/* Intensity slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
              Intensity: {(intensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={intensity * 100}
              onChange={handleIntensityChange}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          {/* Rendering mode selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
              Rendering Mode
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['visible', 'thermal', 'uv-film', 'xray', 'particles', 'wave', 'heatmap'] as EMBand['renderingMode'][]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRenderingMode(mode)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    background: renderingMode === mode ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: renderingMode === mode ? '1px solid #00e5ff' : '1px solid #2a2a3e',
                    borderRadius: 4,
                    color: renderingMode === mode ? '#00e5ff' : '#a0a0b0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle annotations */}
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAnnotations}
                onChange={(e) => setShowAnnotations(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Annotations
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showRealWorldExamples}
                onChange={(e) => setShowRealWorldExamples(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Real-world Examples
            </label>
          </div>

          {/* EM band quick select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
              Quick Band Select
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {EM_BANDS.map((band) => (
                <button
                  key={band.label}
                  onClick={() => handleBandClick(band)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    background: selectedBand?.label === band.label ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedBand?.label === band.label ? '1px solid #00e5ff' : '1px solid #2a2a3e',
                    borderRadius: 3,
                    color: band.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={band.desc}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Selected band info */}
      {selectedBand && (
        <div style={{ padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 4, border: '1px solid #2a2a3e' }}>
          <div style={{ color: '#00e5ff', fontSize: 13, fontFamily: 'monospace', marginBottom: 8 }}>
            {selectedBand.label} - {selectedBand.desc}
          </div>
          <div style={{ color: '#a0a0b0', fontSize: 11, fontFamily: 'monospace', marginBottom: 8 }}>
            Range: {(selectedBand.lo * 1e9).toExponential(2)} - {(selectedBand.hi * 1e9).toExponential(2)} nm
          </div>
          {showRealWorldExamples && selectedBand.realWorldExamples.length > 0 && (
            <div>
              <div style={{ color: '#808090', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 }}>
                Examples:
              </div>
              {selectedBand.realWorldExamples.map((example, i) => (
                <div key={i} style={{ color: '#a0a0b0', fontSize: 10, fontFamily: 'monospace' }}>
                  • {example}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpectrumViewer;
