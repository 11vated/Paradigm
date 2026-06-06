/**
 * Electromagnetic Spectrum Renderer — Phase 3 Implementation
 * 
 * Complete EM spectrum visualization with:
 * - Full spectrum rendering (Radio to Gamma)
 * - False-color mapping for non-visible bands
 * - Interactive wavelength slider
 * - Spectrum-specific rendering modes
 * - Scientific annotations
 */

export interface EMBand {
  label: string;
  lo: number; // wavelength in meters
  hi: number; // wavelength in meters
  color: string;
  desc: string;
  renderingMode: 'wave' | 'heatmap' | 'thermal' | 'visible' | 'uv-film' | 'xray' | 'particles';
  realWorldExamples: string[];
}

export const EM_BANDS: EMBand[] = [
  { 
    label: 'γ-ray', 
    lo: 0, 
    hi: 0.01e-9, 
    color: '#ff00ff', 
    desc: 'Gamma rays (10⁻¹²–10⁻¹⁰ m)',
    renderingMode: 'particles',
    realWorldExamples: ['Nuclear decay', 'Cosmic rays', 'Gamma-ray bursts']
  },
  { 
    label: 'Hard X', 
    lo: 0.01e-9, 
    hi: 0.1e-9, 
    color: '#cc44ff', 
    desc: 'Hard X-rays',
    renderingMode: 'xray',
    realWorldExamples: ['Medical imaging', 'Security scanning', 'Crystallography']
  },
  { 
    label: 'Soft X', 
    lo: 0.1e-9, 
    hi: 10e-9, 
    color: '#9966ff', 
    desc: 'Soft X-rays',
    renderingMode: 'xray',
    realWorldExamples: ['Astronomy', 'Microscopy', 'Lithography']
  },
  { 
    label: 'EUV', 
    lo: 10e-9, 
    hi: 124e-9, 
    color: '#8844ff', 
    desc: 'Extreme UV',
    renderingMode: 'uv-film',
    realWorldExamples: ['Solar physics', 'Semiconductor manufacturing']
  },
  { 
    label: 'UVC', 
    lo: 124e-9, 
    hi: 280e-9, 
    color: '#6622ff', 
    desc: 'UV-C (germicidal)',
    renderingMode: 'uv-film',
    realWorldExamples: ['Sterilization', 'Water purification']
  },
  { 
    label: 'UVB', 
    lo: 280e-9, 
    hi: 315e-9, 
    color: '#5511ee', 
    desc: 'UV-B (sunburn)',
    renderingMode: 'uv-film',
    realWorldExamples: ['Vitamin D synthesis', 'DNA damage', 'Tanning beds']
  },
  { 
    label: 'UVA', 
    lo: 315e-9, 
    hi: 380e-9, 
    color: '#4400dd', 
    desc: 'UV-A (blacklight)',
    renderingMode: 'uv-film',
    realWorldExamples: ['Black lights', 'Forensics', 'Insect traps']
  },
  { 
    label: 'Violet', 
    lo: 380e-9, 
    hi: 450e-9, 
    color: '#4400ff', 
    desc: '380–450nm',
    renderingMode: 'visible',
    realWorldExamples: ['Flowers', 'Rainbows', 'LED displays']
  },
  { 
    label: 'Blue', 
    lo: 450e-9, 
    hi: 495e-9, 
    color: '#0044ff', 
    desc: '450–495nm',
    renderingMode: 'visible',
    realWorldExamples: ['Sky', 'Ocean', 'Blueberries']
  },
  { 
    label: 'Green', 
    lo: 495e-9, 
    hi: 570e-9, 
    color: '#00cc44', 
    desc: '495–570nm',
    renderingMode: 'visible',
    realWorldExamples: ['Plants', 'Emeralds', 'Grass']
  },
  { 
    label: 'Yellow', 
    lo: 570e-9, 
    hi: 590e-9, 
    color: '#aacc00', 
    desc: '570–590nm',
    renderingMode: 'visible',
    realWorldExamples: ['Sunflowers', 'Gold', 'Lemons']
  },
  { 
    label: 'Orange', 
    lo: 590e-9, 
    hi: 620e-9, 
    color: '#ffaa00', 
    desc: '590–620nm',
    renderingMode: 'visible',
    realWorldExamples: ['Carrots', 'Sunsets', 'Pumpkins']
  },
  { 
    label: 'Red', 
    lo: 620e-9, 
    hi: 700e-9, 
    color: '#ff2200', 
    desc: '620–700nm',
    renderingMode: 'visible',
    realWorldExamples: ['Blood', 'Tomatoes', 'Rubies']
  },
  { 
    label: 'NIR', 
    lo: 700e-9, 
    hi: 1.4e-6, 
    color: '#880000', 
    desc: 'Near IR',
    renderingMode: 'thermal',
    realWorldExamples: ['Night vision', 'Remote controls', 'Fiber optics']
  },
  { 
    label: 'SWIR', 
    lo: 1.4e-6, 
    hi: 3e-6, 
    color: '#660000', 
    desc: 'Short-wave IR',
    renderingMode: 'thermal',
    realWorldExamples: ['Thermal imaging', 'Moisture detection']
  },
  { 
    label: 'MWIR', 
    lo: 3e-6, 
    hi: 8e-6, 
    color: '#550000', 
    desc: 'Mid-wave IR',
    renderingMode: 'thermal',
    realWorldExamples: ['Heat seeking', 'Gas detection']
  },
  { 
    label: 'LWIR', 
    lo: 8e-6, 
    hi: 15e-6, 
    color: '#440000', 
    desc: 'Long-wave IR',
    renderingMode: 'thermal',
    realWorldExamples: ['Thermal cameras', 'Climate monitoring']
  },
  { 
    label: 'FIR', 
    lo: 15e-6, 
    hi: 1e-3, 
    color: '#330000', 
    desc: 'Far IR',
    renderingMode: 'thermal',
    realWorldExamples: ['Astronomy', 'Spectroscopy']
  },
  { 
    label: 'EHF', 
    lo: 1e-3, 
    hi: 0.03, 
    color: '#002244', 
    desc: 'Extremely high freq',
    renderingMode: 'wave',
    realWorldExamples: ['Millimeter-wave scanners', '5G backhaul']
  },
  { 
    label: 'SHF', 
    lo: 0.03, 
    hi: 0.3, 
    color: '#001a33', 
    desc: 'Super high freq',
    renderingMode: 'wave',
    realWorldExamples: ['Microwave ovens', 'Satellite comms', 'Radar']
  },
  { 
    label: 'UHF', 
    lo: 0.3, 
    hi: 1, 
    color: '#001122', 
    desc: 'Ultra high freq',
    renderingMode: 'wave',
    realWorldExamples: ['TV broadcasting', 'Mobile phones', 'GPS']
  },
  { 
    label: 'VHF', 
    lo: 1, 
    hi: 10, 
    color: '#000a11', 
    desc: 'Very high freq',
    renderingMode: 'wave',
    realWorldExamples: ['FM radio', 'Marine radio', 'Air traffic control']
  },
  { 
    label: 'HF', 
    lo: 10, 
    hi: 100, 
    color: '#000808', 
    desc: 'High freq',
    renderingMode: 'wave',
    realWorldExamples: ['Shortwave radio', 'Amateur radio', 'Aviation']
  },
  { 
    label: 'MF', 
    lo: 100, 
    hi: 1000, 
    color: '#000606', 
    desc: 'Medium freq',
    renderingMode: 'wave',
    realWorldExamples: ['AM radio', 'Navigation beacons']
  },
];

