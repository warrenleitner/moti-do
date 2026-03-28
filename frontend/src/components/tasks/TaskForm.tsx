import { useState } from 'react';
import {
  Modal,
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
  Tooltip,
  TagsInput,
  DateTimePicker,
} from '../../ui';
import { IconPlus, IconTrash, IconInfoCircle } from '../../ui/icons';
import { ArcadeButton } from '../ui';
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
    <Box p={4}>
      {values.map((value) => (
        <Box key={value} mb={4}>
          <Text size="sm" fw={700} style={{ color: '#e6e7f5' }}>
            {emojis[value]} {labels[value]}
          </Text>
          <Text size="xs" style={{ color: '#a8aab7' }}>
            {descriptions[value]}
          </Text>
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
  allTasks?: Task[];  // For dependency selection
}

const defaultTask: Partial<Task> = {
  title: '',
  text_description: '',
  icon: '',
  priority: Priority.MEDIUM,
  difficulty: Difficulty.MEDIUM,
  duration: Duration.MEDIUM,
  is_habit: false,
  tags: [],
  subtasks: [],
};

/** Kinetic Console-styled select: void bg, ghost border, 0px radius */
const kcSelectStyles = {
  input: {
    backgroundColor: '#0B0E17',
    borderColor: 'rgba(69, 71, 82, 0.15)',
    borderRadius: 0,
    color: '#e6e7f5',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8125rem',
    '&:focus': {
      borderColor: '#81ecff',
      boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
    },
  },
  label: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#a8aab7',
  },
  dropdown: {
    backgroundColor: '#181B25',
    borderColor: 'rgba(69, 71, 82, 0.15)',
    borderRadius: 0,
  },
  option: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8125rem',
    color: '#e6e7f5',
    '&[data-selected]': {
      backgroundColor: 'rgba(129, 236, 255, 0.15)',
      color: '#81ecff',
    },
    '&[data-hovered]': {
      backgroundColor: '#272A34',
    },
  },
};

/** Kinetic Console-styled text input: void bg, ghost border, 0px radius */
const kcInputStyles = {
  input: {
    backgroundColor: '#0B0E17',
    borderColor: 'rgba(69, 71, 82, 0.15)',
    borderRadius: 0,
    color: '#e6e7f5',
    fontFamily: '"JetBrains Mono", monospace',
    '&:focus': {
      borderColor: '#81ecff',
      boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
    },
    '&::placeholder': {
      color: '#525560',
    },
  },
  label: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#a8aab7',
  },
};

