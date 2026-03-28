import type { ReactNode, CSSProperties } from 'react';

interface GlowCardProps {
  children: ReactNode;
  accentColor?: 'cyan' | 'magenta' | 'amber' | 'none';
  accentPosition?: 'left' | 'bottom' | 'top';
  elevated?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  'data-testid'?: string;
}

const accentColorMap = {
  cyan: '#81ecff',
  magenta: '#ff6b9b',
  amber: '#FFC775',
  none: 'transparent',
};

export function GlowCard({
  children,
  accentColor = 'none',
  accentPosition = 'left',
  elevated = false,
  className = '',
  style,
  onClick,
  ...rest
}: GlowCardProps) {
  const bg = elevated ? '#272A34' : '#10131C';
  const borderStyle =
    accentColor !== 'none'
      ? {
          [`border${accentPosition.charAt(0).toUpperCase() + accentPosition.slice(1)}`]:
            `4px solid ${accentColorMap[accentColor]}`,
        }
      : {};

  return (
    <div
      className={`ghost-border ${className}`}
      style={{
        backgroundColor: bg,
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
        padding: '1rem',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        cursor: onClick ? 'pointer' : undefined,
        ...borderStyle,
        ...style,
      }}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
