/**
 * Spectrum-Based Theming — Phase 3 Implementation
 * 
 * Seed themes derived from spectral signature, UI colors shift based on
 * seed's dominant wavelength, ambient lighting effects from spectrum
 */

import { EMSpectrumRenderer, EM_BANDS, type EMBand } from './em-spectrum-renderer';
import { SpectrumComposer, type SpectralSignature } from './spectrum-composition';

export interface SpectrumTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  border: string;
  glow: string;
  ambient: {
    topColor: string;
    bottomColor: string;
    intensity: number;
  };
}

export class SpectrumThemer {
  private renderer: EMSpectrumRenderer;
  private composer: SpectrumComposer;

  constructor() {
    this.renderer = new EMSpectrumRenderer();
    this.composer = new SpectrumComposer();
  }

  /**
   * Generate theme from spectral signature
   */
  generateTheme(signature: SpectralSignature): SpectrumTheme {
    const dominantWavelength = signature.dominantWavelength;
    const spectralWidth = signature.spectralWidth;

    // Get base color from dominant wavelength
    const baseColor = this.renderer.wavelengthToColor(dominantWavelength);
    const rgb = this.hexToRgb(baseColor);

    // Generate complementary and analogous colors
    const complementary = this.rotateHue(rgb, 180);
    const analogous1 = this.rotateHue(rgb, 30);
    this.rotateHue(rgb, -30);

    // Calculate theme colors based on spectral characteristics
    const primary = baseColor;
    const secondary = this.rgbToHex(analogous1);
    const accent = this.rgbToHex(complementary);
    const background = this.rgbToHex(this.darkenColor(rgb, 0.85));
    const foreground = this.rgbToHex(this.lightenColor(rgb, 0.3));
    const border = this.adjustAlpha(rgb, 0.3);
    const glow = this.adjustAlpha(rgb, 0.5);

    // Ambient lighting based on spectral width (wider = more diffuse)
    const ambientIntensity = Math.max(0.1, Math.min(0.5, spectralWidth / 500e-9));
    const ambientTopColor = this.lightenColor(rgb, 0.2);
    const ambientBottomColor = this.darkenColor(rgb, 0.9);

    return {
      primary,
      secondary,
      accent,
      background,
      foreground,
      border,
      glow,
      ambient: {
        topColor: this.rgbToHex(ambientTopColor),
        bottomColor: this.rgbToHex(ambientBottomColor),
        intensity: ambientIntensity,
      },
    };
  }

  /**
   * Generate theme from seed genes
   */
  generateThemeFromGenes(genes: Record<string, { value?: any }>): SpectrumTheme {
    const signature = this.composer.extractSpectralSignature(genes);
    return this.generateTheme(signature);
  }

  /**
   * Generate theme from wavelength directly
   */
  generateThemeFromWavelength(wavelength: number): SpectrumTheme {
    const signature: SpectralSignature = {
      wavelengths: [wavelength],
      intensities: [0.8],
      dominantWavelength: wavelength,
      dominantBand: this.renderer.getBandForWavelength(wavelength),
      spectralWidth: 50e-9,
    };
    return this.generateTheme(signature);
  }

  /**
   * Apply theme to CSS variables
   */
  applyThemeToCSS(theme: SpectrumTheme, root: HTMLElement = document.documentElement): void {
    root.style.setProperty('--spectrum-primary', theme.primary);
    root.style.setProperty('--spectrum-secondary', theme.secondary);
    root.style.setProperty('--spectrum-accent', theme.accent);
    root.style.setProperty('--spectrum-background', theme.background);
    root.style.setProperty('--spectrum-foreground', theme.foreground);
    root.style.setProperty('--spectrum-border', theme.border);
    root.style.setProperty('--spectrum-glow', theme.glow);
    root.style.setProperty('--spectrum-ambient-top', theme.ambient.topColor);
    root.style.setProperty('--spectrum-ambient-bottom', theme.ambient.bottomColor);
    root.style.setProperty('--spectrum-ambient-intensity', String(theme.ambient.intensity));
  }

