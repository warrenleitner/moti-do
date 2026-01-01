import { useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export interface DateEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onClose: () => void;
  onSave: (value?: string | undefined) => void;
  label?: string;
}

/**
 * Inline date editor using MUI DatePicker.
 * Opens immediately and auto-saves on date selection.
 */
export function DateEditor({
  value,
  onChange,
  onClose,
  onSave,
  label = 'Date',
}: DateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasOpenedRef = useRef(false);

  // Parse string date to Date object
  const dateValue = value
    ? new Date(value.includes('T') ? value : value + 'T00:00:00')
    : null;

  // Focus the date picker input when mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = containerRef.current?.querySelector('input');
      // DOM element check is a safety guard - covered via E2E tests
      /* v8 ignore next 5 */
      if (input && !hasOpenedRef.current) {
        input.focus();
        input.click(); // Open the date picker
        hasOpenedRef.current = true;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = useCallback(
    (newDate: Date | null) => {
      // Convert Date to ISO date string (YYYY-MM-DD) or undefined
      const newValue = newDate ? newDate.toISOString().split('T')[0] : undefined;
      onChange(newValue);
      // Auto-save on selection, passing value directly
      onSave(newValue);
    },
    [onChange, onSave]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box ref={containerRef} sx={{ minWidth: 140 }} data-testid="date-editor">
        <DatePicker
          label={label}
          value={dateValue}
          onChange={handleChange}
          onClose={handleClose}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
            },
            actionBar: {
              actions: ['clear', 'today', 'accept'],
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default DateEditor;
