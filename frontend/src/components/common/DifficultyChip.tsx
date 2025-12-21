import { Chip } from '@mui/material';
import { type Difficulty, Difficulty as DifficultyValues, DifficultyLabel, DifficultyEmoji } from '../../types';

interface DifficultyChipProps {
  difficulty: Difficulty;
  size?: 'small' | 'medium';
}

const difficultyColors: Record<Difficulty, string> = {
  [DifficultyValues.TRIVIAL]: '#00BCD4',
  [DifficultyValues.LOW]: '#4caf50',
  [DifficultyValues.MEDIUM]: '#FFEB3B',
  [DifficultyValues.HIGH]: '#FF9800',
  [DifficultyValues.HERCULEAN]: '#f44336',
};

export default function DifficultyChip({
  difficulty,
  size = 'small',
}: DifficultyChipProps) {
  const label = `${DifficultyEmoji[difficulty]} ${DifficultyLabel[difficulty]}`;
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
