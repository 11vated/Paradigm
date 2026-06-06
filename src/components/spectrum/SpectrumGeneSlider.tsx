/**
 * Spectrum-Based Gene Manipulation Sliders — Phase 3 Implementation
 * 
 * Wavelength sliders for gene manipulation, spectrum-based seed similarity visualization,
 * and spectral composition tools
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SpectrumComposer, type SpectralSignature } from '@/lib/spectrum/spectrum-composition';
import { EMSpectrumRenderer, EM_BANDS, type EMBand } from '@/lib/spectrum/em-spectrum-renderer';

interface SpectrumGeneSliderProps {
  geneName: string;
  geneValue: number;
  onValueChange: (value: number) => void;
  wavelength?: number;
  showSpectrum?: boolean;
  className?: string;
}

export const SpectrumGeneSlider: React.FC<SpectrumGeneSliderProps> = ({
  geneName,
  geneValue,
  onValueChange,
  wavelength = 550e-9,
  showSpectrum = true,
  className = '',
}) => {
  const [currentWavelength, setCurrentWavelength] = useState(wavelength);
  const composer = useMemo(() => new SpectrumComposer(), []);
  const renderer = useMemo(() => new EMSpectrumRenderer(), []);

  // Update wavelength when gene value changes
  useEffect(() => {
    const newWavelength = 380e-9 + geneValue * (700e-9 - 380e-9);
    setCurrentWavelength(newWavelength);
  }, [geneValue]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) / 100;
    onValueChange(newValue);
  };

  const wavelengthColor = renderer.wavelengthToColor(currentWavelength);
  const band = renderer.getBandForWavelength(currentWavelength);

  return (
    <div className={`spectrum-gene-slider ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, border: '1px solid #2a2a3e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
          {geneName}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showSpectrum && (
            <div 
              style={{ 
                width: 20, 
                height: 20, 
                borderRadius: 4, 
                background: wavelengthColor,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }} 
            />
          )}
          <span style={{ color: '#00e5ff', fontSize: 11, fontFamily: 'monospace' }}>
            {(geneValue * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {showSpectrum && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#606070', fontSize: 10, fontFamily: 'monospace' }}>
            380nm
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={geneValue * 100}
            onChange={handleSliderChange}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(to right, 
                #4400dd 0%, 
                #4400ff 8%, 
                #0044ff 15%, 
                #00cc44 30%, 
                #aacc00 40%, 
                #ffaa00 45%, 
                #ff2200 55%, 
                #880000 70%, 
                #330000 100%)`,
              cursor: 'pointer',
              appearance: 'none',
            }}
          />
          <span style={{ color: '#606070', fontSize: 10, fontFamily: 'monospace' }}>
            700nm
          </span>
        </div>
      )}

      {!showSpectrum && (
        <input
          type="range"
          min="0"
          max="100"
          value={geneValue * 100}
          onChange={handleSliderChange}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      )}

      {band && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#606070', fontFamily: 'monospace' }}>
          <span>{(currentWavelength * 1e9).toFixed(1)} nm</span>
          <span style={{ color: band.color }}>{band.label}</span>
        </div>
      )}
    </div>
  );
};

interface SpectrumSimilarityProps {
  signature1: SpectralSignature;
  signature2: SpectralSignature;
  className?: string;
}

export const SpectrumSimilarity: React.FC<SpectrumSimilarityProps> = ({
  signature1,
  signature2,
  className = '',
}) => {
  const composer = useMemo(() => new SpectrumComposer(), []);
  const similarity = useMemo(() => 
    composer.calculateSpectralSimilarity(signature1, signature2),
    [composer, signature1, signature2]
  );

  const similarityPercent = Math.round(similarity * 100);
  const similarityColor = similarity > 0.8 ? '#00cc44' : similarity > 0.5 ? '#ffaa00' : '#ff2200';

  return (
    <div className={`spectrum-similarity ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, border: '1px solid #2a2a3e' }}>
      <div style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
        Spectral Similarity
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 8, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${similarityPercent}%`, 
              height: '100%', 
              background: similarityColor,
              transition: 'width 0.3s ease',
            }} 
          />
        </div>
        <span style={{ color: similarityColor, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {similarityPercent}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#606070', fontFamily: 'monospace' }}>
        <span>{(signature1.dominantWavelength * 1e9).toFixed(1)} nm</span>
        <span>vs</span>
        <span>{(signature2.dominantWavelength * 1e9).toFixed(1)} nm</span>
      </div>
    </div>
  );
};

interface SpectralCompositionProps {
  signatures: SpectralSignature[];
  weights: number[];
  onWeightChange: (index: number, weight: number) => void;
  className?: string;
}

export const SpectralComposition: React.FC<SpectralCompositionProps> = ({
  signatures,
  weights,
  onWeightChange,
  className = '',
}) => {
  const composer = useMemo(() => new SpectrumComposer(), []);
  const renderer = useMemo(() => new EMSpectrumRenderer(), []);

  const blendedSignature = useMemo(() => 
    composer.blendSpectralSignatures(signatures, weights),
    [composer, signatures, weights]
  );

  const handleWeightChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = parseFloat(e.target.value) / 100;
    onWeightChange(index, newWeight);
  };

  const blendedColor = renderer.wavelengthToColor(blendedSignature.dominantWavelength);
  const blendedBand = renderer.getBandForWavelength(blendedSignature.dominantWavelength);

  return (
    <div className={`spectral-composition ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8, border: '1px solid #2a2a3e' }}>
      <div style={{ color: '#a0a0b0', fontSize: 12, fontFamily: 'monospace' }}>
        Spectral Composition
      </div>

      {/* Individual signatures */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {signatures.map((sig, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{ 
                width: 16, 
                height: 16, 
                borderRadius: 3, 
                background: renderer.wavelengthToColor(sig.dominantWavelength),
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }} 
            />
            <span style={{ color: '#808090', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
              {(sig.dominantWavelength * 1e9).toFixed(1)} nm
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={weights[i] * 100}
              onChange={(e) => handleWeightChange(i, e)}
              style={{ width: 80, cursor: 'pointer' }}
            />
            <span style={{ color: '#00e5ff', fontSize: 10, fontFamily: 'monospace', width: 35 }}>
              {(weights[i] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Blended result */}
      <div style={{ padding: 12, background: 'rgba(0, 229, 255, 0.05)', borderRadius: 6, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div 
            style={{ 
              width: 24, 
              height: 24, 
              borderRadius: 4, 
              background: blendedColor,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }} 
          />
          <div>
            <div style={{ color: '#00e5ff', fontSize: 12, fontFamily: 'monospace' }}>
              Blended Result
            </div>
            <div style={{ color: '#808090', fontSize: 10, fontFamily: 'monospace' }}>
              {(blendedSignature.dominantWavelength * 1e9).toFixed(1)} nm
              {blendedBand && ` · ${blendedBand.label}`}
            </div>
          </div>
        </div>
        <div style={{ color: '#606070', fontSize: 10, fontFamily: 'monospace' }}>
          Spectral width: {(blendedSignature.spectralWidth * 1e9).toFixed(1)} nm
        </div>
      </div>
    </div>
  );
};

export default SpectrumGeneSlider;
