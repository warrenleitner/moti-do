# Moti-Do Comprehensive Implementation Plan

## Executive Summary

This document provides a complete audit of the Moti-Do codebase against the vision in `basic_idea.md`, identifying gaps and providing a detailed roadmap to achieve the stated end goals.

**Current Status**: CLI-based implementation is approximately **85% complete** for core features. The major remaining work is the GUI/PWA implementation (milestones 0.5-1.0).

---

## Part 1: Feature Audit

### Legend
- ✅ Fully Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented
- 🔮 Future/GUI-only Feature

---

### 1.1 Task Features

| Feature | Status | Current Implementation | Gap |
|---------|--------|------------------------|-----|
| Title | ✅ | `Task.title` field | None |
| Icon/Emoji | ⚠️ | `Task.icon` field exists | Missing auto-generation based on title |
| Text description | ✅ | `Task.text_description` field | None |
| Formatted text + images | ❌ | Plain text only | Need markdown support and image attachments |
| Start date | ✅ | `Task.start_date` field | None |
| Due date | ✅ | `Task.due_date` field | None |
| Creation date | ✅ | `Task.creation_date` (implicit) | None |
| Priority/Importance | ✅ | `Priority` enum: TRIVIAL, LOW, MEDIUM, HIGH, DEFCON_ONE | None |
| Difficulty | ✅ | `Difficulty` enum: TRIVIAL, LOW, MEDIUM, HIGH, HERCULEAN | None |
| Duration | ✅ | `Duration` enum: MINISCULE, SHORT, MEDIUM, LONG, ODYSSEYAN | None |
| Dependencies | ✅ | `Task.dependencies` list with picker | None |
| Hidden when deps incomplete | ⚠️ | Blocked column in Kanban | Default list view shows all tasks |
| Subtasks | ✅ | `Task.subtasks` list | None |
| Tags with colors | ✅ | `Tag` dataclass with color | None |
| Projects with color bar | ✅ | `Project` dataclass with color | None |
| Change history | ✅ | `Task.history` list | None |
| Undo changes | ✅ | `motido undo` command | None |

---

### 1.2 Habit Features

| Feature | Status | Current Implementation | Gap |
|---------|--------|------------------------|-----|
| Habit checkbox | ✅ | `Task.is_habit` boolean | None |
| Recurrence rule | ✅ | `Task.recurrence_rule` (rrule format) | None |
| Complex recurrences | ✅ | Uses `dateutil.rrule` | None |
| Recurrence types | ✅ | `RecurrenceType` enum: STRICT, FROM_DUE_DATE, FROM_COMPLETION | None |
| Start date as delta | ❌ | Start date is absolute | Need `habit_start_delta` field (X days before due) |
| Heat view calendar | ✅ | `motido view heatmap` | None |
| Credit for interval days | ⚠️ | Heatmap shows completion | Scoring doesn't credit interval days |
| Subtask recurrence modes | ✅ | `SubtaskRecurrenceMode` enum | None |
| Best streak tracking | ✅ | `Task.streak_best` | None |
| Current streak tracking | ✅ | `Task.streak_current` | None |
| Completion percentage | ✅ | `motido habits` command | None |

---

### 1.3 Scoring Features

| Feature | Status | Current Implementation | Gap |
|---------|--------|------------------------|-----|
| Optional fields add score | ✅ | `field_presence_bonus` in config | None |
| Priority as largest factor | ✅ | Priority multiplier up to 3.0x | None |
| Due date proximity | ✅ | `due_date_proximity_weight` | None |
| Overdue escalation | ✅ | `overdue_multiplier` (0.5x/day) | None |
| Start date aging | ✅ | `start_date_aging_bonus` | None |
| Task age bonus | ✅ | `age_factor` (0.01 XP/day) | None |
| Difficulty/Duration multipliers | ✅ | Configurable multipliers | None |
| In Progress/Next bump | ✅ | `in_progress_bump`, `next_up_bump` | None |
| Dependency chain bonus | ✅ | `dependency_chain_bonus_percent` | None |
| Habit streak bonus | ✅ | `habit_streak_bonus` | None |
| Custom tag/project multipliers | ✅ | `tag_multipliers`, `project_multipliers` | None |
| Score visible when sorting | ⚠️ | Score calculated but not shown in list | Need `--show-score` flag |
| Confetti animation | 🔮 | CLI limitation | GUI feature |
| Task completion grants score | ✅ | `add_xp()` on completion | None |
| Subtask proportional score | ✅ | Score divided by subtask count | None |
| Daily penalty for overdue | ✅ | `run-penalties` command | None |
| Harder tasks = less penalty | ⚠️ | Flat penalty rate | Need difficulty-adjusted penalty |
| Manual XP withdrawal | ✅ | `motido xp withdraw` | None |
| Configurable XP scale | ✅ | `scoring_config.json` | None |

