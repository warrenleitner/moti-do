import { Chip } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { type Duration, DurationLabel } from '../../types';

interface DurationChipProps {
  duration: Duration;
  size?: 'small' | 'medium';
}

export default function DurationChip({ duration, size = 'small' }: DurationChipProps) {
  return (
    <Chip
      icon={<AccessTime sx={{ fontSize: size === 'small' ? 14 : 18 }} />}
      label={DurationLabel[duration]}
      size={size}
      variant="outlined"
      sx={{
        color: 'text.secondary',
        borderColor: 'divider',
      }}
    />
  );
}
