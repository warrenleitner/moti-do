import { useCallback, useEffect, useRef } from 'react';
import { Box, TagsInput } from '../../../ui';
import { useDefinedTags } from '../../../store/userStore';

export interface TagsEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  onClose: () => void;
  onSave: (value?: string[]) => void;
}

/**
 * Inline tags editor using Mantine TagsInput.
 * Allows selecting existing tags or entering new ones.
 * Auto-saves on selection change or blur.
 */
export function TagsEditor({
  value,
  onChange,
  onClose,
  onSave,
}: TagsEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const definedTags = useDefinedTags();
  const tagNames = definedTags.map((t) => t.name);

  // Focus the input when mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = containerRef.current?.querySelector('input');
      // DOM element check is a safety guard - covered via E2E tests
      /* v8 ignore next 3 */
      if (input) {
        input.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = useCallback(
    (newValue: string[]) => {
      onChange(newValue);
      // Auto-save on selection
      onSave(newValue);
    },
    [onChange, onSave]
  );

  const handleBlur = useCallback(() => {
    // Save on blur with current value
    setTimeout(() => {
      onSave();
    }, 100);
  }, [onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Box ref={containerRef} style={{ minWidth: 200 }} data-testid="tags-editor">
      <TagsInput
        data={tagNames}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? 'Add tags...' : ''}
        size="sm"
        comboboxProps={{ withinPortal: false }}
      />
    </Box>
  );
}

export default TagsEditor;