---

### 1.4 Other Features

| Feature | Status | Current Implementation | Gap |
|---------|--------|------------------------|-----|
| Incremental date processing | ✅ | `motido advance`, `last_processed_date` | None |
| Skip to specific date | ⚠️ | Advance by N days | Need `--to-date` option |
| View filters | ✅ | Status, priority, tag, project filters | None |
| Batch edit | ✅ | `motido batch-edit` | None |
| Batch complete | ✅ | `motido batch-complete` | None |
| Sort by priority/size/due | ✅ | `--sort` option | None |
| Notifications | ❌ | None | Need notification system |
| Calendar view | ✅ | `motido view calendar` | None |
| Calendar heat view | ✅ | `motido view heatmap` | None |
| Click day to see completed | 🔮 | CLI limitation | GUI feature |
| Subtask view modes | ⚠️ | Subtask list command | Need inline/member/top-level modes in `list` |
| Vacation mode | ✅ | `motido vacation` | None |
| Reward badges | ⚠️ | `Badge` model exists | Need badge earning logic and CLI display |
| Dark/light mode | 🔮 | Terminal colors only | GUI feature |
| Dependency graph view | ✅ | `motido view graph` | None |
| Dependency filtering | ⚠️ | Full graph shown | Need `--task-id` filter for specific tree |
| Kanban view | ✅ | `motido view kanban` | None |

---

### 1.5 Milestone Status

| Milestone | Description | Status | Completion |
|-----------|-------------|--------|------------|
| 0.1 | Major task functionality CLI | ✅ | 100% |
| 0.2 | Score calculation + incremental processing | ✅ | 100% |
| 0.3 | Incremental task completion | ✅ | 100% |
| 0.5 | GUI | ❌ | 0% |
| 0.7 | Hosted in Vercel | ❌ | 0% |
| 1.0 | PWA working on mobile | ❌ | 0% |
| 1.3 | Holding box for quick task adding | ❌ | 0% |
| 1.5 | Score keeping | ✅ | 100% |
| 2.0 | Complex views | ✅ | 100% |
| 2.5 | Basic habits | ✅ | 100% |
| 3.0 | Full habits | ✅ | 95% |
| 4.0 | Other features | ⚠️ | 60% |

---

## Part 2: Gap Analysis

### 2.1 CLI Gaps (Must Fix Before GUI)

These are missing features that should be completed in the CLI before building the GUI:

#### Priority 1: Critical Gaps

1. **Badge Earning System**
   - Badge model exists but no earning logic
   - Need badge definitions in `scoring_config.json`
   - Need `check_badges()` function called on task completion
   - Need `motido badges` command to display earned badges

2. **Icon Auto-Generation**
   - Icon field exists but never populated
   - Need keyword → emoji mapping (exercise → 🏃, read → 📚, etc.)
   - Apply when creating tasks or when title is edited

3. **Show Score in List View**
   - Score is calculated but not visible in `motido list`
   - Need `--show-score` or `--sort score` to display

4. **Dependency-Aware Default View**
   - Tasks with incomplete dependencies should be hidden by default
   - Add `--include-blocked` flag to show them

#### Priority 2: Important Gaps

5. **Habit Start Date as Delta**
   - Need `habit_start_delta` field (integer, days before due)
   - When generating next habit instance, calculate: `start_date = due_date - delta`

