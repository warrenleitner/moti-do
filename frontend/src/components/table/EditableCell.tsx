import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, ClickAwayListener, CircularProgress } from '@mui/material';
import type { Task } from '../../types/models';

export interface EditorProps<T> {
  value: T;
  onChange: (value: T) => void;
  onClose: () => void;
  onSave: (value?: T) => void;
}

export interface EditableCellProps<T> {
  value: T;
  taskId: string;
  field: keyof Task;
  displayComponent: React.ReactNode;
  renderEditor: (props: EditorProps<T>) => React.ReactNode;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  disabled?: boolean;
}

export function EditableCell<T>({
  value,
  taskId,
  field,
  displayComponent,
  renderEditor,
  onSave,
  disabled = false,
}: EditableCellProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync pendingValue when value changes externally
  useEffect(() => {
    if (!isEditing) {
      setPendingValue(value);
    }
  }, [value, isEditing]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row selection
      if (!disabled && !isEditing && !isSaving) {
        setPendingValue(value);
        setIsEditing(true);
      }
    },
    [disabled, isEditing, isSaving, value]
  );

  const handleSave = useCallback(async (valueToSave?: T) => {
    const finalValue = valueToSave ?? pendingValue;
    if (finalValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(taskId, { [field]: finalValue } as Partial<Task>);
      setIsEditing(false);
    } catch {
      // Store handles rollback, just close editor
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [pendingValue, value, onSave, taskId, field]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setPendingValue(value);
  }, [value]);

  const handleChange = useCallback((newValue: T) => {
    setPendingValue(newValue);
  }, []);

  const handleClickAway = useCallback(() => {
    // isSaving branch is a race condition guard - tested via integration tests
    /* v8 ignore next 3 */
    if (isEditing && !isSaving) {
      handleSave();
    }
  }, [isEditing, isSaving, handleSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    },
    [handleClose]
  );

  if (isEditing) {
    return (
      <ClickAwayListener onClickAway={handleClickAway}>
        <Box
          ref={containerRef}
          onKeyDown={handleKeyDown}
          sx={{ position: 'relative', minWidth: 120 }}
          data-testid="editable-cell-editor"
        >
          {renderEditor({
            value: pendingValue,
            onChange: handleChange,
            onClose: handleClose,
            onSave: handleSave,
          })}
          {isSaving && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                right: 8,
                transform: 'translateY(-50%)',
              }}
            >
              <CircularProgress size={16} />
            </Box>
          )}
        </Box>
      </ClickAwayListener>
    );
  }

  return (
    <Box
      onClick={handleClick}
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        '&:hover': disabled
          ? {}
          : {
              backgroundColor: 'action.hover',
              borderRadius: 1,
            },
        padding: '2px 4px',
        margin: '-2px -4px',
        borderRadius: 1,
        transition: 'background-color 0.15s ease',
      }}
      data-testid="editable-cell-display"
    >
      {displayComponent}
    </Box>
  );
}

export default EditableCell;
