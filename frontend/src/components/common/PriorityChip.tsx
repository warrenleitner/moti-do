import { Chip } from '@mui/material';
import { type Priority, PriorityEmoji } from '../../types';

interface PriorityChipProps {
  priority: Priority;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

const priorityColors: Record<Priority, string> = {
  trivial: '#9e9e9e',
  low: '#2196f3',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f',
};

const priorityLabels: Record<Priority, string> = {
  trivial: 'Trivial',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export default function PriorityChip({
  priority,
  size = 'small',
  showLabel = true,
}: PriorityChipProps) {
  const emoji = PriorityEmoji[priority];
  const label = showLabel ? `${emoji} ${priorityLabels[priority]}` : emoji;
  const color = priorityColors[priority];

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
