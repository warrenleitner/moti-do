# Moti-Do Advanced Scoring System

This document describes the advanced scoring system implemented in Moti-Do.

## Overview

The scoring system calculates a point value for each task based on several factors:
- Base score
- Field presence bonuses
- Difficulty multiplier
- Duration multiplier
- Age multiplier (tasks get more valuable as they get older)

Additionally, the system includes a daily penalty mechanism that deducts points for incomplete tasks.

## Scoring Configuration

The scoring configuration is stored in `scoring_config.json` with the following structure:

```json
{
  "base_score": 10,
  "field_presence_bonus": {
    "description": 5
  },
  "difficulty_multiplier": {
    "NOT_SET": 1.0,
    "TRIVIAL": 1.1,
    "LOW": 1.5,
    "MEDIUM": 2.0,
    "HIGH": 3.0,
    "HERCULEAN": 5.0
  },
  "duration_multiplier": {
    "NOT_SET": 1.0,
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

## Score Calculation

The score for a task is calculated with the following formula:

```
final_score = additive_base * difficulty_mult * duration_mult * age_mult
```

Where:
- `additive_base` = `base_score` + any field presence bonuses
- `difficulty_mult` = multiplier based on task difficulty
- `duration_mult` = multiplier based on task duration
- `age_mult` = 1.0 + (task_age_in_units * multiplier_per_unit)

The score is rounded to the nearest integer.

## CLI Integration

The scoring system is integrated into the following CLI commands:

1. `view <id>`: Displays the calculated score alongside other task details
2. `complete <id>`: Adds XP points based on the task's score when it's completed
3. `list`: Tasks are sorted by score by default (descending order) and the score is displayed in a new column
4. `run-penalties`: Applies daily penalties for incomplete tasks

## Daily Penalties

The system tracks when penalties were last applied and only applies new penalties for days that haven't been processed yet. For each incomplete task on each new day, a penalty of `penalty_points` is deducted from the user's total.

Run penalties manually with:
```
motido run-penalties
```

You can also specify a specific date:
```
motido run-penalties --date 2023-05-15
```

## Future Enhancements

Potential future enhancements:
- Actual XP tracking and user leveling system
- Task caching to improve performance
- More field bonuses
- Recurring task handling
- Weekly summaries or reports