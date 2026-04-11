import React, { useState, useCallback } from 'react';
import { Box, Loader, useClickOutside } from '../../ui';
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
  const [isHovered, setIsHovered] = useState(false);

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

  const handleClickOutside = useCallback(() => {
    // isSaving branch is a race condition guard - tested via integration tests
    /* v8 ignore next 3 */
    if (isEditing && !isSaving) {
      handleSave();
    }
  }, [isEditing, isSaving, handleSave]);

  const clickOutsideRef = useClickOutside<HTMLDivElement>(handleClickOutside);

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
      <Box
        ref={clickOutsideRef}
        onKeyDown={handleKeyDown}
        style={{ position: 'relative', minWidth: 120 }}
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
            style={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
            }}
          >
            <Loader size={16} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        padding: '2px 4px',
        margin: '-2px -4px',
        borderRadius: 4,
        transition: 'background-color 0.15s ease',
        backgroundColor: isHovered && !disabled ? 'var(--mantine-color-gray-1)' : undefined,
      }}
      data-testid="editable-cell-display"
    >
      {displayComponent}
    </Box>
  );
}

export default EditableCell;
