import { Modal, Text, Group, Button, Stack } from '@mantine/core';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

// Map MUI color names to Mantine colors
const colorMap: Record<string, string> = {
  primary: 'blue',
  secondary: 'violet',
  error: 'red',
  warning: 'yellow',
  info: 'cyan',
  success: 'green',
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal opened={open} onClose={onCancel} title={title} size="xs" centered>
      <Stack>
        <Text c="dimmed">{message}</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button color={colorMap[confirmColor]} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
