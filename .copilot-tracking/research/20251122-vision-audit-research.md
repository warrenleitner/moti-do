# Vision Audit Research

## Overview
This document audits the `basic_idea.md` vision against the current codebase state as of November 22, 2025.

## Current State Analysis

### 1. Core Models (`src/motido/core/models.py`)
- **Implemented**:
  - `Task` class with most fields (title, description, priority, difficulty, duration, dates, tags, project, subtasks, dependencies).
  - `Priority`, `Difficulty`, `Duration` enums with emojis and styles.
  - `User` class with XP tracking.
- **Missing**:
  - **Habits**: No `Habit` class or recurrence logic.
  - **Recurrence**: No fields for recurrence rules (frequency, interval, etc.).
  - **Streaks**: No tracking of habit streaks.
  - **Vacation Mode**: No user setting for vacation mode.

### 2. Scoring System (`src/motido/core/scoring.py`)
- **Implemented**:
  - Base score calculation.
  - Multipliers: Difficulty, Duration, Priority, Age, Tags, Projects.
  - Due Date Proximity (overdue/approaching logic).
  - Start Date Aging.
  - Dependency Chain Bonus.
  - Basic Daily Penalty (fixed amount).
- **Missing/Incorrect**:
  - **Penalty Logic**: Current implementation deducts a fixed amount. Vision requires:
    - Deduct current task value.
    - Inverse relationship with difficulty/duration (harder/longer = lower penalty impact).
  - **Habit Bonuses**: No streak bonuses.
  - **Status Bumps**: No automatic bumps for "Next" or "In Progress" tasks.
  - **XP Management**: No "Withdraw XP" feature. No "XP Scale" setting.

### 3. CLI (`src/motido/cli/main.py`)
- **Implemented**:
  - `init`, `create`, `list`, `advance` commands.
  - Basic sorting and filtering.
- **Missing**:
  - **Habit Commands**: `create-habit`, `habit-stats`, etc.
  - **Advanced Views**: Calendar view, Dependency Graph view.
  - **Batch Operations**: Batch edit/update.
  - **Vacation Mode**: Toggle command.
  - **Withdraw XP**: Command to spend XP.

## Implementation Plan Recommendations

### Phase 1: Habit Foundation
- Update `Task` model to support recurrence (make it a Habit).
- Add recurrence fields: `recurrence_rule` (str/dict), `recurrence_type` (enum), `streak_current`, `streak_best`.
- Implement recurrence logic in `core/utils.py` or `core/recurrence.py`.
- Update `advance` command to process recurrences.

### Phase 2: Scoring Overhaul
- Refactor `apply_penalties` to:
  - Calculate penalty based on task's current score.
  - Apply difficulty/duration dampeners.
- Add `calculate_habit_bonus` to `scoring.py`.
- Add "Next/In Progress" logic to `calculate_score`.
- Add `withdraw_xp` function to `scoring.py` and CLI command.

### Phase 3: CLI Expansion
- Add `motido habit create` command.
- Add `motido vacation` command.
- Add `motido xp withdraw` command.
- Implement `motido view calendar` (using `rich` layout).
- Implement `motido view graph` (using `rich` tree).

### Phase 4: Refinement
- Batch editing.
- Notifications (if feasible in CLI).
- Badges/Achievements system.
