import { Box, Typography, Tooltip } from '@mui/material';
import { LocalFireDepartment } from '@mui/icons-material';

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
    <Tooltip title={showBest ? `Current: ${current} | Best: ${best}` : `${current} day streak`}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          backgroundColor: `${color}20`,
        }}
      >
        <LocalFireDepartment sx={{ fontSize: 18, color }} />
        <Typography variant="body2" fontWeight="medium" sx={{ color }}>
          {current}
        </Typography>
        {showBest && current < best && (
          <Typography variant="caption" color="text.secondary">
            / {best}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
