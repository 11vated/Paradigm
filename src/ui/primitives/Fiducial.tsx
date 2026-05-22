/**
 * Fiducial — corner alignment markers.
 *
 * Wraps a relative-positioned container in 4 hairline brackets to
 * communicate "this surface is calibrated / alive." Pure decoration,
 * but it carries the Reality OS instrumentation feel.
 */
import React from 'react';

interface FiducialProps {
  corners?: Array<'tl' | 'tr' | 'bl' | 'br'>;
}

export const Fiducial: React.FC<FiducialProps> = ({
  corners = ['tl', 'tr', 'bl', 'br'],
}) => (
  <>
    {corners.map((c) => (
      <span key={c} className="r-fiducial" data-corner={c} aria-hidden />
    ))}
  </>
);
