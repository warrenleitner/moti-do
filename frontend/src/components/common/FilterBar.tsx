import { useState } from 'react';
import {
  Box,
  Select,
  Badge,
  Indicator,
  Group,
  Stack,
  Checkbox,
  CloseButton,
  Drawer,
  Divider,
  Text,
  DatePickerInput,
  useMediaQuery,
} from '../../ui';
import { IconFilter, IconX } from '../../ui/icons';
import { format } from 'date-fns';
import {
  Priority,
  PriorityEmoji,
  Difficulty,
  DifficultyEmoji,
  Duration,
  DurationEmoji,
} from '../../types';
import { ArcadeButton } from '../ui';
import SearchInput from './SearchInput';

type StatusFilter = 'all' | 'active' | 'completed' | 'blocked' | 'future';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
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
  maxDueDate?: string;
  onMaxDueDateChange: (date: string | undefined) => void;
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

// Status tabs for Kinetic Console
const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'blocked', label: 'BLOCKED' },
  { value: 'future', label: 'FUTURE' },
  { value: 'completed', label: 'COMPLETED' },
  { value: 'all', label: 'ALL' },
];

// Helper to toggle a value in an array (for multi-select checkboxes)
function toggleArrayValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

/** Kinetic Console-styled select: void bg, ghost border, 0px radius, JetBrains Mono options */
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

