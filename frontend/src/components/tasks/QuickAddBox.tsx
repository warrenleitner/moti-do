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
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Snackbar,
  Alert,
  Tooltip,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { Add, Bolt, HelpOutline } from '@mui/icons-material';
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
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
      setLastCreated(parsed.title);
      setShowSuccess(true);
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
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Add a task... (try: !high #work @tomorrow ~project)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Bolt color="primary" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Show syntax help">
                    <IconButton
                      size="small"
                      onClick={() => setShowHelp(!showHelp)}
                      aria-label="Show syntax help"
                      sx={{ mr: 0.5 }}
                    >
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Add task (Enter)">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleSubmit}
                        disabled={!parsed.title.trim()}
                        color="primary"
                        aria-label="Add task"
                      >
                        <Add />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              },
            }}
          />
        </Box>

        {/* Preview of parsed modifiers */}
        {hasModifiers && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
            {parsed.priority && (
              <Chip
                size="small"
                label={`${PriorityEmoji[parsed.priority]} ${parsed.priority}`}
                color="primary"
                variant="outlined"
              />
            )}
            {parsed.tags.map((tag) => (
              <Chip key={tag} size="small" label={`#${tag}`} variant="outlined" />
            ))}
            {parsed.dueDate && (
              <Chip
                size="small"
                label={`Due: ${parsed.dueDate.toLocaleDateString()}`}
                color="secondary"
                variant="outlined"
              />
            )}
            {parsed.project && (
              <Chip
                size="small"
                label={`~${parsed.project}`}
                color="info"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        {/* Help text */}
        {showHelp && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" component="div">
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
            </Typography>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Task "{lastCreated}" created!
        </Alert>
      </Snackbar>
    </>
  );
}
/* v8 ignore stop */
