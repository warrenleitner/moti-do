import { Chip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';

interface TagChipProps {
  tag: string;
  color?: string;
  size?: 'small' | 'medium';
  onDelete?: () => void;
  onClick?: () => void;
}

export default function TagChip({
  tag,
  color,
  size = 'small',
  onDelete,
  onClick,
}: TagChipProps) {
  return (
    <Chip
      icon={<LocalOffer sx={{ fontSize: size === 'small' ? 14 : 18 }} />}
      label={tag}
      size={size}
      onClick={onClick}
      onDelete={onDelete}
      sx={{
        backgroundColor: color ? `${color}20` : 'action.selected',
        color: color || 'text.primary',
        cursor: onClick ? 'pointer' : 'default',
        // Conditional hover style tested via integration tests
        /* v8 ignore next 1 */
        '&:hover': onClick ? { backgroundColor: color ? `${color}30` : 'action.hover' } : {},
      }}
    />
  );
}
