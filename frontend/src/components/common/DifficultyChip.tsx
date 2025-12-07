import { Chip } from '@mui/material';
import { type Difficulty, DifficultyLabel } from '../../types';

interface DifficultyChipProps {
  difficulty: Difficulty;
  size?: 'small' | 'medium';
}

const difficultyColors: Record<Difficulty, string> = {
  trivial: '#9e9e9e',
  easy: '#4caf50',
  medium: '#ff9800',
  hard: '#f44336',
  extreme: '#9c27b0',
};

const difficultyIcons: Record<Difficulty, string> = {
  trivial: '○',
  easy: '●',
  medium: '●●',
  hard: '●●●',
  extreme: '★',
};

export default function DifficultyChip({
  difficulty,
  size = 'small',
}: DifficultyChipProps) {
  const label = `${difficultyIcons[difficulty]} ${DifficultyLabel[difficulty]}`;
  const color = difficultyColors[difficulty];

  return (
    <Chip
      label={label}
      size={size}
      variant="outlined"
      sx={{
        borderColor: color,
        color: color,
        fontWeight: 500,
      }}
    />
  );
}
