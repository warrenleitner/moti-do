# MotiDo Implementation Plan

Based on the Vision Audit, this document outlines the phased implementation plan to align the codebase with the vision in `basic_idea.md`.

---

## Progress Tracker

| Feature | Status | Notes |
|---------|--------|-------|
| XP Transaction logging | ✅ Complete | `add_xp()` and `withdraw_xp()` now log transactions |
| Badge model | ✅ Complete | `Badge` dataclass with `is_earned()` method |
| SubtaskRecurrenceMode enum | ✅ Complete | DEFAULT, PARTIAL, ALWAYS modes |
| User model enhancements | ✅ Complete | Added `xp_transactions` and `badges` fields |
| JSON serialization | ✅ Complete | New deserializers for transactions/badges |
| Habit statistics CLI | ✅ Complete | `motido habits` command |
| XP log CLI | ✅ Complete | `motido xp log` subcommand |
| Stats CLI | ✅ Complete | `motido stats` command |
| Habit auto-generation | ✅ Complete | Creates next instance on habit completion |
| Kanban view | ✅ Complete | `motido view kanban` with 5 columns |
| Tag/Project colors | ✅ Complete | `Tag` and `Project` dataclasses with color support; `motido tags` and `motido projects` commands |
| Heatmap view | ✅ Complete | `motido view heatmap [--habit ID] [--weeks N]` for habit completion visualization |
| Batch operations | ✅ Complete | `motido batch-edit` and `motido batch-complete` commands with filters |

---

## Phase 1: Complete Habit System (Priority: High)

**Goal**: Achieve milestone 2.5/3.0 - Full habit tracking with auto-generation and statistics

### 1.1 Auto-Generate Habit Instances

**Files to modify**:
- `core/models.py` - Add `last_completed_date`, `parent_habit_id` fields
- `core/recurrence.py` - Add `create_next_habit_instance()` function
- `cli/main.py` - Modify `handle_complete()` to generate next instance

**Implementation**:
```python
# In recurrence.py
def create_next_habit_instance(task: Task, completion_date: datetime) -> Task | None:
    """Creates the next occurrence of a habit task."""
    next_due = calculate_next_occurrence(task, completion_date)
    if not next_due:
        return None
    
    # Clone task with new dates
    new_task = Task(
        title=task.title,
        creation_date=datetime.now(),
        priority=task.priority,
        # ... copy other fields
        due_date=next_due,
        is_habit=True,
        recurrence_rule=task.recurrence_rule,
        recurrence_type=task.recurrence_type,
    )
    return new_task
```

### 1.2 Subtask Recurrence Options

**Add to `models.py`**:
```python
class SubtaskRecurrenceMode(str, Enum):
    DEFAULT = "default"      # New recurrence only after ALL subtasks complete
    PARTIAL = "partial"      # New task with only completed subtasks
    ALWAYS = "always"        # Full new task regardless of subtask state
```

### 1.3 Habit Statistics

**New CLI command**: `motido habits`

**Output**:
```
Habit Stats
┌──────────────────┬─────────┬──────────┬──────────┬────────────┐
│ Habit            │ Streak  │ Best     │ Complete │ Rate       │
├──────────────────┼─────────┼──────────┼──────────┼────────────┤
│ Daily Exercise   │ 5 days  │ 12 days  │ 45/60    │ 75%        │
│ Read a Book      │ 3 days  │ 8 days   │ 30/45    │ 67%        │
└──────────────────┴─────────┴──────────┴──────────┴────────────┘
```

### 1.4 Habit Heatmap View

**New command**: `motido view heatmap --id <habit_id>`

**Implementation in `views.py`**:
```python
def render_habit_heatmap(task: Task, console: Console) -> None:
    """Renders a calendar heatmap showing habit completion."""
    # Show last 12 weeks in a grid
    # ✓ = completed, ○ = missed, · = not applicable
```

---

## Phase 2: Enhanced Data Models (Priority: High)

**Goal**: Add color support, transaction logging, and model improvements

### 2.1 Tag and Project Colors

**Modify `models.py`**:
```python
@dataclass
class Tag:
    name: str
    color: str = "#808080"  # Default gray
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

@dataclass
class Project:
    name: str
    color: str = "#4A90D9"  # Default blue
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
```

