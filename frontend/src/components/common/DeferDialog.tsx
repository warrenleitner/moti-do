import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delay {tasks.length} task{tasks.length !== 1 ? 's' : ''}</DialogTitle>
      <DialogContent>
        <RadioGroup
          value={mode}
          onChange={(e) => setMode(e.target.value as 'next_recurrence' | 'specific_date')}
        >
          <Tooltip
            title={
              !hasRecurringTasks
                ? 'Only available for recurring tasks'
                : !allRecurring
                  ? 'Some selected tasks are not recurring'
                  : ''
            }
            placement="right"
          >
            <span>
              <FormControlLabel
                value="next_recurrence"
                control={<Radio />}
                label="Until next recurrence"
                disabled={!allRecurring}
              />
            </span>
          </Tooltip>
          <FormControlLabel
            value="specific_date"
            control={<Radio />}
            label="Until a specific date"
          />
        </RadioGroup>

        {mode === 'specific_date' && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Defer until"
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
              minDate={new Date()}
            />
          </LocalizationProvider>
        )}

        {mode === 'next_recurrence' && !allRecurring && hasRecurringTasks && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Some selected tasks are not recurring. Only recurring tasks can be deferred to their
            next recurrence.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!canConfirm}>
          Defer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
/* v8 ignore stop */
