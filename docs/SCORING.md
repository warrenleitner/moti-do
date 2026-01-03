# Moti-Do Scoring Algorithm

This document provides a comprehensive explanation of Moti-Do's scoring system, which calculates XP (experience points) for task completion. The system uses a sophisticated multi-factor approach that balances urgency, difficulty, and task attributes.

## Overview

The scoring system assigns scores based on:
- Task attributes (priority, difficulty, duration)
- Timing factors (due date proximity, task age)
- Relationships (dependencies on other tasks)
- User customization (tag and project multipliers)
- Habit streaks (bonus for consistency)

Completed tasks award XP to the user, contributing to their overall level (100 XP = 1 level).

## Score Calculation Formula

The scoring formula uses a **hybrid additive + multiplicative approach**:

```
ADDITIVE BASE = base_score
              + text_description_bonus (if present)
              + start_date_aging_bonus
              + habit_streak_bonus (if habit)
              + status_bumps

FINAL SCORE = (ADDITIVE BASE * priority_mult * difficulty_mult * duration_mult
              * age_mult * due_date_mult * tag_mult * project_mult)
              + dependency_chain_bonus
```

## Additive Base Components

| Component | Default Value | Description |
|-----------|---------------|-------------|
| **base_score** | 10 | Starting points for every task |
| **text_description** | +5 | Bonus if task has rich text content |
| **start_date_bonus** | days_past_start × 0.2 | Disabled if task is overdue |
| **habit_streak_bonus** | min(streak × 1.0, 50.0) | Capped at 50 points max |
| **in_progress_bonus** | +5.0 | If start_date ≤ today & not complete |
| **next_up_bonus** | +10.0 | If due within 3 days & not complete |

## Multiplicative Factors

### Difficulty Multiplier

| Difficulty | Multiplier |
|------------|------------|
| NOT_SET | 1.0 |
| TRIVIAL | 1.1 |
| LOW | 1.5 |
| MEDIUM | 2.0 |
| HIGH | 3.0 |
| HERCULEAN | 5.0 |

### Duration Multiplier

| Duration | Multiplier |
|----------|------------|
| NOT_SET | 1.0 |
| MINUSCULE | 1.05 |
| SHORT | 1.2 |
| MEDIUM | 1.5 |
| LONG | 2.0 |
| ODYSSEYAN | 3.0 |

### Priority Multiplier

| Priority | Multiplier |
|----------|------------|
| NOT_SET | 1.0 |
| LOW | 1.2 |
| MEDIUM | 1.5 |
| HIGH | 2.0 |
| DEFCON_ONE | 3.0 |

### Age Multiplier

Rewards older tasks to prevent them from being forgotten:

```
age_multiplier = 1.0 + (task_age_days × 0.005)
```

- Task age = days since creation
- Minimum: 1.0 (never penalizes fresh tasks)
- Example: 100-day-old task = 1.0 + (100 × 0.005) = **1.5×**

### Tag and Project Multipliers

- **Tags**: User-defined multipliers that stack multiplicatively
  - Example: tags ["urgent"=1.8, "critical"=1.4] → combined = 1.8 × 1.4 = **2.52×**
- **Projects**: Single project multiplier applied per task

## Due Date Proximity Multiplier

Rewards urgency with **logarithmic scaling for overdue tasks**:

### Overdue (days_until_due < 0)

```
multiplier = 1.0 + (log(days_overdue + 1) × 0.75)
```

| Days Overdue | Multiplier |
|--------------|------------|
| 1 day | ~1.52× |
| 5 days | ~2.30× |
| 10 days | ~2.80× |

Logarithmic scaling prevents infinite escalation.

### Approaching (0 ≤ days_until_due ≤ 14)

```
multiplier = 1.0 + ((14 - days_until_due) × 0.05)
```

| Days Until Due | Multiplier |
|----------------|------------|
| Due today (0) | 1.70× |
| 7 days away | 1.35× |
| 14 days away | 1.0× |

### Future (days_until_due > 14)

No bonus: **1.0×**

## Dependency Chain Bonus

Rewards completing tasks that unblock other work:

- Finds all incomplete tasks listing this task as a dependency
- Recursively calculates the score of each dependent task
- Returns: `sum(dependent_scores) × 0.1` (10% of total)
- **Circular dependency detection** prevents infinite loops

**Example**: If completing this task unblocks 2 tasks worth 100 XP each:
```
bonus = 200 × 0.1 = +20 XP
```

## Complete Calculation Example

**Task:** "Fix production bug"
- Priority: DEFCON_ONE
- Difficulty: HIGH
- Duration: SHORT
- Created: 20 days ago
- Due: 5 days ago (overdue)
- Tags: ["urgent"=1.8, "critical"=1.4]
- Project: "ProductionFix"=2.5
- Text description: Yes

