import { useState, useEffect } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

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
  const [localValue, setLocalValue] = useState(value);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <TextField
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      size="small"
      fullWidth={fullWidth}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          endAdornment: localValue ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} edge="end">
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
      }}
    />
  );
}