6. **Difficulty-Adjusted Penalties**
   - Currently flat penalty (5 XP/day)
   - Should be: `penalty = base_penalty / difficulty_divisor`
   - Harder tasks get less penalty per day

7. **Interval Day Credit for Habits**
   - When completing a habit, credit all days since last occurrence
   - Affects streak calculation and heatmap display

8. **Advance to Specific Date**
   - Currently `motido advance --days N`
   - Need `motido advance --to-date 2025-01-15`

#### Priority 3: Nice-to-Have

9. **Subtask Display Modes**
   - `--subtask-mode hidden|inline|expanded` in list command
   - `inline`: Show subtasks as indented items
   - `expanded`: Show subtasks as pseudo-top-level tasks

10. **Dependency Graph Filtering**
    - `motido view graph --task-id X` to show only that task's tree
    - `motido view graph --upstream X` and `--downstream X`

11. **Markdown Description Support**
    - Parse and render markdown in `text_description`
    - Rich console already supports markdown

---

### 2.2 GUI/PWA Gaps (Major Work)

These features require the GUI to be built:

1. **Frontend Application** (Milestone 0.5)
   - React/Vue/Svelte frontend (TBD)
   - Material Design theme
   - Responsive layout for mobile/desktop

2. **Backend API** (Milestone 0.5)
   - Python serverless functions
   - REST or GraphQL API
   - Authentication

3. **Vercel Deployment** (Milestone 0.7)
   - Migrate from SQLite to Vercel Postgres
   - Deploy serverless functions
   - Set up CI/CD

4. **PWA Features** (Milestone 1.0)
   - Service worker for offline support
   - Push notifications
   - Add to home screen

5. **GUI-Only Features**
   - Confetti animation on task completion
   - Dark/light mode toggle
   - Click calendar day to see details
   - Drag-and-drop in Kanban view
   - Rich text editor for descriptions
   - Image attachments

6. **Quick Task Entry** (Milestone 1.3)
   - "Holding box" for rapid task capture
   - Minimal required fields
   - Expand to full editor

---

## Part 3: Implementation Roadmap

### Phase A: Complete CLI Features (Estimated: 2-3 weeks work)

#### A.1 Badge System
**Files**: `core/scoring.py`, `core/models.py`, `cli/main.py`, `scoring_config.json`

```python
# scoring_config.json additions
{
  "badges": [
    {"id": "first_task", "name": "First Steps", "glyph": "🌟",
     "description": "Complete your first task", "criteria": {"tasks_completed": 1}},
    {"id": "streak_7", "name": "Week Warrior", "glyph": "🔥",
     "description": "Achieve a 7-day streak", "criteria": {"streak_days": 7}},
    {"id": "streak_30", "name": "Monthly Master", "glyph": "🏆",
     "description": "Achieve a 30-day streak", "criteria": {"streak_days": 30}},
    {"id": "century", "name": "Centurion", "glyph": "💯",
     "description": "Complete 100 tasks", "criteria": {"tasks_completed": 100}},
    {"id": "xp_1000", "name": "XP Seeker", "glyph": "⭐",
     "description": "Earn 1,000 XP", "criteria": {"total_xp": 1000}},
    {"id": "xp_10000", "name": "XP Master", "glyph": "🌟",
     "description": "Earn 10,000 XP", "criteria": {"total_xp": 10000}},
    {"id": "habit_master", "name": "Habit Master", "glyph": "🎯",
     "description": "Complete 50 habit instances", "criteria": {"habits_completed": 50}}
  ]
}
```

**Implementation Steps**:
1. Add badge definitions to `scoring_config.json`
2. Create `check_badges(user, manager)` function in `scoring.py`
3. Call `check_badges()` after task completion in `handle_complete()`
4. Add `motido badges` command to display earned badges with glyphs
5. Show newly earned badges in completion output
6. Write comprehensive tests

#### A.2 Icon Auto-Generation
**Files**: `core/utils.py`, `cli/main.py`

