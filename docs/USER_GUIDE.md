# Moti-Do User Guide

Welcome to Moti-Do, a gamified task and habit tracker that rewards you for getting things done.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Managing Tasks](#managing-tasks)
- [Tracking Habits](#tracking-habits)
- [Views](#views)
- [Understanding Your Score](#understanding-your-score)
- [Customization](#customization)
- [Tips for Success](#tips-for-success)

## Getting Started

### First Login

1. Navigate to the app URL
2. Click **Register** to create an account
3. Enter username `default_user` and set a password (8+ characters)
4. You're in! Start adding tasks.

### Quick Add

The fastest way to add a task:
1. Use the **Quick Add** box at the top of the Tasks page
2. Type your task title
3. Press Enter

For more details, click the expand icon to open the full task form.

## Core Concepts

### Tasks vs Habits

| | Tasks | Habits |
|---|-------|--------|
| **Occurs** | Once | Repeatedly |
| **Completion** | Done forever | Creates next occurrence |
| **Tracking** | Individual | Streaks, heatmaps |
| **Example** | "Submit tax return" | "Exercise 30 min" |

### XP and Levels

- **XP (Experience Points)**: Earned by completing tasks
- **Levels**: Every 100 XP = 1 level
- Higher difficulty/priority tasks = more XP
- Overdue tasks = XP penalties

### The Game Date

Moti-Do uses a "game date" that you control. This lets you:
- Process days you missed (vacation, sick days)
- Avoid unfair penalties when you couldn't use the app
- Advance one day at a time to properly handle recurrences

Find this in **Settings > Game Date**.

## Managing Tasks

### Task Fields

| Field | Purpose | Impact on Score |
|-------|---------|-----------------|
| **Title** | What you need to do | Base points |
| **Description** | Details, notes, context | +5 XP bonus |
| **Priority** | How important (Low → DEFCON ONE) | Up to 3× multiplier |
| **Difficulty** | How hard (Trivial → Herculean) | Up to 5× multiplier |
| **Duration** | Time needed (Minuscule → Odysseyan) | Up to 3× multiplier |
| **Due Date** | When it's due | Urgency bonus |
| **Start Date** | When to start showing it | Aging bonus |
| **Tags** | Categories with custom multipliers | Stacks multiplicatively |
| **Project** | Group related tasks | Custom multiplier |
| **Dependencies** | Tasks that must complete first | Chain bonus |

### Task States

- **Active**: Available to work on (start date passed, dependencies met)
- **Future**: Start date hasn't arrived yet
- **Blocked**: Waiting on dependencies
- **Completed**: Done!

### Completing Tasks

1. Click the checkbox next to a task
2. Watch the XP animation
3. The task moves to completed

**Partial completion**: If a task has subtasks, completing the parent completes all remaining subtasks.

### Subtasks

Break large tasks into smaller steps:
1. Open a task for editing
2. Add subtasks in the checklist section
3. Each subtask completed earns proportional XP

Formula: `subtask_xp = total_task_xp / number_of_subtasks`

### Dependencies

Create task chains where one must complete before another:
1. Edit a task
2. In the Dependencies field, search and select prerequisite tasks
3. The task won't appear in active view until dependencies are done

**Tip**: The dependency graph view helps visualize complex task relationships.

### Bulk Editing

Edit multiple tasks at once:
1. Select tasks using checkboxes
2. Click the bulk edit button
3. Change shared fields (due date, priority, etc.)
4. Only changed fields are updated

## Tracking Habits

### Creating a Habit

1. Create a new task
2. Check the **Habit** checkbox
3. Set up the recurrence pattern

### Recurrence Patterns

Moti-Do supports complex recurrence rules:

| Pattern | Example |
|---------|---------|
| Daily | Every day |
| Weekly | Every Monday, Wednesday, Friday |
| Monthly by date | 1st and 15th of each month |
| Monthly by day | Last Friday of each month |
| Custom interval | Every 3 days |

### Recurrence Types

How the next occurrence is created:

| Type | Behavior |
|------|----------|
| **Fixed** | Next occurrence created on schedule, even if previous incomplete |
| **After completion (original)** | Next occurrence based on original due date |
| **After completion (actual)** | Next occurrence based on when you actually completed |

### Start Date Delta

Control when habits appear before they're due:
- Set "Show X days before due"
- Example: Weekly task due Friday, show 2 days before = appears Wednesday

### Streaks

Consecutive completions build streaks:
- Streak bonus adds to your XP
- View current and best streak in habit stats
- Missing a habit resets the streak

### Habit Heatmap

The Habits page shows a GitHub-style heatmap:
- Green = completed
- Red = missed
- Gray = no habit scheduled
- Darker = more completions that day

## Views

### Task List (Default)

The primary view with filtering and sorting:

**Filters:**
- Status (Active, Future, Completed, All)
- Priority, Difficulty, Duration
- Tags, Projects
- Due date range
- Habits only

**Sorting:**
- Score (recommended - shows what to do next)
- Due date
- Priority
- Created date
- Title

### Calendar View

See tasks by due date:
- Monthly/weekly/daily views
- Drag tasks to reschedule
- Color-coded by priority
- Click a day to see all tasks

### Kanban Board

Visual workflow management:
- Columns: To Do, In Progress, Done
- Drag cards between columns
- Great for project-based work

### Dependency Graph

Visualize task relationships:
- Nodes = tasks
- Arrows = dependencies
- Filter to see specific task chains
- Identify bottlenecks

### Habits View

Dedicated habit tracking:
- Heatmap visualization
- Streak statistics
- Completion percentages
- Quick complete buttons

## Understanding Your Score

### How Score is Calculated

Your task score combines multiple factors:

```
Base (10 points)
  + Description bonus (+5)
  + Status bonuses (in progress, due soon)
  × Priority multiplier (1.0 - 3.0)
  × Difficulty multiplier (1.0 - 5.0)
  × Duration multiplier (1.0 - 3.0)
  × Age multiplier (grows over time)
  × Due date multiplier (urgency bonus)
  × Tag multipliers (custom)
  × Project multiplier (custom)
  + Dependency chain bonus
```

### What Earns More XP

| Factor | Low XP | High XP |
|--------|--------|---------|
| Priority | Not set | DEFCON ONE |
| Difficulty | Trivial | Herculean |
| Duration | Minuscule | Odysseyan |
| Due date | Far future | Overdue |
| Task age | Just created | Old task |
| Dependencies | None | Blocks many tasks |

### Penalties

Overdue incomplete tasks cost you XP:
- Calculated daily when you advance the game date
- Easier tasks have higher penalties (no excuse!)
- Harder tasks have lower penalties (understandable to defer)

**Avoiding penalties:**
- Complete tasks on time
- Use vacation mode when away
- Adjust due dates if plans change

### Badges

Unlock achievements:

| Badge | Requirement |
|-------|-------------|
| First Task | Complete 1 task |
| Getting Started | Complete 5 tasks |
| Productive | Complete 25 tasks |
| Task Master | Complete 100 tasks |
| Legendary | Complete 500 tasks |
| Week Streak | 7-day habit streak |
| Month Streak | 30-day habit streak |
| Quarter Streak | 90-day habit streak |

## Customization

### Tag Multipliers

Create tags with custom score multipliers:
1. Go to Settings > Tags
2. Add a tag with name and color
3. Set multiplier (e.g., 1.5 = 50% bonus)
4. Apply tag to tasks

**Example tags:**
- "Work" (1.2×) - slight bonus for professional tasks
- "Health" (1.5×) - prioritize wellness
- "Quick Win" (0.8×) - reduce score for easy tasks

### Project Multipliers

Similar to tags, but limited to one per task:
1. Go to Settings > Projects
2. Create project with color and multiplier
3. Assign tasks to projects

### Scoring Configuration

Advanced users can adjust in Settings:
- Base score value
- Multiplier values for each level
- Age factor
- Due date proximity thresholds
- Penalty calculations

## Tips for Success

### Daily Workflow

1. **Morning**: Review active tasks sorted by score
2. **Work**: Complete tasks, starting with highest score
3. **Evening**: Add new tasks, adjust priorities
4. **Advance**: Move game date forward if needed

### Getting the Most XP

1. **Add details**: Description = +5 XP
2. **Set accurate attributes**: Priority, difficulty, duration
3. **Complete on time**: Avoid penalties
4. **Build streaks**: Habit consistency bonus
5. **Create dependencies**: Earn chain bonuses

### Avoiding Overwhelm

1. **Use start dates**: Hide future tasks until relevant
2. **Filter views**: Focus on what's actionable now
3. **Break down large tasks**: Use subtasks
4. **Be realistic**: Don't over-commit

### Habit Building

1. **Start small**: One or two habits initially
2. **Stack habits**: Link to existing routines
3. **Use appropriate recurrence**: Daily might be too aggressive
4. **Celebrate streaks**: The visual feedback helps

### When You Fall Behind

1. **Don't panic**: Use game date to process incrementally
2. **Assess realistically**: Remove or reschedule impossible tasks
3. **Consider vacation mode**: Pause penalties during recovery
4. **Withdraw XP**: Rather than abandoning tasks, formally withdraw

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New task |
| `Enter` | Submit quick add |
| `Escape` | Close dialogs |

## Mobile Usage

Moti-Do is a Progressive Web App (PWA):

1. **Install**: Use browser's "Add to Home Screen"
2. **Offline**: Basic functionality works offline
3. **Sync**: Changes sync when back online

**Mobile tips:**
- Use swipe gestures where available
- Compact card view optimized for small screens
- Pull to refresh task list

## Troubleshooting

### Tasks Not Showing

- Check the status filter (Active vs All)
- Verify start date has passed
- Check if blocked by incomplete dependencies

### XP Not Updating

- Advance the game date in Settings
- Refresh the page
- Check if in development mode

### Habits Not Recurring

- Verify recurrence rule is set
- Check recurrence type setting
- Ensure previous occurrence is completed (if using "after completion" type)

---

For technical documentation, see:
- [Scoring Algorithm](SCORING.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
