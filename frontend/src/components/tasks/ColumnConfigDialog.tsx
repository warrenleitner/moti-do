import React, { useState } from 'react';
import {
  Modal,
  Button,
  Stack,
  Group,
  Checkbox,
  ActionIcon,
  Box,
  Text,
  Divider,
  Paper,
} from '@mantine/core';
import {
  IconGripVertical,
  IconEye,
  IconEyeOff,
  IconRefresh,
} from '@tabler/icons-react';
import type { ColumnConfig } from './TaskTable';

interface ColumnConfigDialogProps {
  open: boolean;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (columns: ColumnConfig[]) => void;
  onReset: () => void;
}

const ColumnConfigDialog: React.FC<ColumnConfigDialogProps> = ({
  open,
  columns,
  onClose,
  onSave,
  onReset,
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Update local state when dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalColumns(columns);
    }
  }, [open, columns]);

  const handleToggleVisible = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    const newColumns = [...localColumns];
    const draggedItem = newColumns[draggedIndex];

    // Remove dragged item
    newColumns.splice(draggedIndex, 1);

    // Insert at new position
    newColumns.splice(index, 0, draggedItem);

    setLocalColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(localColumns);
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const canToggle = (col: ColumnConfig) => {
    // Don't allow hiding these essential columns
    return col.id !== 'select' && col.id !== 'title' && col.id !== 'actions';
  };

  const visibleCount = localColumns.filter((col) => col.visible).length;

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="Configure Columns"
      size="md"
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <Group justify="flex-end">
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleReset}
            size="xs"
            variant="subtle"
          >
            Reset to Default
          </Button>
        </Group>

        <Text size="sm" c="dimmed">
          Drag columns to reorder. Click the eye icon to show/hide columns.
          <br />
          {visibleCount} of {localColumns.length} columns visible
        </Text>

        <Divider />

        <Stack gap="xs">
          {localColumns.map((col, index) => {
            const isEssential = !canToggle(col);

            return (
              <Paper
                key={col.id}
                p="sm"
                withBorder
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  cursor: 'grab',
                  opacity: draggedIndex === index ? 0.5 : 1,
                  backgroundColor: col.visible ? undefined : 'var(--mantine-color-gray-1)',
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <IconGripVertical
                      size={20}
                      style={{ cursor: 'grab', color: 'var(--mantine-color-gray-5)' }}
                    />
                    <Box style={{ opacity: col.visible ? 1 : 0.5 }}>
                      <Text size="sm" fw={500}>
                        {col.label || col.id}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {isEssential
                          ? 'Essential column (always visible)'
                          : col.sortable
                          ? 'Sortable'
                          : ''}
                      </Text>
                    </Box>
                  </Group>

                  <Group gap="xs" wrap="nowrap">
                    <Checkbox
                      checked={col.visible}
                      disabled={isEssential}
                      onChange={() => handleToggleVisible(col.id)}
                      size="sm"
                    />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => handleToggleVisible(col.id)}
                      disabled={isEssential}
                      title={
                        isEssential
                          ? 'This column cannot be hidden'
                          : col.visible
                          ? 'Hide column'
                          : 'Show column'
                      }
                    >
                      {col.visible ? (
                        <IconEye
                          size={18}
                          color={
                            isEssential
                              ? 'var(--mantine-color-gray-4)'
                              : 'var(--mantine-color-blue-6)'
                          }
                        />
                      ) : (
                        <IconEyeOff size={18} color="var(--mantine-color-gray-4)" />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            );
          })}
        </Stack>

        <Paper p="sm" bg="blue.0" radius="sm">
          <Text size="sm" c="blue.9">
            <strong>Tip:</strong> You can sort by multiple columns! Click column headers in the
            table to add them to the sort order. Click again to toggle ascending/descending, or a
            third time to remove from sort.
          </Text>
        </Paper>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ColumnConfigDialog;
