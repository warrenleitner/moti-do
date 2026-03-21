import { useCallback, useEffect, useRef } from 'react';
import { Autocomplete, Box } from '../../../ui';
import { useDefinedProjects } from '../../../store/userStore';

export interface ProjectEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onClose: () => void;
  onSave: (value?: string | undefined) => void;
}

/**
 * Inline project editor using Mantine Autocomplete.
 * Allows selecting existing projects or entering new ones.
 * Auto-saves on selection or blur.
 */
export function ProjectEditor({
  value,
  onChange,
  onClose,
  onSave,
}: ProjectEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const definedProjects = useDefinedProjects();
  const projectNames = definedProjects.map((p) => p.name);

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
    (newValue: string) => {
      // Update value as user types (Mantine Autocomplete fires onChange on typing)
      onChange(newValue || undefined);
    },
    [onChange]
  );

  const handleOptionSubmit = useCallback(
    (selectedValue: string) => {
      const projectValue = selectedValue || undefined;
      onChange(projectValue);
      // Auto-save on selection
      onSave(projectValue);
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
    <Box ref={containerRef} style={{ minWidth: 150 }} data-testid="project-editor">
      <Autocomplete
        data={projectNames}
        value={value || ''}
        onChange={handleChange}
        onOptionSubmit={handleOptionSubmit}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Select or type project"
        size="sm"
        comboboxProps={{ withinPortal: false }}
      />
    </Box>
  );
}

export default ProjectEditor;
