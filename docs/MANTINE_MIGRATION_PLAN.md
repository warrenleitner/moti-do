# Mantine v8 Migration Plan

This document outlines the comprehensive plan to migrate Moti-Do's frontend from Material UI (MUI) v7 to Mantine v8.

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Package Changes](#package-changes)
4. [Theme Migration](#theme-migration)
5. [Component Mapping](#component-mapping)
6. [Styling Approach Changes](#styling-approach-changes)
7. [Icons Migration](#icons-migration)
8. [Date Picker Migration](#date-picker-migration)
9. [Form Handling](#form-handling)
10. [Notifications Migration](#notifications-migration)
11. [Testing Strategy](#testing-strategy)
12. [Migration Order](#migration-order)
13. [Verification Checklist](#verification-checklist)
14. [Rollback Strategy](#rollback-strategy)

---

## Overview

### Goals

- Replace Material UI with Mantine v8 for a lighter, more modern UI
- Reduce bundle size (~300KB → ~150KB)
- Improve Playwright testability with cleaner DOM structure
- Leverage Mantine's built-in features (date pickers, notifications, hooks)
- Maintain all existing functionality and visual consistency

### Scope

- **44 files** currently use MUI components
- **7 pages** + **37 component files**
- Key patterns: `sx` prop styling, theme integration, responsive design

### Timeline Approach

Follow the project's "One Feature, One Commit, One CI Run" workflow:
- Migrate in logical batches (core → common → feature-specific)
- Each batch gets its own commit after passing `bash scripts/check-all.sh`
- Never batch multiple migration phases into one commit

---

## Current State Analysis

### MUI Packages in Use

```json
{
  "@mui/material": "^7.3.6",
  "@mui/icons-material": "^7.3.6",
  "@mui/x-date-pickers": "^8.21.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1"
}
```

### Most Used Components (by usage count)

| Component | Count | Mantine Equivalent |
|-----------|-------|-------------------|
| Box | 312 | Box |
| Typography | 271 | Text, Title |
| MenuItem | 123 | Menu.Item, Select data |
| Button | 95 | Button |
| IconButton | 81 | ActionIcon |
| Chip | 60 | Badge, Pill |
| Card | 50 | Card |
| Select | 47 | Select |
| Tooltip | 45 | Tooltip |
| Alert | 39 | Alert |
| Stack | 37 | Stack, Group |
| InputLabel | 34 | Input.Label (built-in) |
| Paper | 31 | Paper |
| ToggleButton | 29 | SegmentedControl |
| TextField | 28 | TextInput |
| Snackbar | 26 | Notifications |
| Dialog | 24 | Modal |
| TableRow | 22 | Table.Tr |
| InputAdornment | 19 | Input leftSection/rightSection |
| Grid | 17 | Grid or SimpleGrid |
| ToggleButtonGroup | 15 | SegmentedControl |
| Checkbox | 14 | Checkbox |
| Badge | 14 | Badge, Indicator |
| List | 14 | List or NavLink |
| CircularProgress | 12 | Loader |
| ListItem | 12 | List.Item or NavLink |
| Switch | 9 | Switch |
| Table | 9 | Table |
| FormControlLabel | 7 | Checkbox/Switch with label prop |
| Divider | 6 | Divider |
| LinearProgress | 6 | Progress |

### Files to Migrate

**Core Files (3):**
- `src/main.tsx` - Theme provider setup
- `src/App.tsx` - App structure
- `src/test/utils.tsx` - Test utilities

**Layout (1):**
- `src/components/layout/MainLayout.tsx`

**Pages (8):**
- `src/pages/Dashboard.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/HabitsPage.tsx`
- `src/pages/CalendarPage.tsx`
- `src/pages/KanbanPage.tsx`
- `src/pages/GraphPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/LoginPage.tsx`

**Common Components (13):**
- `ConfirmDialog.tsx`, `SearchInput.tsx`, `EmptyState.tsx`
- `TagChip.tsx`, `PriorityChip.tsx`, `DifficultyChip.tsx`, `DurationChip.tsx`
- `StreakBadge.tsx`, `LoadingSpinner.tsx`, `XPDisplay.tsx`
- `DateDisplay.tsx`, `FilterBar.tsx`, `InstallPrompt.tsx`

**Task Components (9):**
- `TaskForm.tsx`, `TaskTable.tsx`, `TaskList.tsx`, `TaskCard.tsx`
- `SubtaskList.tsx`, `SubtaskCard.tsx`, `QuickAddBox.tsx`
- `RecurrenceRuleBuilder.tsx`, `ColumnConfigDialog.tsx`

**Habit Components (4):**
- `HabitList.tsx`, `HabitCard.tsx`, `HabitHeatmap.tsx`, `HabitStats.tsx`

**Kanban Components (3):**
- `KanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx`

**Graph Components (2):**
- `DependencyGraph.tsx`, `TaskNode.tsx`

**Calendar Components (1):**
- `TaskCalendar.tsx`

---

## Package Changes

### Remove (after migration complete)

```bash
npm uninstall @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled
```

### Install

```bash
# Core Mantine packages
npm install @mantine/core @mantine/hooks

# Date/time pickers
npm install @mantine/dates dayjs

# Notifications (replaces Snackbar)
npm install @mantine/notifications

# Form handling (optional but recommended)
npm install @mantine/form

# Icons (Tabler icons are Mantine's default)
npm install @tabler/icons-react

# PostCSS for Mantine styling
npm install --save-dev postcss postcss-preset-mantine postcss-simple-vars
```

### PostCSS Configuration

Create `frontend/postcss.config.cjs`:

```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

---

## Theme Migration

### Current MUI Theme (`main.tsx`)

```typescript
// Current MUI theme
createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
    secondary: { main: '#9c27b0', light: '#ba68c8', dark: '#7b1fa2' },
    error: { main: '#d32f2f' },
    warning: { main: '#ff9800' },
    success: { main: '#2e7d32' },
    background: { default: '#fafafa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    MuiButton: { styleOverrides: { borderRadius: 8, textTransform: 'none' } },
    MuiCard: { styleOverrides: { borderRadius: 12 } },
    MuiChip: { styleOverrides: { borderRadius: 6 } },
  },
})
```

### Mantine Theme Equivalent

```typescript
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    // Custom blue to match MUI primary
    blue: [
      '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5',
      '#1976d2', '#1565c0', '#0d47a1', '#0a3d91', '#082f70'
    ],
    // Custom violet to match MUI secondary
    violet: [
      '#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc',
      '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c'
    ],
  },
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  radius: {
    xs: '4px',
    sm: '6px',   // Chip radius
    md: '8px',   // Button radius
    lg: '12px',  // Card radius
    xl: '16px',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          textTransform: 'none',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
  },
});

// In App component
<MantineProvider theme={theme}>
  <Notifications position="top-right" />
  {/* App content */}
</MantineProvider>
```

---

## Component Mapping

### Layout Components

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<Box sx={{...}}>` | `<Box style={{...}}>` or `<Box className={classes.xxx}>` | Use CSS modules or inline styles |
| `<Stack direction="row">` | `<Group>` | Horizontal layout |
| `<Stack direction="column">` | `<Stack>` | Vertical layout |
| `<Grid container>` | `<Grid>` or `<SimpleGrid>` | SimpleGrid for equal columns |
| `<Container maxWidth="lg">` | `<Container size="lg">` | Same concept |
| `<Paper elevation={2}>` | `<Paper shadow="sm">` | shadow: xs, sm, md, lg, xl |
| `<Divider>` | `<Divider>` | Same API |

### Navigation

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<AppBar>` | `<AppShell.Header>` | Part of AppShell layout |
| `<Drawer>` | `<AppShell.Navbar>` | Responsive sidebar |
| `<Toolbar>` | `<Group>` inside Header | Manual layout |
| `<List>` | `<NavLink>` or `<Stack>` | NavLink for navigation items |
| `<ListItem>` | `<NavLink>` | Built-in active states |
| `<ListItemButton>` | `<NavLink>` | Clickable nav items |
| `<ListItemIcon>` | `leftSection` prop | Part of NavLink |
| `<ListItemText>` | `label` prop | Part of NavLink |

### Typography

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<Typography variant="h1">` | `<Title order={1}>` | order 1-6 for h1-h6 |
| `<Typography variant="h2">` | `<Title order={2}>` | |
| `<Typography variant="body1">` | `<Text>` | Default body text |
| `<Typography variant="body2">` | `<Text size="sm">` | Smaller body |
| `<Typography variant="caption">` | `<Text size="xs" c="dimmed">` | Small, muted |
| `<Typography color="primary">` | `<Text c="blue">` | Theme color |
| `<Typography color="error">` | `<Text c="red">` | Error color |

### Buttons & Actions

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<Button variant="contained">` | `<Button variant="filled">` | Default solid |
| `<Button variant="outlined">` | `<Button variant="outline">` | Outline style |
| `<Button variant="text">` | `<Button variant="subtle">` | Text-only |
| `<Button startIcon={<Icon/>}>` | `<Button leftSection={<Icon/>}>` | Icon position |
| `<Button endIcon={<Icon/>}>` | `<Button rightSection={<Icon/>}>` | |
| `<Button disabled>` | `<Button disabled>` | Same |
| `<Button size="small">` | `<Button size="xs">` or `size="sm"` | |
| `<IconButton>` | `<ActionIcon>` | Icon-only button |
| `<IconButton size="small">` | `<ActionIcon size="sm">` | |

### Form Inputs

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<TextField>` | `<TextInput>` | Basic text input |
| `<TextField multiline>` | `<Textarea>` | Multi-line |
| `<TextField type="password">` | `<PasswordInput>` | Built-in toggle |
| `<TextField type="number">` | `<NumberInput>` | With stepper |
| `<TextField error helperText="">` | `<TextInput error="">` | Error message as string |
| `<TextField InputProps={{startAdornment}}>` | `<TextInput leftSection={}>` | Icons in input |
| `<Select>` | `<Select data={[]}>` | Data-driven |
| `<MenuItem value="x">Label</MenuItem>` | `{ value: 'x', label: 'Label' }` | Array of objects |
| `<Checkbox>` | `<Checkbox>` | Same API |
| `<Switch>` | `<Switch>` | Same API |
| `<FormControlLabel control={} label="">` | `<Checkbox label="">` | Label built-in |
| `<FormControl><InputLabel>` | Not needed | Labels built into inputs |

### Feedback & Dialogs

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<Dialog open onClose>` | `<Modal opened onClose>` | Prop name change |
| `<DialogTitle>` | `<Modal.Header><Modal.Title>` | Structured header |
| `<DialogContent>` | `<Modal.Body>` | Main content |
| `<DialogActions>` | `<Group justify="flex-end">` | Manual button layout |
| `<Alert severity="error">` | `<Alert color="red">` | Color-based |
| `<Alert severity="warning">` | `<Alert color="yellow">` | |
| `<Alert severity="success">` | `<Alert color="green">` | |
| `<Alert severity="info">` | `<Alert color="blue">` | |
| `<Snackbar>` | `notifications.show()` | Imperative API |
| `<CircularProgress>` | `<Loader>` | Spinner |
| `<LinearProgress>` | `<Progress>` | Bar |
| `<Tooltip title="">` | `<Tooltip label="">` | Prop name change |

### Data Display

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<Table>` | `<Table>` | Same structure |
| `<TableHead>` | `<Table.Thead>` | Dot notation |
| `<TableBody>` | `<Table.Tbody>` | |
| `<TableRow>` | `<Table.Tr>` | |
| `<TableCell>` | `<Table.Td>` or `<Table.Th>` | |
| `<TableSortLabel>` | Custom with ActionIcon | Manual implementation |
| `<Chip>` | `<Badge>` or `<Pill>` | Badge for status, Pill for removable |
| `<Chip onDelete>` | `<Pill withRemoveButton>` | Removable chip |
| `<Badge badgeContent={5}>` | `<Indicator label={5}>` | Notification dot |
| `<Card>` | `<Card>` | Same concept |
| `<CardContent>` | `<Card.Section>` or children | Built-in padding |

### Toggle Groups

| MUI | Mantine | Notes |
|-----|---------|-------|
| `<ToggleButtonGroup>` | `<SegmentedControl>` | Different API |
| `<ToggleButton value="x">` | `data={[{value, label}]}` | Data-driven |

---

## Styling Approach Changes

### MUI sx Prop → Mantine Approaches

Mantine offers multiple styling approaches. Choose based on complexity:

#### 1. Inline Styles (Simple cases)

```typescript
// MUI
<Box sx={{ display: 'flex', gap: 2, p: 2 }}>

// Mantine
<Box style={{ display: 'flex', gap: 'var(--mantine-spacing-sm)', padding: 'var(--mantine-spacing-sm)' }}>
// Or use Mantine's built-in props
<Group gap="sm" p="sm">
```

#### 2. Component Props (Preferred for common patterns)

```typescript
// MUI
<Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>

// Mantine
<Box mb="sm">
  <Group justify="center">
```

#### 3. CSS Modules (Complex styling)

```typescript
// styles.module.css
.customCard {
  background: var(--mantine-color-blue-0);
  border: 1px solid var(--mantine-color-blue-2);

  &:hover {
    background: var(--mantine-color-blue-1);
  }
}

// Component
import classes from './styles.module.css';
<Card className={classes.customCard}>
```

#### 4. Styles API (Component-specific overrides)

```typescript
<Button
  styles={{
    root: { backgroundColor: 'var(--mantine-color-red-6)' },
    label: { fontWeight: 700 },
  }}
>
```

### Common sx Prop Translations

| MUI sx | Mantine Equivalent |
|--------|-------------------|
| `sx={{ p: 2 }}` | `p="sm"` prop |
| `sx={{ m: 2 }}` | `m="sm"` prop |
| `sx={{ mb: 2 }}` | `mb="sm"` prop |
| `sx={{ gap: 2 }}` | `gap="sm"` prop (on Group/Stack) |
| `sx={{ display: 'flex' }}` | Use `<Group>` or `<Flex>` |
| `sx={{ flexDirection: 'column' }}` | Use `<Stack>` |
| `sx={{ justifyContent: 'center' }}` | `justify="center"` on Group/Flex |
| `sx={{ alignItems: 'center' }}` | `align="center"` on Group/Stack |
| `sx={{ width: '100%' }}` | `w="100%"` prop |
| `sx={{ height: 200 }}` | `h={200}` prop |
| `sx={{ bgcolor: 'primary.main' }}` | `bg="blue"` prop |
| `sx={{ color: 'error.main' }}` | `c="red"` prop |
| `sx={{ borderRadius: 2 }}` | `radius="md"` prop |
| `sx={{ boxShadow: 2 }}` | `shadow="sm"` prop |

### Responsive Syntax

```typescript
// MUI
<Box sx={{ display: { xs: 'none', md: 'block' } }}>

// Mantine
<Box visibleFrom="md">  // or hiddenFrom="md"
// Or for other props:
<Box display={{ base: 'none', md: 'block' }}>
```

---

## Icons Migration

### Package Change

```bash
# Remove
npm uninstall @mui/icons-material

# Install
npm install @tabler/icons-react
```

### Icon Mapping

Create a mapping file or update imports directly:

| MUI Icon | Tabler Icon |
|----------|-------------|
| `<AddIcon>` | `<IconPlus>` |
| `<DeleteIcon>` | `<IconTrash>` |
| `<EditIcon>` | `<IconEdit>` or `<IconPencil>` |
| `<CloseIcon>` | `<IconX>` |
| `<MenuIcon>` | `<IconMenu2>` |
| `<SettingsIcon>` | `<IconSettings>` |
| `<SearchIcon>` | `<IconSearch>` |
| `<CheckIcon>` | `<IconCheck>` |
| `<ExpandMoreIcon>` | `<IconChevronDown>` |
| `<ExpandLessIcon>` | `<IconChevronUp>` |
| `<ChevronLeftIcon>` | `<IconChevronLeft>` |
| `<ChevronRightIcon>` | `<IconChevronRight>` |
| `<CalendarIcon>` | `<IconCalendar>` |
| `<RepeatIcon>` | `<IconRepeat>` |
| `<DragIndicatorIcon>` | `<IconGripVertical>` |
| `<VisibilityIcon>` | `<IconEye>` |
| `<VisibilityOffIcon>` | `<IconEyeOff>` |
| `<FilterListIcon>` | `<IconFilter>` |
| `<SortIcon>` | `<IconArrowsSort>` |
| `<RefreshIcon>` | `<IconRefresh>` |
| `<MoreVertIcon>` | `<IconDotsVertical>` |
| `<HomeIcon>` | `<IconHome>` |
| `<ListIcon>` | `<IconList>` |
| `<DashboardIcon>` | `<IconLayoutDashboard>` |

### Import Pattern

```typescript
// MUI
import AddIcon from '@mui/icons-material/Add';
import { Delete, Edit, Close } from '@mui/icons-material';

// Mantine/Tabler
import { IconPlus, IconTrash, IconPencil, IconX } from '@tabler/icons-react';

// Usage
<ActionIcon><IconPlus size={18} /></ActionIcon>
```

---

## Date Picker Migration

### Package Change

```bash
# Remove
npm uninstall @mui/x-date-pickers

# Install
npm install @mantine/dates dayjs
```

### Import and Setup

```typescript
// MUI
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Mantine
import { DateTimePicker } from '@mantine/dates';
import '@mantine/dates/styles.css';
```

### Component Usage

```typescript
// MUI
<LocalizationProvider dateAdapter={AdapterDateFns}>
  <DateTimePicker
    label="Due Date"
    value={dueDate}
    onChange={(newValue) => setDueDate(newValue)}
    slotProps={{ textField: { size: 'small' } }}
  />
</LocalizationProvider>

// Mantine
<DateTimePicker
  label="Due Date"
  value={dueDate}
  onChange={setDueDate}
  size="sm"
  clearable
/>
```

### Date Picker Variants

| MUI | Mantine |
|-----|---------|
| `<DatePicker>` | `<DateInput>` or `<DatePicker>` |
| `<DateTimePicker>` | `<DateTimePicker>` |
| `<TimePicker>` | `<TimeInput>` |
| `<DateRangePicker>` | `<DatePickerInput type="range">` |

---

## Form Handling

### Option 1: Continue with Current Approach

Keep existing form state management (likely useState or react-hook-form).

### Option 2: Adopt @mantine/form (Recommended)

```typescript
import { useForm } from '@mantine/form';

function TaskForm() {
  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      dueDate: null,
      priority: 'medium',
    },
    validate: {
      title: (value) => value.length < 2 ? 'Title too short' : null,
    },
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        label="Title"
        {...form.getInputProps('title')}
      />
      <Textarea
        label="Description"
        {...form.getInputProps('description')}
      />
      <Select
        label="Priority"
        data={['low', 'medium', 'high']}
        {...form.getInputProps('priority')}
      />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

---

## Notifications Migration

### Replace Snackbar with Mantine Notifications

```typescript
// Setup in main.tsx or App.tsx
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

<MantineProvider theme={theme}>
  <Notifications position="top-right" />
  <App />
</MantineProvider>
```

### Usage

```typescript
// MUI
const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
<Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleClose}>
  <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
</Snackbar>

// Mantine
import { notifications } from '@mantine/notifications';

// Show notification (no state management needed!)
notifications.show({
  title: 'Success',
  message: 'Task created successfully',
  color: 'green',
  autoClose: 5000,
});

// Error notification
notifications.show({
  title: 'Error',
  message: 'Failed to save task',
  color: 'red',
});

// With icon
import { IconCheck } from '@tabler/icons-react';
notifications.show({
  title: 'Success',
  message: 'Task completed!',
  color: 'green',
  icon: <IconCheck size={18} />,
});
```

---

## Testing Strategy

### Unit Tests (Vitest)

Update test utilities in `src/test/utils.tsx`:

```typescript
import { MantineProvider } from '@mantine/core';
import { render as rtlRender } from '@testing-library/react';
import { theme } from '../theme'; // Your Mantine theme

function render(ui: React.ReactElement, options = {}) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <MantineProvider theme={theme}>
        {children}
      </MantineProvider>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { render };
```

### E2E Tests (Playwright)

Mantine components produce cleaner DOM, so selectors should get simpler:

```typescript
// MUI often requires complex selectors
await page.locator('.MuiButton-root').click();
await page.locator('[class*="MuiDialog"]').waitFor();

// Mantine uses data attributes and cleaner structure
await page.getByRole('button', { name: 'Save' }).click();
await page.getByRole('dialog').waitFor();
```

### Test Updates Required

1. Update component rendering wrappers
2. Update any selectors that target MUI-specific classes
3. Verify all existing tests pass after each migration phase
4. Update visual regression baselines after UI changes

---

## Migration Order

Execute in this order, with a commit and CI run after each phase:

### Phase 1: Foundation Setup

**Commit 1: Add Mantine packages and configuration**
- [ ] Install Mantine packages
- [ ] Create PostCSS configuration
- [ ] Create Mantine theme file
- [ ] Update test utilities with MantineProvider
- [ ] Import Mantine CSS in main entry point
- [ ] Verify build succeeds

### Phase 2: Core Infrastructure

**Commit 2: Migrate main.tsx and App.tsx**
- [ ] Replace ThemeProvider with MantineProvider
- [ ] Set up Notifications provider
- [ ] Remove CssBaseline (Mantine handles this)
- [ ] Run full test suite

**Commit 3: Migrate MainLayout.tsx**
- [ ] Replace AppBar with AppShell.Header
- [ ] Replace Drawer with AppShell.Navbar
- [ ] Update navigation items to NavLink
- [ ] Verify responsive behavior

### Phase 3: Common Components

**Commit 4: Migrate simple common components**
- [ ] LoadingSpinner.tsx (CircularProgress → Loader)
- [ ] EmptyState.tsx
- [ ] DateDisplay.tsx

**Commit 5: Migrate chip components**
- [ ] TagChip.tsx
- [ ] PriorityChip.tsx
- [ ] DifficultyChip.tsx
- [ ] DurationChip.tsx
- [ ] StreakBadge.tsx

**Commit 6: Migrate dialog and input components**
- [ ] ConfirmDialog.tsx (Dialog → Modal)
- [ ] SearchInput.tsx
- [ ] FilterBar.tsx
- [ ] XPDisplay.tsx
- [ ] InstallPrompt.tsx

### Phase 4: Task Components

**Commit 7: Migrate TaskForm.tsx**
- [ ] Replace all form inputs
- [ ] Replace DateTimePicker
- [ ] Update form layout

**Commit 8: Migrate task display components**
- [ ] TaskCard.tsx
- [ ] TaskList.tsx
- [ ] SubtaskCard.tsx
- [ ] SubtaskList.tsx
- [ ] QuickAddBox.tsx

**Commit 9: Migrate TaskTable.tsx**
- [ ] Replace Table components
- [ ] Update sorting UI

**Commit 10: Migrate task dialogs**
- [ ] RecurrenceRuleBuilder.tsx
- [ ] ColumnConfigDialog.tsx

### Phase 5: Feature-Specific Components

**Commit 11: Migrate Habit components**
- [ ] HabitCard.tsx
- [ ] HabitList.tsx
- [ ] HabitStats.tsx
- [ ] HabitHeatmap.tsx

**Commit 12: Migrate Kanban components**
- [ ] KanbanCard.tsx
- [ ] KanbanColumn.tsx
- [ ] KanbanBoard.tsx

**Commit 13: Migrate Graph components**
- [ ] TaskNode.tsx
- [ ] DependencyGraph.tsx

**Commit 14: Migrate Calendar components**
- [ ] TaskCalendar.tsx

### Phase 6: Pages

**Commit 15: Migrate simpler pages**
- [ ] LoginPage.tsx
- [ ] SettingsPage.tsx

**Commit 16: Migrate main pages**
- [ ] Dashboard.tsx
- [ ] TasksPage.tsx
- [ ] HabitsPage.tsx

**Commit 17: Migrate remaining pages**
- [ ] CalendarPage.tsx
- [ ] KanbanPage.tsx
- [ ] GraphPage.tsx

### Phase 7: Cleanup

**Commit 18: Remove MUI dependencies**
- [ ] Uninstall @mui/* packages
- [ ] Uninstall @emotion/* packages
- [ ] Remove any remaining MUI references
- [ ] Update visual regression baselines
- [ ] Final full test suite run

### Phase 8: Future Components

**Placeholder for components added after this plan:**
- [ ] Any new components should follow Mantine patterns from the start
- [ ] Update this section as new components are added

---

## Verification Checklist

After each phase, verify:

- [ ] `bash scripts/check-all.sh` passes (includes E2E)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors in browser
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Accessibility maintained (keyboard navigation, screen readers)
- [ ] Visual appearance is consistent (update baselines if intentional changes)
- [ ] All user workflows function correctly

### Final Verification

- [ ] Bundle size reduced (check build output)
- [ ] Lighthouse scores maintained or improved
- [ ] All E2E tests pass
- [ ] Visual regression tests updated and passing
- [ ] Performance tests pass budgets
- [ ] No MUI packages in package.json
- [ ] No MUI imports in codebase

---

## Rollback Strategy

If migration encounters blocking issues:

1. **Git-based rollback**: Each phase is a separate commit, so revert to last working state
2. **Parallel development**: Keep MUI installed during migration; both can coexist temporarily
3. **Feature flags**: If needed, wrap new Mantine components in feature flags

### Coexistence (Temporary)

Both libraries can coexist during migration:

```typescript
// Temporary: Both providers can wrap the app
<ThemeProvider theme={muiTheme}>
  <MantineProvider theme={mantineTheme}>
    <App />
  </MantineProvider>
</ThemeProvider>
```

This allows incremental migration without big-bang risk.

---

## Resources

- [Mantine v8 Documentation](https://mantine.dev/)
- [Mantine GitHub](https://github.com/mantinedev/mantine)
- [Tabler Icons](https://tabler.io/icons)
- [Mantine UI Examples](https://ui.mantine.dev/)

---

## Notes

- This plan is open-ended; update as new components are added to the codebase
- Each phase should be treated as a mini-project with its own verification
- When in doubt, refer to Mantine documentation for v8-specific patterns
- Consider creating a shared components library if patterns emerge during migration
