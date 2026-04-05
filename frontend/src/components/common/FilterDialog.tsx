import { useState } from 'react';
import {
  Box,
  Group,
  Stack,
  Checkbox,
  Divider,
  Text,
  Modal,
  DatePickerInput,
  Indicator,
} from '../../ui';
import { IconFilter, IconX } from '../../ui/icons';
import { format, parseISO } from 'date-fns';
import {
  Priority,
  PriorityEmoji,
  Difficulty,
  DifficultyEmoji,
  Duration,
  DurationEmoji,
} from '../../types';
import type { StatusFilter } from '../../types/filters';
import { ArcadeButton } from '../ui';
import SearchInput from './SearchInput';

interface FilterDialogProps {
  search: string;
  onSearchChange: (value: string) => void;
  statuses: StatusFilter[];
  onStatusesChange: (statuses: StatusFilter[]) => void;
  priorities: Priority[];
  onPrioritiesChange: (priorities: Priority[]) => void;
  difficulties: Difficulty[];
  onDifficultiesChange: (difficulties: Difficulty[]) => void;
  durations: Duration[];
  onDurationsChange: (durations: Duration[]) => void;
  selectedProjects: string[];
  onProjectsChange: (projects: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  projects: string[];
  tags: string[];
  minDueDate?: string;
  maxDueDate?: string;
  onMinDueDateChange: (date: string | undefined) => void;
  onMaxDueDateChange: (date: string | undefined) => void;
  minStartDate?: string;
  maxStartDate?: string;
  onMinStartDateChange: (date: string | undefined) => void;
  onMaxStartDateChange: (date: string | undefined) => void;
  onReset: () => void;
}

// Priority options in display order
const priorityOptions: { value: Priority; label: string }[] = [
  { value: Priority.DEFCON_ONE, label: `${PriorityEmoji[Priority.DEFCON_ONE]} Defcon One` },
  { value: Priority.HIGH, label: `${PriorityEmoji[Priority.HIGH]} High` },
  { value: Priority.MEDIUM, label: `${PriorityEmoji[Priority.MEDIUM]} Medium` },
  { value: Priority.LOW, label: `${PriorityEmoji[Priority.LOW]} Low` },
  { value: Priority.TRIVIAL, label: `${PriorityEmoji[Priority.TRIVIAL]} Trivial` },
];

// Difficulty options in display order
const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: Difficulty.HERCULEAN, label: `${DifficultyEmoji[Difficulty.HERCULEAN]} Herculean` },
  { value: Difficulty.HIGH, label: `${DifficultyEmoji[Difficulty.HIGH]} High` },
  { value: Difficulty.MEDIUM, label: `${DifficultyEmoji[Difficulty.MEDIUM]} Medium` },
  { value: Difficulty.LOW, label: `${DifficultyEmoji[Difficulty.LOW]} Low` },
  { value: Difficulty.TRIVIAL, label: `${DifficultyEmoji[Difficulty.TRIVIAL]} Trivial` },
];

// Duration options in display order
const durationOptions: { value: Duration; label: string }[] = [
  { value: Duration.ODYSSEYAN, label: `${DurationEmoji[Duration.ODYSSEYAN]} Odysseyan` },
  { value: Duration.LONG, label: `${DurationEmoji[Duration.LONG]} Long` },
  { value: Duration.MEDIUM, label: `${DurationEmoji[Duration.MEDIUM]} Medium` },
  { value: Duration.SHORT, label: `${DurationEmoji[Duration.SHORT]} Short` },
  { value: Duration.MINUSCULE, label: `${DurationEmoji[Duration.MINUSCULE]} Minuscule` },
];

// Helper to toggle a value in an array (for multi-select checkboxes)
function toggleArrayValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

// Status options for checkboxes
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'blocked', label: 'BLOCKED' },
  { value: 'future', label: 'FUTURE' },
  { value: 'completed', label: 'COMPLETED' },
  { value: 'all', label: 'ALL' },
];

