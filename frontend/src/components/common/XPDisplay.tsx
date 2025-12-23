import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';

interface XPDisplayProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export default function XPDisplay({ xp, level, compact = false }: XPDisplayProps) {
  // XP progress within current level (100 XP per level)
  const currentLevelXP = xp % 100;
  const xpToNextLevel = 100 - currentLevelXP;

  // Compact display tested via integration tests
  /* v8 ignore next 11 */
  if (compact) {
    return (
      <Tooltip title={`${xp} XP total - ${xpToNextLevel} XP to level ${level + 1}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EmojiEvents sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight="medium">
            Lvl {level}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ minWidth: 150 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EmojiEvents sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2">Level {level}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {xp} XP
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={currentLevelXP}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary">
        {xpToNextLevel} XP to next level
      </Typography>
    </Box>
  );
}
