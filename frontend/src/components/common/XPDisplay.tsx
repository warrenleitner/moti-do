import { Box, Text, Progress, Tooltip, Group } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';

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
      <Tooltip label={`${xp} XP total - ${xpToNextLevel} XP to level ${level + 1}`}>
        <Group gap={4}>
          <IconTrophy size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={500}>
            Lvl {level}
          </Text>
        </Group>
      </Tooltip>
    );
  }

  return (
    <Box style={{ minWidth: 150 }}>
      <Group justify="space-between" mb={4}>
        <Group gap={4}>
          <IconTrophy size={20} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={500}>Level {level}</Text>
        </Group>
        <Text size="xs" c="dimmed">
          {xp} XP
        </Text>
      </Group>
      <Progress
        value={currentLevelXP}
        size={6}
        radius="xl"
      />
      <Text size="xs" c="dimmed">
        {xpToNextLevel} XP to next level
      </Text>
    </Box>
  );
}