export default function FilterDialog({
  search,
  onSearchChange,
  statuses,
  onStatusesChange,
  priorities,
  onPrioritiesChange,
  difficulties,
  onDifficultiesChange,
  durations,
  onDurationsChange,
  selectedProjects,
  onProjectsChange,
  selectedTags,
  onTagsChange,
  projects,
  tags,
  minDueDate,
  maxDueDate,
  onMinDueDateChange,
  onMaxDueDateChange,
  minStartDate,
  maxStartDate,
  onMinStartDateChange,
  onMaxStartDateChange,
  onReset,
}: FilterDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Local copies of filter state for editing inside the dialog
  const [localStatuses, setLocalStatuses] = useState(statuses);
  const [localPriorities, setLocalPriorities] = useState(priorities);
  const [localDifficulties, setLocalDifficulties] = useState(difficulties);
  const [localDurations, setLocalDurations] = useState(durations);
  const [localProjects, setLocalProjects] = useState(selectedProjects);
  const [localTags, setLocalTags] = useState(selectedTags);
  const [localMinDueDate, setLocalMinDueDate] = useState(minDueDate);
  const [localMaxDueDate, setLocalMaxDueDate] = useState(maxDueDate);
  const [localMinStartDate, setLocalMinStartDate] = useState(minStartDate);
  const [localMaxStartDate, setLocalMaxStartDate] = useState(maxStartDate);

  // Sync local state from props when dialog opens
  const openDialog = () => {
    setLocalStatuses(statuses);
    setLocalPriorities(priorities);
    setLocalDifficulties(difficulties);
    setLocalDurations(durations);
    setLocalProjects(selectedProjects);
    setLocalTags(selectedTags);
    setLocalMinDueDate(minDueDate);
    setLocalMaxDueDate(maxDueDate);
    setLocalMinStartDate(minStartDate);
    setLocalMaxStartDate(maxStartDate);
    setDialogOpen(true);
  };

  // Count active filters for badge (excluding search)
  const isNonDefaultStatus = !(statuses.length === 1 && statuses[0] === 'active');
  const activeFilterCount =
    (isNonDefaultStatus ? 1 : 0) +
    priorities.length +
    difficulties.length +
    durations.length +
    selectedProjects.length +
    selectedTags.length +
    (minDueDate ? 1 : 0) +
    (maxDueDate ? 1 : 0) +
    (minStartDate ? 1 : 0) +
    (maxStartDate ? 1 : 0);

  const handleApply = () => {
    onStatusesChange(localStatuses);
    onPrioritiesChange(localPriorities);
    onDifficultiesChange(localDifficulties);
    onDurationsChange(localDurations);
    onProjectsChange(localProjects);
    onTagsChange(localTags);
    onMinDueDateChange(localMinDueDate);
    onMaxDueDateChange(localMaxDueDate);
    onMinStartDateChange(localMinStartDate);
    onMaxStartDateChange(localMaxStartDate);
    setDialogOpen(false);
  };

  const handleReset = () => {
    onReset();
    setDialogOpen(false);
  };

  /* v8 ignore start -- DatePickerInput onChange callback not exercisable in JSDOM */
  const handleDateChange = (setter: (val: string | undefined) => void) => (date: string | Date | null) => {
    const d = date ? new Date(date) : null;
    if (d && !isNaN(d.getTime())) {
      setter(format(d, 'yyyy-MM-dd'));
    } else {
      setter(undefined);
    }
  };
  /* v8 ignore stop */

  const sectionLabelStyle = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#a8aab7',
    fontWeight: 600,
  };

  const dateInputStyle = {
    backgroundColor: '#0B0E17',
    borderColor: 'rgba(69, 71, 82, 0.15)',
    borderRadius: 0,
    color: '#e6e7f5',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8125rem',
  };

  return (
    <Box mb="lg">
      {/* Compact bar: Search + Filter button */}
      <Group gap="sm" align="center" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search tasks..."
          />
        </Box>
        <Indicator label={activeFilterCount} color="blue" size={16} disabled={activeFilterCount === 0}>
          <ArcadeButton
            variant="ghost"
            size="xs"
            onClick={openDialog}
            aria-label="Open filters"
          >
            <Group gap={4}>
              <IconFilter size={16} />
              FILTERS
            </Group>
          </ArcadeButton>
        </Indicator>
      </Group>

      {/* Filter dialog */}
      <Modal
        opened={dialogOpen}
        onClose={() => setDialogOpen(false)}
        size="md"
        styles={{
          content: {
            backgroundColor: '#181B25',
            border: '1px solid rgba(69, 71, 82, 0.15)',
            borderRadius: 0,
          },
          header: {
            backgroundColor: '#181B25',
            borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
          },
          body: {
            padding: 16,
          },
        }}
        title={
          <Text
            fw={700}
            size="lg"
            className="font-display"
            style={{ color: '#81ecff', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            FILTER TASKS
          </Text>
        }
      >
        <Stack gap="md">
          {/* Status filter (multi-select) */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Status</Text>
            <Group gap="xs" wrap="wrap">
              {STATUS_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={localStatuses.includes(opt.value)}
                  onChange={() => setLocalStatuses(toggleArrayValue(localStatuses, opt.value))}
                  size="sm"
                  styles={{
                    label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                  }}
                />
              ))}
            </Group>
          </Box>

          <Divider style={{ borderColor: 'rgba(69, 71, 82, 0.15)' }} />

          {/* Priority */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Priority</Text>
            <Group gap="xs" wrap="wrap">
              {priorityOptions.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={localPriorities.includes(opt.value)}
                  onChange={() => setLocalPriorities(toggleArrayValue(localPriorities, opt.value))}
                  size="sm"
                  styles={{
                    label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                  }}
                />
              ))}
            </Group>
          </Box>

          {/* Difficulty */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Difficulty</Text>
            <Group gap="xs" wrap="wrap">
              {difficultyOptions.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={localDifficulties.includes(opt.value)}
                  onChange={() => setLocalDifficulties(toggleArrayValue(localDifficulties, opt.value))}
                  size="sm"
                  styles={{
                    label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                  }}
                />
              ))}
            </Group>
          </Box>

          {/* Duration */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Duration</Text>
            <Group gap="xs" wrap="wrap">
              {durationOptions.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={localDurations.includes(opt.value)}
                  onChange={() => setLocalDurations(toggleArrayValue(localDurations, opt.value))}
                  size="sm"
                  styles={{
                    label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                  }}
                />
              ))}
            </Group>
          </Box>

          {/* Project (only shown when projects exist) */}
          {projects.length > 0 && (
            <Box>
              <Text style={sectionLabelStyle} mb={6}>Project</Text>
              <Group gap="xs" wrap="wrap">
                {projects.map((p) => (
                  <Checkbox
                    key={p}
                    label={p}
                    checked={localProjects.includes(p)}
                    onChange={() => setLocalProjects(toggleArrayValue(localProjects, p))}
                    size="sm"
                    styles={{
                      label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                    }}
                  />
                ))}
              </Group>
            </Box>
          )}

          {/* Tags (only shown when tags exist) */}
          {tags.length > 0 && (
            <Box>
              <Text style={sectionLabelStyle} mb={6}>Tags</Text>
              <Group gap="xs" wrap="wrap">
                {tags.map((t) => (
                  <Checkbox
                    key={t}
                    label={t}
                    checked={localTags.includes(t)}
                    onChange={() => setLocalTags(toggleArrayValue(localTags, t))}
                    size="sm"
                    styles={{
                      label: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                    }}
                  />
                ))}
              </Group>
            </Box>
          )}

          {/* Due Date Range */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Due Date</Text>
            <Group gap="xs" grow>
              <DatePickerInput
                size="sm"
                value={localMinDueDate ? parseISO(localMinDueDate) : null}
                onChange={handleDateChange(setLocalMinDueDate)}
                clearable
                placeholder="From"
                styles={{
                  input: dateInputStyle,
                }}
              />
              <DatePickerInput
                size="sm"
                value={localMaxDueDate ? parseISO(localMaxDueDate) : null}
                onChange={handleDateChange(setLocalMaxDueDate)}
                clearable
                placeholder="To"
                styles={{
                  input: dateInputStyle,
                }}
              />
            </Group>
          </Box>

          {/* Start Date Range */}
          <Box>
            <Text style={sectionLabelStyle} mb={6}>Start Date</Text>
            <Group gap="xs" grow>
              <DatePickerInput
                size="sm"
                value={localMinStartDate ? parseISO(localMinStartDate) : null}
                onChange={handleDateChange(setLocalMinStartDate)}
                clearable
                placeholder="From"
                styles={{
                  input: dateInputStyle,
                }}
              />
              <DatePickerInput
                size="sm"
                value={localMaxStartDate ? parseISO(localMaxStartDate) : null}
                onChange={handleDateChange(setLocalMaxStartDate)}
                clearable
                placeholder="To"
                styles={{
                  input: dateInputStyle,
                }}
              />
            </Group>
          </Box>

          <Divider style={{ borderColor: 'rgba(69, 71, 82, 0.15)' }} />

          {/* Action buttons */}
          <Group justify="space-between">
            <ArcadeButton
              variant="ghost"
              size="xs"
              onClick={handleReset}
            >
              <Group gap={4}>
                <IconX size={14} />
                CLEAR ALL
              </Group>
            </ArcadeButton>
            <ArcadeButton
              variant="primary"
              onClick={handleApply}
            >
              APPLY FILTERS
            </ArcadeButton>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
