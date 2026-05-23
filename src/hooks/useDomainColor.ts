/**
 * useDomainColor — resolve a domain name to its registered prism color.
 *
 * Reads the CSS custom property `--p-domain-{slug}` from `paradigm-os.css`
 * when the domain is in the registered set; falls back to a deterministic
 * HSL hash so every domain string gets a unique, stable color.
 */

const KNOWN = new Set([
  // Visual + structural
  'visual2d', 'sprite', 'typography', 'shader', 'particle', 'procedural',
  'architecture', 'fashion', 'vehicle', 'circuit',
  // Kinetic + life
  'music', 'audio', 'animation', 'choreography', 'physics',
  'alife', 'ecosystem', 'agent', 'robotics',
  // Narrative + structural
  'character', 'narrative', 'game', 'fullgame', 'ui', 'food',
  // Scientific
  'molecule', 'quantum', 'field', 'cosmology', 'geometry3d',
  // Digital products
  'website', 'app',
  // World + spaces
  'world',
  // Curated inventory domains (data/commons/inventories/*.gspl)
  'algorithm', 'building', 'camera', 'creature', 'cross-domain',
  'fluid', 'framework', 'fx', 'lighting', 'materials', 'plant',
  'scene', 'style', 'weather',
]);

/** Stable per-string HSL via a tiny FNV-1a 32-bit hash. */
function hashHue(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 360;
}

function fallbackColor(domain: string): string {
  return `hsl(${hashHue(domain)}, 60%, 58%)`;
}

export function useDomainColor(domain?: string | null): string {
  const d = (domain ?? '').toLowerCase().trim();
  if (!d) return 'var(--p-domain-default)';
  if (KNOWN.has(d)) return `var(--p-domain-${d})`;
  return fallbackColor(d);
}

/** Non-hook variant — for inline-style consumers. */
export function domainColor(domain?: string | null): string {
  const d = (domain ?? '').toLowerCase().trim();
  if (!d) return 'var(--p-domain-default)';
  if (KNOWN.has(d)) return `var(--p-domain-${d})`;
  return fallbackColor(d);
}
