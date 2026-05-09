/**
 * PARADIGM DESIGN SYSTEM TOKENS
 * 
 * Design tokens for the visual foundation of Paradigm Studio Pro
 * Follows CSS custom properties for theming
 */

export const tokens = {
  // ─────────────────────────────────────────────────────────────────────────
  // COLORS
  // ─────────────────────────────────────────────────────────────────────────
  colors: {
    // Primary - Genesis theme
    primary: {
      deepSpace: '#0A0A1A',
      nebula: '#4A00E0',
      genesisGreen: '#00FF88',
    },
    
    // Secondary
    secondary: {
      mutationOrange: '#FF6B35',
      evolutionGold: '#FFD700',
      dataBlue: '#00D9FF',
    },
    
    // Neutral
    neutral: {
      surface: '#1A1A2E',
      surfaceHover: '#252540',
      surfaceActive: '#2A2A4A',
      border: '#2A2A4A',
      borderFocus: '#4A00E0',
      text: '#E8E8FF',
      textMuted: '#A0A0C0',
      textDisabled: '#606080',
    },
    
    // Semantic
    semantic: {
      success: '#00FF88',
      warning: '#FF6B35',
      error: '#FF4444',
      info: '#00D9FF',
    },
    
    // Gradients
    gradient: {
      genesis: 'linear-gradient(135deg, #4A00E0 0%, #0A0A1A 100%)',
      nebula: 'radial-gradient(ellipse at top, #4A00E0 0%, #0A0A1A 70%)',
      evolution: 'linear-gradient(180deg, #00FF88 0%, #4A00E0 100%)',
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────────────────────────────────────
  typography: {
    fontFamily: {
      heading: '"JetBrains Mono", monospace',
      body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      code: '"Fira Code", monospace',
      mono: '"IBM Plex Mono", monospace',
    },
    
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',       // 48px
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SPACING
  // ─────────────────────────────────────────────────────────────────────────
  spacing: {
    '0': '0',
    '1': '0.25rem',   // 4px
    '2': '0.5rem',    // 8px
    '3': '0.75rem',   // 12px
    '4': '1rem',      // 16px
    '5': '1.25rem',   // 20px
    '6': '1.5rem',    // 24px
    '8': '2rem',      // 32px
    '10': '2.5rem',   // 40px
    '12': '3rem',     // 48px
    '16': '4rem',     // 64px
    '20': '5rem',     // 80px
    '24': '6rem',     // 96px
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SIZING
  // ─────────────────────────────────────────────────────────────────────────
  sizing: {
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      base: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      '2xl': '1.5rem',
      full: '9999px',
    },
    
    borderWidth: {
      '0': '0',
      '1': '1px',
      '2': '2px',
      '4': '4px',
    },
    
    shadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      glow: '0 0 20px rgba(74, 0, 224, 0.5)',
      genesis: '0 0 30px rgba(0, 255, 136, 0.3)',
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ANIMATION
  // ─────────────────────────────────────────────────────────────────────────
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
    },
    
    easing: {
      base: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // Z-INDEX
  // ─────────────────────────────────────────────────────────────────────────
  zIndex: {
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BREAKPOINTS
  // ─────────────────────────────────────────────────────────────────────────
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// CSS CUSTOM PROPERTIES OUTPUT
// ─────────────────────────────────────────────────────────────────────────

export function generateCSSVariables(): string {
  const vars: string[] = [];
  
  // Colors
  Object.entries(tokens.colors.primary).forEach(([key, value]) => {
    vars.push(`--color-primary-${key}: ${value};`);
  });
  
  Object.entries(tokens.colors.secondary).forEach(([key, value]) => {
    vars.push(`--color-secondary-${key}: ${value};`);
  });
  
  Object.entries(tokens.colors.neutral).forEach(([key, value]) => {
    vars.push(`--color-neutral-${key}: ${value};`);
  });
  
  Object.entries(tokens.colors.semantic).forEach(([key, value]) => {
    vars.push(`--color-semantic-${key}: ${value};`);
  });
  
  Object.entries(tokens.colors.gradient).forEach(([key, value]) => {
    vars.push(`--gradient-${key}: ${value};`);
  });
  
  // Typography
  Object.entries(tokens.typography.fontFamily).forEach(([key, value]) => {
    vars.push(`--font-${key}: ${value};`);
  });
  
  Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
    vars.push(`--font-size-${key}: ${value};`);
  });
  
  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    vars.push(`--spacing-${key}: ${value};`);
  });
  
  // Shadows
  Object.entries(tokens.sizing.shadow).forEach(([key, value]) => {
    vars.push(`--shadow-${key}: ${value};`);
  });
  
  return `:root {\n  ${vars.join('\n  ')}\n}`;
}

// Export as CSS module
export default tokens;