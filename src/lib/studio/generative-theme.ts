/**
 * Generative Theme System for Paradigm Infinite Studio
 * 
 * This system uses GSPL seeds to dynamically generate UI themes, making every
 * element feel alive, adaptive, and intelligent. The theme responds to creation
 * events, user interactions, and the generative substrate itself.
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

export interface GenerativeTheme {
  // Color palette derived from seed
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    glow: string;
  };
  
  // Typography
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      bold: number;
    };
  };
  
  // Spacing
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  // Animation
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
      organic: string;
    };
  };
  
  // Effects
  effects: {
    glow: string;
    shadow: string;
    blur: string;
    grain: string;
  };
  
  // Particle system configuration
  particles: {
    count: number;
    speed: number;
    size: number;
    opacity: number;
  };
}

/**
 * Generate a color palette from a seed hash
 */
function generateColorPalette(_hash: string, rng: () => number): GenerativeTheme['colors'] {
  // Generate hue from hash (0-360)
  const hue = Math.floor(rng() * 360);
  
  // Generate saturation and lightness
  const saturation = 60 + Math.floor(rng() * 30); // 60-90%
  const lightness = 45 + Math.floor(rng() * 20); // 45-65%
  
  // Generate complementary and analogous colors
  const complementaryHue = (hue + 180) % 360;
  const analogousHue1 = (hue + 30) % 360;
  
  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): string => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  
  return {
    primary: hslToHex(hue, saturation, lightness),
    secondary: hslToHex(complementaryHue, saturation - 10, lightness - 5),
    accent: hslToHex(analogousHue1, saturation + 10, lightness + 10),
    background: hslToHex(hue, 20, 8),
    surface: hslToHex(hue, 15, 12),
    text: hslToHex(hue, 10, 90),
    textSecondary: hslToHex(hue, 10, 70),
    border: hslToHex(hue, 15, 20),
    glow: hslToHex(hue, saturation, lightness + 20),
  };
}

/**
 * Generate typography settings from seed
 */
function generateTypography(rng: () => number): GenerativeTheme['typography'] {
  const fonts = [
    'Inter, system-ui, sans-serif',
    'Space Grotesk, system-ui, sans-serif',
    'JetBrains Mono, monospace',
    'SF Pro Display, system-ui, sans-serif',
  ];
  
  return {
    fontFamily: fonts[Math.floor(rng() * fonts.length)],
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  };
}

/**
 * Generate spacing scale from seed
 */
function generateSpacing(rng: () => number): GenerativeTheme['spacing'] {
  const base = 4 + Math.floor(rng() * 4); // 4-8px base unit
  
  return {
    xs: `${base}px`,
    sm: `${base * 2}px`,
    md: `${base * 3}px`,
    lg: `${base * 4}px`,
    xl: `${base * 6}px`,
  };
}

/**
 * Generate animation settings from seed
 */
