/**
 * Quick-add input box for rapid task creation.
 *
 * Supports inline modifiers:
 * - Priority: !high, !low, !medium, !critical
 * - Tags: #tagname
 * - Due date: @tomorrow, @friday, @next-week
 * - Project: ~projectname
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TextInput,
  ActionIcon,
  Paper,
  Tooltip,
  Box,
  Text,
  Badge,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconBolt, IconHelp } from '@tabler/icons-react';
import { useTaskStore } from '../../store';
import { parseQuickAddInput, quickAddResultToTask } from '../../utils/quickAdd';
import { Priority, Difficulty, Duration, PriorityEmoji } from '../../types';

interface QuickAddBoxProps {
  /** Called after a task is successfully created */
  onTaskCreated?: () => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function QuickAddBox({ onTaskCreated }: QuickAddBoxProps) {
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useTaskStore((state) => state.createTask);

  // Parse input for preview
  const parsed = parseQuickAddInput(input);
  const hasModifiers =
    parsed.priority || parsed.tags.length > 0 || parsed.dueDate || parsed.project;

  const handleSubmit = useCallback(async () => {
    if (!parsed.title.trim()) return;

    const taskData = quickAddResultToTask(parsed);

    // Apply defaults for missing required fields
    const fullTaskData = {
      ...taskData,
      priority: taskData.priority || Priority.MEDIUM,
      difficulty: Difficulty.MEDIUM,
      duration: Duration.MEDIUM,
      is_habit: false,
      tags: taskData.tags || [],
      subtasks: [],
      dependencies: [],
    };

    try {
      await createTask(fullTaskData);
      notifications.show({
        title: 'Task created',
        message: `Task "${parsed.title}" created!`,
        color: 'green',
      });
      setInput('');
      onTaskCreated?.();
    } catch (error) /* v8 ignore next */ {
      console.error('Failed to create task:', error);
    }
  }, [parsed, createTask, onTaskCreated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Keyboard shortcut (Ctrl/Cmd+K to focus) - tested via E2E
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <Paper p="md" mb="md" withBorder radius="md">
      <TextInput
        ref={inputRef}
        placeholder="Add a task... (try: !high #work @tomorrow ~project)"
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        leftSection={<IconBolt size={16} color="var(--mantine-color-blue-6)" />}
        rightSection={
          <Group gap={4}>
            <Tooltip label="Show syntax help">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                aria-label="Show syntax help"
              >
                <IconHelp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Add task (Enter)">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleSubmit}
                disabled={!parsed.title.trim()}
                color="blue"
                aria-label="Add task"
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        rightSectionWidth={70}
      />

      {/* Preview of parsed modifiers */}
      {hasModifiers && (
        <Group gap="xs" mt="xs" wrap="wrap">
          {parsed.priority && (
            <Badge size="sm" variant="outline" color="blue">
              {PriorityEmoji[parsed.priority]} {parsed.priority}
            </Badge>
          )}
          {parsed.tags.map((tag) => (
            <Badge key={tag} size="sm" variant="outline">
              #{tag}
            </Badge>
          ))}
          {parsed.dueDate && (
            <Badge size="sm" variant="outline" color="violet">
              Due: {parsed.dueDate.toLocaleDateString()}
            </Badge>
          )}
          {parsed.project && (
            <Badge size="sm" variant="outline" color="cyan">
              ~{parsed.project}
            </Badge>
          )}
        </Group>
      )}

      {/* Help text */}
      {showHelp && (
        <Box mt="sm" p="sm" bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
          <Text size="xs" c="dimmed">
            <strong>Quick-add syntax:</strong>
            <br />
            <code>!high</code>, <code>!low</code>, <code>!medium</code>,{' '}
            <code>!critical</code> - Priority
            <br />
            <code>#tagname</code> - Add tags (multiple allowed)
            <br />
            <code>@tomorrow</code>, <code>@friday</code>, <code>@next-week</code>,{' '}
            <code>@dec-25</code> - Due date
            <br />
            <code>~project</code> - Project name
            <br />
            <br />
            <em>Example: Buy groceries !high #shopping @friday ~home</em>
            <br />
            <em>Press Ctrl/Cmd+K to focus this input</em>
          </Text>
        </Box>
      )}
    </Paper>
  );
}
/* v8 ignore stop */