```python
# core/utils.py
ICON_MAPPINGS = {
    # Exercise & Health
    "exercise": "🏃", "workout": "💪", "gym": "🏋️", "run": "🏃", "yoga": "🧘",
    "meditate": "🧘", "sleep": "😴", "water": "💧", "vitamin": "💊",

    # Work & Productivity
    "meeting": "📅", "call": "📞", "email": "📧", "write": "✍️", "review": "👀",
    "report": "📊", "presentation": "📽️", "deadline": "⏰",

    # Learning
    "read": "📚", "study": "📖", "learn": "🎓", "course": "🎓", "practice": "📝",

    # Home & Personal
    "clean": "🧹", "cook": "🍳", "grocery": "🛒", "laundry": "👕",
    "bills": "💸", "budget": "💰", "doctor": "🏥", "dentist": "🦷",

    # Social
    "birthday": "🎂", "gift": "🎁", "party": "🎉", "date": "❤️",

    # Tech
    "code": "💻", "deploy": "🚀", "fix": "🔧", "test": "🧪", "debug": "🐛"
}

def auto_generate_icon(title: str) -> str | None:
    """Generate an icon based on task title keywords."""
    title_lower = title.lower()
    for keyword, icon in ICON_MAPPINGS.items():
        if keyword in title_lower:
            return icon
    return None
```

**Implementation Steps**:
1. Add `ICON_MAPPINGS` dictionary to `utils.py`
2. Create `auto_generate_icon(title)` function
3. Call in `handle_create()` when no icon specified
4. Call in `handle_edit()` when title changes and no icon set
5. Add `--no-auto-icon` flag to disable
6. Write tests for icon mapping

#### A.3 Show Score in List View
**Files**: `cli/main.py`, `cli/views.py`

**Implementation Steps**:
1. Add `--show-score` flag to `list` command
2. Calculate score for each task when flag is set
3. Add "Score" column to Rich table output
4. Support `--sort score` for score-based ordering
5. Write tests

#### A.4 Dependency-Aware Default View
**Files**: `cli/main.py`

**Implementation Steps**:
1. In `handle_list()`, filter out tasks with incomplete dependencies by default
2. Add `--include-blocked` flag to show all tasks
3. Add visual indicator for blocked tasks when shown
4. Update Kanban to move blocked tasks correctly
5. Write tests

#### A.5 Habit Start Delta
**Files**: `core/models.py`, `core/recurrence.py`, `cli/main.py`

```python
# models.py - Add to Task
habit_start_delta: int | None = None  # Days before due to show habit

# recurrence.py - Modify create_next_habit_instance
def create_next_habit_instance(task: Task, completion_date: datetime) -> Task | None:
    next_due = calculate_next_occurrence(task, completion_date)
    if not next_due:
        return None

    start_date = None
    if task.habit_start_delta is not None:
        start_date = next_due - timedelta(days=task.habit_start_delta)

    # ... rest of implementation
```

**Implementation Steps**:
1. Add `habit_start_delta` field to `Task` model
2. Update serialization/deserialization in JSON and SQLite managers
3. Modify `create_next_habit_instance()` to calculate start date
4. Add `--start-delta` flag to `create` command for habits
5. Write tests

#### A.6 Difficulty-Adjusted Penalties
**Files**: `core/scoring.py`, `scoring_config.json`

```python
# scoring_config.json
{
  "penalty_difficulty_divisors": {
    "trivial": 1.0,
    "low": 1.2,
    "medium": 1.5,
    "high": 2.0,
    "herculean": 3.0
  }
}

# scoring.py
def calculate_penalty(task: Task, config: dict) -> float:
    base = config.get("daily_penalty", 5)
    divisors = config.get("penalty_difficulty_divisors", {})
    divisor = divisors.get(task.difficulty.value, 1.0)
    return base / divisor
```

**Implementation Steps**:
1. Add `penalty_difficulty_divisors` to config
2. Modify `apply_penalties()` to use difficulty-based calculation
3. Update tests for penalty calculations

#### A.7 Advance to Specific Date
**Files**: `cli/main.py`

