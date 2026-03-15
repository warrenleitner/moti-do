import { Modal, Button, Text, Group, Stack, Table, ScrollArea, Badge } from '../../ui';
import { format } from 'date-fns';
import type { JumpToCurrentInstancePreview } from '../../services/api';

interface JumpToCurrentInstanceDialogProps {
  open: boolean;
  previews: JumpToCurrentInstancePreview[];
  isApplying?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatDateValue(value: string | null): string {
  if (!value) {
    return '—';
  }

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00`;
  return format(new Date(normalizedValue), 'MMM d, yyyy');
}

/* v8 ignore start */
export default function JumpToCurrentInstanceDialog({
  open,
  previews,
  isApplying = false,
  onConfirm,
  onCancel,
}: JumpToCurrentInstanceDialogProps) {
  const applicableCount = previews.filter((preview) => preview.can_apply).length;

  return (
    <Modal
      opened={open}
      onClose={onCancel}
      title="Jump Selected Tasks to Their Current Instance"
      size="lg"
      centered
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Review how each selected recurring task will move forward before you apply the catch-up
          change.
        </Text>

        <ScrollArea>
          <Table fontSize="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Task</Table.Th>
                <Table.Th>Current Start</Table.Th>
                <Table.Th>Current Due</Table.Th>
                <Table.Th>New Start</Table.Th>
                <Table.Th>New Due</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {previews.map((preview) => (
                <Table.Tr key={preview.task_id}>
                  <Table.Td>{preview.title}</Table.Td>
                  <Table.Td>{formatDateValue(preview.current_start_date)}</Table.Td>
                  <Table.Td>{formatDateValue(preview.current_due_date)}</Table.Td>
                  <Table.Td>{formatDateValue(preview.new_start_date)}</Table.Td>
                  <Table.Td>{formatDateValue(preview.new_due_date)}</Table.Td>
                  <Table.Td>
                    {preview.can_apply ? (
                      <Badge color="green" size="sm">
                        Ready
                      </Badge>
                    ) : (
                      <Badge color="gray" size="sm" variant="outline">
                        {preview.reason || 'Skipped'}
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Group justify="space-between" mt="md">
          <Text size="xs" c="dimmed">
            {applicableCount} task{applicableCount === 1 ? '' : 's'} ready to jump
          </Text>
          <Group>
            <Button variant="subtle" onClick={onCancel} disabled={isApplying}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isApplying || applicableCount === 0}>
              Jump Tasks
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
/* v8 ignore stop */
