import type { ReactNode } from 'react';

interface DataBadgeProps {
  value: string | number;
  color?: 'cyan' | 'magenta' | 'amber' | 'muted';
  icon?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap = {
  cyan: {
    bg: 'rgba(129, 236, 255, 0.1)',
    border: 'rgba(129, 236, 255, 0.3)',
    text: '#81ecff',
  },
  magenta: {
    bg: 'rgba(255, 107, 155, 0.1)',
    border: 'rgba(255, 107, 155, 0.3)',
    text: '#ff6b9b',
  },
  amber: {
    bg: 'rgba(255, 199, 117, 0.1)',
    border: 'rgba(255, 199, 117, 0.3)',
    text: '#FFC775',
  },
  muted: {
    bg: 'rgba(69, 71, 82, 0.1)',
    border: 'rgba(69, 71, 82, 0.3)',
    text: '#a8aab7',
  },
};

export function DataBadge({
  value,
  color = 'cyan',
  icon,
  size = 'sm',
  className = '',
}: DataBadgeProps) {
  const colors = colorMap[color];
  const fontSize = size === 'sm' ? '0.6875rem' : '0.8125rem';
  const padding = size === 'sm' ? '2px 6px' : '4px 10px';

  return (
    <span
      className={`font-data ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize,
        fontWeight: 600,
        padding,
        letterSpacing: '0.05em',
        lineHeight: 1.2,
      }}
    >
      {icon}
      {value}
    </span>
  );
}
