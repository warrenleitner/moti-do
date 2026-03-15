import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
    <Dialog open={open} onClose={onCancel} maxWidth="lg" fullWidth>
      <DialogTitle>Jump Selected Tasks to Their Current Instance</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Review how each selected recurring task will move forward before you apply the catch-up
          change.
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Task</TableCell>
                <TableCell>Current Start</TableCell>
                <TableCell>Current Due</TableCell>
                <TableCell>New Start</TableCell>
                <TableCell>New Due</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previews.map((preview) => (
                <TableRow key={preview.task_id}>
                  <TableCell>{preview.title}</TableCell>
                  <TableCell>{formatDateValue(preview.current_start_date)}</TableCell>
                  <TableCell>{formatDateValue(preview.current_due_date)}</TableCell>
                  <TableCell>{formatDateValue(preview.new_start_date)}</TableCell>
                  <TableCell>{formatDateValue(preview.new_due_date)}</TableCell>
                  <TableCell>
                    {preview.can_apply ? (
                      <Chip label="Ready" size="small" color="success" />
                    ) : (
                      <Chip
                        label={preview.reason || 'Skipped'}
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 1 }}>
          {applicableCount} task{applicableCount === 1 ? '' : 's'} ready to jump
        </Typography>
        <Button onClick={onCancel} disabled={isApplying}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={isApplying || applicableCount === 0}
        >
          Jump Tasks
        </Button>
      </DialogActions>
    </Dialog>
  );
}
/* v8 ignore stop */
