<!-- markdownlint-disable-file -->
# Task Research Notes: MotiDo Vision Alignment & Milestone Planning

## Research Executed

### File Analysis
- `/Users/wleitner/Code/moti-do/moti-do-v2/src/motido/core/models.py`
  - Comprehensive `Task` dataclass with 16 fields (title, creation_date, id, text_description, priority, difficulty, duration, is_complete, due_date, start_date, icon, tags, project, subtasks, dependencies, history)
  - `User` dataclass with username, total_xp, tasks list
  - Three enums (Priority, Difficulty, Duration) with 5-level progression and emoji/styling support
  - **Many fields defined but unused in CLI** - critical gap

- `/Users/wleitner/Code/moti-do/moti-do-v2/src/motido/cli/main.py`
  - 934 lines, becoming monolithic
  - 8 CLI commands: init, create, list, view, edit, delete, complete, run-penalties
  - Uses `rich` for table display with styled output
  - **Missing commands** for: tags, projects, subtasks, dependencies, text_description, icons

- `/Users/wleitner/Code/moti-do/moti-do-v2/src/motido/core/scoring.py`
  - Score formula: `(base_score + bonuses) × difficulty_mult × duration_mult × age_mult`
  - `add_xp()` is placeholder - only prints, doesn't persist to `User.total_xp`
  - Daily penalty system tracks last check date in file
  - **Missing**: due date proximity, start date aging, dependency scoring, tag/project multipliers, streak bonuses

- `/Users/wleitner/Code/moti-do/moti-do-v2/src/motido/data/scoring_config.json`
  - JSON configuration with base_score=10, field bonuses, multipliers
  - Auto-creates if missing
  - **Limitation**: No support for custom tag/project multipliers per user

### Code Search Results
- `textual TUI terminal user interface` in workspace
  - No TUI implementation found - confirmed absent
  - Test file `test_task_creation.py` references `motido.cli.tui` but module doesn't exist

- Recurrence patterns
  - No recurrence logic in codebase
  - No `is_habit` field or `Habit` model
  - Vision document requires complex recurrence with multiple types

### External Research
- #fetch:"https://docs.python.org/3/library/datetime.html"
  - Python `datetime` module supports: date, time, datetime, timedelta, timezone
  - No built-in recurrence rule support - would need additional library

- #fetch:"https://dateutil.readthedocs.io/en/stable/rrule.html"
  - `python-dateutil` library provides RFC 5545 compliant recurrence rules
  - Classes: `rrule`, `rruleset` for complex recurrences
  - Supports: DAILY, WEEKLY, MONTHLY, YEARLY frequencies
  - Parameters: count, until, bymonthday, byweekday, bysetpos, etc.
  - Example: `rrule(MONTHLY, count=10, byweekday=FR(1))` for first Friday of month

- #githubRepo:"Textualize/textual TUI screen create form input"
  - Textual library for Python TUIs with modern UI components
  - `Screen` class for full-screen views, `ModalScreen` for dialogs
  - `Input` widget for text fields, `Select` for dropdowns
  - `Button`, `Label`, `DataTable`, `TextArea`, etc.
  - CSS-like styling system
  - Example pattern:
    ```python
    from textual.app import App, ComposeResult
    from textual.screen import Screen
    from textual.widgets import Input, Button
    
    class TaskFormScreen(Screen):
        def compose(self) -> ComposeResult:
            yield Input(placeholder="Task title")
            yield Button("Save")
    ```

### Project Conventions
- Standards referenced: `.github/copilot-instructions.md`, `.github/instructions/python.instructions.md`
- Backend abstraction pattern: Must use `get_data_manager()` factory, never direct imports
- Enum display pattern: All enums must implement `emoji()` and `display_style()` methods
- Testing: 100% coverage requirement, Pylint 10.0/10.0, mypy strict mode
- Code formatting: Black 88 chars, isort, type hints mandatory

## Key Discoveries

### Project Structure
**Current State: Milestone 0.1 Complete**