**Implementation Steps**:
1. Add `--to-date` option to `advance` command
2. Calculate days difference from current processed date
3. Process each day in sequence
4. Validate target date is in the future
5. Write tests

#### A.8 Subtask Display Modes
**Files**: `cli/main.py`, `cli/views.py`

**Implementation Steps**:
1. Add `--subtask-mode` option: `hidden`, `inline`, `expanded`
2. `hidden`: Current behavior (subtasks not shown in list)
3. `inline`: Show subtasks as indented rows under parent
4. `expanded`: Show subtasks as separate top-level items
5. Update Rich table rendering for each mode
6. Write tests

#### A.9 Dependency Graph Filtering
**Files**: `cli/main.py`, `cli/views.py`

**Implementation Steps**:
1. Add `--task-id` option to `view graph`
2. Add `--direction` option: `all`, `upstream`, `downstream`
3. Filter graph to show only relevant tasks
4. Highlight the focal task
5. Write tests

---

### Phase B: Frontend Architecture (Milestone 0.5)

#### B.1 Technology Selection

**Recommended Stack**:
- **Frontend Framework**: React 18+ with TypeScript
  - Extensive ecosystem
  - Good PWA support
  - Material UI library (MUI) for Material Design

- **State Management**: Zustand or React Query
  - Lightweight
  - Good for server state synchronization

- **Build Tool**: Vite
  - Fast development
  - Good PWA plugin support

- **Styling**: Tailwind CSS + MUI components
  - Utility-first for customization
  - Material Design components for consistency

#### B.2 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/           # Buttons, inputs, cards
│   │   ├── tasks/            # Task list, task card, task form
│   │   ├── habits/           # Habit heatmap, habit stats
│   │   ├── views/            # Calendar, Kanban, Graph
│   │   └── layout/           # Header, sidebar, navigation
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API client, auth
│   ├── store/                # State management
│   ├── types/                # TypeScript types
│   ├── utils/                # Helper functions
│   └── pages/                # Route pages
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
└── vite.config.ts
```

#### B.3 Core Components to Build

1. **TaskList** - Main task listing with filters/sort
2. **TaskCard** - Individual task display with actions
3. **TaskForm** - Create/edit task modal
4. **HabitHeatmap** - Calendar visualization
5. **KanbanBoard** - Drag-and-drop columns
6. **DependencyGraph** - D3.js or React Flow visualization
7. **CalendarView** - Month/week/day views
8. **XPDisplay** - Score and level display
9. **BadgeShowcase** - Earned badges grid
10. **QuickCapture** - Floating action button + quick entry

---

### Phase C: Backend API (Milestone 0.5)

#### C.1 API Design

**REST Endpoints**:

```
# Authentication
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout

# Tasks
GET    /api/tasks                    # List tasks (with filters)
POST   /api/tasks                    # Create task
GET    /api/tasks/:id                # Get task
PUT    /api/tasks/:id                # Update task
DELETE /api/tasks/:id                # Delete task
POST   /api/tasks/:id/complete       # Complete task
POST   /api/tasks/:id/undo           # Undo last change

# Subtasks
POST   /api/tasks/:id/subtasks       # Add subtask
PUT    /api/tasks/:id/subtasks/:sid  # Update subtask
DELETE /api/tasks/:id/subtasks/:sid  # Delete subtask

# Dependencies
POST   /api/tasks/:id/dependencies   # Add dependency
DELETE /api/tasks/:id/dependencies/:dep_id

# Tags & Projects
GET    /api/tags
POST   /api/tags
PUT    /api/tags/:id
DELETE /api/tags/:id
GET    /api/projects
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

# User & Stats
GET    /api/user/profile
GET    /api/user/stats
GET    /api/user/xp-log
POST   /api/user/xp/withdraw
GET    /api/user/badges

# Views
GET    /api/views/calendar           # Calendar data
GET    /api/views/heatmap            # Heatmap data
GET    /api/views/kanban             # Kanban columns

