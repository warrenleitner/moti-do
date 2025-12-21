import { Chip } from '@mui/material';
import { type Duration, DurationLabel, DurationEmoji } from '../../types';

interface DurationChipProps {
  duration: Duration;
  size?: 'small' | 'medium';
}

export default function DurationChip({ duration, size = 'small' }: DurationChipProps) {
  return (
    <Chip
      label={`${DurationEmoji[duration]} ${DurationLabel[duration]}`}
      size={size}
      variant="outlined"
      sx={{
        color: 'text.secondary',
        borderColor: 'divider',
      }}
    />
  );
}
