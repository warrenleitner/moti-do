import { Box, FormControl, InputLabel, Select, MenuItem, Chip, Stack, Button } from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { Priority, PriorityEmoji } from '../../types';
import SearchInput from './SearchInput';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: 'all' | 'active' | 'completed';
  onStatusChange: (status: 'all' | 'active' | 'completed') => void;
  priority?: Priority;
  onPriorityChange: (priority: Priority | undefined) => void;
  project?: string;
  onProjectChange: (project: string | undefined) => void;
  tag?: string;
  onTagChange: (tag: string | undefined) => void;
  projects: string[];
  tags: string[];
  onReset: () => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  project,
  onProjectChange,
  tag,
  onTagChange,
  projects,
  tags,
  onReset,
}: FilterBarProps) {
  const hasActiveFilters =
    search || status !== 'active' || priority || project || tag;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main filter row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
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
            onChange={(e) => onStatusChange(e.target.value as 'all' | 'active' | 'completed')}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority || ''}
            label="Priority"
            onChange={(e) =>
              onPriorityChange(e.target.value ? (e.target.value as Priority) : undefined)
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value={Priority.DEFCON_ONE}>{PriorityEmoji[Priority.DEFCON_ONE]} Defcon One</MenuItem>
            <MenuItem value={Priority.HIGH}>{PriorityEmoji[Priority.HIGH]} High</MenuItem>
            <MenuItem value={Priority.MEDIUM}>{PriorityEmoji[Priority.MEDIUM]} Medium</MenuItem>
            <MenuItem value={Priority.LOW}>{PriorityEmoji[Priority.LOW]} Low</MenuItem>
            <MenuItem value={Priority.TRIVIAL}>{PriorityEmoji[Priority.TRIVIAL]} Trivial</MenuItem>
          </Select>
        </FormControl>

        {projects.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={project || ''}
              label="Project"
              onChange={(e) =>
                onProjectChange(e.target.value || undefined)
              }
            >
              <MenuItem value="">All</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {tags.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tag</InputLabel>
            <Select
              value={tag || ''}
              label="Tag"
              onChange={(e) => onTagChange(e.target.value || undefined)}
            >
              <MenuItem value="">All</MenuItem>
              {tags.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

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
          {priority && (
            <Chip
              label={`Priority: ${priority}`}
              size="small"
              onDelete={() => onPriorityChange(undefined)}
            />
          )}
          {project && (
            <Chip
              label={`Project: ${project}`}
              size="small"
              onDelete={() => onProjectChange(undefined)}
            />
          )}
          {tag && (
            <Chip
              label={`Tag: ${tag}`}
              size="small"
              onDelete={() => onTagChange(undefined)}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}
