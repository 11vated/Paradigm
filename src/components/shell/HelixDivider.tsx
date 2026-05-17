import { useState } from 'react';

interface HelixDividerProps {
  orientation?: 'horizontal' | 'vertical';
}

export function HelixDivider({ orientation = 'horizontal' }: HelixDividerProps) {
  const [hovered, setHovered] = useState(false);
  const isHoriz = orientation === 'horizontal';
  const size = isHoriz ? { w: '100%', h: 6 } : { w: 6, h: '100%' };
  const viewBox = isHoriz ? '0 0 100 6' : '0 0 6 100';

  const strand1 = isHoriz
    ? 'M0,3 Q12.5,0 25,3 T50,3 T75,3 T100,3'
    : 'M3,0 Q0,12.5 3,25 T3,50 T3,75 T3,100';
  const strand2 = isHoriz
    ? 'M0,3 Q12.5,6 25,3 T50,3 T75,3 T100,3'
    : 'M3,0 Q6,12.5 3,25 T3,50 T3,75 T3,100';

  return (
    <div
      className={`relative flex-shrink-0 cursor-${isHoriz ? 'row' : 'col'}-resize`}
      style={{
        width: size.w,
        height: size.h,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox={viewBox}
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <path
          d={strand1}
          fill="none"
          stroke="rgba(0, 229, 255, 0.25)"
          strokeWidth={0.5}
          style={{
            transform: hovered ? 'translateY(-1px)' : 'none',
            transition: 'transform var(--p-dur-base) var(--p-ease-organic)',
          }}
        />
        <path
          d={strand2}
          fill="none"
          stroke="rgba(138, 43, 226, 0.25)"
          strokeWidth={0.5}
          style={{
            transform: hovered ? 'translateY(1px)' : 'none',
            transition: 'transform var(--p-dur-base) var(--p-ease-organic)',
          }}
        />
      </svg>
    </div>
  );
}
