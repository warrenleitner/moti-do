/**
 * Quick-add input box for rapid task creation.
 *
 * Supports inline modifiers:
 * - Priority: !high, !low, !medium, !critical
 * - Tags: #tagname
 * - Due date: @tomorrow, @friday, @next-week
 * - Project: ~projectname
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Popper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ClickAwayListener,
} from '@mui/material';
import { Add, Bolt, HelpOutline } from '@mui/icons-material';
import { useTaskStore } from '../../store';
import { useDefinedTags, useDefinedProjects } from '../../store/userStore';
import { parseQuickAddInput, quickAddResultToTask } from '../../utils/quickAdd';
import { Priority, Difficulty, Duration, PriorityEmoji } from '../../types';

/** Default tag added to all tasks created via QuickAdd */
const QUICK_ADD_DEFAULT_TAG = 'inbox';

/** Autocomplete options for each modifier type */
interface AutocompleteOption {
  label: string;
  value: string;
  description?: string;
}

const PRIORITY_OPTIONS: AutocompleteOption[] = [
  { label: 'Trivial', value: 'trivial', description: 'Lowest priority' },
  { label: 'Low', value: 'low', description: 'Low priority' },
  { label: 'Medium', value: 'medium', description: 'Normal priority' },
  { label: 'High', value: 'high', description: 'High priority' },
  { label: 'Critical', value: 'critical', description: 'Highest priority' },
];

const DATE_OPTIONS: AutocompleteOption[] = [
  { label: 'Today', value: 'today', description: 'Due today' },
  { label: 'Tomorrow', value: 'tomorrow', description: 'Due tomorrow' },
  { label: 'Next Week', value: 'next-week', description: 'Due in 7 days' },
  { label: 'Monday', value: 'monday', description: 'Next Monday' },
  { label: 'Tuesday', value: 'tuesday', description: 'Next Tuesday' },
  { label: 'Wednesday', value: 'wednesday', description: 'Next Wednesday' },
  { label: 'Thursday', value: 'thursday', description: 'Next Thursday' },
  { label: 'Friday', value: 'friday', description: 'Next Friday' },
  { label: 'Saturday', value: 'saturday', description: 'Next Saturday' },
  { label: 'Sunday', value: 'sunday', description: 'Next Sunday' },
];

interface QuickAddBoxProps {
  /** Called after a task is successfully created */
  onTaskCreated?: () => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function QuickAddBox({ onTaskCreated }: QuickAddBoxProps) {
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useTaskStore((state) => state.createTask);

  // Get user's defined tags and projects for autocomplete
  const definedTags = useDefinedTags();
  const definedProjects = useDefinedProjects();

  // Parse input for preview
  const parsed = parseQuickAddInput(input);
  const hasModifiers =
    parsed.priority || parsed.tags.length > 0 || parsed.dueDate || parsed.project;

  // Detect if user is typing a modifier and what options to show
  const autocompleteState = useMemo(() => {
    // Find the last modifier being typed (not yet completed)
    const textBeforeCursor = input.slice(0, cursorPos);

    // Match any modifier at the end that's still being typed
    const modifierMatch = textBeforeCursor.match(/([!#@~])(\S*)$/);
    if (!modifierMatch) return null;

    const [fullMatch, prefix, partial] = modifierMatch;
    const startPos = cursorPos - fullMatch.length;
    const filter = partial.toLowerCase();

    let options: AutocompleteOption[] = [];
    switch (prefix) {
      case '!':
        options = PRIORITY_OPTIONS.filter(
          (o) => o.value.startsWith(filter) || o.label.toLowerCase().startsWith(filter)
        );
        break;
      case '#':
        options = definedTags
          .filter((t) => t.name.toLowerCase().startsWith(filter))
          .map((t) => ({ label: t.name, value: t.name, description: `Tag: ${t.name}` }));
        break;
      case '@':
        options = DATE_OPTIONS.filter(
          (o) => o.value.startsWith(filter) || o.label.toLowerCase().startsWith(filter)
        );
        break;
      case '~':
        options = definedProjects
          .filter((p) => p.name.toLowerCase().startsWith(filter))
          .map((p) => ({ label: p.name, value: p.name, description: `Project: ${p.name}` }));
        break;
    }

    if (options.length === 0) return null;

    // If the typed partial exactly matches an option, don't show autocomplete
    // This allows Enter to submit instead of selecting
    if (options.length === 1 && options[0].value.toLowerCase() === filter) {
      return null;
    }

    return { prefix, partial, startPos, endPos: cursorPos, options };
  }, [input, cursorPos, definedTags, definedProjects]);

  // Clamp selected index to valid range
  const effectiveSelectedIndex = autocompleteState
    ? Math.min(selectedIndex, autocompleteState.options.length - 1)
    : 0;

  const handleSelectOption = useCallback(
    (option: AutocompleteOption) => {
      if (!autocompleteState) return;

      const { prefix, startPos, endPos } = autocompleteState;
      const before = input.slice(0, startPos);
      const after = input.slice(endPos);
      const newInput = `${before}${prefix}${option.value} ${after}`;
      setInput(newInput);

      // Focus and move cursor to end of inserted text
      setTimeout(() => {
        inputRef.current?.focus();
        const cursorPos = startPos + prefix.length + option.value.length + 1;
        inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [autocompleteState, input]
  );

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
      // Handle autocomplete navigation
      if (autocompleteState) {
        const { options } = autocompleteState;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % options.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && options.length > 0)) {
          e.preventDefault();
          handleSelectOption(options[effectiveSelectedIndex]);
          return;
        }
        if (e.key === 'Escape') {
          // Close autocomplete without doing anything
          setInput((prev) => prev); // Force re-render to close
          return;
        }
      }

      // Regular enter key for submission
      if (e.key === 'Enter' && !e.shiftKey && !autocompleteState) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, autocompleteState, effectiveSelectedIndex, handleSelectOption]
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
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, position: 'relative' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Add a task... (try: !high #work @tomorrow ~project)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCursorPos(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => {
              const target = e.target as HTMLInputElement;
              setCursorPos(target.selectionStart ?? input.length);
            }}
            onFocus={(e) => setAnchorEl(e.target as HTMLInputElement)}
            onBlur={() => {
              // Delay clearing anchor to allow click on dropdown options
              setTimeout(() => setAnchorEl(null), 150);
            }}
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

          {/* Autocomplete dropdown */}
          <Popper
            open={!!autocompleteState && !!anchorEl}
            anchorEl={anchorEl}
            placement="bottom-start"
            sx={{ zIndex: 1300, width: anchorEl?.offsetWidth || 300 }}
          >
            <ClickAwayListener onClickAway={() => setInput((prev) => prev)}>
              <Paper elevation={8} sx={{ maxHeight: 200, overflow: 'auto', mt: 0.5 }}>
                <List dense>
                  {autocompleteState?.options.map((option, index) => (
                    <ListItem key={option.value} disablePadding>
                      <ListItemButton
                        selected={index === effectiveSelectedIndex}
                        onClick={() => handleSelectOption(option)}
                        sx={{ py: 0.5 }}
                      >
                        <ListItemText
                          primary={option.label}
                          secondary={option.description}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </ClickAwayListener>
          </Popper>
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
