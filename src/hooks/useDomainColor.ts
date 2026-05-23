/**
 * useDomainColor — resolve a domain name to its registered prism color.
 *
 * Reads the CSS custom property `--p-domain-{slug}` from `paradigm-os.css`.
 * Falls back to `--p-domain-default` for unknown domains. Server-side
 * rendering safe (returns the literal var string).
 */

const KNOWN = new Set([
  'visual2d', 'sprite', 'typography', 'shader', 'particle', 'procedural',
  'architecture', 'fashion', 'vehicle', 'circuit',
  'music', 'audio', 'animation', 'choreography', 'physics',
  'alife', 'ecosystem', 'agent', 'robotics',
  'character', 'narrative', 'game', 'fullgame', 'ui', 'food',
  'molecule', 'quantum', 'field', 'cosmology', 'geometry3d',
  'website', 'app', 'world',
]);

export function useDomainColor(domain?: string | null): string {
  const d = (domain ?? '').toLowerCase().trim();
  if (d && KNOWN.has(d)) return `var(--p-domain-${d})`;
  return 'var(--p-domain-default)';
}

/** Non-hook variant — for inline-style consumers. */
export function domainColor(domain?: string | null): string {
  const d = (domain ?? '').toLowerCase().trim();
  if (d && KNOWN.has(d)) return `var(--p-domain-${d})`;
  return 'var(--p-domain-default)';
}