**Update Task model**:
```python
# Change from:
tags: List[str]
project: str | None

# To:
tags: List[Tag]
project: Project | None
```

**Migration**:
- Add backward-compatible deserialization
- CLI commands for managing tags/projects globally

### 2.2 XP Transaction Log

**Add to `models.py`**:
```python
@dataclass
class XPTransaction:
    amount: int
    source: str  # "task_completion", "subtask_completion", "penalty", "withdrawal"
    timestamp: datetime
    task_id: str | None = None
    description: str = ""
```

**Add to `User`**:
```python
xp_transactions: List[XPTransaction] = field(default_factory=list)
```

**New command**: `motido xp log` - Shows transaction history

### 2.3 Badge System

**Add to `models.py`**:
```python
@dataclass
class Badge:
    id: str
    name: str
    description: str
    glyph: str  # Emoji
    earned_date: datetime | None = None
```

**Badge definitions in `scoring_config.json`**:
```json
{
  "badges": [
    {"id": "first_task", "name": "Getting Started", "glyph": "🌟", "criteria": {"tasks_completed": 1}},
    {"id": "streak_7", "name": "Week Warrior", "glyph": "🔥", "criteria": {"streak_days": 7}},
    {"id": "centurion", "name": "Centurion", "glyph": "💯", "criteria": {"tasks_completed": 100}}
  ]
}
```

---

## Phase 3: Enhanced Views (Priority: Medium)

**Goal**: Achieve milestone 2.0 - Complex views

### 3.1 Kanban View

**New command**: `motido view kanban`

**Columns**:
- Backlog (future tasks)
- To Do (active, no start date passed)
- In Progress (start date passed)
- Blocked (has incomplete dependencies)
- Done (completed)

### 3.2 Productivity Stats

**New command**: `motido stats`

**Output**:
```
Productivity Stats (Last 30 Days)
─────────────────────────────────
Tasks Created:     45
Tasks Completed:   38
Completion Rate:   84%
XP Earned:         1,250
XP Spent:          200
Net XP:            1,050

Top Projects:
  Career:          15 tasks (395 XP)
  Fitness:         12 tasks (280 XP)

Badges Earned:     3/15
```

### 3.3 Calendar Heat View

**Enhance `view calendar`** to show:
- Color intensity based on tasks completed that day
- Click/select to drill into specific date

---

## Phase 4: Multi-Task Operations (Priority: Medium)

**Goal**: Enable batch operations on filtered tasks

### 4.1 Batch Edit Command

**New command**: `motido batch-edit`

**Options**:
```bash
motido batch-edit --filter "project:Career" --set-priority High
motido batch-edit --filter "tag:urgent" --set-due "2025-01-15"
motido batch-edit --filter "status:active" --set-project "Q1 Goals"
```

### 4.2 Batch Complete

```bash
motido batch-complete --filter "project:Sprint1"
```

---

## Phase 5: Polish & Configuration (Priority: Lower)

### 5.1 Icon Auto-Generation

- Use keyword matching to suggest emojis
- Common mappings: "exercise" → 🏃, "read" → 📚, "call" → 📞

### 5.2 Default Tag/Project Colors

Add to config:
```json
{
  "default_colors": {
    "tags": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
    "projects": ["#6C5CE7", "#A29BFE", "#74B9FF", "#0984E3", "#00CEC9"]
  }
}
```

---

## Implementation Order

| Order | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1 | Habit auto-generation | Medium | High |
| 2 | Habit statistics CLI | Low | High |
| 3 | XP transaction log | Low | Medium |
| 4 | Badge system basics | Medium | Medium |
| 5 | Kanban view | Medium | Medium |
| 6 | Tag/Project colors | Medium | Low |
| 7 | Batch operations | High | Medium |
| 8 | Heatmap view | Medium | Medium |

---

## Testing Strategy

Each feature requires:
1. Unit tests in `tests/test_<feature>.py`
2. Edge case tests in `tests/test_<feature>_edge_cases.py`
3. Integration tests where applicable

Coverage requirement: **100%** (enforced by `poetry run poe coverage`)

---

## Migration Notes

When adding new model fields:
1. Update `JsonDataManager._serialize_task()` and `_deserialize_task()`
2. Update `DatabaseDataManager` schema and methods
3. Add default values for backward compatibility
4. Update `conftest.py` fixtures
