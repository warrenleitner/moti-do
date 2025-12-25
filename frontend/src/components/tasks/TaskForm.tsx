import { useState } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Select,
  Switch,
  Box,
  Stack,
  Group,
  Badge,
  ActionIcon,
  Text,
  Divider,
  CloseButton,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
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
  SubtaskRecurrenceMode,
} from '../../types';
import RecurrenceRuleBuilder from './RecurrenceRuleBuilder';

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
    <Modal
      opened={open}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      size="lg"
      key={task?.id || 'new'}
    >
      <Stack gap="md">
        {/* Title */}
        <TextInput
          label="Title"
          value={formData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          autoFocus
        />

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.text_description || ''}
          onChange={(e) => handleChange('text_description', e.target.value)}
          rows={3}
        />

        {/* Priority, Difficulty, Duration row */}
        <Group grow>
          <Select
            label="Priority"
            value={formData.priority || Priority.MEDIUM}
            onChange={(val) => handleChange('priority', val as typeof Priority[keyof typeof Priority])}
            data={[
              { value: Priority.TRIVIAL, label: `${PriorityEmoji[Priority.TRIVIAL]} Trivial` },
              { value: Priority.LOW, label: `${PriorityEmoji[Priority.LOW]} Low` },
              { value: Priority.MEDIUM, label: `${PriorityEmoji[Priority.MEDIUM]} Medium` },
              { value: Priority.HIGH, label: `${PriorityEmoji[Priority.HIGH]} High` },
              { value: Priority.DEFCON_ONE, label: `${PriorityEmoji[Priority.DEFCON_ONE]} Defcon One` },
            ]}
          />

          <Select
            label="Difficulty"
            value={formData.difficulty || Difficulty.MEDIUM}
            onChange={(val) => handleChange('difficulty', val as typeof Difficulty[keyof typeof Difficulty])}
            data={[
              { value: Difficulty.TRIVIAL, label: `${DifficultyEmoji[Difficulty.TRIVIAL]} ${DifficultyLabel[Difficulty.TRIVIAL]}` },
              { value: Difficulty.LOW, label: `${DifficultyEmoji[Difficulty.LOW]} ${DifficultyLabel[Difficulty.LOW]}` },
              { value: Difficulty.MEDIUM, label: `${DifficultyEmoji[Difficulty.MEDIUM]} ${DifficultyLabel[Difficulty.MEDIUM]}` },
              { value: Difficulty.HIGH, label: `${DifficultyEmoji[Difficulty.HIGH]} ${DifficultyLabel[Difficulty.HIGH]}` },
              { value: Difficulty.HERCULEAN, label: `${DifficultyEmoji[Difficulty.HERCULEAN]} ${DifficultyLabel[Difficulty.HERCULEAN]}` },
            ]}
          />

          <Select
            label="Duration"
            value={formData.duration || Duration.MEDIUM}
            onChange={(val) => handleChange('duration', val as typeof Duration[keyof typeof Duration])}
            data={[
              { value: Duration.MINUSCULE, label: `${DurationEmoji[Duration.MINUSCULE]} ${DurationLabel[Duration.MINUSCULE]}` },
              { value: Duration.SHORT, label: `${DurationEmoji[Duration.SHORT]} ${DurationLabel[Duration.SHORT]}` },
              { value: Duration.MEDIUM, label: `${DurationEmoji[Duration.MEDIUM]} ${DurationLabel[Duration.MEDIUM]}` },
              { value: Duration.LONG, label: `${DurationEmoji[Duration.LONG]} ${DurationLabel[Duration.LONG]}` },
              { value: Duration.ODYSSEYAN, label: `${DurationEmoji[Duration.ODYSSEYAN]} ${DurationLabel[Duration.ODYSSEYAN]}` },
            ]}
          />
        </Group>

        {/* Dates row */}
        <Group grow>
          <DateTimePicker
            label="Due Date"
            value={formData.due_date ? new Date(formData.due_date) : null}
            onChange={(value) => {
              handleChange('due_date', value ? new Date(value).toISOString() : undefined);
            }}
            clearable
          />
          <DateTimePicker
            label="Start Date"
            value={formData.start_date ? new Date(formData.start_date) : null}
            onChange={(value) => {
              handleChange('start_date', value ? new Date(value).toISOString() : undefined);
            }}
            clearable
          />
        </Group>

        {/* Project */}
        <TextInput
          label="Project"
          value={formData.project || ''}
          onChange={(e) => handleChange('project', e.target.value || undefined)}
          placeholder="e.g., Work, Personal, Side Project"
        />

        {/* Habit toggle */}
        <Switch
          label="Recurring Habit"
          checked={formData.is_habit || false}
          onChange={(e) => {
            const isHabit = e.currentTarget.checked;
            setFormData((prev) => ({
              ...prev,
              is_habit: isHabit,
              // Set default recurrence rule when enabling habit
              recurrence_rule: isHabit ? (prev.recurrence_rule || 'FREQ=DAILY') : prev.recurrence_rule,
            }));
          }}
        />

        {/* Recurrence rule (only if habit) */}
        {formData.is_habit && (
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Recurrence Pattern
            </Text>
            <RecurrenceRuleBuilder
              value={formData.recurrence_rule || 'FREQ=DAILY'}
              onChange={(rrule) => handleChange('recurrence_rule', rrule)}
            />
          </Box>
        )}

        {/* Subtask recurrence mode (only if habit AND has subtasks) */}
        {formData.is_habit && (formData.subtasks?.length ?? 0) > 0 && (
          <Select
            label="Subtask Recurrence"
            size="sm"
            value={formData.subtask_recurrence_mode || SubtaskRecurrenceMode.DEFAULT}
            onChange={(val) => handleChange('subtask_recurrence_mode', val)}
            data={[
              { value: SubtaskRecurrenceMode.DEFAULT, label: 'All Complete First - New recurrence only after all subtasks complete' },
              { value: SubtaskRecurrenceMode.PARTIAL, label: 'Carry Over Completed - Copy only completed subtasks to next' },
              { value: SubtaskRecurrenceMode.ALWAYS, label: 'Always Copy All - Full subtask list regardless of completion' },
            ]}
          />
        )}

        <Divider />

        {/* Tags */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Tags
          </Text>
          <Group gap="xs" mb="xs">
            {formData.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="light"
                size="sm"
                rightSection={
                  <CloseButton size="xs" onClick={() => handleRemoveTag(tag)} aria-label={`Remove ${tag} tag`} />
                }
              >
                {tag}
              </Badge>
            ))}
          </Group>
          <Group gap="xs">
            <TextInput
              size="sm"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              style={{ flex: 1 }}
            />
            <ActionIcon onClick={handleAddTag} size="sm" variant="light" aria-label="Add tag">
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        </Box>

        {/* Subtasks */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Subtasks
          </Text>
          {formData.subtasks?.map((subtask, index) => (
            <Group key={index} gap="xs" mb={4}>
              <Text size="sm" style={{ flex: 1 }}>
                • {subtask.text}
              </Text>
              <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleRemoveSubtask(index)} aria-label="Remove subtask">
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Group gap="xs">
            <TextInput
              size="sm"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add subtask..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              style={{ flex: 1 }}
            />
            <ActionIcon onClick={handleAddSubtask} size="sm" variant="light" aria-label="Add subtask">
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        </Box>

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title?.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
/* v8 ignore stop */
