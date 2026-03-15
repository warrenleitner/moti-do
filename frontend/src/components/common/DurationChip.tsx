import { Badge } from '../../ui';
import { type Duration, DurationLabel, DurationEmoji } from '../../types';

interface DurationChipProps {
  duration: Duration;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export default function DurationChip({
  duration,
  size = 'small',
  showLabel = true,
}: DurationChipProps) {
  const emoji = DurationEmoji[duration];
  const label = showLabel ? `${emoji} ${DurationLabel[duration]}` : emoji;
  const mantineSize = size === 'small' ? 'sm' : 'md';

  return (
    <Badge
      size={mantineSize}
      variant="outline"
      color="gray"
    >
      {label}
    </Badge>
  );
}
