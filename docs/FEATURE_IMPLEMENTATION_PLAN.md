# Feature Implementation Plan

This document outlines the implementation plan for 10 advanced features, ordered from easiest to most complex. Each phase includes detailed technical specifications, testing requirements, and acceptance criteria.

**Critical Requirement:** Each phase MUST pass the full test suite (`bash scripts/check-all.sh`) including E2E tests before proceeding to the next phase.

---

## Table of Contents

1. [Phase 1: Recurrence Correction Fix](#phase-1-recurrence-correction-fix)
2. [Phase 2: Max Due Date Filter](#phase-2-max-due-date-filter)
3. [Phase 3: Mobile Card Simplification](#phase-3-mobile-card-simplification)
4. [Phase 4: Mobile Filter Improvements](#phase-4-mobile-filter-improvements)
5. [Phase 5: Inverted Penalty Multipliers](#phase-5-inverted-penalty-multipliers)
6. [Phase 6: Penalty Score and Net Score Fields](#phase-6-penalty-score-and-net-score-fields)
7. [Phase 7: Swipe to Complete](#phase-7-swipe-to-complete)
8. [Phase 8: Counter Task Type](#phase-8-counter-task-type)
9. [Phase 9: Recurring Task Dependencies](#phase-9-recurring-task-dependencies)
10. [Phase 10: Inline Table Editing](#phase-10-inline-table-editing)

---

## Phase 1: Recurrence Correction Fix

**Complexity:** Very Low (Bug Fix)
**Estimated Files Changed:** 1-2

### Current Behavior
The `_advance_to_future_start()` function in `src/motido/core/recurrence.py` ensures the START date is in the future when using "From Due Date" recurrence correction.

### Required Change
For "From Due Date" recurrence type, ensure the DUE date of the new instance is after the COMPLETION date of the previous instance (not that the start date is in the future).

### Implementation Details

**File:** `src/motido/core/recurrence.py`

```python
# In _advance_to_future_start() function (lines 147-195)
# Change the logic from:
#   - Checking if start_date > today
# To:
#   - Checking if due_date > completion_date of previous instance

def _advance_to_future_start(
    next_due: date,
    habit_start_delta: int,
    rrule_str: str,
    completion_date: date,  # Add this parameter
) -> date:
    """
    Advance the recurrence until the due date is after the completion date.

    For FROM_DUE_DATE recurrence, we offset based on when the task was
    actually completed, ensuring the new due date is always after completion.
    """
    while next_due <= completion_date:
        next_due = calculate_next_occurrence(next_due, rrule_str)
    return next_due
```

**Update `create_next_habit_instance()`** to pass `completion_date` to the helper function.

### Test Requirements

**Unit Tests:** `tests/test_recurrence.py`
- Test that completing a task late (e.g., 3 days after due date) results in a new instance with due date after completion date
- Test edge case: completing on due date
- Test edge case: completing before due date
- Test with different recurrence intervals (daily, weekly, monthly)

**E2E Tests:** Verify in existing habit E2E tests that late completion behaves correctly

### Acceptance Criteria
- [ ] New due date is always > completion date for FROM_DUE_DATE recurrence
- [ ] All existing recurrence tests pass
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 2: Max Due Date Filter

**Complexity:** Low
**Estimated Files Changed:** 3-4

### Current Filters
- Status (all, active, blocked, future, completed)
- Priorities, Difficulties, Durations (multi-select)
- Projects, Tags (multi-select)
- Search text

### Required Change
Add a "Max Due Date" filter that shows only tasks with due date <= selected date.

### Implementation Details

**Frontend Changes:**

1. **FilterBar.tsx** - Add date picker for max due date
```typescript
// Add to filter state in taskStore.ts
maxDueDate: string | null; // ISO date string

// Add to FilterBar component
<DatePickerInput
  label="Due before"
  placeholder="Select max due date"
  value={maxDueDate ? new Date(maxDueDate) : null}
  onChange={(date) => setMaxDueDate(date?.toISOString() ?? null)}
  clearable
/>
```

2. **taskStore.ts** - Add filter state and logic
```typescript
// Add to FilterState interface
maxDueDate: string | null;

// Add to filter logic in getFilteredTasks()
if (filters.maxDueDate) {
  tasks = tasks.filter(task =>
    task.due_date && new Date(task.due_date) <= new Date(filters.maxDueDate)
  );
}
```

3. **FilterBar active chip display** - Show active max due date filter with clear button

### Test Requirements

**Unit Tests:** `frontend/src/components/common/FilterBar.test.tsx`
- Test filter is applied correctly
- Test clearing the filter
- Test interaction with other filters
- Test tasks without due dates are excluded when filter is active

**E2E Tests:** `frontend/e2e/tasks.spec.ts`
- Test setting max due date filter
- Verify only tasks before/on that date appear
- Test clearing the filter

### Acceptance Criteria
- [ ] Date picker appears in FilterBar
- [ ] Setting a date filters tasks correctly
- [ ] Active filter chip shows selected date
- [ ] Clear button removes the filter
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 3: Mobile Card Simplification

**Complexity:** Low-Medium
**Estimated Files Changed:** 2-3

### Current Behavior
Task cards on mobile show all metadata (XP, priority, difficulty, duration, due date, streak, project) before expansion.

### Required Change
On mobile, show only:
- Task name (with icon)
- XP score
- Due date

All other metadata should be visible after expanding the card.

### Implementation Details

**File:** `frontend/src/components/tasks/TaskCard.tsx`

1. **Detect mobile viewport**
```typescript
import { useMediaQuery } from '@mantine/hooks';

const isMobile = useMediaQuery('(max-width: 768px)');
```

2. **Conditional metadata rendering**
```typescript
// Collapsed state on mobile shows only:
// - Title row (icon + name + recurring indicator + dependencies)
// - Minimal metadata: XP and due date

// Expanded state (or desktop always) shows:
// - Priority badge
// - Difficulty badge
// - Duration badge
// - Streak badge
// - Project tag
// - Tags
// - Description
// - Subtasks
```

3. **Adjust expand/collapse logic**
```typescript
// hasDetails should always be true on mobile (since we always hide some info)
const hasDetails = isMobile || !!task.text_description || !!task.tags?.length || hasSubtasks;
```

### Test Requirements

**Unit Tests:** `frontend/src/components/tasks/TaskCard.test.tsx`
- Test collapsed state on mobile shows minimal info
- Test expanded state shows all info
- Test desktop always shows full info
- Mock `useMediaQuery` for mobile/desktop testing

**Visual Regression Tests:** Update snapshots for mobile card view

**E2E Tests:** Test card expansion on mobile viewport

### Acceptance Criteria
- [ ] Mobile cards show only name, XP, due date when collapsed
- [ ] Expanding card reveals all metadata
- [ ] Desktop cards unchanged (show all metadata)
- [ ] Expand button always visible on mobile
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 4: Mobile Filter Improvements

**Complexity:** Low-Medium
**Estimated Files Changed:** 2-3

### Current Behavior
All filters stack vertically on mobile, making the filter bar very busy.

### Proposed Solutions

**Option A: Collapsible Filter Section**
Hide filters behind an "Expand Filters" button. Shows only search bar + active filter count by default.

**Option B: Filter Modal/Drawer**
Open a full-screen modal or slide-out drawer with all filter options.

**Option C: Chip-Based Quick Filters**
Show horizontal scrolling chips for common filters, with "More" opening full filter options.

### Recommended: Option B (Filter Drawer)

### Implementation Details

**File:** `frontend/src/components/common/FilterBar.tsx`

1. **Mobile detection**
```typescript
const isMobile = useMediaQuery('(max-width: 768px)');
```

2. **Filter drawer component**
```typescript
// On mobile: show compact bar with search + filter button
// Filter button opens Mantine Drawer with all options

<Group>
  <TextInput placeholder="Search..." style={{ flex: 1 }} />
  <Button leftSection={<IconFilter />} onClick={openDrawer}>
    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
  </Button>
</Group>

<Drawer
  opened={drawerOpened}
  onClose={closeDrawer}
  title="Filter Tasks"
  position="bottom"
  size="80%"
>
  {/* All filter options rendered vertically with full width */}
</Drawer>
```

3. **Active filter indicator**
```typescript
// Show count of active filters on the button
// Show active filter chips above the search bar (horizontally scrolling)
```

### Test Requirements

**Unit Tests:** `frontend/src/components/common/FilterBar.test.tsx`
- Test drawer opens/closes on mobile
- Test filter button shows correct count
- Test desktop shows inline filters (no drawer)

**E2E Tests:**
- Test filtering via drawer on mobile viewport
- Test active filter indicators

### Acceptance Criteria
- [ ] Mobile shows compact filter bar with drawer
- [ ] Filter button shows count of active filters
- [ ] Drawer contains all filter options
- [ ] Desktop FilterBar unchanged
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 5: Inverted Penalty Multipliers

**Complexity:** Medium
**Estimated Files Changed:** 2-3

### Current Behavior
Penalty calculation (in `apply_penalties()`):
```python
penalty = current_score / (difficulty_multiplier * duration_multiplier)
```

This means harder/longer tasks have SMALLER penalties when skipped.

### Required Change
Invert the logic: easier/shorter tasks should have higher penalties because:
- Harder/longer tasks are more valuable as XP rewards
- Skipping easy tasks should be penalized more (no excuse for skipping easy things)

### Implementation Details

**File:** `src/motido/core/scoring.py`

1. **Add inverted multiplier calculation**
```python
def get_penalty_multiplier(difficulty: Difficulty, duration: Duration) -> float:
    """
    Calculate penalty multiplier - INVERTED from XP multiplier.

    Easy/short tasks get HIGHER penalties (no excuse for skipping).
    Hard/long tasks get LOWER penalties (understandable to defer).
    """
    # XP multipliers are 1.0-5.0 where 5.0 = hardest/longest
    # Invert: penalty multiplier = 6.0 - xp_multiplier
    # So trivial (1.0) becomes 5.0, herculean (5.0) becomes 1.0

    difficulty_penalty = 6.0 - SCORING_CONFIG.difficulty_multipliers[difficulty]
    duration_penalty = 6.0 - SCORING_CONFIG.duration_multipliers[duration]

    return difficulty_penalty * duration_penalty
```

2. **Update `apply_penalties()` function**
```python
def apply_penalties(task: Task, today: date) -> float:
    """Apply penalty for incomplete tasks."""
    # ... existing checks ...

    # Calculate inverted penalty (higher for easy tasks)
    penalty_multiplier = get_penalty_multiplier(task.difficulty, task.duration)

    # Base penalty calculation
    base_penalty = SCORING_CONFIG.base_score * penalty_multiplier

    # Apply due date urgency (more penalty if very overdue)
    # ... additional logic ...

    return base_penalty
```

3. **Configuration option** (optional)
```python
# In SCORING_CONFIG
penalty_inversion_enabled: bool = True  # Allow toggling behavior
```

### Test Requirements

**Unit Tests:** `tests/test_scoring.py`
- Test trivial/minuscule task has highest penalty
- Test herculean/odysseyan task has lowest penalty
- Test medium difficulty/duration has middle penalty
- Test penalty values are proportional

**Integration Tests:** Test penalty application over multiple days

### Acceptance Criteria
- [ ] Trivial tasks penalized ~25x more than Herculean tasks
- [ ] Penalty formula documented in code comments
- [ ] All existing scoring tests updated/passing
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 6: Penalty Score and Net Score Fields

**Complexity:** Medium
**Estimated Files Changed:** 8-10

### Dependencies
- Phase 5 (Inverted Penalty Multipliers) must be complete

### New Fields
1. **Penalty Score:** The penalty this task would incur if not completed today
2. **Net Score:** XP reward + penalty avoided (for tasks due today/overdue)

### Implementation Details

**Backend Changes:**

1. **Update Task model** (`src/motido/core/models.py`)
```python
@dataclass
class Task:
    # ... existing fields ...

    # Computed fields (not persisted)
    score: float = 0.0
    penalty_score: float = 0.0  # NEW
    net_score: float = 0.0       # NEW
```

2. **Update scoring.py**
```python
def calculate_score(task: Task, today: date) -> tuple[float, float, float]:
    """
    Calculate XP score, penalty score, and net score for a task.

    Returns:
        (xp_score, penalty_score, net_score)
    """
    xp_score = # ... existing calculation ...

    # Penalty score: what would be lost if task not completed
    if task.due_date and task.due_date <= today:
        penalty_score = calculate_penalty_score(task)
    else:
        penalty_score = 0.0

    # Net score: XP gained + penalty avoided
    net_score = xp_score + penalty_score

    return (xp_score, penalty_score, net_score)
```

3. **Update API response** (`src/motido/api/schemas.py`)
```python
class TaskResponse(BaseModel):
    # ... existing fields ...
    score: float
    penalty_score: float  # NEW
    net_score: float       # NEW
```

**Frontend Changes:**

4. **Update TypeScript types** (`frontend/src/types/models.ts`)
```typescript
interface Task {
  // ... existing fields ...
  score: number;
  penalty_score: number;  // NEW
  net_score: number;       // NEW
}
```

5. **Update TaskTable.tsx** - Add new columns
```typescript
// Add to COLUMN_DEFINITIONS
{ key: 'penalty_score', label: 'Penalty', sortable: true, defaultVisible: false },
{ key: 'net_score', label: 'Net Score', sortable: true, defaultVisible: true },
```

6. **Update TaskCard.tsx** - Show net score when relevant
```typescript
// Show net score instead of XP when task is due/overdue
{task.penalty_score > 0 ? (
  <Badge color="red">Net: {task.net_score} XP</Badge>
) : (
  <Badge>{task.score} XP</Badge>
)}
```

### Test Requirements

**Unit Tests (Backend):**
- Test penalty_score is 0 for future tasks
- Test penalty_score calculated correctly for due/overdue tasks
- Test net_score = score + penalty_score

**Unit Tests (Frontend):**
- Test columns render correctly
- Test sorting by penalty_score and net_score
- Test TaskCard displays net score when applicable

**E2E Tests:**
- Test table shows new columns
- Test sorting by new columns works

### Acceptance Criteria
- [ ] penalty_score field populated for due/overdue tasks
- [ ] net_score = XP + penalty for due/overdue tasks
- [ ] Table columns sortable by new fields
- [ ] TaskCard shows net score when penalty applies
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 7: Swipe to Complete

**Complexity:** Medium
**Estimated Files Changed:** 3-5

### Desired Behavior
In task card view, users can swipe right to mark a task as complete (similar to email apps like Gmail/Outlook).

### Implementation Details

**Approach:** Use a swipe gesture library or implement with touch event handlers.

**Recommended Library:** `react-swipeable` or custom implementation with `@use-gesture/react`

1. **Install dependency**
```bash
cd frontend && npm install @use-gesture/react
```

2. **Create SwipeableCard wrapper** (`frontend/src/components/tasks/SwipeableTaskCard.tsx`)
```typescript
import { useGesture } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';

interface SwipeableTaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  children: React.ReactNode;
}

export function SwipeableTaskCard({ task, onComplete, children }: SwipeableTaskCardProps) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useGesture({
    onDrag: ({ movement: [mx], direction: [dx], velocity: [vx], cancel }) => {
      // Swipe right to complete
      if (mx > 100 && dx > 0) {
        api.start({ x: 300 }); // Slide off screen
        onComplete(task.id);
        cancel();
      } else {
        api.start({ x: 0 }); // Snap back
      }
    },
  });

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background revealed on swipe */}
      <div style={{
        position: 'absolute',
        left: 0,
        background: 'green',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
      }}>
        <IconCheck /> Complete
      </div>

      {/* Swipeable card */}
      <animated.div {...bind()} style={{ x, touchAction: 'pan-y' }}>
        {children}
      </animated.div>
    </div>
  );
}
```

3. **Integrate with TaskCard**
```typescript
// In parent component (TasksPage or TaskList)
{tasks.map(task => (
  <SwipeableTaskCard
    key={task.id}
    task={task}
    onComplete={handleComplete}
  >
    <TaskCard task={task} />
  </SwipeableTaskCard>
))}
```

4. **Visual feedback**
- Green background with checkmark icon revealed on swipe
- Haptic feedback on mobile (if available via browser API)
- Undo toast after completion

### Test Requirements

**Unit Tests:**
- Test swipe gesture triggers onComplete callback
- Test insufficient swipe snaps back
- Test blocked tasks cannot be swiped
- Test completed tasks show different swipe behavior (undo?)

**E2E Tests:**
- Test swipe gesture on mobile viewport (simulated touch)
- Test task disappears after swipe completion
- Test undo functionality if implemented

### Acceptance Criteria
- [ ] Swipe right completes task
- [ ] Visual feedback during swipe (green background)
- [ ] Blocked tasks cannot be swiped
- [ ] Desktop behavior unchanged (click-based)
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 8: Counter Task Type

**Complexity:** High
**Estimated Files Changed:** 15-20

### Behavior
A counter task must be completed X times before the due date:
- Completing increments counter: 1/X, 2/X, ... X/X
- Each increment grants `0.5 * (1/X)` of base XP
- Final completion grants remaining `0.5 * base_XP`

**Example:** Task worth 100 XP, requires 5 completions
- Each increment: 0.5 * (100/5) = 10 XP
- Final completion: 0.5 * 100 = 50 XP
- Total: 4 * 10 + 50 = 90 XP (or 10 * 5 = 50 + 50 = 100 XP if completed)

### Implementation Details

**Backend Changes:**

1. **Update Task model** (`src/motido/core/models.py`)
```python
@dataclass
class Task:
    # ... existing fields ...

    # Counter task fields
    is_counter: bool = False
    counter_target: int = 1       # How many completions needed
    counter_current: int = 0      # Current count
```

2. **Create counter logic** (`src/motido/core/counter.py`)
```python
def increment_counter(task: Task) -> tuple[Task, float]:
    """
    Increment a counter task and calculate XP reward.

    Returns:
        (updated_task, xp_earned)
    """
    if not task.is_counter:
        raise ValueError("Task is not a counter task")

    if task.counter_current >= task.counter_target:
        raise ValueError("Counter already complete")

    task.counter_current += 1

    # Calculate XP
    base_score = calculate_base_score(task)
    if task.counter_current < task.counter_target:
        # Partial completion: 0.5 * (1/target) of base
        xp = 0.5 * (base_score / task.counter_target)
    else:
        # Final completion: remaining 0.5 + last increment
        xp = 0.5 * base_score + 0.5 * (base_score / task.counter_target)
        task.is_complete = True

    return task, xp
```

3. **New API endpoint** (`src/motido/api/routers/tasks.py`)
```python
@router.post("/{task_id}/increment")
async def increment_counter_task(task_id: str) -> TaskResponse:
    """Increment a counter task's progress."""
    ...
```

4. **Update scoring** to account for counter tasks

**Frontend Changes:**

5. **Update TypeScript types**
```typescript
interface Task {
  // ... existing fields ...
  is_counter: boolean;
  counter_target: number;
  counter_current: number;
}
```

6. **TaskForm** - Add counter task option
```typescript
// Toggle for "Counter Task"
// Number input for "Target count"
```

7. **TaskCard** - Show counter progress
```typescript
// Replace complete button with increment button for counter tasks
// Show progress: "3/5 completed"
// Visual progress bar
```

8. **TaskTable** - Counter column and actions
```typescript
// Show counter progress in a column
// Increment button in actions
```

### Test Requirements

**Unit Tests (Backend):**
- Test increment_counter function
- Test XP calculation at each increment
- Test final completion XP
- Test cannot increment past target
- Test non-counter tasks rejected

**Unit Tests (Frontend):**
- Test counter progress display
- Test increment button functionality
- Test form validation for counter fields

**E2E Tests:**
- Test creating a counter task
- Test incrementing through to completion
- Test XP awarded at each step
- Test counter progress persists across page reload

### Acceptance Criteria
- [ ] Counter tasks can be created with target count
- [ ] Increment action increases counter
- [ ] XP awarded proportionally per increment
- [ ] Final completion awards remaining XP
- [ ] Progress displayed in card and table
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 9: Recurring Task Dependencies

**Complexity:** Very High
**Estimated Files Changed:** 10-15

### Problem Statement
When a recurring task (B) depends on another recurring task (A):
- When A is completed, a new instance A' is created
- When B is completed later, new instance B' should depend on A', not original A
- Challenge: A' and B' are created at different times

### Solution: Dependency Template Pattern

Store a "dependency template" that references the parent habit ID, not the specific instance ID. When creating new instances, resolve templates to actual task IDs.

### Implementation Details

**Backend Changes:**

1. **Update Task model** (`src/motido/core/models.py`)
```python
@dataclass
class Task:
    # ... existing fields ...

    # Regular dependencies (specific task IDs)
    dependencies: List[str] = field(default_factory=list)

    # Template dependencies (parent habit IDs for recurring tasks)
    dependency_templates: List[str] = field(default_factory=list)
```

2. **Dependency resolution** (`src/motido/core/dependencies.py`)
```python
def resolve_dependency_templates(
    task: Task,
    all_tasks: List[Task],
) -> List[str]:
    """
    Resolve dependency templates to actual task IDs.

    For each parent_habit_id in dependency_templates, find the
    most recent incomplete instance of that habit.
    """
    resolved = list(task.dependencies)  # Start with explicit deps

    for parent_habit_id in task.dependency_templates:
        # Find latest incomplete instance of this habit
        candidates = [
            t for t in all_tasks
            if t.parent_habit_id == parent_habit_id and not t.is_complete
        ]
        if candidates:
            # Get the one with the latest due date
            latest = max(candidates, key=lambda t: t.due_date or date.max)
            resolved.append(latest.id)

    return resolved
```

3. **Update recurrence.py** - Carry forward dependency templates
```python
def create_next_habit_instance(task: Task, ...) -> Task:
    new_task = Task(
        # ... existing fields ...

        # Carry forward dependency templates (NOT regular dependencies)
        dependency_templates=task.dependency_templates,
    )
    return new_task
```

4. **Update blocked status calculation**
```python
def is_task_blocked(task: Task, all_tasks: List[Task]) -> bool:
    """Check if task is blocked by incomplete dependencies."""
    resolved_deps = resolve_dependency_templates(task, all_tasks)
    for dep_id in resolved_deps:
        dep_task = get_task_by_id(dep_id, all_tasks)
        if dep_task and not dep_task.is_complete:
            return True
    return False
```

5. **API for setting template dependencies**
```python
@router.post("/{task_id}/dependency-template/{parent_habit_id}")
async def add_dependency_template(task_id: str, parent_habit_id: str):
    """Add a recurring dependency template."""
    ...
```

**Frontend Changes:**

6. **Update DependencyGraph** - Show template dependencies differently
7. **TaskForm** - Option to create template vs instance dependency
8. **Dependency picker** - Filter to show only recurring tasks for templates

### Test Requirements

**Unit Tests (Backend):**
- Test dependency template resolution
- Test new habit instance carries templates
- Test blocked status with template dependencies
- Test mixed regular + template dependencies

**E2E Tests:**
- Create two recurring tasks with template dependency
- Complete first task, verify new instance created
- Complete second task, verify new instance depends on first's new instance
- Test across multiple recurrence cycles

### Acceptance Criteria
- [ ] Template dependencies persist across recurrence
- [ ] New instances resolve to correct dependency instances
- [ ] Blocked status calculated correctly
- [ ] Dependency graph shows template relationships
- [ ] `bash scripts/check-all.sh` passes

---

## Phase 10: Inline Table Editing

**Complexity:** Very High (Major Feature)
**Estimated Files Changed:** 15-25

### Desired Behavior
Click any cell in the table view to edit that field inline:
- **Text fields** (title): Inline text input
- **Date fields** (due_date, start_date): Date picker popover
- **Select fields** (priority, difficulty, duration): Dropdown popover
- **Tags/Project**: Multi-select or autocomplete popover

### Implementation Details

**Architecture:** Create an EditableCell component system with field-specific editors.

**Core Components:**

1. **EditableCell wrapper** (`frontend/src/components/tasks/EditableCell.tsx`)
```typescript
interface EditableCellProps {
  task: Task;
  field: keyof Task;
  value: any;
  onSave: (taskId: string, field: string, value: any) => Promise<void>;
  children: React.ReactNode;
}

export function EditableCell({ task, field, value, onSave, children }: EditableCellProps) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
    );
  }

  // Render appropriate editor based on field type
  return <FieldEditor field={field} value={value} onSave={...} onCancel={...} />;
}
```

2. **Field-specific editors:**

```typescript
// TextFieldEditor.tsx
<TextInput
  value={localValue}
  onChange={(e) => setLocalValue(e.target.value)}
  onBlur={handleSave}
  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
  autoFocus
/>

// DateFieldEditor.tsx
<DatePickerInput
  value={localValue}
  onChange={(date) => { setLocalValue(date); handleSave(); }}
  popoverProps={{ opened: true }}
/>

// SelectFieldEditor.tsx
<Select
  data={options}
  value={localValue}
  onChange={(val) => { setLocalValue(val); handleSave(); }}
  dropdownOpened={true}
/>

// TagsFieldEditor.tsx
<MultiSelect
  data={allTags}
  value={localValue}
  onChange={setLocalValue}
  onBlur={handleSave}
/>
```

3. **Update TaskTable.tsx** - Wrap cells with EditableCell
```typescript
// Before:
<td>{task.title}</td>

// After:
<td>
  <EditableCell
    task={task}
    field="title"
    value={task.title}
    onSave={handleInlineEdit}
  >
    {task.title}
  </EditableCell>
</td>
```

4. **Optimistic updates with rollback**
```typescript
const handleInlineEdit = async (taskId: string, field: string, value: any) => {
  const previousValue = tasks.find(t => t.id === taskId)?.[field];

  // Optimistic update
  updateTaskLocally(taskId, { [field]: value });

  try {
    await api.updateTask(taskId, { [field]: value });
  } catch (error) {
    // Rollback on failure
    updateTaskLocally(taskId, { [field]: previousValue });
    showErrorNotification('Failed to update task');
  }
};
```

5. **Keyboard navigation**
- Tab to move to next editable cell
- Escape to cancel editing
- Enter to save (for text fields)
- Arrow keys in dropdowns

6. **Field-specific validation**
```typescript
const FIELD_VALIDATORS: Record<string, (value: any) => string | null> = {
  title: (v) => v.trim() ? null : 'Title is required',
  counter_target: (v) => v > 0 ? null : 'Must be greater than 0',
  // etc.
};
```

### Phased Implementation (Sub-phases)

**10a: Select Fields Only**
- Priority, Difficulty, Duration dropdowns
- Simplest to implement, good proof of concept

**10b: Date Fields**
- Due date, Start date with date pickers
- Creation date should be read-only

**10c: Text Fields**
- Title (required, validated)
- Description (optional, multiline?)

**10d: Tags and Project**
- Multi-select for tags
- Autocomplete for project

**10e: Special Fields**
- Counter target (number input)
- Recurrence rule (complex - might open full editor)

### Test Requirements

**Unit Tests:**
- Test EditableCell opens on click
- Test each field editor type
- Test save/cancel functionality
- Test validation
- Test keyboard navigation
- Test optimistic update and rollback

**E2E Tests:**
- Test inline editing for each field type
- Test changes persist after page reload
- Test validation errors displayed
- Test cancel behavior
- Test rapid successive edits

### Acceptance Criteria
- [ ] All field types support inline editing
- [ ] Click-to-edit UX is intuitive
- [ ] Changes save automatically on blur/enter
- [ ] Escape cancels without saving
- [ ] Validation errors shown inline
- [ ] Optimistic updates with rollback
- [ ] `bash scripts/check-all.sh` passes

---

## Summary: Implementation Order

| Phase | Feature | Complexity | Est. Files |
|-------|---------|------------|------------|
| 1 | Recurrence Correction Fix | Very Low | 1-2 |
| 2 | Max Due Date Filter | Low | 3-4 |
| 3 | Mobile Card Simplification | Low-Medium | 2-3 |
| 4 | Mobile Filter Improvements | Low-Medium | 2-3 |
| 5 | Inverted Penalty Multipliers | Medium | 2-3 |
| 6 | Penalty Score and Net Score | Medium | 8-10 |
| 7 | Swipe to Complete | Medium | 3-5 |
| 8 | Counter Task Type | High | 15-20 |
| 9 | Recurring Task Dependencies | Very High | 10-15 |
| 10 | Inline Table Editing | Very High | 15-25 |

**Total Estimated Files:** 60-90 files across all phases

---

## Quality Gates

Before each phase is considered complete:

1. [ ] All new code has unit test coverage
2. [ ] All existing tests still pass
3. [ ] E2E tests cover new user workflows
4. [ ] `bash scripts/check-all.sh` passes completely
5. [ ] Code reviewed for security vulnerabilities
6. [ ] No TypeScript errors
7. [ ] No ESLint warnings
8. [ ] Python pylint score = 10.0/10.0
9. [ ] Python coverage = 100%
10. [ ] Changes committed and CI passes

---

## Notes

- Each phase should be implemented, tested, committed, and verified in CI before starting the next
- If a phase uncovers issues with assumptions, update this plan before proceeding
- Complex phases (8, 9, 10) may benefit from sub-phase breakdown
- Mobile features (3, 4, 7) should be tested on real devices, not just browser emulation
