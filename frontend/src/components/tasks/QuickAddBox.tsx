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
  Tooltip,
  Box,
  Text,
  Group,
  notifications,
} from '../../ui';
import { IconPlus, IconBolt, IconHelp } from '../../ui/icons';
import { DataBadge } from '../ui';
import { useTaskStore } from '../../store';
import { parseQuickAddInput, quickAddResultToTask } from '../../utils/quickAdd';
import { Priority, Difficulty, Duration, PriorityEmoji } from '../../types';

/** Default tag added to all tasks created via QuickAdd */
const QUICK_ADD_DEFAULT_TAG = 'inbox';

/** Priority → Kinetic Console DataBadge color */
const priorityBadgeColor: Record<string, 'magenta' | 'amber' | 'cyan' | 'muted'> = {
  [Priority.DEFCON_ONE]: 'magenta',
  [Priority.HIGH]: 'amber',
  [Priority.MEDIUM]: 'cyan',
  [Priority.LOW]: 'muted',
  [Priority.TRIVIAL]: 'muted',
};

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

    // Add default "inbox" tag to tasks created via QuickAdd
    const tagsWithDefault = [...(taskData.tags || [])];
    if (!tagsWithDefault.includes(QUICK_ADD_DEFAULT_TAG)) {
      tagsWithDefault.push(QUICK_ADD_DEFAULT_TAG);
    }

    // Apply defaults for missing required fields
    const fullTaskData = {
      ...taskData,
      priority: taskData.priority || Priority.MEDIUM,
      difficulty: Difficulty.MEDIUM,
      duration: Duration.MEDIUM,
      is_habit: false,
      tags: tagsWithDefault,
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
    <Box
      className="ghost-border"
      style={{
        backgroundColor: '#0B0E17',
        padding: '12px 16px',
        boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Group gap="sm" wrap="nowrap" align="center">
        {/* ">" cursor prefix */}
        <span
          className="font-data"
          style={{
            color: '#81ecff',
            fontWeight: 700,
            fontSize: '1.1rem',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          &gt;
        </span>

        {/* Terminal input */}
        <TextInput
          ref={inputRef}
          placeholder='DEPLOY NEW TASK: [TITLE] /PRIORITY /DUE...'
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          variant="unstyled"
          styles={{
            root: { flex: 1 },
            input: {
              backgroundColor: 'transparent',
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.875rem',
              border: 'none',
              padding: '4px 0',
              '&::placeholder': {
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#525560',
              },
            },
          }}
        />

        {/* XP potential badge */}
        <DataBadge
          value="POTENTIAL +250 XP"
          color="cyan"
          icon={<IconBolt size={12} />}
          size="sm"
        />

        {/* Help button */}
        <Tooltip label="Show syntax help">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Show syntax help"
            style={{ color: '#a8aab7' }}
          >
            <IconHelp size={16} />
          </ActionIcon>
        </Tooltip>

        {/* Submit button */}
        <Tooltip label="Add task (Enter)">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleSubmit}
            disabled={!parsed.title.trim()}
            aria-label="Add task"
            style={{
              color: parsed.title.trim() ? '#81ecff' : '#525560',
            }}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Preview of parsed modifiers */}
      {hasModifiers && (
        <Group gap="xs" mt="xs" wrap="wrap" pl={24}>
          {parsed.priority && (
            <DataBadge
              value={`${PriorityEmoji[parsed.priority]} ${parsed.priority.toUpperCase()}`}
              color={priorityBadgeColor[parsed.priority] || 'cyan'}
            />
          )}
          {parsed.tags.map((tag) => (
            <DataBadge key={tag} value={`#${tag.toUpperCase()}`} color="muted" />
          ))}
          {parsed.dueDate && (
            <DataBadge
              value={`DUE: ${parsed.dueDate.toLocaleDateString()}`}
              color="amber"
            />
          )}
          {parsed.project && (
            <DataBadge value={`~${parsed.project.toUpperCase()}`} color="cyan" />
          )}
        </Group>
      )}

      {/* Help text */}
      {showHelp && (
        <Box
          mt="sm"
          p="sm"
          style={{
            backgroundColor: '#181B25',
            border: '1px solid rgba(69, 71, 82, 0.15)',
          }}
        >
          <Text
            size="xs"
            className="font-data"
            style={{ color: '#a8aab7', lineHeight: 1.8 }}
          >
            <strong style={{ color: '#81ecff' }}>QUICK-ADD SYNTAX:</strong>
            <br />
            <code style={{ color: '#FFC775' }}>!high</code>, <code style={{ color: '#FFC775' }}>!low</code>, <code style={{ color: '#FFC775' }}>!medium</code>,{' '}
            <code style={{ color: '#FFC775' }}>!critical</code> — Priority
            <br />
            <code style={{ color: '#FFC775' }}>#tagname</code> — Add tags (multiple allowed)
            <br />
            <code style={{ color: '#FFC775' }}>@tomorrow</code>, <code style={{ color: '#FFC775' }}>@friday</code>, <code style={{ color: '#FFC775' }}>@next-week</code>,{' '}
            <code style={{ color: '#FFC775' }}>@dec-25</code> — Due date
            <br />
            <code style={{ color: '#FFC775' }}>~project</code> — Project name
            <br />
            <br />
            <em style={{ color: '#525560' }}>Example: Buy groceries !high #shopping @friday ~home</em>
            <br />
            <em style={{ color: '#525560' }}>Press Ctrl/Cmd+K to focus this input</em>
          </Text>
        </Box>
      )}
    </Box>
  );
}
/* v8 ignore stop */
