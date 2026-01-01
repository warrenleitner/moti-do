import type { SelectChangeEvent } from '@mui/material';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import {
  Priority,
  PriorityEmoji,
  Difficulty,
  DifficultyEmoji,
  Duration,
  DurationEmoji,
} from '../../types';
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
  const hasActiveFilters =
    search ||
    status !== 'active' ||
    priorities.length > 0 ||
    difficulties.length > 0 ||
    durations.length > 0 ||
    selectedProjects.length > 0 ||
    selectedTags.length > 0 ||
    maxDueDate;

  const handlePriorityChange = (event: SelectChangeEvent<Priority[]>) => {
    const value = event.target.value;
    onPrioritiesChange(typeof value === 'string' ? (value.split(',') as Priority[]) : value);
  };

  const handleDifficultyChange = (event: SelectChangeEvent<Difficulty[]>) => {
    const value = event.target.value;
    onDifficultiesChange(typeof value === 'string' ? (value.split(',') as Difficulty[]) : value);
  };

  const handleDurationChange = (event: SelectChangeEvent<Duration[]>) => {
    const value = event.target.value;
    onDurationsChange(typeof value === 'string' ? (value.split(',') as Duration[]) : value);
  };

  const handleProjectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onProjectsChange(typeof value === 'string' ? value.split(',') : value);
  };

  const handleTagChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onTagsChange(typeof value === 'string' ? value.split(',') : value);
  };

  const renderPriorityValue = (selected: Priority[]) => {
    if (selected.length === 0) return '';
    if (selected.length === 1) {
      const option = priorityOptions.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  const renderDifficultyValue = (selected: Difficulty[]) => {
    if (selected.length === 0) return '';
    if (selected.length === 1) {
      const option = difficultyOptions.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  const renderDurationValue = (selected: Duration[]) => {
    if (selected.length === 0) return '';
    if (selected.length === 1) {
      const option = durationOptions.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  const renderMultiValue = (selected: string[]) => {
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main filter row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search tasks..."
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="blocked">Blocked</MenuItem>
            <MenuItem value="future">Future</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            multiple
            value={priorities}
            onChange={handlePriorityChange}
            input={<OutlinedInput label="Priority" />}
            renderValue={renderPriorityValue}
          >
            {priorityOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={priorities.includes(option.value)} size="small" />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Difficulty</InputLabel>
          <Select
            multiple
            value={difficulties}
            onChange={handleDifficultyChange}
            input={<OutlinedInput label="Difficulty" />}
            renderValue={renderDifficultyValue}
          >
            {difficultyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={difficulties.includes(option.value)} size="small" />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Duration</InputLabel>
          <Select
            multiple
            value={durations}
            onChange={handleDurationChange}
            input={<OutlinedInput label="Duration" />}
            renderValue={renderDurationValue}
          >
            {durationOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={durations.includes(option.value)} size="small" />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {projects.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Project</InputLabel>
            <Select
              multiple
              value={selectedProjects}
              onChange={handleProjectChange}
              input={<OutlinedInput label="Project" />}
              renderValue={renderMultiValue}
            >
              {projects.map((p) => (
                <MenuItem key={p} value={p}>
                  <Checkbox checked={selectedProjects.includes(p)} size="small" />
                  <ListItemText primary={p} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {tags.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tag</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={handleTagChange}
              input={<OutlinedInput label="Tag" />}
              renderValue={renderMultiValue}
            >
              {tags.map((t) => (
                <MenuItem key={t} value={t}>
                  <Checkbox checked={selectedTags.includes(t)} size="small" />
                  <ListItemText primary={t} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Due before"
            value={maxDueDate ? new Date(maxDueDate + 'T00:00:00') : null}
            onChange={(date) => {
              if (date && !isNaN(date.getTime())) {
                onMaxDueDateChange(format(date, 'yyyy-MM-dd'));
              } else {
                onMaxDueDateChange(undefined);
              }
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
              },
              field: {
                clearable: true,
                onClear: () => onMaxDueDateChange(undefined),
              },
            }}
          />
        </LocalizationProvider>

        {hasActiveFilters && (
          <Button
            startIcon={<Clear />}
            onClick={onReset}
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <FilterList color="action" sx={{ mr: 1 }} />
          {search && (
            <Chip
              label={`Search: "${search}"`}
              size="small"
              onDelete={() => onSearchChange('')}
            />
          )}
          {status !== 'active' && (
            <Chip
              label={`Status: ${status}`}
              size="small"
              onDelete={() => onStatusChange('active')}
            />
          )}
          {priorities.map((p) => (
            <Chip
              key={p}
              label={`Priority: ${p}`}
              size="small"
              onDelete={() => onPrioritiesChange(priorities.filter((x) => x !== p))}
            />
          ))}
          {difficulties.map((d) => (
            <Chip
              key={d}
              label={`Difficulty: ${d}`}
              size="small"
              onDelete={() => onDifficultiesChange(difficulties.filter((x) => x !== d))}
            />
          ))}
          {durations.map((d) => (
            <Chip
              key={d}
              label={`Duration: ${d}`}
              size="small"
              onDelete={() => onDurationsChange(durations.filter((x) => x !== d))}
            />
          ))}
          {selectedProjects.map((p) => (
            <Chip
              key={p}
              label={`Project: ${p}`}
              size="small"
              onDelete={() => onProjectsChange(selectedProjects.filter((x) => x !== p))}
            />
          ))}
          {selectedTags.map((t) => (
            <Chip
              key={t}
              label={`Tag: ${t}`}
              size="small"
              onDelete={() => onTagsChange(selectedTags.filter((x) => x !== t))}
            />
          ))}
          {maxDueDate && (
            <Chip
              label={`Due before: ${maxDueDate}`}
              size="small"
              onDelete={() => onMaxDueDateChange(undefined)}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}
/* v8 ignore stop */
