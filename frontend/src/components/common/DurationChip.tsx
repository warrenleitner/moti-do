import { Chip } from '@mui/material';
import { type Duration, Duration as DurationValues, DurationLabel, DurationEmoji } from '../../types';

interface DurationChipProps {
  duration: Duration;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const durationColors: Record<Duration, string> = {
  [DurationValues.MINUSCULE]: '#4CAF50', // Green - quick tasks
  [DurationValues.SHORT]: '#8BC34A',      // Light green
  [DurationValues.MEDIUM]: '#FFEB3B',     // Yellow
  [DurationValues.LONG]: '#FF9800',       // Orange
  [DurationValues.ODYSSEYAN]: '#9C27B0',  // Purple - epic tasks
};

export default function DurationChip({
  duration,
  size = 'small',
  showLabel = true,
}: DurationChipProps) {
  const emoji = DurationEmoji[duration];
  const label = showLabel ? `${emoji} ${DurationLabel[duration]}` : emoji;
  const color = durationColors[duration];

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 500,
        '& .MuiChip-label': {
          px: showLabel ? 1 : 0.5,
        },
      }}
    />
  );
}