# System
POST   /api/system/advance           # Advance date
POST   /api/system/run-penalties     # Run penalty calculation
GET    /api/system/scoring-config    # Get scoring configuration
```

#### C.2 Serverless Function Structure

```
api/
├── auth/
│   ├── login.py
│   ├── register.py
│   └── logout.py
├── tasks/
│   ├── index.py          # GET (list), POST (create)
│   ├── [id]/
│   │   ├── index.py      # GET, PUT, DELETE
│   │   ├── complete.py   # POST
│   │   ├── undo.py       # POST
│   │   ├── subtasks/
│   │   │   └── index.py
│   │   └── dependencies/
│   │       └── index.py
├── tags/
│   └── index.py
├── projects/
│   └── index.py
├── user/
│   ├── profile.py
│   ├── stats.py
│   ├── xp.py
│   └── badges.py
└── views/
    ├── calendar.py
    ├── heatmap.py
    └── kanban.py
```

#### C.3 Database Migration

**From SQLite to Vercel Postgres**:

1. Export existing schema as PostgreSQL DDL
2. Update `DatabaseDataManager` for PostgreSQL dialect
3. Add connection pooling for serverless
4. Implement data migration script
5. Add database indexes for common queries

---

### Phase D: Vercel Deployment (Milestone 0.7)

#### D.1 Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build" },
    { "src": "api/**/*.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

#### D.2 Environment Setup

1. Create Vercel project
2. Add Vercel Postgres database
3. Configure environment variables
4. Set up GitHub integration for CI/CD
5. Configure custom domain

---

### Phase E: PWA Implementation (Milestone 1.0)

#### E.1 Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'motido-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS and JS bundles
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for API, cache-first for static
});
```

#### E.2 PWA Manifest

