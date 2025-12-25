import { Badge } from '@mantine/core';
import { type Priority, Priority as PriorityValues, PriorityEmoji } from '../../types';

interface PriorityChipProps {
  priority: Priority;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const priorityColors: Record<Priority, string> = {
  [PriorityValues.TRIVIAL]: '#00BCD4',
  [PriorityValues.LOW]: '#4CAF50',
  [PriorityValues.MEDIUM]: '#FFEB3B',
  [PriorityValues.HIGH]: '#FF9800',
  [PriorityValues.DEFCON_ONE]: '#f44336',
};

const priorityLabels: Record<Priority, string> = {
  [PriorityValues.TRIVIAL]: 'Trivial',
  [PriorityValues.LOW]: 'Low',
  [PriorityValues.MEDIUM]: 'Medium',
  [PriorityValues.HIGH]: 'High',
  [PriorityValues.DEFCON_ONE]: 'Defcon One',
};

export default function PriorityChip({
  priority,
  size = 'small',
  showLabel = true,
}: PriorityChipProps) {
  const emoji = PriorityEmoji[priority];
  const label = showLabel ? `${emoji} ${priorityLabels[priority]}` : emoji;
  const color = priorityColors[priority];
  const mantineSize = size === 'small' ? 'sm' : 'md';

  return (
    <Badge
      size={mantineSize}
      variant="light"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        fontWeight: 500,
      }}
    >
      {label}
    </Badge>
  );
}
