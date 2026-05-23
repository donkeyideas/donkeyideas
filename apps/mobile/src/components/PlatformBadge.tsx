import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PlatformBadgeProps {
  platform: 'PLAY' | 'iOS' | string;
  size?: number;
  appleColor?: string;
}

// Google Play — authentic 4-colour triangle. The four sub-paths are the
// standard Material google-play icon split into its colour segments.
function GooglePlayIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* left spine — blue */}
      <Path
        d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5Z"
        fill="#00A0FF"
      />
      {/* bottom-right — red */}
      <Path
        d="M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12Z"
        fill="#FF3D2E"
      />
      {/* tip — yellow */}
      <Path
        d="M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81Z"
        fill="#FFCE00"
      />
      {/* top-right — green */}
      <Path
        d="M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"
        fill="#00C853"
      />
    </Svg>
  );
}

// Apple — classic monochrome silhouette.
function AppleIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M17.543 12.65c-.014-2.354 1.92-3.484 2.008-3.54-1.092-1.596-2.792-1.814-3.4-1.84-1.45-.146-2.83.854-3.566.854-.736 0-1.872-.832-3.078-.81-1.586.024-3.046.92-3.862 2.34-1.646 2.86-.422 7.098 1.18 9.42.784 1.136 1.72 2.412 2.946 2.366 1.18-.048 1.626-.764 3.054-.764 1.428 0 1.83.764 3.08.74 1.27-.024 2.074-1.158 2.852-2.298.898-1.318 1.27-2.594 1.29-2.66-.028-.014-2.476-.952-2.502-3.772M15.296 5.62c.652-.79 1.092-1.886.972-2.978-.94.038-2.076.626-2.75 1.414-.604.7-1.132 1.816-.99 2.888 1.048.082 2.116-.534 2.768-1.324"
        fill={color}
      />
    </Svg>
  );
}

export function PlatformBadge({ platform, size = 14, appleColor = '#1f1d1a' }: PlatformBadgeProps) {
  if (platform === 'iOS') {
    return <AppleIcon size={size} color={appleColor} />;
  }
  return <GooglePlayIcon size={size} />;
}
