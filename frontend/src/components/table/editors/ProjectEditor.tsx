import { useCallback, useEffect, useRef } from 'react';
import { Autocomplete, TextField, Box } from '@mui/material';
import { useDefinedProjects } from '../../../store/userStore';

export interface ProjectEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onClose: () => void;
  onSave: (value?: string | undefined) => void;
}

/**
 * Inline project editor using MUI Autocomplete with freeSolo.
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
    (_event: React.SyntheticEvent, newValue: string | null) => {
      const projectValue = newValue || undefined;
      onChange(projectValue);
      // Auto-save on selection
      onSave(projectValue);
    },
    [onChange, onSave]
  );

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, newInputValue: string) => {
      // Update value as user types (for freeSolo mode)
      onChange(newInputValue || undefined);
    },
    [onChange]
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
    <Box ref={containerRef} sx={{ minWidth: 150 }} data-testid="project-editor">
      <Autocomplete
        freeSolo
        options={projectNames}
        value={value || ''}
        onChange={handleChange}
        onInputChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        size="small"
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select or type project"
            size="small"
          />
        )}
        slotProps={{
          popper: {
            placement: 'bottom-start',
          },
        }}
      />
    </Box>
  );
}

export default ProjectEditor;