function generateAnimation(rng: () => number): GenerativeTheme['animation'] {
  const baseDuration = 200 + Math.floor(rng() * 300); // 200-500ms
  
  return {
    duration: {
      fast: `${baseDuration * 0.5}ms`,
      normal: `${baseDuration}ms`,
      slow: `${baseDuration * 2}ms`,
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      organic: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  };
}

/**
 * Generate visual effects from seed
 */
function generateEffects(rng: () => number): GenerativeTheme['effects'] {
  const glowIntensity = 10 + Math.floor(rng() * 20); // 10-30px
  const blurAmount = 4 + Math.floor(rng() * 8); // 4-12px
  const grainOpacity = 0.02 + rng() * 0.04; // 2-6%
  
  return {
    glow: `0 0 ${glowIntensity}px var(--theme-glow)`,
    shadow: `0 4px 24px rgba(0, 0, 0, 0.4)`,
    blur: `${blurAmount}px`,
    grain: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${grainOpacity}'/%3E%3C/svg%3E")`,
  };
}

/**
 * Generate particle system configuration from seed
 */
function generateParticles(rng: () => number): GenerativeTheme['particles'] {
  return {
    count: 50 + Math.floor(rng() * 100), // 50-150 particles
    speed: 0.5 + rng() * 1.5, // 0.5-2.0 speed multiplier
    size: 1 + rng() * 3, // 1-4px particle size
    opacity: 0.1 + rng() * 0.3, // 10-40% opacity
  };
}

/**
 * Generate a complete generative theme from a seed
 */
export function generateTheme(seed: Seed): GenerativeTheme {
  const hash = seed.$hash || seed.id || 'default';
  const rng = rngFromHash(hash);
  const rngFn = () => rng.nextF64();
  
  return {
    colors: generateColorPalette(hash, rngFn),
    typography: generateTypography(rngFn),
    spacing: generateSpacing(rngFn),
    animation: generateAnimation(rngFn),
    effects: generateEffects(rngFn),
    particles: generateParticles(rngFn),
  };
}

/**
 * Apply a generative theme to the document
 */
export function applyTheme(theme: GenerativeTheme): void {
  const root = document.documentElement;
  
  // Apply colors
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-background', theme.colors.background);
  root.style.setProperty('--theme-surface', theme.colors.surface);
  root.style.setProperty('--theme-text', theme.colors.text);
  root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-glow', theme.colors.glow);
  
  // Apply typography
  root.style.setProperty('--theme-font-family', theme.typography.fontFamily);
  root.style.setProperty('--theme-font-size-xs', theme.typography.fontSize.xs);
  root.style.setProperty('--theme-font-size-sm', theme.typography.fontSize.sm);
  root.style.setProperty('--theme-font-size-base', theme.typography.fontSize.base);
  root.style.setProperty('--theme-font-size-lg', theme.typography.fontSize.lg);
  root.style.setProperty('--theme-font-size-xl', theme.typography.fontSize.xl);
  
  // Apply spacing
  root.style.setProperty('--theme-spacing-xs', theme.spacing.xs);
  root.style.setProperty('--theme-spacing-sm', theme.spacing.sm);
  root.style.setProperty('--theme-spacing-md', theme.spacing.md);
  root.style.setProperty('--theme-spacing-lg', theme.spacing.lg);
  root.style.setProperty('--theme-spacing-xl', theme.spacing.xl);
  
  // Apply animation
  root.style.setProperty('--theme-duration-fast', theme.animation.duration.fast);
  root.style.setProperty('--theme-duration-normal', theme.animation.duration.normal);
  root.style.setProperty('--theme-duration-slow', theme.animation.duration.slow);
  root.style.setProperty('--theme-easing-linear', theme.animation.easing.linear);
  root.style.setProperty('--theme-easing-ease-in', theme.animation.easing.easeIn);
  root.style.setProperty('--theme-easing-ease-out', theme.animation.easing.easeOut);
  root.style.setProperty('--theme-easing-ease-in-out', theme.animation.easing.easeInOut);
  root.style.setProperty('--theme-easing-organic', theme.animation.easing.organic);
  
  // Apply effects
  root.style.setProperty('--theme-glow', theme.effects.glow);
  root.style.setProperty('--theme-shadow', theme.effects.shadow);
  root.style.setProperty('--theme-blur', theme.effects.blur);
  root.style.setProperty('--theme-grain', theme.effects.grain);
  
  // Apply particle config
  root.style.setProperty('--theme-particle-count', theme.particles.count.toString());
  root.style.setProperty('--theme-particle-speed', theme.particles.speed.toString());
  root.style.setProperty('--theme-particle-size', theme.particles.size.toString());
  root.style.setProperty('--theme-particle-opacity', theme.particles.opacity.toString());
}

/**
 * Create a theme transition effect
 */
export function transitionTheme(_fromTheme: GenerativeTheme, toTheme: GenerativeTheme, duration: number = 1000): void {
  const root = document.documentElement;
  
  // Enable smooth transitions
  root.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  
  // Apply new theme
  applyTheme(toTheme);
  
  // Remove transition after animation
  setTimeout(() => {
    root.style.transition = '';
  }, duration);
}
