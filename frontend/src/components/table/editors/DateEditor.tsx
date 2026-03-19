import { useCallback } from 'react';
import { Box, DatePickerInput } from '../../../ui';

export interface DateEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onClose: () => void;
  onSave: (value?: string | undefined) => void;
  label?: string;
}

/**
 * Inline date editor using Mantine DatePickerInput.
 * Auto-saves on date selection.
 */
export function DateEditor({
  value,
  onChange,
  onSave,
  label = 'Date',
}: DateEditorProps) {
  // Parse string date to Date object
  const dateValue = value
    ? new Date(value.includes('T') ? value : value + 'T00:00:00')
    : null;

  const handleChange = useCallback(
    (newDate: string | Date | null) => {
      // Convert Date to ISO date string (YYYY-MM-DD) or undefined
      const dateObj = newDate ? new Date(newDate) : null;
      const newValue = dateObj ? dateObj.toISOString().split('T')[0] : undefined;
      onChange(newValue);
      // Auto-save on selection, passing value directly
      onSave(newValue);
    },
    [onChange, onSave]
  );

  return (
    <Box style={{ minWidth: 140 }} data-testid="date-editor">
      <DatePickerInput
        label={label}
        value={dateValue}
        onChange={handleChange}
        clearable
        size="sm"
        popoverProps={{ withinPortal: false }}
      />
    </Box>
  );
}

export default DateEditor;
