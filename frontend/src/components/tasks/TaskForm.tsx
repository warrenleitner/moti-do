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
  Autocomplete,
  Tooltip,
} from '@mui/material';
import { Add, Delete, InfoOutlined } from '@mui/icons-material';
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
  PriorityDescription,
  DifficultyDescription,
  DurationDescription,
  SubtaskRecurrenceMode,
  RecurrenceType,
} from '../../types';
import RecurrenceRuleBuilder from './RecurrenceRuleBuilder';
import { getNextOccurrenceText } from '../../utils/recurrence';
import { useDefinedTags, useDefinedProjects } from '../../store/userStore';

// Helper component for field info tooltips
interface FieldInfoTooltipProps<T extends string> {
  values: readonly T[];
  emojis: Record<T, string>;
  labels: Record<T, string>;
  descriptions: Record<T, string>;
}

function FieldInfoTooltip<T extends string>({
  values,
  emojis,
  labels,
  descriptions,
}: FieldInfoTooltipProps<T>) {
  return (
    <Box sx={{ p: 0.5 }}>
      {values.map((value) => (
        <Box key={value} sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {emojis[value]} {labels[value]}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {descriptions[value]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

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

// UI component - tested via integration tests
/* v8 ignore start */
export default function TaskForm({ open, task, onSave, onClose }: TaskFormProps) {
  // Initialize form data based on task prop
  // Note: Parent must use key={task?.id ?? 'new'} to reset state when task changes
  const getInitialFormData = () => (task ? { ...task } : { ...defaultTask });
  const [formData, setFormData] = useState<Partial<Task>>(getInitialFormData);
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  // Get defined tags and projects for autocomplete
  const definedTags = useDefinedTags();
  const definedProjects = useDefinedProjects();
  const projectNames = definedProjects.map((p) => p.name);
  const tagNames = definedTags.map((t) => t.name);

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
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Tooltip
                  title={
                    <FieldInfoTooltip
                      values={Object.values(Priority)}
                      emojis={PriorityEmoji}
                      labels={{ [Priority.TRIVIAL]: 'Trivial', [Priority.LOW]: 'Low', [Priority.MEDIUM]: 'Medium', [Priority.HIGH]: 'High', [Priority.DEFCON_ONE]: 'Defcon One' }}
                      descriptions={PriorityDescription}
                    />
                  }
                  placement="top"
                  arrow
                >
                  <InfoOutlined sx={{ position: 'absolute', right: 8, top: -8, fontSize: 16, color: 'text.secondary', cursor: 'help', zIndex: 1 }} />
                </Tooltip>
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
              </Box>

              <Box sx={{ flex: 1, position: 'relative' }}>
                <Tooltip
                  title={
                    <FieldInfoTooltip
                      values={Object.values(Difficulty)}
                      emojis={DifficultyEmoji}
                      labels={DifficultyLabel}
                      descriptions={DifficultyDescription}
                    />
                  }
                  placement="top"
                  arrow
                >
                  <InfoOutlined sx={{ position: 'absolute', right: 8, top: -8, fontSize: 16, color: 'text.secondary', cursor: 'help', zIndex: 1 }} />
                </Tooltip>
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
              </Box>

              <Box sx={{ flex: 1, position: 'relative' }}>
                <Tooltip
                  title={
                    <FieldInfoTooltip
                      values={Object.values(Duration)}
                      emojis={DurationEmoji}
                      labels={DurationLabel}
                      descriptions={DurationDescription}
                    />
                  }
                  placement="top"
                  arrow
                >
                  <InfoOutlined sx={{ position: 'absolute', right: 8, top: -8, fontSize: 16, color: 'text.secondary', cursor: 'help', zIndex: 1 }} />
                </Tooltip>
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
              </Box>
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
            <Autocomplete
              freeSolo
              options={projectNames}
              value={formData.project || ''}
              onChange={(_e, newValue) => handleChange('project', newValue || undefined)}
              onInputChange={(_e, newValue) => handleChange('project', newValue || undefined)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Project"
                  placeholder="e.g., Work, Personal, Side Project"
                />
              )}
            />

            {/* Recurring toggle - enables recurrence for any task */}
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.recurrence_rule}
                  onChange={(e) => {
                    const isRecurring = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      recurrence_rule: isRecurring ? (prev.recurrence_rule || 'FREQ=DAILY') : undefined,
                    }));
                  }}
                />
              }
              label="Recurring Task"
            />

            {/* Recurrence options (when recurring is enabled) */}
            {formData.recurrence_rule && (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recurrence Pattern
                  </Typography>
                  <RecurrenceRuleBuilder
                    value={formData.recurrence_rule || 'FREQ=DAILY'}
                    onChange={(rrule) => handleChange('recurrence_rule', rrule)}
                  />

                  {/* Next occurrence preview */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {getNextOccurrenceText(
                      formData.recurrence_rule,
                      formData.due_date ? new Date(formData.due_date) : undefined
                    )}
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Recurrence Style</InputLabel>
                  <Select
                    value={formData.recurrence_type || RecurrenceType.FROM_DUE_DATE}
                    label="Recurrence Style"
                    onChange={(e) => handleChange('recurrence_type', e.target.value)}
                  >
                    <MenuItem value={RecurrenceType.FROM_DUE_DATE}>
                      From Due Date - Next due = previous due + pattern
                    </MenuItem>
                    <MenuItem value={RecurrenceType.FROM_COMPLETION}>
                      From Completion - Next due = completion date + pattern
                    </MenuItem>
                    <MenuItem value={RecurrenceType.STRICT}>
                      Strict - Always recur on schedule regardless of completion
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Habit toggle - adds streak tracking for recurring tasks */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_habit || false}
                      onChange={(e) => handleChange('is_habit', e.target.checked)}
                    />
                  }
                  label="Track as Habit (enables streak tracking)"
                />

                {/* Subtask recurrence mode (when recurring AND has subtasks) */}
                {(formData.subtasks?.length ?? 0) > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Subtask Recurrence</InputLabel>
                    <Select
                      value={formData.subtask_recurrence_mode || SubtaskRecurrenceMode.DEFAULT}
                      label="Subtask Recurrence"
                      onChange={(e) =>
                        handleChange('subtask_recurrence_mode', e.target.value)
                      }
                    >
                      <MenuItem value={SubtaskRecurrenceMode.DEFAULT}>
                        All Complete First - New recurrence only after all subtasks complete
                      </MenuItem>
                      <MenuItem value={SubtaskRecurrenceMode.PARTIAL}>
                        Carry Over Completed - Copy only completed subtasks to next
                      </MenuItem>
                      <MenuItem value={SubtaskRecurrenceMode.ALWAYS}>
                        Always Copy All - Full subtask list regardless of completion
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Autocomplete
                  freeSolo
                  options={tagNames.filter((t) => !formData.tags?.includes(t))}
                  value={newTag}
                  onChange={(_e, newValue) => {
                    if (newValue && !formData.tags?.includes(newValue)) {
                      setFormData((prev) => ({
                        ...prev,
                        tags: [...(prev.tags || []), newValue],
                      }));
                    }
                    setNewTag('');
                  }}
                  onInputChange={(_e, newValue) => setNewTag(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTag.trim() && !formData.tags?.includes(newTag.trim())) {
                          e.preventDefault();
                          setFormData((prev) => ({
                            ...prev,
                            tags: [...(prev.tags || []), newTag.trim()],
                          }));
                          setNewTag('');
                        }
                      }}
                    />
                  )}
                  sx={{ flex: 1 }}
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
/* v8 ignore stop */
