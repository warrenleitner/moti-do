import type { ReactNode } from 'react';
import { Progress } from '@mantine/core';

interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: 'cyan' | 'magenta' | 'amber';
  progress?: number;
  icon?: ReactNode;
  className?: string;
}

const colorMap = {
  cyan: { accent: '#00E5FF', glow: 'rgba(0, 229, 255, 0.3)' },
  magenta: { accent: '#FF007F', glow: 'rgba(255, 0, 127, 0.3)' },
  amber: { accent: '#FFC775', glow: 'rgba(255, 199, 117, 0.3)' },
};

export function StatCard({
  label,
  value,
  accentColor = 'cyan',
  progress,
  icon,
  className = '',
}: StatCardProps) {
  const colors = colorMap[accentColor];

  return (
    <div
      className={`ghost-border ${className}`}
      style={{
        backgroundColor: '#10131C',
        padding: '1rem',
        borderBottom: `2px solid ${colors.accent}`,
      }}
    >
      <div className="micro-meta" style={{ marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {icon}
        <span
          className="font-display"
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: '#E0E0E0',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      {progress !== undefined && (
        <Progress
          value={progress}
          color={colors.accent}
          size={4}
          mt="sm"
          radius={0}
          styles={{
            root: { backgroundColor: '#272A34' },
            section: { boxShadow: `0 0 8px ${colors.glow}` },
          }}
        />
      )}
    </div>
  );
}