### Calculation

**1. Additive Base:**
```
base_score: 10
text_description: +5
Total: 15
```

**2. Multiplicative Stack:**
```
Priority (DEFCON_ONE): 3.0
Difficulty (HIGH): 3.0
Duration (SHORT): 1.2
Age (20 days): 1.0 + (20 × 0.005) = 1.1
Due date (5 days overdue): 1.0 + log(6) × 0.75 ≈ 2.30
Tags: 1.8 × 1.4 = 2.52
Project: 2.5
Product: 3.0 × 3.0 × 1.2 × 1.1 × 2.30 × 2.52 × 2.5 = 630.54
```

**3. Final Score:**
```
15 × 630.54 = 9,458 XP (rounded)
```

## Penalty System

The penalty system discourages leaving tasks incomplete past their due date.

### Penalty Multiplier Calculation

The penalty multiplier is **inverted** from the XP multiplier:
```
penalty_multiplier = 6.0 - xp_multiplier
```

This means:
- **Easy tasks** get **higher** penalties (no excuse to skip)
- **Hard tasks** get **lower** penalties (understandable to defer)

### When Penalties Apply

- Only to **incomplete** tasks
- Only to tasks **with due dates**
- Only when `due_date ≤ today`

### Penalty Formula

```
penalty = max(1, int((base_score × penalty_multiplier) / 25))
```

Example: TRIVIAL + MINUSCULE task → ~10 XP lost per day overdue

### Daily Penalty Processing

Penalties are applied via the `apply_penalties()` function:
- Runs when advancing the game date (in Settings)
- Iterates through all incomplete tasks
- Applies penalty per day for overdue tasks

## XP and Leveling System

### Level Progression

```
Level = total_xp // 100
Current level progress = total_xp % 100
```

Example: 350 XP = Level 3 with 50% progress to Level 4

### XP Transactions

XP is tracked through transactions with these sources:
- `task_completion` - Completing a task
- `penalty` - Daily penalty for overdue tasks
- `withdrawal` - Manual XP withdrawal by user
- `habit_streak_bonus` - Bonus for habit streaks

## Badge System

Achievements are unlocked based on various milestones:

| Category | Milestones |
|----------|------------|
| Tasks Completed | 1, 5, 25, 100, 500 |
| Habit Streak | 7, 30, 90 days |
| Total XP | 100, 1000, 10000 |
| Habit Completions | 1, 10, 50 |

## Configuration

All scoring parameters are configurable in `src/motido/data/scoring_config.json`.

### Key Configuration Sections

1. **Base scoring values** - `base_score`, `text_description_bonus`
2. **Difficulty/duration/priority multipliers** - Per-level values
3. **Age factor** - `multiplier_per_unit`, `unit` (days/weeks)
4. **Due date proximity** - `approaching_multiplier_per_day`, `overdue_scale_factor`
5. **Start date aging bonus** - `bonus_points_per_day`
6. **Dependency chain** - `dependent_score_percentage` (default 10%)
7. **Habit streak bonus** - `bonus_per_streak_day`, `max_bonus`
8. **Status bumps** - `in_progress_bonus`, `next_up_bonus`
9. **Badge definitions** - Achievement thresholds

### User Customization

Users can define custom multipliers for:
- **Tags**: Create tags with custom multipliers (stacks multiplicatively)
- **Projects**: Assign a multiplier to each project

These are merged with the base config via `build_scoring_config_with_user_multipliers()`.

## API/Frontend Integration

### Task Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `score` | int | XP earned for completion |
| `penalty_score` | float | XP lost if not completed |
| `net_score` | float | score + penalty_avoided (motivation metric) |

### User Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_xp` | int | Cumulative experience points |
| `level` | int | Derived from total_xp // 100 |
| `xp_transactions` | list | History of XP changes |
| `badges` | list | Earned achievements |

## Implementation Details

### Key Functions

- `calculate_score()` - Main entry point for score calculation
- `calculate_due_date_multiplier()` - Handles due date proximity
- `calculate_start_date_bonus()` - Aging bonus for started tasks
- `calculate_dependency_chain_bonus()` - Recursive dependency scoring
- `calculate_penalty_score()` - Penalty for overdue incomplete tasks
- `calculate_task_scores()` - Returns tuple (xp_score, penalty_score, net_score)

### Edge Cases

- **Tasks with no due date**: No due date proximity bonus
- **Overdue tasks**: No start_date_aging bonus (avoid double-counting urgency)
- **Completed tasks**: No penalty applied
- **Future tasks beyond threshold**: No approaching bonus
- **Circular dependencies**: Detected and prevented during calculation

### Source Files

- `src/motido/core/scoring.py` - Core scoring logic
- `src/motido/data/scoring_config.json` - Default configuration
- `tests/test_scoring.py` - Comprehensive test coverage
