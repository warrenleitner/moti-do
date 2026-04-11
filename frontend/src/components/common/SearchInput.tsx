import { useState, useEffect } from 'react';
import { TextInput, CloseButton } from '../../ui';
import { IconSearch } from '../../ui/icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  fullWidth?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  fullWidth = false,
}: SearchInputProps) {
  const [{ localValue, syncedValue }, setInputState] = useState(() => ({
    localValue: value,
    syncedValue: value,
  }));
  const displayValue = value !== syncedValue ? value : localValue;

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayValue !== value) {
        onChange(displayValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [displayValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setInputState({
      localValue: '',
      syncedValue: value,
    });
    onChange('');
  };

  return (
    <TextInput
      value={displayValue}
      onChange={(e) =>
        setInputState({
          localValue: e.target.value,
          syncedValue: value,
        })
      }
      placeholder={placeholder}
      size="sm"
      w={fullWidth ? '100%' : undefined}
      leftSection={<IconSearch size={16} color="gray" />}
      rightSection={
        displayValue ? (
          <CloseButton size="sm" onClick={handleClear} aria-label="Clear search" />
        ) : null
      }
      styles={{
        input: {
          borderRadius: 'var(--mantine-radius-md)',
        },
      }}
    />
  );
}