```json
// public/manifest.json
{
  "name": "Moti-Do",
  "short_name": "MotiDo",
  "description": "Gamified task and habit tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### E.3 Push Notifications

1. Set up Web Push API
2. Create notification service worker handlers
3. Backend: Schedule notification triggers for due dates
4. Permission request UX flow

---

### Phase F: Quick Task Entry (Milestone 1.3)

#### F.1 Holding Box Design

**Concept**: Floating action button (FAB) that opens minimal task entry

**Fields**:
- Title (required)
- Due date (optional, quick select: today, tomorrow, next week)
- Priority (optional, default: Medium)

**Behavior**:
1. FAB always visible in bottom-right
2. Click opens minimal form overlay
3. Submit creates task immediately
4. "Expand" button opens full task form
5. Tasks created here go to "Inbox" project by default

#### F.2 Implementation

```tsx
// components/QuickCapture.tsx
const QuickCapture = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Fab onClick={() => setIsOpen(true)}>
        <AddIcon />
      </Fab>
      <Dialog open={isOpen}>
        <TextField label="What needs to be done?" autoFocus />
        <QuickDatePicker />
        <PriorityChips />
        <Button onClick={handleCreate}>Add Task</Button>
        <Button onClick={handleExpand}>More Options</Button>
      </Dialog>
    </>
  );
};
```

---

## Part 4: Testing Strategy

### 4.1 CLI Testing (Current)
- **Framework**: pytest
- **Coverage**: 100% target
- **Files**: `tests/test_*.py`

### 4.2 Frontend Testing
- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: Storybook
- **E2E Tests**: Playwright or Cypress

### 4.3 API Testing
- **Unit Tests**: pytest for serverless functions
- **Integration Tests**: httpx for API endpoints
- **Load Tests**: Locust for performance

### 4.4 PWA Testing
- **Lighthouse**: PWA audit scores
- **Manual**: Offline functionality, install prompt

---

## Part 5: Implementation Timeline

### Summary View

| Phase | Focus | Effort Estimate |
|-------|-------|-----------------|
| A | Complete CLI Features | Medium |
| B | Frontend Architecture | High |
| C | Backend API | High |
| D | Vercel Deployment | Medium |
| E | PWA Implementation | Medium |
| F | Quick Task Entry | Low |

### Detailed Task Breakdown

#### Phase A: CLI Completion

| Task | Effort | Dependencies |
|------|--------|--------------|
| A.1 Badge System | Medium | None |
| A.2 Icon Auto-Generation | Low | None |
| A.3 Show Score in List | Low | None |
| A.4 Dependency-Aware View | Low | None |
| A.5 Habit Start Delta | Medium | None |
| A.6 Difficulty-Adjusted Penalties | Low | None |
| A.7 Advance to Date | Low | None |
| A.8 Subtask Display Modes | Medium | None |
| A.9 Graph Filtering | Low | None |

#### Phase B: Frontend

| Task | Effort | Dependencies |
|------|--------|--------------|
| B.1 Project Setup | Low | None |
| B.2 Component Library | High | B.1 |
| B.3 State Management | Medium | B.1 |
| B.4 Task Views | High | B.2, B.3 |
| B.5 Habit Views | Medium | B.2, B.3 |
| B.6 Complex Views (Kanban, Graph) | High | B.2, B.3 |

#### Phase C: Backend

| Task | Effort | Dependencies |
|------|--------|--------------|
| C.1 API Framework Setup | Low | None |
| C.2 Auth System | Medium | C.1 |
| C.3 Task Endpoints | High | C.1, C.2 |
| C.4 User Endpoints | Medium | C.1, C.2 |
| C.5 View Endpoints | Medium | C.3 |
| C.6 PostgreSQL Migration | Medium | C.1 |

#### Phase D: Deployment

| Task | Effort | Dependencies |
|------|--------|--------------|
| D.1 Vercel Project Setup | Low | B, C |
| D.2 Database Provisioning | Low | C.6 |
| D.3 CI/CD Pipeline | Medium | D.1 |
| D.4 Production Launch | Low | D.1, D.2, D.3 |

#### Phase E: PWA

| Task | Effort | Dependencies |
|------|--------|--------------|
| E.1 Service Worker | Medium | B |
| E.2 Offline Support | High | E.1 |
| E.3 Push Notifications | Medium | C, E.1 |
| E.4 Install Prompts | Low | E.1 |

#### Phase F: Quick Entry

| Task | Effort | Dependencies |
|------|--------|--------------|
| F.1 FAB Component | Low | B |
| F.2 Quick Form | Low | F.1 |
| F.3 Integration | Low | F.2, C.3 |

---

## Part 6: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep in GUI | High | Strict MVP definition, phased releases |
| Performance with large task lists | Medium | Pagination, virtual scrolling, indexing |
| Offline sync conflicts | Medium | Last-write-wins with conflict UI |
| Push notification delivery | Low | Fallback to email, in-app notifications |
| Mobile responsiveness issues | Medium | Mobile-first design, continuous testing |

---

## Part 7: Success Criteria

### MVP (Milestone 1.0)
- [ ] All CLI gaps closed (Phase A complete)
- [ ] Working web frontend with core task management
- [ ] Mobile-responsive design
- [ ] PWA installable on iOS/Android
- [ ] Deployed to Vercel with Postgres

### Full Release (Milestone 4.0)
- [ ] All features from `basic_idea.md` implemented
- [ ] Badge system with 10+ badges
- [ ] Push notifications working
- [ ] Offline mode functional
- [ ] Performance: <100ms API response, <3s initial load
- [ ] Test coverage: >90% frontend, 100% backend

---

## Appendix A: Current Codebase Statistics

| Metric | Value |
|--------|-------|
| Python LOC (src) | ~3,500 |
| Test LOC | ~2,500 |
| Test Files | 42 |
| Test Functions | 697+ |
| CLI Commands | 26+ |
| Data Models | 8 |
| Enums | 6 |

## Appendix B: Technology Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI Framework | Typer + Rich | Type-safe, beautiful terminal output |
| Persistence | JSON + SQLite | Flexible, portable, no server needed |
| Date Handling | dateutil | Robust recurrence rule support |
| Frontend (Proposed) | React + MUI | Material Design, strong ecosystem |
| Backend (Proposed) | Python Serverless | Reuse core logic from CLI |
| Database (Proposed) | Vercel Postgres | Managed, scales, Vercel integration |
