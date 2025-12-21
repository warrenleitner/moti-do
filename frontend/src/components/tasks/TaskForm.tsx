import { useState } from 'react';
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
import type { Task, Subtask } from '../../types';
import {
  Priority,
  Difficulty,
  Duration,
  PriorityEmoji,
  DifficultyEmoji,
  DurationEmoji,
  DifficultyLabel,
  DurationLabel,
} from '../../types';

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

const defaultTask: Partial<Task> = {
  title: '',
  text_description: '',
  priority: Priority.MEDIUM,
  difficulty: Difficulty.MEDIUM,
  duration: Duration.MEDIUM,
  is_habit: false,
  tags: [],
  subtasks: [],
};

export default function TaskForm({ open, task, onSave, onClose }: TaskFormProps) {
  // Initialize form data based on task prop
  const getInitialFormData = () => (task ? { ...task } : { ...defaultTask });
  const [formData, setFormData] = useState<Partial<Task>>(getInitialFormData);
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

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
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        key={task?.id || 'new'}
      >
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
                  value={formData.priority || Priority.MEDIUM}
                  label="Priority"
                  onChange={(e) => handleChange('priority', e.target.value as typeof Priority[keyof typeof Priority])}
                >
                  <MenuItem value={Priority.TRIVIAL}>{PriorityEmoji[Priority.TRIVIAL]} Trivial</MenuItem>
                  <MenuItem value={Priority.LOW}>{PriorityEmoji[Priority.LOW]} Low</MenuItem>
                  <MenuItem value={Priority.MEDIUM}>{PriorityEmoji[Priority.MEDIUM]} Medium</MenuItem>
                  <MenuItem value={Priority.HIGH}>{PriorityEmoji[Priority.HIGH]} High</MenuItem>
                  <MenuItem value={Priority.DEFCON_ONE}>{PriorityEmoji[Priority.DEFCON_ONE]} Defcon One</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty || Difficulty.MEDIUM}
                  label="Difficulty"
                  onChange={(e) => handleChange('difficulty', e.target.value as typeof Difficulty[keyof typeof Difficulty])}
                >
                  <MenuItem value={Difficulty.TRIVIAL}>{DifficultyEmoji[Difficulty.TRIVIAL]} {DifficultyLabel[Difficulty.TRIVIAL]}</MenuItem>
                  <MenuItem value={Difficulty.LOW}>{DifficultyEmoji[Difficulty.LOW]} {DifficultyLabel[Difficulty.LOW]}</MenuItem>
                  <MenuItem value={Difficulty.MEDIUM}>{DifficultyEmoji[Difficulty.MEDIUM]} {DifficultyLabel[Difficulty.MEDIUM]}</MenuItem>
                  <MenuItem value={Difficulty.HIGH}>{DifficultyEmoji[Difficulty.HIGH]} {DifficultyLabel[Difficulty.HIGH]}</MenuItem>
                  <MenuItem value={Difficulty.HERCULEAN}>{DifficultyEmoji[Difficulty.HERCULEAN]} {DifficultyLabel[Difficulty.HERCULEAN]}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={formData.duration || Duration.MEDIUM}
                  label="Duration"
                  onChange={(e) => handleChange('duration', e.target.value as typeof Duration[keyof typeof Duration])}
                >
                  <MenuItem value={Duration.MINUSCULE}>{DurationEmoji[Duration.MINUSCULE]} {DurationLabel[Duration.MINUSCULE]}</MenuItem>
                  <MenuItem value={Duration.SHORT}>{DurationEmoji[Duration.SHORT]} {DurationLabel[Duration.SHORT]}</MenuItem>
                  <MenuItem value={Duration.MEDIUM}>{DurationEmoji[Duration.MEDIUM]} {DurationLabel[Duration.MEDIUM]}</MenuItem>
                  <MenuItem value={Duration.LONG}>{DurationEmoji[Duration.LONG]} {DurationLabel[Duration.LONG]}</MenuItem>
                  <MenuItem value={Duration.ODYSSEYAN}>{DurationEmoji[Duration.ODYSSEYAN]} {DurationLabel[Duration.ODYSSEYAN]}</MenuItem>
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
