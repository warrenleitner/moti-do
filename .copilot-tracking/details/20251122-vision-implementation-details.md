<!-- markdownlint-disable-file -->
# Task Details: Vision Implementation

## Research Reference

**Source Research**: #file:../research/20251122-vision-audit-research.md

## Phase 1: Habit Foundation

### Task 1.1: Update Task Model for Habits

Add fields to `Task` class in `src/motido/core/models.py` to support habits.

- **Files**:
  - `src/motido/core/models.py` - Add `is_habit`, `recurrence_rule`, `recurrence_type`, `streak_current`, `streak_best`.
- **Success**:
  - `Task` objects can store habit data.
  - Tests pass for new fields.
- **Research References**:
  - #file:../research/20251122-vision-audit-research.md (Lines 15-20) - Missing habit fields.

### Task 1.2: Implement Recurrence Logic

Create logic to calculate next occurrence dates based on recurrence rules.

- **Files**:
  - `src/motido/core/recurrence.py` (New) - Implement `calculate_next_occurrence`.
  - `src/motido/core/utils.py` - Integrate if needed.
- **Success**:
  - Correctly calculates next date for daily, weekly, monthly patterns.
  - Handles "X days before due" logic.
- **Dependencies**:
  - Task 1.1 completion.

### Task 1.3: Update CLI for Habits

Add CLI support for creating and managing habits.

- **Files**:
  - `src/motido/cli/main.py` - Add `create --habit` flag and recurrence args.
  - `src/motido/cli/main.py` - Update `advance` to generate new habit instances.
- **Success**:
  - Can create a habit via CLI.
  - `advance` command creates new task instances for due habits.
- **Dependencies**:
  - Task 1.2 completion.

## Phase 2: Scoring Overhaul

### Task 2.1: Advanced Penalty Logic

Refactor `apply_penalties` to match vision.

- **Files**:
  - `src/motido/core/scoring.py` - Rewrite `apply_penalties`.
- **Success**:
  - Penalty = current task score.
  - Penalty is reduced by difficulty/duration (inverse multiplier).
- **Research References**:
  - #file:../research/20251122-vision-audit-research.md (Lines 30-35) - Penalty logic gaps.

### Task 2.2: Habit Bonuses & Status Bumps

Add scoring bonuses for habit streaks and task status.

- **Files**:
  - `src/motido/core/scoring.py` - Update `calculate_score`.
- **Success**:
  - Habits get bonus based on streak length.
  - "Next" (due soon) and "In Progress" tasks get score bumps.

### Task 2.3: XP Management (Withdraw/Scale)

Implement XP withdrawal and scaling.

- **Files**:
  - `src/motido/core/scoring.py` - Add `withdraw_xp`.
  - `src/motido/cli/main.py` - Add `xp withdraw` command.
- **Success**:
  - User can spend XP (reduce total).
  - Transaction is logged (optional).

## Phase 3: CLI Enhancements

### Task 3.1: Vacation Mode

Implement vacation mode to pause penalties.

- **Files**:
  - `src/motido/core/models.py` - Add `vacation_mode` to `User`.
  - `src/motido/cli/main.py` - Add `vacation` command (on/off).
  - `src/motido/core/scoring.py` - Update `apply_penalties` to check vacation mode.
- **Success**:
  - Penalties are skipped when vacation mode is on.

### Task 3.2: Advanced Views (Calendar/Graph)

Implement rich text views for calendar and dependency graph.

- **Files**:
  - `src/motido/cli/views.py` (New) - Implement `CalendarView` and `DependencyGraphView`.
  - `src/motido/cli/main.py` - Integrate new views.
- **Success**:
  - `motido view calendar` shows tasks by date.
  - `motido view graph` shows dependency tree.
