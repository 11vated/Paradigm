/**
 * Spectrum Module — Phase 3 Implementation
 * 
 * Electromagnetic spectrum visualization, composition, and theming
 */

export { EMSpectrumRenderer, EM_BANDS, createEMSpectrumRenderer } from './em-spectrum-renderer';
export type { EMBand, SpectrumConfig } from './em-spectrum-renderer';

export { SpectrumComposer, createSpectrumComposer } from './spectrum-composition';
export type { SpectralSignature, MultiSpectralSeed } from './spectrum-composition';

export { SpectrumThemer, createSpectrumThemer } from './spectrum-theming';
export type { SpectrumTheme } from './spectrum-theming';
