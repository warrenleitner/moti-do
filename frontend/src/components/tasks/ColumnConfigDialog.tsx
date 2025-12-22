import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material';
import type { ColumnConfig } from './TaskTable';

interface ColumnConfigDialogProps {
  open: boolean;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (columns: ColumnConfig[]) => void;
  onReset: () => void;
}

const ColumnConfigDialog: React.FC<ColumnConfigDialogProps> = ({
  open,
  columns,
  onClose,
  onSave,
  onReset,
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Update local state when dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalColumns(columns);
    }
  }, [open, columns]);

  const handleToggleVisible = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    const newColumns = [...localColumns];
    const draggedItem = newColumns[draggedIndex];

    // Remove dragged item
    newColumns.splice(draggedIndex, 1);

    // Insert at new position
    newColumns.splice(index, 0, draggedItem);

    setLocalColumns(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(localColumns);
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const canToggle = (col: ColumnConfig) => {
    // Don't allow hiding these essential columns
    return col.id !== 'select' && col.id !== 'title' && col.id !== 'actions';
  };

  const visibleCount = localColumns.filter((col) => col.visible).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Configure Columns</span>
          <Button
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            size="small"
            color="secondary"
          >
            Reset to Default
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag columns to reorder. Click the eye icon to show/hide columns.
          <br />
          {visibleCount} of {localColumns.length} columns visible
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <List>
          {localColumns.map((col, index) => {
            const isEssential = !canToggle(col);

            return (
              <ListItem
                key={col.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'grab',
                  opacity: draggedIndex === index ? 0.5 : 1,
                  backgroundColor: col.visible ? 'background.paper' : 'action.hover',
                  '&:hover': {
                    backgroundColor: col.visible ? 'action.hover' : 'action.selected',
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleToggleVisible(col.id)}
                    disabled={isEssential}
                    title={
                      isEssential
                        ? 'This column cannot be hidden'
                        : col.visible
                        ? 'Hide column'
                        : 'Show column'
                    }
                  >
                    {col.visible ? (
                      <VisibilityIcon color={isEssential ? 'disabled' : 'primary'} />
                    ) : (
                      <VisibilityOffIcon color="disabled" />
                    )}
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <DragIndicatorIcon sx={{ cursor: 'grab' }} />
                </ListItemIcon>
                <ListItemText
                  primary={col.label || col.id}
                  secondary={
                    isEssential ? 'Essential column (always visible)' : col.sortable ? 'Sortable' : ''
                  }
                  sx={{
                    opacity: col.visible ? 1 : 0.5,
                  }}
                />
                <Checkbox
                  checked={col.visible}
                  disabled={isEssential}
                  onChange={() => handleToggleVisible(col.id)}
                  sx={{ ml: 2 }}
                />
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>Tip:</strong> You can sort by multiple columns! Click column headers in the
            table to add them to the sort order. Click again to toggle ascending/descending, or a
            third time to remove from sort.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnConfigDialog;
