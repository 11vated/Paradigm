export { default as ThreeViewport } from './ThreeViewport';
export { default as SvgViewport } from './SvgViewport';
export { default as AudioViewport } from './AudioViewport';
export { default as GameViewport } from './GameViewport';
export { default as CodeViewport } from './CodeViewport';
export { default as SimViewport } from './SimViewport';
export { default as AnimViewport } from './AnimViewport';
export { ArtifactInfo } from './OverlayPreviews';
export { default as DomainIcon } from './DomainIcon';
export type { ViewportProps } from './types';

export const VIEWPORT_TYPES: Record<string, string[]> = {
  '3d': ['character', 'geometry3d', 'architecture', 'vehicle', 'furniture', 'fashion', 'robotics'],
  'svg': ['typography', 'visual2d'],
  'audio': ['music', 'audio'],
  'game': ['fullgame', 'game'],
  'code': ['narrative', 'circuit', 'procedural'],
  'sim': ['physics', 'ecosystem', 'alife'],
  'anim': ['animation', 'choreography', 'sprite'],
  '2d': ['ui', 'particle', 'shader', 'food', 'agent'],
};

export function getViewportType(domain?: string): string {
  if (!domain) return '3d';
  for (const [vt, domains] of Object.entries(VIEWPORT_TYPES)) {
    if (domains.includes(domain)) return vt;
  }
  return '3d';
}

export const AVAILABLE_VIEWS = ['hyperobject', '3d', '2d', 'svg', 'audio', 'game', 'code', 'sim', 'anim'];
