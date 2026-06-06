/**
 * Spectrum Composition Tools — Phase 3 Implementation
 * 
 * Multi-spectral seed visualization, spectrum-based gene mapping,
 * and cross-spectral composition (e.g., visible + infrared)
 */

import { EMSpectrumRenderer, EM_BANDS, type EMBand } from './em-spectrum-renderer';

export interface SpectralSignature {
  wavelengths: number[];
  intensities: number[];
  dominantWavelength: number;
  dominantBand: EMBand | null;
  spectralWidth: number; // standard deviation of wavelengths
}

export interface MultiSpectralSeed {
  spectralSignature: SpectralSignature;
  geneMapping: Record<string, number>; // gene name -> wavelength mapping
  crossSpectralCompositions: Array<{
    bands: EMBand['renderingMode'][];
    blendMode: 'add' | 'multiply' | 'screen' | 'overlay';
    weight: number;
  }>;
}

export class SpectrumComposer {
  /**
   * Extract spectral signature from seed genes
   */
  extractSpectralSignature(genes: Record<string, { value?: any }>): SpectralSignature {
    const wavelengths: number[] = [];
    const intensities: number[] = [];
    
    // Map common genes to wavelengths
    const geneToWavelength: Record<string, number> = {
      color: 550e-9, // green default
      hue: 550e-9,
      brightness: 550e-9,
      warmth: 650e-9, // red/warm
      temperature: 700e-9, // IR
      frequency: 500e-9, // blue
      energy: 400e-9, // violet
      density: 800e-9, // IR
      complexity: 450e-9, // blue
    };
    
    Object.entries(genes).forEach(([geneName, geneData]) => {
      const value = geneData.value;
      if (typeof value === 'number') {
        const baseWavelength = geneToWavelength[geneName] || 550e-9;
        // Modulate wavelength based on gene value (0-1 range)
        const wavelength = baseWavelength * (0.5 + value);
        const intensity = Math.max(0, Math.min(1, value));
        
        wavelengths.push(wavelength);
        intensities.push(intensity);
      }
    });
    
    // If no genes, use default signature
    if (wavelengths.length === 0) {
      wavelengths.push(550e-9);
      intensities.push(0.8);
    }
    
    // Calculate dominant wavelength (weighted average)
    const totalIntensity = intensities.reduce((sum, i) => sum + i, 0);
    const dominantWavelength = wavelengths.reduce((sum, w, i) => sum + w * intensities[i], 0) / totalIntensity;
    
    // Calculate spectral width (standard deviation)
    const meanWavelength = wavelengths.reduce((sum, w) => sum + w, 0) / wavelengths.length;
    const variance = wavelengths.reduce((sum, w) => sum + Math.pow(w - meanWavelength, 2), 0) / wavelengths.length;
    const spectralWidth = Math.sqrt(variance);
    
    // Find dominant band
    const renderer = new EMSpectrumRenderer();
    const dominantBand = renderer.getBandForWavelength(dominantWavelength);
    renderer.destroy();
    
    return {
      wavelengths,
      intensities,
      dominantWavelength,
      dominantBand,
      spectralWidth,
    };
  }
  
  /**
   * Map genes to spectral wavelengths
   */
  mapGenesToSpectrum(genes: Record<string, { value?: any }>): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    Object.entries(genes).forEach(([geneName, geneData]) => {
      const value = geneData.value;
      if (typeof value === 'number') {
        // Map gene value to wavelength (0-1 -> 380nm-700nm for visible)
        const wavelength = 380e-9 + value * (700e-9 - 380e-9);
        mapping[geneName] = wavelength;
      }
    });
    
