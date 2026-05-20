/**
 * FriendAvatar — renders a Friend's stylized SVG portrait inline.
 *
 * The Friend artifact contains a deterministic SVG (256x256) as a string.
 * This component renders it directly via dangerouslySetInnerHTML, since
 * the SVG is fully under our control (no user input flows into it).
 *
 * Optional decoration: an animated subtle "breathing" pulse driven by
 * the persona vector's energy dimension.
 */

import React, { useMemo } from 'react';
import type { FriendArtifact } from '@/lib/friend';

interface FriendAvatarProps {
  artifact: FriendArtifact | null;
  size?: number;
  animated?: boolean;
  className?: string;
}

export const FriendAvatar: React.FC<FriendAvatarProps> = ({
  artifact,
  size = 256,
  animated = true,
  className = '',
}) => {
  // Strip the fixed width/height on the inline SVG so it scales by CSS.
  const svgInline = useMemo(() => {
    if (!artifact) return '';
    return artifact.phenotype.portraitSvg.replace(
      / width="256" height="256"/,
      ' width="100%" height="100%" viewBox="0 0 256 256"',
    );
  }, [artifact]);

  // Use persona "warmth" + "energy" as visual hints.
  const aura = useMemo(() => {
    if (!artifact) return null;
    const v = artifact.personaVector;
    const energy = v[3] ?? 0.5; // index 3 = expressiveness/energy
    const warmth = v[1] ?? 0.5; // index 1 = warmth
    return { energy, warmth };
  }, [artifact]);

  if (!artifact) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-900 border border-neutral-800 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider">
          No friend
        </span>
      </div>
    );
  }

  // Aura: a subtle outer ring whose color and pulse rate reflect persona.
  const ringHue = Math.round((aura?.warmth ?? 0.5) * 60); // 0 (cool) → 60 (warm)
  const pulseDuration = animated
    ? Math.max(1.4, 4 - (aura?.energy ?? 0.5) * 2)
    : 0;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {animated && pulseDuration > 0 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 0 1px hsl(${ringHue}, 60%, 50%, 0.3),
                        0 0 ${size * 0.15}px hsl(${ringHue}, 70%, 55%, 0.18)`,
            animation: `friend-pulse ${pulseDuration}s ease-in-out infinite`,
          }}
        />
      )}

      <div
        className="relative w-full h-full rounded-md overflow-hidden border border-neutral-800"
        // SVG is server-generated from our own code — safe to inline.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svgInline }}
      />

      {animated && (
        <style>{`
          @keyframes friend-pulse {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%      { opacity: 1.00; transform: scale(1.015); }
          }
        `}</style>
      )}
    </div>
  );
};

export default FriendAvatar;
