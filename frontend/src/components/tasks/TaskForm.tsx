import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Chip,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { Task, Priority, Difficulty, Duration, Subtask } from '../../types';

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

const defaultTask: Partial<Task> = {
  title: '',
  text_description: '',
  priority: 'medium',
  difficulty: 'medium',
  duration: 'medium',
  is_habit: false,
  tags: [],
  subtasks: [],
};

export default function TaskForm({ open, task, onSave, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState<Partial<Task>>(defaultTask);
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
    } else {
      setFormData({ ...defaultTask });
    }
  }, [task, open]);

  const handleChange = (field: keyof Task, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const subtask: Subtask = { text: newSubtask.trim(), complete: false };
      setFormData((prev) => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), subtask],
      }));
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = () => {
    if (!formData.title?.trim()) return;
    onSave(formData);
    onClose();
  };

  const isEditing = !!task;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Title */}
            <TextField
              label="Title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              fullWidth
              required
              autoFocus
            />

            {/* Description */}
            <TextField
              label="Description"
              value={formData.text_description || ''}
              onChange={(e) => handleChange('text_description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />

            {/* Priority, Difficulty, Duration row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority || 'medium'}
                  label="Priority"
                  onChange={(e) => handleChange('priority', e.target.value as Priority)}
                >
                  <MenuItem value="trivial">⬜ Trivial</MenuItem>
                  <MenuItem value="low">🟦 Low</MenuItem>
                  <MenuItem value="medium">🟨 Medium</MenuItem>
                  <MenuItem value="high">🟧 High</MenuItem>
                  <MenuItem value="critical">🟥 Critical</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty || 'medium'}
                  label="Difficulty"
                  onChange={(e) => handleChange('difficulty', e.target.value as Difficulty)}
                >
                  <MenuItem value="trivial">Trivial</MenuItem>
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                  <MenuItem value="extreme">Extreme</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={formData.duration || 'medium'}
                  label="Duration"
                  onChange={(e) => handleChange('duration', e.target.value as Duration)}
                >
                  <MenuItem value="minute">&lt; 5 min</MenuItem>
                  <MenuItem value="short">5-15 min</MenuItem>
                  <MenuItem value="medium">15-60 min</MenuItem>
                  <MenuItem value="long">1-4 hours</MenuItem>
                  <MenuItem value="marathon">4+ hours</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Dates row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DateTimePicker
                label="Due Date"
                value={formData.due_date ? new Date(formData.due_date) : null}
                onChange={(date) =>
                  handleChange('due_date', date ? date.toISOString() : undefined)
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DateTimePicker
                label="Start Date"
                value={formData.start_date ? new Date(formData.start_date) : null}
                onChange={(date) =>
                  handleChange('start_date', date ? date.toISOString() : undefined)
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>

            {/* Project */}
            <TextField
              label="Project"
              value={formData.project || ''}
              onChange={(e) => handleChange('project', e.target.value || undefined)}
              fullWidth
              placeholder="e.g., Work, Personal, Side Project"
            />

            {/* Habit toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_habit || false}
                  onChange={(e) => handleChange('is_habit', e.target.checked)}
                />
              }
              label="Recurring Habit"
            />

            {/* Recurrence rule (only if habit) */}
            {formData.is_habit && (
              <TextField
                label="Recurrence Rule"
                value={formData.recurrence_rule || ''}
                onChange={(e) => handleChange('recurrence_rule', e.target.value)}
                fullWidth
                placeholder="e.g., daily, weekly, every 3 days"
                helperText="Simple rules: daily, weekly, monthly, or 'every N days/weeks'"
              />
            )}

            <Divider />

            {/* Tags */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                {formData.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <IconButton onClick={handleAddTag} size="small">
                  <Add />
                </IconButton>
              </Stack>
            </Box>

            {/* Subtasks */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Subtasks
              </Typography>
              {formData.subtasks?.map((subtask, index) => (
                <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    • {subtask.text}
                  </Typography>
                  <IconButton size="small" onClick={() => handleRemoveSubtask(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask..."
                  fullWidth
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                />
                <IconButton onClick={handleAddSubtask} size="small">
                  <Add />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.title?.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
