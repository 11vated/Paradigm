import { useReducedMotion } from 'framer-motion';

interface GlassPanelProps {
  children: React.ReactNode;
  domain?: string;
  padded?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DOMAIN_BORDER: Record<string, string> = {
  character: '#00E5FF',
  music: '#8B5CF6',
  sprite: '#10B981',
  visual2d: '#06B6D4',
  game: '#FB923C',
  agent: '#FF6B6B',
  architecture: '#A855F7',
  vehicle: '#22D3EE',
  circuit: '#4ADE80',
  narrative: '#F59E0B',
  shader: '#D946EF',
};

export function GlassPanel({
  children,
  domain,
  padded = true,
  className = '',
  style,
}: GlassPanelProps) {
  const reducedMotion = useReducedMotion();
  const hueColor = domain ? DOMAIN_BORDER[domain] : undefined;

  return (
    <div
      className={`p-glass ${padded ? 'p-4' : ''} ${className}`}
      style={{
        fontFamily: 'var(--p-font-ui)',
        color: 'var(--p-text)',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        borderColor: hueColor ?? undefined,
        boxShadow: hueColor
          ? `0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), 0 0 12px ${hueColor}15`
          : undefined,
        transition: reducedMotion ? 'none' : 'border-color var(--p-dur-base) var(--p-ease-organic), box-shadow var(--p-dur-base) var(--p-ease-organic)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
