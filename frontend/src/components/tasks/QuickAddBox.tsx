/**
 * Quick-add input box for rapid task creation.
 *
 * Supports inline modifiers:
 * - Priority: !high, !low, !medium, !critical
 * - Tags: #tagname
 * - Due date: @today, @tomorrow, @friday, @next-week
 * - Start date: ^today, ^tomorrow, ^friday, ^next-week
 * - Project: ~projectname
 * - Recurrence: &daily, &weekly, &weekly-wed, &weekly-mon,wed,fri,
 *   &monthly, &every-2-weeks
 *   - Style: &daily:strict, &weekly-wed:completion, &monthly:due
 * - Description: "quoted text"
 *
 * Bulk mode: toggle to multi-line input, one task per line.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TextInput,
  Textarea,
  ActionIcon,
  Tooltip,
  Box,
  Text,
  Group,
  Modal,
  Table,
  Button,
  Stack,
  notifications,
} from '../../ui';
import { IconPlus, IconBolt, IconHelp, IconList } from '../../ui/icons';
import { DataBadge } from '../ui';
import { useTaskStore } from '../../store';
import {
  parseQuickAddInput,
  quickAddResultToTask,
  parseBulkQuickAddInput,
} from '../../utils/quickAdd';
import type { QuickAddResult } from '../../utils/quickAdd';
import { Priority, Difficulty, Duration, PriorityEmoji } from '../../types';

/** Default tag added to all tasks created via QuickAdd */
const QUICK_ADD_DEFAULT_TAG = 'inbox';

/** Max characters shown in the description preview badge */
const MAX_DESCRIPTION_PREVIEW_LENGTH = 30;

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

/**
 * Build the full task data from a parsed QuickAddResult with defaults applied.
 */
function buildTaskData(parsed: QuickAddResult): Record<string, unknown> {
  const taskData = quickAddResultToTask(parsed);

  const tagsWithDefault = [...(taskData.tags || [])];
  if (!tagsWithDefault.includes(QUICK_ADD_DEFAULT_TAG)) {
    tagsWithDefault.push(QUICK_ADD_DEFAULT_TAG);
  }

  return {
    ...taskData,
    priority: taskData.priority || Priority.MEDIUM,
    difficulty: Difficulty.MEDIUM,
    duration: Duration.MEDIUM,
    is_habit: taskData.is_habit || false,
    tags: tagsWithDefault,
    subtasks: [],
    dependencies: [],
  };
}

