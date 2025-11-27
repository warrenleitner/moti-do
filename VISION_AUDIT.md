# MotiDo Vision Audit

## Overview

This document audits the vision outlined in `basic_idea.md` against the current Python CLI implementation in `src/motido/`. The audit is structured around the feature categories and milestones defined in the vision document.

> **Last Updated**: Implementation progress has been made. See **Implementation Progress** section at end.

---

## 1. Task Features Audit

### ✅ Fully Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Title | ✅ | `Task.title` in `models.py` |
| Text description field | ✅ | `Task.text_description` |
| Creation date | ✅ | `Task.creation_date` |
| Due date | ✅ | `Task.due_date`, CLI: `set-due` |
| Start date | ✅ | `Task.start_date`, CLI: `set-start` |
| Priority (5 levels) | ✅ | `Priority` enum: Trivial→Defcon One |
| Difficulty (5 levels) | ✅ | `Difficulty` enum: Trivial→Herculean |
| Duration (5 levels) | ✅ | `Duration` enum: Miniscule→Odysseyan |
| Dependencies | ✅ | `Task.dependencies`, CLI: `depends add/remove/list` |
| Subtasks (checklist) | ✅ | `Task.subtasks`, CLI: `subtask add/complete/remove/list` |
| Tags (multiple) | ✅ | `Task.tags`, CLI: `tag add/remove/list` |
| Projects (single) | ✅ | `Task.project`, CLI: `project` |
| History tracking | ✅ | `Task.history`, CLI: `history` |
| Undo capability | ✅ | CLI: `undo` (reverts last history entry) |
| Completion status | ✅ | `Task.is_complete`, CLI: `complete` |

### ⚠️ Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Icon/emoji based on title | ⚠️ | `Task.icon` field exists but not auto-generated |
| Rich text formatting | ⚠️ | `text_description` is plain string, no formatting/images |

### ❌ Not Implemented

| Feature | Vision Description |
|---------|-------------------|
| Image attachments | Ability to attach images to description |
| Colored tag labels | Tags are strings, no color support |
| Colored project bars | Projects are strings, no color support |

---

## 2. Habit Features Audit

### ✅ Fully Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Habit flag | ✅ | `Task.is_habit` |
| Recurrence rule | ✅ | `Task.recurrence_rule` (e.g., "daily", "weekly") |
| Recurrence type | ✅ | `RecurrenceType` enum (Strict, From Due Date, From Completion) |
| Current streak | ✅ | `Task.streak_current` |
| Best streak | ✅ | `Task.streak_best` |
| Streak update on complete | ✅ | `handle_complete()` updates streaks |
| rrule parsing | ✅ | `recurrence.py` with dateutil.rrule |

### ⚠️ Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Complex recurrence | ⚠️ | Basic rrule support exists; "every X days/weeks" works, but advanced patterns (specific days, "last day of month") not fully tested/documented |
| Advance display delta | ⚠️ | Vision mentions "show habit X days before due" - not implemented as explicit field |

### ❌ Not Implemented

| Feature | Vision Description |
|---------|-------------------|
| Heat map calendar view | Visual calendar showing consistency |
| Credit calculation for non-daily habits | "Credit for all days from N-1 to N" |
| Subtask recurrence options | Default/partial/always recurrence modes |
| Completion percentage stats | Overall habit completion rate |
| Next instance generation | Auto-creating new habit instances on completion |

---

## 3. Scoring System Audit

### ✅ Fully Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Base score | ✅ | `scoring_config.json` |
| Field presence bonuses | ✅ | Bonus for `text_description` |
| Priority multiplier | ✅ | `priority_multiplier` in config |
| Difficulty multiplier | ✅ | `difficulty_multiplier` in config |
| Duration multiplier | ✅ | `duration_multiplier` in config |
| Task age factor | ✅ | Age in days/weeks × multiplier |
| Due date proximity | ✅ | Overdue/approaching multipliers |
| Start date aging bonus | ✅ | `start_date_aging.bonus_points_per_day` |
| Dependency chain bonus | ✅ | % of dependent task scores |
| Tag multipliers (custom) | ✅ | `tag_multipliers` in config |
| Project multipliers (custom) | ✅ | `project_multipliers` in config |
| Habit streak bonus | ✅ | `habit_streak_bonus` in config |
| Status bumps (In Progress, Next Up) | ✅ | `status_bumps` in config |
| Configurable weights | ✅ | All via `scoring_config.json` |

### ⚠️ Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| XP for task completion | ✅ | Score → XP via `add_xp()` |
| XP for subtask completion | ✅ | Proportional XP: `score / num_subtasks` |
| Daily penalty | ✅ | Penalty dampened by difficulty × duration |
| XP withdrawal | ✅ | `xp withdraw` command |
| XP scale | ⚠️ | Vision mentions "default value for completing a task" - no explicit scale multiplier |

### ❌ Not Implemented

| Feature | Vision Description |
|---------|-------------------|
| Confetti animation | Visual feedback on task completion |
| XP transaction log | Vision mentions "app should log" manual withdrawals |

---

## 4. Other Features Audit