  /**
   * Remove spectrum theme from CSS
   */
  removeThemeFromCSS(root: HTMLElement = document.documentElement): void {
    root.style.removeProperty('--spectrum-primary');
    root.style.removeProperty('--spectrum-secondary');
    root.style.removeProperty('--spectrum-accent');
    root.style.removeProperty('--spectrum-background');
    root.style.removeProperty('--spectrum-foreground');
    root.style.removeProperty('--spectrum-border');
    root.style.removeProperty('--spectrum-glow');
    root.style.removeProperty('--spectrum-ambient-top');
    root.style.removeProperty('--spectrum-ambient-bottom');
    root.style.removeProperty('--spectrum-ambient-intensity');
  }

  /**
   * Get CSS transition for theme changes
   */
  getThemeTransition(duration: number = 300): string {
    return `all ${duration}ms ease-in-out`;
  }

  /**
   * Interpolate between two themes
   */
  interpolateThemes(theme1: SpectrumTheme, theme2: SpectrumTheme, t: number): SpectrumTheme {
    const rgb1 = this.hexToRgb(theme1.primary);
    const rgb2 = this.hexToRgb(theme2.primary);
    
    const interpolated = this.interpolateRgb(rgb1, rgb2, t);
    
    return {
      primary: this.rgbToHex(interpolated),
      secondary: this.interpolateColor(theme1.secondary, theme2.secondary, t),
      accent: this.interpolateColor(theme1.accent, theme2.accent, t),
      background: this.interpolateColor(theme1.background, theme2.background, t),
      foreground: this.interpolateColor(theme1.foreground, theme2.foreground, t),
      border: this.interpolateColor(theme1.border, theme2.border, t),
      glow: this.interpolateColor(theme1.glow, theme2.glow, t),
      ambient: {
        topColor: this.interpolateColor(theme1.ambient.topColor, theme2.ambient.topColor, t),
        bottomColor: this.interpolateColor(theme1.ambient.bottomColor, theme2.ambient.bottomColor, t),
        intensity: theme1.ambient.intensity + (theme2.ambient.intensity - theme1.ambient.intensity) * t,
      },
    };
  }

  /**
   * Get theme for specific EM band
   */
  getThemeForBand(band: EMBand): SpectrumTheme {
    const midWavelength = (band.lo + band.hi) / 2;
    return this.generateThemeFromWavelength(midWavelength);
  }

  // Helper methods

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(hex);
    if (result) {
      return { r: parseInt(result[1]), g: parseInt(result[2]), b: parseInt(result[3]) };
    }
    
    const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return hexResult ? {
      r: parseInt(hexResult[1], 16),
      g: parseInt(hexResult[2], 16),
      b: parseInt(hexResult[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private rgbToHex(rgb: { r: number; g: number; b: number }): string {
    return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
  }

  private rotateHue(rgb: { r: number; g: number; b: number }, degrees: number): { r: number; g: number; b: number } {
    // Convert to HSL, rotate hue, convert back to RGB
    const hsl = this.rgbToHsl(rgb);
    hsl.h = (hsl.h + degrees) % 360;
    return this.hslToRgb(hsl);
  }

  private rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
      
      h *= 360;
    }

    return { h, s, l };
  }

  private hslToRgb(hsl: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
    let { h } = hsl;
    const { s, l } = hsl;
    h /= 360;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  private darkenColor(rgb: { r: number; g: number; b: number }, factor: number): { r: number; g: number; b: number } {
    return {
      r: Math.round(rgb.r * (1 - factor)),
      g: Math.round(rgb.g * (1 - factor)),
      b: Math.round(rgb.b * (1 - factor)),
    };
  }

  private lightenColor(rgb: { r: number; g: number; b: number }, factor: number): { r: number; g: number; b: number } {
    return {
      r: Math.round(rgb.r + (255 - rgb.r) * factor),
      g: Math.round(rgb.g + (255 - rgb.g) * factor),
      b: Math.round(rgb.b + (255 - rgb.b) * factor),
    };
  }

  private adjustAlpha(rgb: { r: number; g: number; b: number }, alpha: number): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  private interpolateRgb(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }, t: number): { r: number; g: number; b: number } {
    return {
      r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
      g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
      b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t),
    };
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    const interpolated = this.interpolateRgb(rgb1, rgb2, t);
    return this.rgbToHex(interpolated);
  }

  destroy(): void {
    this.renderer.destroy();
  }
}

export function createSpectrumThemer(): SpectrumThemer {
  return new SpectrumThemer();
}
