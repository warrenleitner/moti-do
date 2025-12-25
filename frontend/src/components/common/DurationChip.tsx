import { Badge } from '@mantine/core';
import { type Duration, DurationLabel, DurationEmoji } from '../../types';

interface DurationChipProps {
  duration: Duration;
  size?: 'small' | 'medium';
}

export default function DurationChip({ duration, size = 'small' }: DurationChipProps) {
  const mantineSize = size === 'small' ? 'sm' : 'md';

  return (
    <Badge
      size={mantineSize}
      variant="outline"
      color="gray"
    >
      {DurationEmoji[duration]} {DurationLabel[duration]}
    </Badge>
  );
}