Architecture:
- `motido.core`: Models + business logic (scoring, XP calculation)
- `motido.data`: Persistence with pluggable backends (JSON/SQLite via abstract DataManager)
- `motido.cli`: Command-line interface with argparse + rich output

**What Works:**
1. ✅ Basic task CRUD with priority/difficulty/duration
2. ✅ Scoring system with configurable multipliers
3. ✅ Daily penalty mechanism
4. ✅ Backend abstraction (JSON/SQLite switchable)
5. ✅ 100% test coverage infrastructure
6. ✅ Rich console output with emojis/colors

**What's Missing:**
1. ❌ No TUI - only CLI with argparse
2. ❌ Most Task fields unused (due_date, start_date, tags, projects, subtasks, dependencies, history, icon)
3. ❌ No habit support or recurrence
4. ❌ XP system is placeholder (doesn't persist)
5. ❌ No web backend or API
6. ❌ No PWA infrastructure
7. ❌ Advanced scoring factors not implemented

### Implementation Patterns

**Backend Abstraction Pattern (CRITICAL):**
```python
# CORRECT - uses factory
from motido.data.backend_factory import get_data_manager
manager = get_data_manager()

# WRONG - breaks abstraction
from motido.data.json_manager import JsonDataManager
manager = JsonDataManager()
```

**Enum Pattern for Display:**
```python
class Priority(str, Enum):
    DEFCON_ONE = "Defcon One"
    
    def emoji(self) -> str:
        return "🔴"
    
    def display_style(self) -> str:
        return "red"
```

**Rich Console Display:**
```python
from rich.text import Text
from rich.table import Table

table = Table()
priority_text = Text(task.priority.value, style=task.priority.display_style())
table.add_row(priority_text)
```

### Complete Examples

**Current Task Creation:**
```python
# From cli/main.py handle_create()
task = Task(
    title=args.title,
    creation_date=datetime.now(),
    priority=Priority(args.priority) if args.priority else Priority.LOW,
    difficulty=Difficulty(args.difficulty) if args.difficulty else Difficulty.TRIVIAL,
    duration=Duration(args.duration) if args.duration else Duration.MINISCULE
)
user.add_task(task)
manager.save_user(user)
```

**Scoring Calculation:**
```python
# From core/scoring.py
def calculate_score(task: Task, config: Dict[str, Any], effective_date: date) -> int:
    additive_base = config["base_score"]
    if task.text_description:
        additive_base += config["field_presence_bonus"].get("text_description", 5)
    
    difficulty_mult = config["difficulty_multiplier"].get(task.difficulty.name, 1.0)
    duration_mult = config["duration_multiplier"].get(task.duration.name, 1.0)
    
    task_age = effective_date - task.creation_date.date()
    age_in_units = max(0, task_age.days)
    age_mult = 1.0 + (age_in_units * config["age_factor"]["multiplier_per_unit"])
    
    final_score = additive_base * difficulty_mult * duration_mult * age_mult
    return int(round(final_score))
```

**Recurrence with dateutil (for Milestone 2.5+):**
```python
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, MO, FR
from datetime import datetime

# Every Friday
rule = rrule(WEEKLY, byweekday=FR, count=10, dtstart=datetime.now())

# First Friday of each month
rule = rrule(MONTHLY, byweekday=FR(1), count=10, dtstart=datetime.now())

# Every 3 days
rule = rrule(DAILY, interval=3, count=10, dtstart=datetime.now())
```

**Textual TUI Screen (for Milestone 0.5):**
```python
from textual.app import App, ComposeResult
from textual.screen import Screen
from textual.widgets import Input, Button, Select, Label
from textual.containers import Vertical

class TaskFormScreen(Screen):
    def __init__(self, task: Task | None = None):
        self.task = task
        super().__init__()
    
    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("Task Title:")
            yield Input(id="title", value=self.task.title if self.task else "")
            yield Label("Priority:")
            yield Select(
                [(p.value, p) for p in Priority],
                value=self.task.priority if self.task else Priority.LOW,
                id="priority"
            )
            yield Button("Save", variant="primary", id="save")
            yield Button("Cancel", id="cancel")
```

### API and Schema Documentation

**Task Model Schema:**
```python
@dataclass
class Task:
    title: str                              # ✅ Used in CLI
    creation_date: datetime                  # ✅ Used in CLI
    id: str = field(default_factory=uuid4)  # ✅ Used in CLI
    text_description: str | None = None     # ❌ NOT accessible via CLI
    priority: Priority = Priority.LOW        # ✅ Used in CLI
    difficulty: Difficulty = TRIVIAL         # ✅ Used in CLI
    duration: Duration = MINISCULE           # ✅ Used in CLI
    is_complete: bool = False                # ✅ Used in CLI
    due_date: datetime | None = None        # ❌ NOT accessible via CLI
    start_date: datetime | None = None      # ❌ NOT accessible via CLI
    icon: str | None = None                 # ❌ NOT accessible via CLI
    tags: List[str] = field(default_factory=list)           # ❌ NOT accessible via CLI
    project: str | None = None              # ❌ NOT accessible via CLI
    subtasks: List[Dict[str, Any]] = field(default_factory=list)  # ❌ NOT accessible via CLI
    dependencies: List[str] = field(default_factory=list)   # ❌ NOT accessible via CLI
    history: List[Dict[str, Any]] = field(default_factory=list)    # ❌ NOT accessible via CLI
```

**User Model Schema:**
```python
@dataclass
class User:
    username: str
    total_xp: int = 0               # ⚠️ NOT updated by add_xp()
    tasks: List[Task] = field(default_factory=list)
```

**Scoring Config Schema:**
```json
{
  "base_score": 10,
  "field_presence_bonus": {
    "text_description": 5
  },
  "difficulty_multiplier": {
    "TRIVIAL": 1.1,
    "LOW": 1.5,
    "MEDIUM": 2.0,
    "HIGH": 3.0,
    "HERCULEAN": 5.0
  },
  "duration_multiplier": {
    "MINISCULE": 1.05,
    "SHORT": 1.2,
    "MEDIUM": 1.5,
    "LONG": 2.0,
    "ODYSSEYAN": 3.0
  },
  "age_factor": {
    "unit": "days",
    "multiplier_per_unit": 0.01
  },
  "daily_penalty": {
    "apply_penalty": true,
    "penalty_points": 5
  }
}
```

### Configuration Examples

**Backend Configuration:**
```json
// src/motido/data/config.json
{
  "backend": "json"  // or "db" for SQLite
}
```

**Textual App Configuration:**
```python
class MotiDoApp(App):
    CSS_PATH = "motido.tcss"
    SCREENS = {
        "task_form": TaskFormScreen,
        "task_list": TaskListScreen
    }
    BINDINGS = [
        ("n", "new_task", "New Task"),
        ("q", "quit", "Quit")
    ]
```

### Technical Requirements

**For Milestone 0.2 (Activate Unused Fields):**
- Add CLI commands: `describe`, `set-due`, `set-start`, `add-tag`, `set-project`, `add-subtask`, `add-dependency`
- Update `handle_list()` to show due dates, tags, projects when present
- Update `handle_view()` to display all fields
- Implement due date proximity in scoring formula
- Add start date aging bonus to scoring formula

**For Milestone 0.3 (Incremental Completion):**
- Fix `add_xp()` to persist: `user.total_xp += points; manager.save_user(user)`
- Add completion_date field to Task model
- Implement backdating completion support
- Add subtask partial scoring logic

**For Milestone 0.5 (TUI):**
- Dependencies: `pip install textual`
- Create screen classes: TaskListScreen, TaskFormScreen, TaskDetailScreen
- Implement keyboard navigation
- Maintain CLI as API layer (refactor handle_* functions into service layer)

**For Milestone 2.5 (Habits - Basic Recurrence):**
- Dependencies: `pip install python-dateutil`
- Add fields to Task:
  ```python
  is_habit: bool = False
  recurrence_rule: str | None = None  # Store rrule string
  next_due_date: datetime | None = None
  advance_days: int = 0
  ```
- Implement recurrence generation logic using dateutil.rrule
- Add "complete and generate next" functionality

**For Milestone 0.7 (Vercel Deployment):**
- Convert data layer to use Vercel Postgres
- Create serverless function endpoints in `/api` directory
- Build React frontend with Material-UI components
- Deploy via `vercel deploy`

## Recommended Approach

**Phase 1: Complete Milestone 0.1 (Immediate - Week 1)**
1. Fix `add_xp()` function to persist XP to User model
2. Add CLI commands for unused Task fields (due_date, start_date, tags, project, text_description)
3. Update list/view commands to display new fields
4. Write comprehensive tests for new commands

**Phase 2: Achieve Milestone 0.2 (Week 2-3)**
1. Implement enhanced scoring factors:
   - Due date proximity (exponential increase as due date approaches)
   - Start date aging bonus
   - Dependency chain scoring (sum of dependent task scores)
2. Add tag/project multiplier configuration to scoring_config.json
3. Implement incremental date processing system:
   - Track last_processed_date in User model
   - Add `advance` command to process one day at a time
   - Add `skip-to` command to jump to specific date

**Phase 3: Build Milestone 0.5 - TUI (Week 4-6)**
1. Refactor cli/main.py:
   - Extract business logic into service layer
   - Keep handle_* functions as thin wrappers
2. Install textual: `poetry add textual`
3. Create TUI screens:
   - TaskListScreen with keyboard navigation and live scoring display
   - TaskFormScreen with all field inputs
   - TaskDetailScreen with full task information
4. Implement keyboard shortcuts (n=new, e=edit, d=delete, c=complete)
5. Add TUI entry point: `poetry run motido-tui`

**Phase 4: Deploy Milestone 0.7 - Web (Week 7-10)**
1. Design RESTful API endpoints:
   - GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id, DELETE /api/tasks/:id
   - GET /api/user, PUT /api/user
2. Create Vercel Postgres schema migration from JSON/SQLite
3. Build React frontend:
   - Install Material-UI: `npm install @mui/material @emotion/react @emotion/styled`
   - Create components: TaskList, TaskForm, TaskCard
   - Implement responsive layout
4. Configure Vercel deployment with serverless functions

**Phase 5: PWA Milestone 1.0 (Week 11-12)**
1. Add PWA manifest.json
2. Implement service workers for offline support
3. Add IndexedDB for local caching
4. Configure push notifications for task reminders
5. Test on mobile devices (iOS/Android)

**Phase 6: Habits Milestone 2.5-3.0 (Week 13-16)**
1. Install python-dateutil: `poetry add python-dateutil`
2. Extend Task model with habit fields
3. Implement recurrence rule parsing and generation
4. Build habit tracking infrastructure:
   - Completion history storage
   - Streak calculation
   - Heat map data generation
5. Add frontend heat map component (use d3.js or react-calendar-heatmap)

**Phase 7: Advanced Features Milestone 4.0 (Week 17-20)**
1. Implement vacation mode (pause penalty calculation)
2. Create badge system with reward criteria
3. Build complex views:
   - Kanban board with drag-and-drop
   - Dependency graph (use Cytoscape.js)
   - Calendar density view
4. Add bulk editing UI
5. Implement undo/redo functionality

## Implementation Guidance

### Objectives
1. **Immediate**: Activate dormant Task fields and fix XP persistence
2. **Short-term**: Complete scoring system and add incremental date processing
3. **Medium-term**: Build TUI for better UX while maintaining CLI
4. **Long-term**: Deploy web app as PWA with full habit tracking

### Key Tasks
**Week 1-2: Foundation Completion**
- [ ] Fix `add_xp()` to persist to `User.total_xp`
- [ ] Add `describe` command for text_description
- [ ] Add `set-due` and `set-start` commands for date fields
- [ ] Add `tag` command (add/remove/list tags)
- [ ] Add `project` command (set/clear project)
- [ ] Update `list` to show due dates, tags, projects
- [ ] Update `view` to show all fields
- [ ] Write tests for all new commands

**Week 3-4: Scoring Enhancements**
- [ ] Implement due date proximity scoring
- [ ] Add start date aging bonus
- [ ] Implement dependency chain scoring
- [ ] Add tag/project multiplier config
- [ ] Add incremental date processing commands
- [ ] Write scoring integration tests

**Week 5-7: TUI Development**
- [ ] Refactor cli/main.py into service layer
- [ ] Create TaskListScreen with textual
- [ ] Create TaskFormScreen with all fields
- [ ] Implement keyboard navigation
- [ ] Add live score updates
- [ ] Write TUI snapshot tests

**Week 8-11: Web Deployment**
- [ ] Design REST API spec
- [ ] Migrate to Vercel Postgres
- [ ] Build serverless function endpoints
- [ ] Create React frontend with Material-UI
- [ ] Deploy to Vercel
- [ ] Add E2E tests with Playwright

**Week 12-13: PWA Features**
- [ ] Add PWA manifest
- [ ] Implement service workers
- [ ] Add offline support
- [ ] Configure push notifications
- [ ] Test on mobile devices

**Week 14-17: Habit Tracking**
- [ ] Extend Task model for habits
- [ ] Implement recurrence with dateutil
- [ ] Build habit completion tracking
- [ ] Add streak calculation
- [ ] Create heat map frontend component

**Week 18-20: Advanced Features**
- [ ] Implement vacation mode
- [ ] Create badge system
- [ ] Build Kanban view
- [ ] Add dependency graph visualization
- [ ] Implement bulk editing

### Dependencies

**Python Libraries:**
- `rich` (installed) - Console output
- `textual` (add for 0.5) - TUI framework
- `python-dateutil` (add for 2.5) - Recurrence rules
- `vercel` (add for 0.7) - Deployment
- `psycopg2-binary` (add for 0.7) - Postgres driver

**Frontend Dependencies (0.7+):**
- React + TypeScript
- Material-UI (@mui/material)
- @tanstack/react-query for API calls
- d3.js or react-calendar-heatmap for visualizations
- Cytoscape.js for dependency graphs

**Infrastructure:**
- Vercel for hosting (free tier for start)
- Vercel Postgres for database
- GitHub Actions for CI/CD

### Success Criteria

**Milestone 0.1 Complete:**
- ✅ All CLI commands work with unused Task fields
- ✅ XP persists correctly to User model
- ✅ 100% test coverage maintained
- ✅ Pylint 10.0/10.0 score maintained

**Milestone 0.2 Complete:**
- ✅ Scoring includes due date proximity and dependency chains
- ✅ Incremental date processing works correctly
- ✅ Tag/project multipliers configurable per user
- ✅ All new scoring factors tested

**Milestone 0.5 Complete:**
- ✅ TUI launches and displays task list
- ✅ All CRUD operations work via keyboard
- ✅ Live score updates on task changes
- ✅ CLI still works for scripting/automation

**Milestone 0.7 Complete:**
- ✅ Web app deployed to Vercel
- ✅ REST API endpoints functional
- ✅ Frontend responsive on desktop/mobile
- ✅ Data migrated to Postgres

**Milestone 1.0 Complete:**
- ✅ PWA installable on mobile devices
- ✅ Offline mode works with cached data
- ✅ Push notifications configured
- ✅ Passes Lighthouse PWA audit

**Milestone 2.5 Complete:**
- ✅ Recurring tasks generate next instance on completion
- ✅ Complex recurrence rules supported
- ✅ Habit vs. task distinction clear in UI

**Milestone 3.0 Complete:**
- ✅ Heat map shows habit completion history
- ✅ Streak statistics calculated and displayed
- ✅ Habit-specific scoring bonuses work

**Milestone 4.0 Complete:**
- ✅ Vacation mode pauses penalties
- ✅ Badge system rewards user milestones
- ✅ Kanban and dependency graph views functional
- ✅ Bulk editing saves time on common operations
