import { Group, Text } from '../../ui';
import { IconTrophy } from '../../ui/icons';

interface XPDisplayProps {
  xp: number;
  variant?: string;
  color?: string;
}

export default function XPDisplay({ xp, color }: XPDisplayProps) {
  return (
    <Group gap={4}>
      <IconTrophy size={16} color={color ? `var(--mantine-color-${color}-6)` : undefined} />
      <Text size="sm" fw={500} c={color}>
        {xp} XP
      </Text>
    </Group>
  );
}
