import { useCallback, useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';

export interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: (value?: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}

/**
 * Inline text editor using MUI TextField.
 * Auto-focuses and selects text on mount.
 * Saves on Enter or blur, cancels on Escape.
 */
export function TextEditor({
  value,
  onChange,
  onClose,
  onSave,
  placeholder = '',
  required = false,
  minLength = 0,
}: TextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState(value);

  // Focus and select text when mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      // Ref null check is a safety guard - covered via E2E tests
      /* v8 ignore next 4 */
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const validate = useCallback(
    (val: string): string | null => {
      const trimmed = val.trim();
      if (required && !trimmed) {
        return 'This field is required';
      }
      if (minLength > 0 && trimmed.length < minLength) {
        return `Minimum ${minLength} characters required`;
      }
      return null;
    },
    [required, minLength]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
      // Clear error as user types
      if (error) {
        setError(validate(newValue));
      }
    },
    [onChange, error, validate]
  );

  const handleSave = useCallback(() => {
    const trimmedValue = localValue.trim();
    const validationError = validate(trimmedValue);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Only save if value changed
    if (trimmedValue !== value.trim()) {
      onSave(trimmedValue);
    } else {
      onClose();
    }
  }, [localValue, value, validate, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleSave, onClose]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to process first
    setTimeout(() => {
      handleSave();
    }, 100);
  }, [handleSave]);

  return (
    <TextField
      inputRef={inputRef}
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      error={!!error}
      helperText={error}
      size="small"
      fullWidth
      autoComplete="off"
      data-testid="text-editor"
    />
  );
}

export default TextEditor;
