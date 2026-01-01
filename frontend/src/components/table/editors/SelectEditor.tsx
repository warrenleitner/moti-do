import { useCallback, useEffect, useRef } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

export interface SelectEditorProps<T extends string> {
  value: T;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  emojis?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
  onClose: () => void;
  onSave: (value?: T) => void;
}

export function SelectEditor<T extends string>({
  value,
  options,
  labels,
  emojis,
  onChange,
  onClose,
  onSave,
}: SelectEditorProps<T>) {
  const selectRef = useRef<HTMLDivElement>(null);

  // Focus the select when mounted
  useEffect(() => {
    // Small delay to ensure the select is rendered
    const timer = setTimeout(() => {
      const selectElement = selectRef.current?.querySelector('[role="combobox"]');
      if (selectElement instanceof HTMLElement) {
        selectElement.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = useCallback(
    (event: SelectChangeEvent<T>) => {
      const newValue = event.target.value as T;
      onChange(newValue);
      // Auto-save on selection, passing value directly to avoid async state issues
      onSave(newValue);
    },
    [onChange, onSave]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const getLabel = (option: T): string => {
    const emoji = emojis?.[option] ?? '';
    const label = labels?.[option] ?? option;
    return emoji ? `${emoji} ${label}` : label;
  };

  return (
    <FormControl size="small" fullWidth ref={selectRef}>
      <Select<T>
        value={value}
        open
        onChange={handleChange}
        onClose={handleClose}
        MenuProps={{
          // Prevent the menu from being positioned outside viewport
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        sx={{ minWidth: 120 }}
        data-testid="select-editor"
      >
        {options.map((option) => (
          <MenuItem key={option} value={option} data-testid={`option-${option}`}>
            {getLabel(option)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default SelectEditor;
