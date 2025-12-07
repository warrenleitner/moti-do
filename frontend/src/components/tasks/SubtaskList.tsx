import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Checkbox } from '@mui/material';
import type { Subtask } from '../../types';

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggle?: (index: number) => void;
  readOnly?: boolean;
}

export default function SubtaskList({ subtasks, onToggle, readOnly = false }: SubtaskListProps) {
  if (subtasks.length === 0) {
    return null;
  }

  return (
    <List dense disablePadding>
      {subtasks.map((subtask, index) => (
        <ListItem key={index} disablePadding>
          {onToggle && !readOnly ? (
            <ListItemButton onClick={() => onToggle(index)} dense>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={subtask.complete}
                  tabIndex={-1}
                  disableRipple
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={subtask.text}
                sx={{
                  textDecoration: subtask.complete ? 'line-through' : 'none',
                  color: subtask.complete ? 'text.secondary' : 'text.primary',
                }}
              />
            </ListItemButton>
          ) : (
            <>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={subtask.complete}
                  disabled
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={subtask.text}
                sx={{
                  textDecoration: subtask.complete ? 'line-through' : 'none',
                  color: subtask.complete ? 'text.secondary' : 'text.primary',
                }}
              />
            </>
          )}
        </ListItem>
      ))}
    </List>
  );
}