export interface SpectrumConfig {
  wavelength: number; // in meters
  intensity: number; // 0-1
  renderingMode: EMBand['renderingMode'];
  showAnnotations: boolean;
  showRealWorldExamples: boolean;
}

export class EMSpectrumRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: SpectrumConfig;
  private animationId: number | null = null;

  constructor(config: Partial<SpectrumConfig> = {}) {
    this.config = {
      wavelength: 550e-9, // Default to green light
      intensity: 0.8,
      renderingMode: 'visible',
      showAnnotations: true,
      showRealWorldExamples: true,
      ...config,
    };
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
  }

  setWavelength(wavelength: number): void {
    this.config.wavelength = wavelength;
    this.render();
  }

  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
    this.render();
  }

  setRenderingMode(mode: EMBand['renderingMode']): void {
    this.config.renderingMode = mode;
    this.render();
  }

  getBandForWavelength(wavelength: number): EMBand | null {
    return EM_BANDS.find(band => wavelength >= band.lo && wavelength < band.hi) || null;
  }

  wavelengthToColor(wavelength: number): string {
    // Convert wavelength to RGB for visible spectrum
    const nm = wavelength * 1e9;
    
    if (nm < 380) return '#4400dd'; // UV
    if (nm > 700) return '#880000'; // IR
    
    let r = 0, g = 0, b = 0;
    
    if (nm >= 380 && nm < 440) {
      r = -(nm - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (nm >= 440 && nm < 490) {
      r = 0;
      g = (nm - 440) / (490 - 440);
      b = 1;
    } else if (nm >= 490 && nm < 510) {
      r = 0;
      g = 1;
      b = -(nm - 510) / (510 - 490);
    } else if (nm >= 510 && nm < 580) {
      r = (nm - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (nm >= 580 && nm < 645) {
      r = 1;
      g = -(nm - 645) / (645 - 580);
      b = 0;
    } else if (nm >= 645 && nm <= 700) {
      r = 1;
      g = 0;
      b = 0;
    }
    
    // Intensity falloff near vision limits
    let factor = 1;
    if (nm >= 380 && nm < 420) {
      factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
    } else if (nm >= 645 && nm <= 700) {
      factor = 0.3 + 0.7 * (700 - nm) / (700 - 645);
    }
    
    const R = Math.round(r * factor * 255);
    const G = Math.round(g * factor * 255);
    const B = Math.round(b * factor * 255);
    
    return `rgb(${R}, ${G}, ${B})`;
  }

  falseColorMap(wavelength: number, intensity: number): string {
    const band = this.getBandForWavelength(wavelength);
    if (!band) return '#000000';
    
    switch (band.renderingMode) {
      case 'thermal':
        // Blue (cold) to red (hot) gradient
        const t = intensity;
        const r = Math.round(t * 255);
        const b = Math.round((1 - t) * 255);
        return `rgb(${r}, 0, ${b})`;
      
      case 'uv-film':
        // Purple/blue UV-sensitive film style
        return `rgb(${Math.round(100 + intensity * 100)}, ${Math.round(50 + intensity * 50)}, ${Math.round(200 + intensity * 55)})`;
      
      case 'xray':
        // Bone-density grayscale
        const gray = Math.round(intensity * 255);
        return `rgb(${gray}, ${gray}, ${gray})`;
      
      case 'particles':
        // High-energy particle trails with magenta/purple
        return `rgb(${Math.round(200 + intensity * 55)}, 0, ${Math.round(200 + intensity * 55)})`;
      
      default:
        return band.color;
    }
  }

  renderWavePattern(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, wavelength: number, intensity: number): void {
    const frequency = 1 / wavelength;
    const amplitude = height * 0.4 * intensity;
    
    ctx.beginPath();
    ctx.strokeStyle = this.falseColorMap(wavelength, intensity);
    ctx.lineWidth = 2;
    
    for (let px = 0; px < width; px++) {
      const py = y + height / 2 + Math.sin((px / width) * Math.PI * 2 * frequency * 0.1) * amplitude;
      if (px === 0) {
        ctx.moveTo(x + px, py);
      } else {
        ctx.lineTo(x + px, py);
      }
    }
    
    ctx.stroke();
  }

  renderHeatmap(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, intensity: number): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, `rgba(0, 0, 255, ${intensity * 0.8})`);
    gradient.addColorStop(0.5, `rgba(128, 0, 128, ${intensity * 0.8})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.8})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  renderParticles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, intensity: number): void {
    const particleCount = Math.floor(20 + intensity * 80);
    
    for (let i = 0; i < particleCount; i++) {
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
      const size = 1 + Math.random() * 3 * intensity;
      
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 255, ${intensity * 0.7})`;
      ctx.fill();
      
      // Particle trail
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (Math.random() - 0.5) * 20, py + (Math.random() - 0.5) * 20);
      ctx.strokeStyle = `rgba(255, 0, 255, ${intensity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  renderXRay(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, intensity: number): void {
    // Bone-density style rendering
    const gradient = ctx.createRadialGradient(x + width / 2, y + height / 2, 0, x + width / 2, y + height / 2, width / 2);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.9})`);
    gradient.addColorStop(0.5, `rgba(128, 128, 128, ${intensity * 0.7})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.5})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Add "bone" structure
    ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + height * 0.2);
    ctx.lineTo(x + width / 2, y + height * 0.8);
    ctx.stroke();
  }

  renderVisibleSpectrum(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, wavelength: number, intensity: number): void {
    const color = this.wavelengthToColor(wavelength);
    const rgb = this.hexToRgb(color);
    
    // Create gradient from color to white
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.3})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Add RGB breakdown bars
    const barHeight = height / 3;
    ctx.fillStyle = `rgba(${rgb.r}, 0, 0, ${intensity * 0.8})`;
    ctx.fillRect(x + width + 5, y, 10, barHeight);
    ctx.fillStyle = `rgba(0, ${rgb.g}, 0, ${intensity * 0.8})`;
    ctx.fillRect(x + width + 5, y + barHeight, 10, barHeight);
    ctx.fillStyle = `rgba(0, 0, ${rgb.b}, ${intensity * 0.8})`;
    ctx.fillRect(x + width + 5, y + barHeight * 2, 10, barHeight);
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(hex);
    if (result) {
      return { r: parseInt(result[1]), g: parseInt(result[2]), b: parseInt(result[3]) };
    }
    
    // Handle hex format
    const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return hexResult ? {
      r: parseInt(hexResult[1], 16),
      g: parseInt(hexResult[2], 16),
      b: parseInt(hexResult[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  render(): void {
    if (!this.canvas || !this.ctx) return;
    
    const { width, height } = this.canvas;
    const { wavelength, intensity, renderingMode, showAnnotations, showRealWorldExamples } = this.config;
    
    // Clear canvas
    this.ctx.fillStyle = '#080812';
    this.ctx.fillRect(0, 0, width, height);
    
    // Render based on mode
    const renderX = 20;
    const renderY = 20;
    const renderW = width - 40;
    const renderH = height - (showAnnotations ? 120 : 80);
    
    switch (renderingMode) {
      case 'wave':
        this.renderWavePattern(this.ctx, renderX, renderY, renderW, renderH, wavelength, intensity);
        break;
      case 'heatmap':
        this.renderHeatmap(this.ctx, renderX, renderY, renderW, renderH, intensity);
        break;
      case 'thermal':
        this.renderHeatmap(this.ctx, renderX, renderY, renderW, renderH, intensity);
        break;
      case 'visible':
        this.renderVisibleSpectrum(this.ctx, renderX, renderY, renderW, renderH, wavelength, intensity);
        break;
      case 'uv-film':
        this.renderVisibleSpectrum(this.ctx, renderX, renderY, renderW, renderH, wavelength, intensity);
        break;
      case 'xray':
        this.renderXRay(this.ctx, renderX, renderY, renderW, renderH, intensity);
        break;
      case 'particles':
        this.renderParticles(this.ctx, renderX, renderY, renderW, renderH, intensity);
        break;
    }
    
    // Draw annotations
    if (showAnnotations) {
      this.drawAnnotations(renderX, renderY + renderH + 10, renderW);
    }
    
    // Draw real-world examples
    if (showRealWorldExamples) {
      this.drawRealWorldExamples(renderX, renderY + renderH + 50, renderW);
    }
  }

  drawAnnotations(x: number, y: number, width: number): void {
    const { wavelength } = this.config;
    const band = this.getBandForWavelength(wavelength);
    
    if (!band || !this.ctx) return;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Wavelength: ${(wavelength * 1e9).toFixed(2)} nm`, x, y);
    this.ctx.fillText(`Frequency: ${(3e8 / wavelength).toExponential(2)} Hz`, x, y + 15);
    this.ctx.fillText(`Energy: ${(6.626e-34 * 3e8 / wavelength).toExponential(2)} J`, x, y + 30);
    this.ctx.fillText(`Band: ${band.label} - ${band.desc}`, x, y + 45);
  }

  drawRealWorldExamples(x: number, y: number, width: number): void {
    const { wavelength } = this.config;
    const band = this.getBandForWavelength(wavelength);
    
    if (!band || band.realWorldExamples.length === 0 || !this.ctx) return;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Real-world examples:', x, y);
    
    band.realWorldExamples.forEach((example, i) => {
      if (!this.ctx) return;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillText(`• ${example}`, x, y + 15 + i * 12);
    });
  }

  startAnimation(): void {
    if (this.animationId !== null) return;
    
    const animate = () => {
      // Subtle animation for particle modes
      if (this.config.renderingMode === 'particles' || this.config.renderingMode === 'wave') {
        this.render();
      }
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
  }
}

export function createEMSpectrumRenderer(config?: Partial<SpectrumConfig>): EMSpectrumRenderer {
  return new EMSpectrumRenderer(config);
}
