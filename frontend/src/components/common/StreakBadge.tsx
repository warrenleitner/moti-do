import { Text, Tooltip, Box } from '@mantine/core';
import { IconFlame } from '@tabler/icons-react';

interface StreakBadgeProps {
  current: number;
  best: number;
  showBest?: boolean;
}

export default function StreakBadge({ current, best, showBest = true }: StreakBadgeProps) {
  // Color based on streak length
  const getStreakColor = (streak: number) => {
    if (streak >= 30) return '#ff5722'; // Deep orange for 30+
    if (streak >= 14) return '#ff9800'; // Orange for 14+
    if (streak >= 7) return '#ffc107'; // Amber for 7+
    if (streak >= 3) return '#ffeb3b'; // Yellow for 3+
    return '#9e9e9e'; // Grey for < 3
  };

  const color = getStreakColor(current);

  return (
    <Tooltip label={showBest ? `Current: ${current} | Best: ${best}` : `${current} day streak`}>
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 2,
          paddingBottom: 2,
          borderRadius: 4,
          backgroundColor: `${color}20`,
        }}
      >
        <IconFlame size={18} color={color} />
        <Text size="sm" fw={500} style={{ color }}>
          {current}
        </Text>
        {showBest && current < best && (
          <Text size="xs" c="dimmed">
            / {best}
          </Text>
        )}
      </Box>
    </Tooltip>
  );
}
