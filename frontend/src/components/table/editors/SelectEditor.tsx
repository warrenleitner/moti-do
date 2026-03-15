import { useCallback, useEffect, useRef } from 'react';
import { Box, Select } from '../../../ui';

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

  // Focus the select when mounted to open dropdown
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = selectRef.current?.querySelector('input');
      // DOM element check is a safety guard - covered via E2E tests
      /* v8 ignore next 3 */
      if (input instanceof HTMLElement) {
        input.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key at document level to ensure it works regardless of focus state
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const getLabel = (option: T): string => {
    const emoji = emojis?.[option] ?? '';
    const label = labels?.[option] ?? option;
    return emoji ? `${emoji} ${label}` : label;
  };

  const data = options.map((option) => ({
    value: option,
    label: getLabel(option),
  }));

  const handleChange = useCallback(
    (val: string | null) => {
      if (val !== null) {
        onChange(val as T);
        // Auto-save on selection, passing value directly to avoid async state issues
        onSave(val as T);
      }
    },
    [onChange, onSave]
  );

  return (
    <Box
      ref={selectRef}
      style={{ minWidth: 120 }}
      data-testid="select-editor"
    >
      <Select
        data={data}
        value={value}
        onChange={handleChange}
        onDropdownClose={onClose}
        allowDeselect={false}
        searchable
        size="sm"
        comboboxProps={{ withinPortal: false, transitionProps: { duration: 0 } }}
        renderOption={({ option }) => (
          <span data-testid={`option-${option.value}`}>{option.label}</span>
        )}
      />
    </Box>
  );
}

export default SelectEditor;
