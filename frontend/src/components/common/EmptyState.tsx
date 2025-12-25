import type { ReactNode } from 'react';
import { Stack, Text, Title, Button, Box } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" ta="center" py="xl" px="lg">
      <Box c="dimmed" mb="sm">
        {icon || <IconInbox size={64} stroke={1.5} />}
      </Box>
      <Title order={4}>{title}</Title>
      {description && (
        <Text size="sm" c="dimmed" maw={400}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} mt="md">
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}
