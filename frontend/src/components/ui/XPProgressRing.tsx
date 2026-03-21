import type { CSSProperties } from 'react';

interface XPProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  glowColor?: string;
}

export function XPProgressRing({
  size = 192,
  strokeWidth = 8,
  progress,
  color = '#00E5FF',
  trackColor = '#272A34',
  label,
  sublabel,
  glowColor,
}: XPProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  const center = size / 2;

  const glowStyle: CSSProperties = glowColor
    ? { filter: `drop-shadow(0 0 6px ${glowColor})` }
    : {};

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', ...glowStyle }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Center content */}
      {(label || sublabel) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {label && (
            <span
              className="font-display"
              style={{
                fontSize: size * 0.18,
                fontWeight: 700,
                color: '#E0E0E0',
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className="font-data micro-meta"
              style={{ fontSize: size * 0.07, marginTop: 4 }}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
