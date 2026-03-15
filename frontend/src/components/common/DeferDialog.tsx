import { useState, useMemo } from 'react';
import { Modal, Button, Radio, Tooltip, Text, Stack, Group, DatePickerInput } from '../../ui';
import type { Task } from '../../types/models';

interface DeferDialogProps {
  open: boolean;
  tasks: Task[];
  onConfirm: (params: { defer_until?: string; defer_to_next_recurrence?: boolean }) => void;
  onCancel: () => void;
}

/* v8 ignore start */
export default function DeferDialog({ open, tasks, onConfirm, onCancel }: DeferDialogProps) {
  const [mode, setMode] = useState<'next_recurrence' | 'specific_date'>('specific_date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const hasRecurringTasks = useMemo(
    () => tasks.some((t) => t.is_habit && t.recurrence_rule),
    [tasks],
  );

  const allRecurring = useMemo(
    () => tasks.length > 0 && tasks.every((t) => t.is_habit && t.recurrence_rule),
    [tasks],
  );

  const handleConfirm = () => {
    if (mode === 'next_recurrence') {
      onConfirm({ defer_to_next_recurrence: true });
    } else if (selectedDate) {
      onConfirm({ defer_until: selectedDate.toISOString().split('T')[0] + ' 00:00:00' });
    }
  };

  const canConfirm =
    (mode === 'next_recurrence' && allRecurring) ||
    (mode === 'specific_date' && selectedDate !== null);

  const handleClose = () => {
    setMode('specific_date');
    setSelectedDate(null);
    onCancel();
  };

  const nextRecurrenceTooltip = !hasRecurringTasks
    ? 'Only available for recurring tasks'
    : !allRecurring
      ? 'Some selected tasks are not recurring'
      : '';

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={`Delay ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
      size="xs"
      centered
    >
      <Stack>
        <Radio.Group
          value={mode}
          onChange={(value) => setMode(value as 'next_recurrence' | 'specific_date')}
        >
          <Stack gap="xs">
            <Tooltip
              label={nextRecurrenceTooltip}
              position="right"
              disabled={!nextRecurrenceTooltip}
            >
              <span>
                <Radio
                  value="next_recurrence"
                  label="Until next recurrence"
                  disabled={!allRecurring}
                />
              </span>
            </Tooltip>
            <Radio value="specific_date" label="Until a specific date" />
          </Stack>
        </Radio.Group>

        {mode === 'specific_date' && (
          <DatePickerInput
            label="Defer until"
            value={selectedDate}
            onChange={(date: string | Date | null) => setSelectedDate(date ? new Date(date) : null)}
            minDate={new Date()}
            mt="xs"
          />
        )}

        {mode === 'next_recurrence' && !allRecurring && hasRecurringTasks && (
          <Text size="sm" c="dimmed" mt="xs">
            Some selected tasks are not recurring. Only recurring tasks can be deferred to their
            next recurrence.
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Defer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
/* v8 ignore stop */