export default function QuickAddBox({ onTaskCreated }: QuickAddBoxProps) {
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkPreview, setBulkPreview] = useState<QuickAddResult[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createTask = useTaskStore((state) => state.createTask);

  // Parse input for preview
  const parsed = parseQuickAddInput(input);
  const hasModifiers =
    parsed.priority ||
    parsed.tags.length > 0 ||
    parsed.dueDate ||
    parsed.startDate ||
    parsed.project ||
    parsed.recurrenceRule ||
    parsed.description;

  const handleSubmit = useCallback(async () => {
    if (!parsed.title.trim()) return;

    const fullTaskData = buildTaskData(parsed);

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

  const handleBulkPreview = useCallback(() => {
    const results = parseBulkQuickAddInput(bulkInput);
    if (results.length === 0) return;
    setBulkPreview(results);
    setShowBulkConfirm(true);
  }, [bulkInput]);

  const handleBulkSubmit = useCallback(async () => {
    let created = 0;
    for (const result of bulkPreview) {
      const fullTaskData = buildTaskData(result);
      try {
        await createTask(fullTaskData);
        created++;
      } catch (error) /* v8 ignore next */ {
        console.error('Failed to create task:', error);
      }
    }
    notifications.show({
      title: 'Tasks created',
      message: `${created} task${created !== 1 ? 's' : ''} created!`,
      color: 'green',
    });
    setShowBulkConfirm(false);
    setBulkInput('');
    setBulkPreview([]);
    onTaskCreated?.();
  }, [bulkPreview, createTask, onTaskCreated]);

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
        if (bulkMode) {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [bulkMode]);

  return (
    <>
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

          {/* Single-line or multi-line input */}
          {bulkMode ? (
            <Textarea
              ref={textareaRef}
              placeholder="ONE TASK PER LINE — PASTE OR TYPE MULTIPLE TASKS..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.currentTarget.value)}
              variant="unstyled"
              autosize
              minRows={3}
              maxRows={10}
              styles={{
                root: { flex: 1 },
                input: {
                  backgroundColor: 'transparent',
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.875rem',
                  border: 'none',
                  padding: '4px 0',
                },
              }}
            />
          ) : (
            <TextInput
              ref={inputRef}
                placeholder='DEPLOY NEW TASK: [TITLE] /PRIORITY /START /DUE...'
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
          )}

          {/* XP potential badge */}
          <DataBadge
            value="POTENTIAL +250 XP"
            color="cyan"
            icon={<IconBolt size={12} />}
            size="sm"
          />

          {/* Bulk mode toggle */}
          <Tooltip label={bulkMode ? 'Single task mode' : 'Bulk add mode'}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setBulkMode(!bulkMode)}
              aria-label={bulkMode ? 'Switch to single mode' : 'Switch to bulk mode'}
              style={{ color: bulkMode ? '#81ecff' : '#a8aab7' }}
            >
              <IconList size={16} />
            </ActionIcon>
          </Tooltip>

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
          {bulkMode ? (
            <Tooltip label="Preview tasks">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleBulkPreview}
                disabled={!bulkInput.trim()}
                aria-label="Preview bulk tasks"
                style={{
                  color: bulkInput.trim() ? '#81ecff' : '#525560',
                }}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          ) : (
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
          )}
        </Group>

        {/* Preview of parsed modifiers (single mode only) */}
        {!bulkMode && hasModifiers && (
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
            {parsed.startDate && (
              <DataBadge
                value={`START: ${parsed.startDate.toLocaleDateString()}`}
                color="muted"
              />
            )}
            {parsed.project && (
              <DataBadge value={`~${parsed.project.toUpperCase()}`} color="cyan" />
            )}
            {parsed.recurrenceRule && (
              <DataBadge
                value={`🔄 ${parsed.recurrenceRule}${parsed.recurrenceType ? ` (${parsed.recurrenceType})` : ''}`}
                color="cyan"
              />
            )}
            {parsed.description && (
              <DataBadge
                value={`📝 ${parsed.description.length > MAX_DESCRIPTION_PREVIEW_LENGTH ? parsed.description.slice(0, MAX_DESCRIPTION_PREVIEW_LENGTH) + '…' : parsed.description}`}
                color="muted"
              />
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
              <code style={{ color: '#FFC775' }}>@today</code>, <code style={{ color: '#FFC775' }}>@tomorrow</code>, <code style={{ color: '#FFC775' }}>@friday</code>, <code style={{ color: '#FFC775' }}>@next-week</code>,{' '}
              <code style={{ color: '#FFC775' }}>@dec-25</code> — Due date
              <br />
              <code style={{ color: '#FFC775' }}>^today</code>, <code style={{ color: '#FFC775' }}>^tomorrow</code>, <code style={{ color: '#FFC775' }}>^friday</code>,{' '}
              <code style={{ color: '#FFC775' }}>^next-week</code>, <code style={{ color: '#FFC775' }}>^dec-25</code> — Start date
              <br />
              <code style={{ color: '#FFC775' }}>~project</code> — Project name
              <br />
              <code style={{ color: '#FFC775' }}>&amp;daily</code>, <code style={{ color: '#FFC775' }}>&amp;weekly</code>, <code style={{ color: '#FFC775' }}>&amp;weekly-wed</code>,{' '}
              <code style={{ color: '#FFC775' }}>&amp;weekly-mon,wed,fri</code> — Recurrence
              <br />
              <code style={{ color: '#FFC775' }}>&amp;daily:strict</code>, <code style={{ color: '#FFC775' }}>&amp;weekly-wed:completion</code>,{' '}
              <code style={{ color: '#FFC775' }}>&amp;monthly:due</code> — Recurrence with style
              <br />
              <code style={{ color: '#FFC775' }}>&quot;description text&quot;</code> — Add a description
              <br />
              <br />
              <em style={{ color: '#525560' }}>Example: Dermaroll ^today &amp;weekly-wed:completion</em>
              <br />
              <em style={{ color: '#525560' }}>Bulk mode: click the list icon to add multiple tasks (one per line)</em>
              <br />
              <em style={{ color: '#525560' }}>Press Ctrl/Cmd+K to focus this input</em>
            </Text>
          </Box>
        )}
      </Box>

      {/* Bulk confirm modal */}
      <Modal
        opened={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        title="Confirm Bulk Task Creation"
        size="lg"
        styles={{
          header: { backgroundColor: '#181B25', color: '#e6e7f5' },
          body: { backgroundColor: '#181B25' },
          content: { backgroundColor: '#181B25' },
        }}
      >
        <Stack gap="md">
          <Text size="sm" style={{ color: '#a8aab7' }}>
            {bulkPreview.length} task{bulkPreview.length !== 1 ? 's' : ''} will be created:
          </Text>
          <Table
            striped
            highlightOnHover
            styles={{
              table: { backgroundColor: '#0B0E17' },
              th: { color: '#81ecff', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' },
              td: { color: '#e6e7f5', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' },
            }}
          >
            <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Tags</Table.Th>
                  <Table.Th>Start</Table.Th>
                  <Table.Th>Due</Table.Th>
                  <Table.Th>Recurrence</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bulkPreview.map((result, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>{result.title}</Table.Td>
                  <Table.Td>
                    {result.priority
                      ? `${PriorityEmoji[result.priority]} ${result.priority}`
                      : '—'}
                  </Table.Td>
                  <Table.Td>
                    {result.tags.length > 0 ? result.tags.map((t) => `#${t}`).join(' ') : '—'}
                  </Table.Td>
                  <Table.Td>
                    {result.startDate ? result.startDate.toLocaleDateString() : '—'}
                  </Table.Td>
                  <Table.Td>
                    {result.dueDate ? result.dueDate.toLocaleDateString() : '—'}
                  </Table.Td>
                  <Table.Td>{result.recurrenceRule || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group gap="sm" justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setShowBulkConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSubmit}
              style={{
                backgroundColor: '#81ecff',
                color: '#0B0E17',
              }}
            >
              Create {bulkPreview.length} Task{bulkPreview.length !== 1 ? 's' : ''}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
/* v8 ignore stop */
