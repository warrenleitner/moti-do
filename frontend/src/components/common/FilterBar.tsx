import { Box, Select, Badge, Group, Button, CloseButton } from '@mantine/core';
import { IconFilter, IconX } from '@tabler/icons-react';
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

// UI component - tested via integration tests
/* v8 ignore start */
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
    <Box mb="lg">
      {/* Main filter row */}
      <Group gap="sm" align="flex-start" wrap="wrap">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search tasks..."
        />

        <Select
          size="sm"
          w={120}
          value={status}
          onChange={(val) => onStatusChange((val || 'active') as 'all' | 'active' | 'completed')}
          data={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'all', label: 'All' },
          ]}
          label="Status"
        />

        <Select
          size="sm"
          w={140}
          value={priority || ''}
          onChange={(val) => onPriorityChange(val ? (val as Priority) : undefined)}
          data={[
            { value: '', label: 'All' },
            { value: Priority.DEFCON_ONE, label: `${PriorityEmoji[Priority.DEFCON_ONE]} Defcon One` },
            { value: Priority.HIGH, label: `${PriorityEmoji[Priority.HIGH]} High` },
            { value: Priority.MEDIUM, label: `${PriorityEmoji[Priority.MEDIUM]} Medium` },
            { value: Priority.LOW, label: `${PriorityEmoji[Priority.LOW]} Low` },
            { value: Priority.TRIVIAL, label: `${PriorityEmoji[Priority.TRIVIAL]} Trivial` },
          ]}
          label="Priority"
        />

        {projects.length > 0 && (
          <Select
            size="sm"
            w={140}
            value={project || ''}
            onChange={(val) => onProjectChange(val || undefined)}
            data={[
              { value: '', label: 'All' },
              ...projects.map((p) => ({ value: p, label: p })),
            ]}
            label="Project"
          />
        )}

        {tags.length > 0 && (
          <Select
            size="sm"
            w={140}
            value={tag || ''}
            onChange={(val) => onTagChange(val || undefined)}
            data={[
              { value: '', label: 'All' },
              ...tags.map((t) => ({ value: t, label: t })),
            ]}
            label="Tag"
          />
        )}

        {hasActiveFilters && (
          <Button
            leftSection={<IconX size={16} />}
            onClick={onReset}
            size="sm"
            variant="subtle"
            style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
          >
            Clear filters
          </Button>
        )}
      </Group>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <Group gap="xs" mt="sm" wrap="wrap">
          <IconFilter size={18} color="gray" style={{ marginRight: 4 }} />
          {search && (
            <Badge
              variant="light"
              size="sm"
              rightSection={
                <CloseButton size="xs" onClick={() => onSearchChange('')} aria-label="Clear search filter" />
              }
            >
              Search: "{search}"
            </Badge>
          )}
          {status !== 'active' && (
            <Badge
              variant="light"
              size="sm"
              rightSection={
                <CloseButton size="xs" onClick={() => onStatusChange('active')} aria-label="Clear status filter" />
              }
            >
              Status: {status}
            </Badge>
          )}
          {priority && (
            <Badge
              variant="light"
              size="sm"
              rightSection={
                <CloseButton size="xs" onClick={() => onPriorityChange(undefined)} aria-label="Clear priority filter" />
              }
            >
              Priority: {priority}
            </Badge>
          )}
          {project && (
            <Badge
              variant="light"
              size="sm"
              rightSection={
                <CloseButton size="xs" onClick={() => onProjectChange(undefined)} aria-label="Clear project filter" />
              }
            >
              Project: {project}
            </Badge>
          )}
          {tag && (
            <Badge
              variant="light"
              size="sm"
              rightSection={
                <CloseButton size="xs" onClick={() => onTagChange(undefined)} aria-label="Clear tag filter" />
              }
            >
              Tag: {tag}
            </Badge>
          )}
        </Group>
      )}
    </Box>
  );
}
/* v8 ignore stop */