### ✅ Fully Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Incremental date processing | ✅ | `advance` command, `last_processed_date` |
| Advance to specific date | ✅ | `advance --to YYYY-MM-DD` |
| Vacation mode | ✅ | `vacation on/off/status`, skips penalties |
| View filters | ✅ | `view --status active/future/completed --project --tag` |
| Sorting | ✅ | `list --sort-by score/priority/title/status --sort-order asc/desc` |
| Calendar/agenda view | ✅ | `view calendar` |
| Dependency graph view | ✅ | `view graph` |
| JSON backend | ✅ | `JsonDataManager` |
| SQLite backend | ✅ | `DatabaseDataManager` |

### ❌ Not Implemented

| Feature | Vision Description |
|---------|-------------------|
| Multi-task editing | Select multiple tasks, edit common fields |
| Notifications | Push notifications for due tasks |
| Calendar heat view (productivity) | Visual productivity calendar |
| Click to see day's completions | Drill into completed tasks by date |
| Subtask display modes | Hidden/nested/standalone viewing options |
| Reward badges | Point thresholds, consistency milestones |
| Dark/light mode | Theme switching (CLI has rich styling but not theme toggle) |
| PWA/Web frontend | All frontend features from vision |

---

## 5. Milestone Alignment

| Milestone | Status | Notes |
|-----------|--------|-------|
| 0.1: Major task functionality in CLI | ✅ | Complete |
| 0.2: Score calculation + incremental date processing | ✅ | Complete |
| 0.3: Incremental task completion | ✅ | Advance command working |
| 0.5: GUI | ❌ | No GUI implemented |
| 0.7: Hosted in Vercel | ❌ | No deployment |
| 1.0: PWA mobile | ❌ | No PWA |
| 1.3: Holding box for quick task adding | ❌ | Not implemented |
| 1.5: Score keeping | ✅ | XP system working |
| 2.0: Complex views | ⚠️ | Calendar + graph done; Kanban missing |
| 2.5: Basic habits | ⚠️ | Habit flag + recurrence exists; auto-generation missing |
| 3.0: Full habits | ❌ | Heat maps, completion %, full tracking |
| 4.0: Other features | ⚠️ | Vacation mode done; badges missing |

---

## 6. Priority Implementation Gaps

### High Priority (Core CLI Completion)

1. **Auto-generate habit instances** - When a habit is completed, create the next occurrence
2. **Heat map view for habits** - Show consistency over time
3. **Subtask recurrence options** - Implement default/partial/always modes
4. **Tag/project colors** - Add color field to Tag and Project

### Medium Priority (Enhanced UX)

5. **Multi-task editing** - Batch operations on filtered tasks
6. **Completion stats** - Habit completion percentage, total tasks completed
7. **Kanban view** - Status-based column view
8. **XP transaction log** - Track all XP changes with timestamps

### Lower Priority (Future Phases)

9. **Reward badges** - Define badge criteria and award logic
10. **Icon auto-generation** - Use title keywords to suggest emojis
11. **Notification system** - Due date reminders (may need external service)

---

## 7. Recommended Next Steps

1. **Extend `models.py`**:
   - Add `Tag` and `Project` dataclasses with color fields
   - Add `XPTransaction` tracking
   - Add habit instance generation fields

2. **Enhance `recurrence.py`**:
   - Add function to create next habit instance
   - Implement subtask recurrence options

3. **New CLI commands**:
   - `habits` - List habits with streak/completion stats
   - `stats` - Show productivity statistics
   - `badge` - View earned badges

4. **New view modes**:
   - `view heatmap` - Habit consistency calendar
   - `view kanban` - Board-style task view

5. **Config extensions**:
   - Badge definitions in `scoring_config.json`
   - Default tag/project colors

---

## Implementation Progress

### Phase 1 Features Completed ✅

1. **XPTransaction Model** (`models.py`)
   - Added `XPTransaction` dataclass with amount, source, timestamp, task_id, description
   - Source types: task_completion, subtask_completion, penalty, withdrawal

2. **Badge Model** (`models.py`)
   - Added `Badge` dataclass with id, name, description, glyph, earned_date
   - Includes `is_earned()` method

3. **SubtaskRecurrenceMode Enum** (`models.py`)
   - Added DEFAULT, PARTIAL, ALWAYS modes for habit subtask behavior

4. **User Model Enhancements** (`models.py`)
   - Added `xp_transactions: List[XPTransaction]`
   - Added `badges: List[Badge]`

5. **XP Transaction Logging** (`scoring.py`)
   - `add_xp()` now logs transactions with source and description
   - `withdraw_xp()` now logs withdrawal transactions

6. **JSON Serialization** (`json_manager.py`)
   - Added `_deserialize_xp_transaction()` method
   - Added `_deserialize_badge()` method
   - Updated `save_user()` to serialize new fields

7. **New CLI Commands** (`cli/main.py`)
   - `motido habits` - Shows habit statistics table with streaks and status
   - `motido stats` - Shows productivity statistics (tasks, XP, badges)
   - `motido xp log` - Shows XP transaction history (last 50)

### Remaining Work

- Habit auto-generation on completion
- Tag/Project color support
- Kanban view
- Heat map view
- Batch operations
- Badge criteria checking/awarding