// UI component - tested via integration tests
/* v8 ignore start */
export default function TaskForm({ open, task, onSave, onClose, allTasks = [] }: TaskFormProps) {
  // Initialize form data based on task prop
  // Note: Parent must use key={task?.id ?? 'new'} to reset state when task changes
  const getInitialFormData = () => (task ? { ...task } : { ...defaultTask });
  const [formData, setFormData] = useState<Partial<Task>>(getInitialFormData);
  const [newSubtask, setNewSubtask] = useState('');

  // Get defined tags and projects for autocomplete
  const definedTags = useDefinedTags();
  const definedProjects = useDefinedProjects();
  const projectNames = definedProjects.map((p) => p.name);
  const tagNames = definedTags.map((t) => t.name);

  const handleChange = (field: keyof Task, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const isEditing = !!task?.id;

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={
        <Text
          className="font-display gradient-text"
          fw={700}
          size="lg"
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {isEditing ? 'EDIT MISSION' : 'NEW MISSION'}
        </Text>
      }
      size="lg"
      key={task?.id || 'new'}
      styles={{
        content: {
          backgroundColor: '#10131C',
          border: '1px solid rgba(69, 71, 82, 0.15)',
          borderRadius: 0,
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
        },
        header: {
          backgroundColor: '#10131C',
          borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
        },
        overlay: {
          backgroundColor: 'rgba(16, 19, 28, 0.80)',
          backdropFilter: 'blur(12px)',
        },
        body: {
          backgroundColor: '#10131C',
        },
        close: {
          color: '#a8aab7',
          '&:hover': {
            backgroundColor: '#272A34',
          },
        },
      }}
    >
      <Stack gap="md">
        {/* Section header: IDENTIFICATION */}
        <Text
          className="font-data micro-meta"
          mt="xs"
          style={{ color: '#525560' }}
        >
          IDENTIFICATION
        </Text>

        {/* Title & Icon (Emoji) */}
        <Group wrap="nowrap" align="flex-end">
          <TextInput
            label="Icon"
            placeholder="Emoji"
            value={formData.icon || ''}
            onChange={(e) => handleChange('icon', e.currentTarget.value)}
            maxLength={5}
            autoComplete="off"
            style={{ width: 80, flex: 'none' }}
            styles={kcInputStyles}
          />
          <TextInput
            label="Title"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.currentTarget.value)}
            required
            autoFocus
            style={{ flex: 1 }}
            styles={kcInputStyles}
          />
        </Group>

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.text_description || ''}
          onChange={(e) => handleChange('text_description', e.currentTarget.value)}
          rows={3}
          styles={{
            input: {
              backgroundColor: '#0B0E17',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              '&:focus': {
                borderColor: '#81ecff',
                boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
              },
              '&::placeholder': {
                color: '#525560',
              },
            },
            label: {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.6875rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: '#a8aab7',
            },
          }}
        />

        {/* Section header: PARAMETERS */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          PARAMETERS
        </Text>

        {/* Priority, Difficulty, Duration row */}
        <Group grow>
          <Box pos="relative">
            <Tooltip
              label={
                <FieldInfoTooltip
                  values={Object.values(Priority)}
                  emojis={PriorityEmoji}
                  labels={{ [Priority.TRIVIAL]: 'Trivial', [Priority.LOW]: 'Low', [Priority.MEDIUM]: 'Medium', [Priority.HIGH]: 'High', [Priority.DEFCON_ONE]: 'Defcon One' }}
                  descriptions={PriorityDescription}
                />
              }
              position="top"
              withArrow
              multiline
              w={250}
            >
              <ActionIcon
                variant="subtle"
                size="xs"
                style={{ position: 'absolute', right: 0, top: 0, zIndex: 1, color: '#525560' }}
                aria-label="Priority info"
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
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
              styles={kcSelectStyles}
            />
          </Box>

          <Box pos="relative">
            <Tooltip
              label={
                <FieldInfoTooltip
                  values={Object.values(Difficulty)}
                  emojis={DifficultyEmoji}
                  labels={DifficultyLabel}
                  descriptions={DifficultyDescription}
                />
              }
              position="top"
              withArrow
              multiline
              w={250}
            >
              <ActionIcon
                variant="subtle"
                size="xs"
                style={{ position: 'absolute', right: 0, top: 0, zIndex: 1, color: '#525560' }}
                aria-label="Difficulty info"
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
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
              styles={kcSelectStyles}
            />
          </Box>

          <Box pos="relative">
            <Tooltip
              label={
                <FieldInfoTooltip
                  values={Object.values(Duration)}
                  emojis={DurationEmoji}
                  labels={DurationLabel}
                  descriptions={DurationDescription}
                />
              }
              position="top"
              withArrow
              multiline
              w={250}
            >
              <ActionIcon
                variant="subtle"
                size="xs"
                style={{ position: 'absolute', right: 0, top: 0, zIndex: 1, color: '#525560' }}
                aria-label="Duration info"
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
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
              styles={kcSelectStyles}
            />
          </Box>
        </Group>

        {/* Section header: SCHEDULE */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          SCHEDULE
        </Text>

        {/* Dates row */}
        <Group grow>
          <DateTimePicker
            label="Start Date"
            value={formData.start_date ? new Date(formData.start_date.includes('T') ? formData.start_date : formData.start_date + 'T00:00:00') : null}
            onChange={(value) =>
              handleChange('start_date', value ? new Date(value).toISOString().split('T')[0] : undefined)
            }
            clearable
            styles={{
              input: {
                backgroundColor: '#0B0E17',
                borderColor: 'rgba(69, 71, 82, 0.15)',
                borderRadius: 0,
                color: '#e6e7f5',
                fontFamily: '"JetBrains Mono", monospace',
              },
              label: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.6875rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: '#a8aab7',
              },
            }}
          />
          <DateTimePicker
            label="Due Date"
            value={formData.due_date ? new Date(formData.due_date.includes('T') ? formData.due_date : formData.due_date + 'T00:00:00') : null}
            onChange={(value) =>
              handleChange('due_date', value ? new Date(value).toISOString().split('T')[0] : undefined)
            }
            clearable
            styles={{
              input: {
                backgroundColor: '#0B0E17',
                borderColor: 'rgba(69, 71, 82, 0.15)',
                borderRadius: 0,
                color: '#e6e7f5',
                fontFamily: '"JetBrains Mono", monospace',
              },
              label: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.6875rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: '#a8aab7',
              },
            }}
          />
        </Group>

        {/* Section header: ORGANIZATION */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          ORGANIZATION
        </Text>

        {/* Project */}
        <TextInput
          label="Project"
          value={formData.project || ''}
          onChange={(e) => handleChange('project', e.currentTarget.value || undefined)}
          placeholder="e.g., Work, Personal, Side Project"
          list="project-suggestions"
          styles={kcInputStyles}
        />
        {/* Native datalist provides lightweight autocomplete for project names */}
        <datalist id="project-suggestions">
          {projectNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {/* Dependencies */}
        {allTasks.length > 0 && (
          <Box>
            <Text
              className="font-data micro-meta"
              mb="xs"
              style={{ color: '#a8aab7' }}
            >
              DEPENDENCIES (BLOCKED BY)
            </Text>
            {(formData.dependencies?.length ?? 0) > 0 && (
              <Group gap="xs" mb="xs" wrap="wrap">
                {allTasks
                  .filter((t) => formData.dependencies?.includes(t.id))
                  .map((t) => (
                    <Badge
                      key={t.id}
                      variant="light"
                      size="sm"
                      style={{
                        backgroundColor: 'rgba(129, 236, 255, 0.1)',
                        color: '#81ecff',
                        border: '1px solid rgba(129, 236, 255, 0.3)',
                        borderRadius: 0,
                      }}
                      rightSection={
                        <CloseButton
                          size="xs"
                          onClick={() =>
                            handleChange(
                              'dependencies',
                              formData.dependencies?.filter((id) => id !== t.id) || []
                            )
                          }
                          aria-label={`Remove ${t.title} dependency`}
                        />
                      }
                    >
                      {`${t.icon || ''} ${t.title}`.trim()}
                    </Badge>
                  ))}
              </Group>
            )}
            <Select
              searchable
              placeholder="Select tasks that must be completed first"
              data={allTasks
                .filter(
                  (t) =>
                    t.id !== task?.id &&
                    !t.is_complete &&
                    !formData.dependencies?.includes(t.id)
                )
                .map((t) => ({
                  value: t.id,
                  label: `${t.icon || ''} ${t.title}`.trim(),
                }))}
              value={null}
              onChange={(val) => {
                if (val) {
                  handleChange('dependencies', [...(formData.dependencies || []), val]);
                }
              }}
              styles={kcSelectStyles}
            />
            <Text size="xs" mt={4} style={{ color: '#525560' }} className="font-data">
              This task will be blocked until all dependencies are complete
            </Text>
          </Box>
        )}

        {/* Section header: RECURRENCE */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          RECURRENCE
        </Text>

        {/* Recurring toggle - enables recurrence for any task */}
        <Switch
          label="Recurring Task"
          checked={!!formData.recurrence_rule}
          onChange={(e) => {
            const isRecurring = e.currentTarget.checked;
            setFormData((prev) => ({
              ...prev,
              recurrence_rule: isRecurring ? (prev.recurrence_rule || 'FREQ=DAILY') : undefined,
            }));
          }}
          styles={{
            label: {
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8125rem',
            },
          }}
        />

        {/* Recurrence options (when recurring is enabled) */}
        {formData.recurrence_rule && (
          <>
            <Box>
              <Text
                className="font-data micro-meta"
                mb="xs"
                style={{ color: '#a8aab7' }}
              >
                RECURRENCE PATTERN
              </Text>
              <RecurrenceRuleBuilder
                value={formData.recurrence_rule || 'FREQ=DAILY'}
                onChange={(rrule) => handleChange('recurrence_rule', rrule)}
              />

              {/* Next occurrence preview */}
              <Text size="xs" mt="xs" className="font-data" style={{ color: '#525560' }}>
                {getNextOccurrenceText(
                  formData.recurrence_rule,
                  formData.due_date ? new Date(formData.due_date) : undefined
                )}
              </Text>
            </Box>

            <Select
              label="Recurrence Style"
              value={formData.recurrence_type || RecurrenceType.FROM_DUE_DATE}
              onChange={(val) => handleChange('recurrence_type', val)}
              data={[
                {
                  value: RecurrenceType.FROM_DUE_DATE,
                  label: 'From Due Date - Next due = previous due + pattern',
                },
                {
                  value: RecurrenceType.FROM_COMPLETION,
                  label: 'From Completion - Next due = completion date + pattern',
                },
                {
                  value: RecurrenceType.STRICT,
                  label: 'Strict - Always recur on schedule regardless of completion',
                },
              ]}
              styles={kcSelectStyles}
            />

            {/* Habit toggle - adds streak tracking for recurring tasks */}
            <Switch
              label="Track as Habit (enables streak tracking)"
              checked={formData.is_habit || false}
              onChange={(e) => handleChange('is_habit', e.currentTarget.checked)}
              styles={{
                label: {
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8125rem',
                },
              }}
            />

            {/* Subtask recurrence mode (when recurring AND has subtasks) */}
            {(formData.subtasks?.length ?? 0) > 0 && (
              <Select
                label="Subtask Recurrence"
                value={formData.subtask_recurrence_mode || SubtaskRecurrenceMode.DEFAULT}
                onChange={(val) => handleChange('subtask_recurrence_mode', val)}
                data={[
                  {
                    value: SubtaskRecurrenceMode.DEFAULT,
                    label: 'All Complete First - New recurrence only after all subtasks complete',
                  },
                  {
                    value: SubtaskRecurrenceMode.PARTIAL,
                    label: 'Carry Over Completed - Copy only completed subtasks to next',
                  },
                  {
                    value: SubtaskRecurrenceMode.ALWAYS,
                    label: 'Always Copy All - Full subtask list regardless of completion',
                  },
                ]}
                styles={kcSelectStyles}
              />
            )}
          </>
        )}

        <Divider style={{ borderColor: 'rgba(69, 71, 82, 0.15)' }} />

        {/* Section header: METADATA */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          METADATA
        </Text>

        {/* Tags */}
        <TagsInput
          label="Tags"
          value={formData.tags || []}
          onChange={(tags) => handleChange('tags', tags)}
          data={tagNames.filter((t) => !formData.tags?.includes(t))}
          placeholder="Add tags..."
          styles={{
            input: {
              backgroundColor: '#0B0E17',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              '&:focus-within': {
                borderColor: '#81ecff',
                boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
              },
            },
            label: {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.6875rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: '#a8aab7',
            },
            pill: {
              backgroundColor: 'rgba(129, 236, 255, 0.1)',
              color: '#81ecff',
              borderRadius: 0,
            },
          }}
        />

        {/* Section header: SUBTASKS */}
        <Text
          className="font-data micro-meta"
          style={{ color: '#525560' }}
        >
          SUBTASKS
        </Text>

        {/* Subtasks */}
        <Box>
          {formData.subtasks?.map((subtask, index) => (
            <Group
              key={index}
              gap="xs"
              mb={4}
              style={{
                backgroundColor: '#272A34',
                border: '1px solid rgba(69, 71, 82, 0.15)',
                padding: '6px 10px',
              }}
            >
              <Text
                size="sm"
                className="font-data"
                style={{ flex: 1, color: '#e6e7f5' }}
              >
                • {subtask.text}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => handleRemoveSubtask(index)}
                aria-label="Remove subtask"
                style={{ color: '#ff6b9b' }}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Group gap="xs">
            <TextInput
              size="sm"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.currentTarget.value)}
              placeholder="Add subtask..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              style={{ flex: 1 }}
              styles={kcInputStyles}
            />
            <ActionIcon
              onClick={handleAddSubtask}
              size="sm"
              variant="light"
              aria-label="Add subtask"
              style={{
                backgroundColor: 'rgba(129, 236, 255, 0.1)',
                color: '#81ecff',
                border: '1px solid rgba(129, 236, 255, 0.3)',
                borderRadius: 0,
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Group>
        </Box>

        {/* Actions */}
        <Group justify="flex-end" mt="md" gap="sm">
          <ArcadeButton variant="ghost" onClick={onClose}>
            CANCEL
          </ArcadeButton>
          <ArcadeButton variant="primary" onClick={handleSubmit} disabled={!formData.title?.trim()}>
            {isEditing ? 'SAVE CHANGES' : 'CREATE MISSION'}
          </ArcadeButton>
        </Group>
      </Stack>
    </Modal>
  );
}
/* v8 ignore stop */