// UI component - tested via integration tests
/* v8 ignore start */
export default function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
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
  maxDueDate,
  onMaxDueDateChange,
  onReset,
}: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const hasActiveFilters =
    search ||
    status !== 'active' ||
    priorities.length > 0 ||
    difficulties.length > 0 ||
    durations.length > 0 ||
    selectedProjects.length > 0 ||
    selectedTags.length > 0 ||
    maxDueDate;

  // Count active filters for badge (excluding search and status=active)
  const activeFilterCount =
    (status !== 'active' ? 1 : 0) +
    priorities.length +
    difficulties.length +
    durations.length +
    selectedProjects.length +
    selectedTags.length +
    (maxDueDate ? 1 : 0);

  // Shared filter controls - used in both mobile drawer and desktop inline view
  const filterControls = (
    <>
      <Select
        label="Priority"
        size="sm"
        w={isMobile ? '100%' : 140}
        value={priorities.length === 1 ? priorities[0] : priorities.length > 1 ? '__multiple__' : null}
        placeholder={priorities.length > 1 ? `${priorities.length} selected` : 'All'}
        onChange={() => {/* handled by renderOption */}}
        data={priorityOptions.map((o) => ({ value: o.value, label: o.label }))}
        styles={kcSelectStyles}
        renderOption={({ option }) => (
          <Group gap="xs" wrap="nowrap" onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onPrioritiesChange(toggleArrayValue(priorities, option.value as Priority));
          }}>
            <Checkbox
              checked={priorities.includes(option.value as Priority)}
              onChange={() => {}}
              size="xs"
              tabIndex={-1}
              style={{ pointerEvents: 'none' }}
            />
            <Text size="sm" className="font-data">{option.label}</Text>
          </Group>
        )}
      />

      <Select
        label="Difficulty"
        size="sm"
        w={isMobile ? '100%' : 140}
        value={difficulties.length === 1 ? difficulties[0] : difficulties.length > 1 ? '__multiple__' : null}
        placeholder={difficulties.length > 1 ? `${difficulties.length} selected` : 'All'}
        onChange={() => {/* handled by renderOption */}}
        data={difficultyOptions.map((o) => ({ value: o.value, label: o.label }))}
        styles={kcSelectStyles}
        renderOption={({ option }) => (
          <Group gap="xs" wrap="nowrap" onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDifficultiesChange(toggleArrayValue(difficulties, option.value as Difficulty));
          }}>
            <Checkbox
              checked={difficulties.includes(option.value as Difficulty)}
              onChange={() => {}}
              size="xs"
              tabIndex={-1}
              style={{ pointerEvents: 'none' }}
            />
            <Text size="sm" className="font-data">{option.label}</Text>
          </Group>
        )}
      />

      <Select
        label="Duration"
        size="sm"
        w={isMobile ? '100%' : 140}
        value={durations.length === 1 ? durations[0] : durations.length > 1 ? '__multiple__' : null}
        placeholder={durations.length > 1 ? `${durations.length} selected` : 'All'}
        onChange={() => {/* handled by renderOption */}}
        data={durationOptions.map((o) => ({ value: o.value, label: o.label }))}
        styles={kcSelectStyles}
        renderOption={({ option }) => (
          <Group gap="xs" wrap="nowrap" onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDurationsChange(toggleArrayValue(durations, option.value as Duration));
          }}>
            <Checkbox
              checked={durations.includes(option.value as Duration)}
              onChange={() => {}}
              size="xs"
              tabIndex={-1}
              style={{ pointerEvents: 'none' }}
            />
            <Text size="sm" className="font-data">{option.label}</Text>
          </Group>
        )}
      />

      {projects.length > 0 && (
        <Select
          label="Project"
          size="sm"
          w={isMobile ? '100%' : 140}
          value={selectedProjects.length === 1 ? selectedProjects[0] : selectedProjects.length > 1 ? '__multiple__' : null}
          placeholder={selectedProjects.length > 1 ? `${selectedProjects.length} selected` : 'All'}
          onChange={() => {/* handled by renderOption */}}
          data={projects.map((p) => ({ value: p, label: p }))}
          styles={kcSelectStyles}
          renderOption={({ option }) => (
            <Group gap="xs" wrap="nowrap" onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onProjectsChange(toggleArrayValue(selectedProjects, option.value));
            }}>
              <Checkbox
                checked={selectedProjects.includes(option.value)}
                onChange={() => {}}
                size="xs"
                tabIndex={-1}
                style={{ pointerEvents: 'none' }}
              />
              <Text size="sm" className="font-data">{option.label}</Text>
            </Group>
          )}
        />
      )}

      {tags.length > 0 && (
        <Select
          label="Tag"
          size="sm"
          w={isMobile ? '100%' : 140}
          value={selectedTags.length === 1 ? selectedTags[0] : selectedTags.length > 1 ? '__multiple__' : null}
          placeholder={selectedTags.length > 1 ? `${selectedTags.length} selected` : 'All'}
          onChange={() => {/* handled by renderOption */}}
          data={tags.map((t) => ({ value: t, label: t }))}
          styles={kcSelectStyles}
          renderOption={({ option }) => (
            <Group gap="xs" wrap="nowrap" onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onTagsChange(toggleArrayValue(selectedTags, option.value));
            }}>
              <Checkbox
                checked={selectedTags.includes(option.value)}
                onChange={() => {}}
                size="xs"
                tabIndex={-1}
                style={{ pointerEvents: 'none' }}
              />
              <Text size="sm" className="font-data">{option.label}</Text>
            </Group>
          )}
        />
      )}

      <DatePickerInput
        label="Due before"
        size="sm"
        w={isMobile ? '100%' : 160}
        value={maxDueDate ? new Date(maxDueDate + 'T00:00:00') : null}
        onChange={(date: string | Date | null) => {
          const d = date ? new Date(date) : null;
          if (d && !isNaN(d.getTime())) {
            onMaxDueDateChange(format(d, 'yyyy-MM-dd'));
          } else {
            onMaxDueDateChange(undefined);
          }
        }}
        clearable
        placeholder="Pick a date"
        styles={{
          input: {
            backgroundColor: '#0B0E17',
            borderColor: 'rgba(69, 71, 82, 0.15)',
            borderRadius: 0,
            color: '#e6e7f5',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8125rem',
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

      {hasActiveFilters && (
        <ArcadeButton
          variant="ghost"
          size="xs"
          onClick={onReset}
          style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end', width: isMobile ? '100%' : 'auto' }}
        >
          <Group gap={4}>
            <IconX size={14} />
            CLEAR FILTERS
          </Group>
        </ArcadeButton>
      )}
    </>
  );

  // Active filter chips - shown in both mobile and desktop
  const activeFilterChips = hasActiveFilters && (
    <Group gap="xs" mt="sm" wrap="wrap">
      <IconFilter size={18} color="#525560" style={{ marginRight: 4 }} />
      {search && (
        <Badge
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onSearchChange('')} aria-label="Clear search filter" data-testid="CancelIcon" />
          }
        >
          Search: &quot;{search}&quot;
        </Badge>
      )}
      {status !== 'active' && (
        <Badge
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onStatusChange('active')} aria-label="Clear status filter" data-testid="CancelIcon" />
          }
        >
          Status: {status}
        </Badge>
      )}
      {priorities.map((p) => (
        <Badge
          key={p}
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onPrioritiesChange(priorities.filter((x) => x !== p))} aria-label="Clear priority filter" data-testid="CancelIcon" />
          }
        >
          Priority: {p}
        </Badge>
      ))}
      {difficulties.map((d) => (
        <Badge
          key={d}
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onDifficultiesChange(difficulties.filter((x) => x !== d))} aria-label="Clear difficulty filter" data-testid="CancelIcon" />
          }
        >
          Difficulty: {d}
        </Badge>
      ))}
      {durations.map((d) => (
        <Badge
          key={d}
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onDurationsChange(durations.filter((x) => x !== d))} aria-label="Clear duration filter" data-testid="CancelIcon" />
          }
        >
          Duration: {d}
        </Badge>
      ))}
      {selectedProjects.map((p) => (
        <Badge
          key={p}
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onProjectsChange(selectedProjects.filter((x) => x !== p))} aria-label="Clear project filter" data-testid="CancelIcon" />
          }
        >
          Project: {p}
        </Badge>
      ))}
      {selectedTags.map((t) => (
        <Badge
          key={t}
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onTagsChange(selectedTags.filter((x) => x !== t))} aria-label="Clear tag filter" data-testid="CancelIcon" />
          }
        >
          Tag: {t}
        </Badge>
      ))}
      {maxDueDate && (
        <Badge
          variant="light"
          size="sm"
          style={{ backgroundColor: 'rgba(129, 236, 255, 0.1)', color: '#81ecff', border: '1px solid rgba(129, 236, 255, 0.3)', borderRadius: 0 }}
          rightSection={
            <CloseButton size="xs" onClick={() => onMaxDueDateChange(undefined)} aria-label="Clear due date filter" data-testid="CancelIcon" />
          }
        >
          Due before: {maxDueDate}
        </Badge>
      )}
    </Group>
  );

  // Mobile view: compact bar + drawer
  if (isMobile) {
    return (
      <Box mb="lg">
        {/* Status tabs (mobile) */}
        <Box
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
            marginBottom: 12,
            overflowX: 'auto',
          }}
        >
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: status === tab.value ? '2px solid #81ecff' : '2px solid transparent',
                padding: '8px 16px',
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: status === tab.value ? '#81ecff' : '#9BA3AF',
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </Box>

        {/* Compact mobile filter bar */}
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
              onClick={() => setDrawerOpen(true)}
            >
              <Group gap={4}>
                <IconFilter size={16} />
                FILTERS
              </Group>
            </ArcadeButton>
          </Indicator>
          {activeFilterCount === 0 && (
            <ArcadeButton
              variant="ghost"
              size="xs"
              onClick={() => setDrawerOpen(true)}
            >
              <Group gap={4}>
                <IconFilter size={16} />
                FILTERS
              </Group>
            </ArcadeButton>
          )}
        </Group>

        {/* Active filter chips below search bar */}
        {activeFilterChips}

        {/* Filter drawer */}
        <Drawer
          opened={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          position="bottom"
          size="auto"
          styles={{
            content: {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              maxHeight: '80vh',
              backgroundColor: '#181B25',
              borderTop: '1px solid rgba(69, 71, 82, 0.15)',
            },
          }}
        >
          <Box p="md">
            {/* Drawer header */}
            <Group justify="space-between" align="center" mb="md">
              <Text
                fw={700}
                size="lg"
                className="font-display"
                style={{ color: '#81ecff', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                FILTER TASKS
              </Text>
              <CloseButton onClick={() => setDrawerOpen(false)} style={{ color: '#a8aab7' }} />
            </Group>
            <Divider mb="md" style={{ borderColor: 'rgba(69, 71, 82, 0.15)' }} />

            {/* Filter controls in vertical stack */}
            <Stack gap="sm">
              {filterControls}
            </Stack>

            {/* Apply button */}
            <Box mt="lg">
              <ArcadeButton
                variant="primary"
                fullWidth
                onClick={() => setDrawerOpen(false)}
              >
                APPLY FILTERS
              </ArcadeButton>
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  }

  // Desktop view: status tabs + inline filters
  return (
    <Box mb="lg">
      {/* Status tabs */}
      <Box
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
          marginBottom: 16,
        }}
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onStatusChange(tab.value)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: status === tab.value ? '2px solid #81ecff' : '2px solid transparent',
              padding: '8px 20px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: status === tab.value ? '#81ecff' : '#9BA3AF',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (status !== tab.value) (e.currentTarget.style.color = '#e6e7f5');
            }}
            onMouseLeave={(e) => {
              if (status !== tab.value) (e.currentTarget.style.color = '#9BA3AF');
            }}
          >
            {tab.label}
          </button>
        ))}
      </Box>

      {/* Main filter row */}
      <Group gap="sm" align="flex-start" wrap="wrap">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search tasks..."
        />
        {filterControls}
      </Group>

      {/* Active filter chips */}
      {activeFilterChips}
    </Box>
  );
}
/* v8 ignore stop */
