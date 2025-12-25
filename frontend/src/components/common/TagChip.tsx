import { Badge, CloseButton } from '@mantine/core';
import { IconTag } from '@tabler/icons-react';

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
  const mantineSize = size === 'small' ? 'sm' : 'md';

  return (
    <Badge
      size={mantineSize}
      variant="light"
      color={color ? undefined : 'gray'}
      leftSection={<IconTag size={size === 'small' ? 12 : 14} />}
      rightSection={
        onDelete ? (
          <CloseButton
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Remove ${tag}`}
          />
        ) : undefined
      }
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...(color ? { backgroundColor: `${color}20`, color: color } : {}),
      }}
    >
      {tag}
    </Badge>
  );
}