    return mapping;
  }
  
  /**
   * Create cross-spectral composition
   */
  createCrossSpectralComposition(
    bands: EMBand['renderingMode'][],
    blendMode: 'add' | 'multiply' | 'screen' | 'overlay' = 'add',
    weight: number = 0.5
  ): MultiSpectralSeed['crossSpectralCompositions'][0] {
    return {
      bands,
      blendMode,
      weight,
    };
  }
  
  /**
   * Blend multiple spectral signatures
   */
  blendSpectralSignatures(
    signatures: SpectralSignature[],
    weights: number[]
  ): SpectralSignature {
    if (signatures.length === 0) {
      return {
        wavelengths: [550e-9],
        intensities: [0.8],
        dominantWavelength: 550e-9,
        dominantBand: null,
        spectralWidth: 0,
      };
    }
    
    if (signatures.length === 1) {
      return signatures[0];
    }
    
    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Blend wavelengths and intensities
    const blendedWavelengths: number[] = [];
    const blendedIntensities: number[] = [];
    
    signatures.forEach((sig, sigIndex) => {
      const weight = normalizedWeights[sigIndex];
      sig.wavelengths.forEach((w, i) => {
        blendedWavelengths.push(w);
        blendedIntensities.push(sig.intensities[i] * weight);
      });
    });
    
    // Calculate new dominant wavelength
    const totalIntensity = blendedIntensities.reduce((sum, i) => sum + i, 0);
    const dominantWavelength = blendedWavelengths.reduce((sum, w, i) => sum + w * blendedIntensities[i], 0) / totalIntensity;
    
    // Calculate new spectral width
    const meanWavelength = blendedWavelengths.reduce((sum, w) => sum + w, 0) / blendedWavelengths.length;
    const variance = blendedWavelengths.reduce((sum, w) => sum + Math.pow(w - meanWavelength, 2), 0) / blendedWavelengths.length;
    const spectralWidth = Math.sqrt(variance);
    
    // Find dominant band
    const renderer = new EMSpectrumRenderer();
    const dominantBand = renderer.getBandForWavelength(dominantWavelength);
    renderer.destroy();
    
    return {
      wavelengths: blendedWavelengths,
      intensities: blendedIntensities,
      dominantWavelength,
      dominantBand,
      spectralWidth,
    };
  }
  
  /**
   * Calculate spectral similarity between two signatures
   */
  calculateSpectralSimilarity(sig1: SpectralSignature, sig2: SpectralSignature): number {
    // Use dominant wavelength difference as primary similarity metric
    const wavelengthDiff = Math.abs(sig1.dominantWavelength - sig2.dominantWavelength);
    const maxWavelength = 700e-9;
    const wavelengthSimilarity = 1 - (wavelengthDiff / maxWavelength);
    
    // Factor in spectral width similarity
    const widthDiff = Math.abs(sig1.spectralWidth - sig2.spectralWidth);
    const maxWidth = 300e-9;
    const widthSimilarity = 1 - (widthDiff / maxWidth);
    
    // Combine similarities
    return (wavelengthSimilarity * 0.7 + widthSimilarity * 0.3);
  }
  
  /**
   * Generate multi-spectral visualization data
   */
  generateMultiSpectralVisualization(
    signature: SpectralSignature,
    width: number,
    height: number
  ): Array<{ x: number; y: number; wavelength: number; intensity: number; color: string }> {
    const renderer = new EMSpectrumRenderer();
    const points: Array<{ x: number; y: number; wavelength: number; intensity: number; color: string }> = [];
    
    signature.wavelengths.forEach((wavelength, i) => {
      const intensity = signature.intensities[i];
      const x = Math.random() * width;
      const y = Math.random() * height;
      const color = renderer.wavelengthToColor(wavelength);
      
      points.push({ x, y, wavelength, intensity, color });
    });
    
    renderer.destroy();
    return points;
  }
  
  /**
   * Apply spectrum-based gene mutation
   */
  applySpectralMutation(
    genes: Record<string, { value?: any }>,
    targetWavelength: number,
    mutationRate: number = 0.1
  ): Record<string, { value?: any }> {
    const mutatedGenes = { ...genes };
    const renderer = new EMSpectrumRenderer();
    
    Object.keys(mutatedGenes).forEach((geneName) => {
      const geneData = mutatedGenes[geneName];
      if (typeof geneData.value === 'number' && Math.random() < mutationRate) {
        // Shift gene value towards target wavelength
        const currentValue = geneData.value;
        const targetValue = (targetWavelength - 380e-9) / (700e-9 - 380e-9);
        const newValue = currentValue + (targetValue - currentValue) * mutationRate;
        
        mutatedGenes[geneName] = {
          ...geneData,
          value: Math.max(0, Math.min(1, newValue)),
        };
      }
    });
    
    renderer.destroy();
    return mutatedGenes;
  }
}

export function createSpectrumComposer(): SpectrumComposer {
  return new SpectrumComposer();
}
