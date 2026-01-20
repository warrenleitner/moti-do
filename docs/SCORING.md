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

The scoring formula is **fully additive**:

```
COMPONENT(task, weight, multiplier_delta) =
    base_score * weight * max(multiplier_delta, 0)

FINAL SCORE = base_score
            + start_date_aging_bonus
            + habit_streak_bonus
            + COMPONENT(priority)
            + COMPONENT(difficulty)
            + COMPONENT(duration)
            + COMPONENT(age)
            + COMPONENT(due_date)
            + COMPONENT(tags)
            + COMPONENT(project)
            + dependency_chain_bonus
```

Each multiplier delta is `(multiplier - 1.0)`.

## Additive Components

| Component | Defaults | Notes |
|-----------|----------|-------|
| **base_score** | 10 | Starting points for every task |
| **start_date_bonus** | base_score × multiplier_per_unit × units_past_start (capped) | Disabled if overdue |
| **habit_streak_bonus** | min(streak × 1.2, 25) | Habit-only |
| **dependency_chain_bonus** | 12% of dependent tasks | Additive |

## Weighted Multipliers (deltas)

| Factor | Weight | Notes |
|--------|--------|-------|
| **Priority** | 1.15 | Higher priority = larger delta |
| **Difficulty** | 1.05 | Harder tasks add more XP |
| **Duration** | 0.95 | Longer tasks add more XP |
| **Age** | 0.6 | Linear, capped at max_multiplier (days or weeks) |
| **Due Date** | 1.2 | Linear proximity bump with cap (days or weeks) |
| **Tags** | 0.5 | Product of configured tag multipliers |
| **Project** | 0.6 | Single project multiplier |

Multipliers are modest (e.g., MEDIUM difficulty ≈ 1.45), so a typical task lands around 10–40 XP, with urgent outliers above 100 XP.

### Due Date Proximity Multiplier

Rewards urgency with a **linear bump per unit** (days or weeks) and a hard cap:

```
max_units = (max_multiplier - 1) / multiplier_per_unit
overdue: 1.0 + min(units_overdue, max_units) × multiplier_per_unit
approaching: 1.0 + (max_units - units_until_due) × multiplier_per_unit
cap: max_multiplier (default 1.5)
```

`unit` applies to both due date proximity and age_factor, so changing it to `weeks`
will scale both urgency and aging the same way (one increases as the due date nears,
the other as the task gets older).

## Dependency Chain Bonus

Rewards completing tasks that unblock other work:

- Finds all incomplete tasks listing this task as a dependency
- Recursively calculates the score of each dependent task
- Returns: `sum(dependent_scores) × 0.12` (12% of total)
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
- Text description: Optional

Using the defaults above on the reference date:

- Additive base: 10 + start date bonus + habit streak bonus
- Component contributions: priority, difficulty, duration, age, due date, tags, project
- Total (without dependencies): ≈ 70–140 XP

The exact value is produced by `calculate_score()` using the same additive formula.

## Penalty System

The penalty system discourages leaving tasks incomplete past their due date.

### Penalty Weighting

Penalties mirror XP component weights and let you choose which components invert:
- `penalty_invert_weights.<component> = true` → penalty weight uses $1 / weight$.
- Difficulty and duration still use inverted deltas (easy/short penalize more).
- Priority, age, due-date urgency, tags, project, and base can each be toggled.

### When Penalties Apply

- Only to **incomplete** tasks
- Only to tasks **with due dates**
- Only when `due_date ≤ today`
- Only when `creation_date < today`

### Penalty Formula

```
penalty = base_score * penalty_weight_base
        + weighted_components(priority, inverted_difficulty, inverted_duration,
                              age, due_date, tags, project)
```
With defaults this yields low double-digits for substantial work and higher double-digits for trivial overdue items.

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

1. **Base scoring values** - `base_score`
2. **Difficulty/duration/priority multipliers** - Per-level values
3. **Age factor** - `enabled`, `multiplier_per_unit`, `unit` (days/weeks), `max_multiplier`
4. **Due date proximity** - `enabled`, `multiplier_per_unit`, `unit` (days/weeks), `max_multiplier`
5. **Dependency chain** - `dependent_score_percentage` (default 10%)
6. **Habit streak bonus** - `bonus_per_streak_day`, `max_bonus`
7. **Penalty weighting** - `penalty_invert_weights.<component>` map (base, priority, difficulty, duration, age, due_date, tag, project)
8. **Badge definitions** - Achievement thresholds

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
- **Future tasks beyond max window**: No proximity bonus
- **Circular dependencies**: Detected and prevented during calculation

### Source Files

- `src/motido/core/scoring.py` - Core scoring logic
- `src/motido/data/scoring_config.json` - Default configuration
- `tests/test_scoring.py` - Comprehensive test coverage
