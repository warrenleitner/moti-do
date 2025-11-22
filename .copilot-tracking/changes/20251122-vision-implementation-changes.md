<!-- markdownlint-disable-file -->
# Release Changes: Vision Implementation

**Related Plan**: 20251122-vision-implementation-plan.instructions.md
**Implementation Date**: 2025-11-22

## Summary

Implementing missing features from the vision document, focusing on Habits, Advanced Scoring, and CLI enhancements.

## Changes

### Added

- src/motido/core/models.py - Added habit fields (is_habit, recurrence_rule, recurrence_type, streak_current, streak_best) to Task model.
- src/motido/core/recurrence.py - Added recurrence calculation logic.

### Modified

- src/motido/core/models.py - Added RecurrenceType enum and updated Task class.
- src/motido/data/json_manager.py - Updated serialization/deserialization for new habit fields.
- src/motido/data/database_manager.py - Updated schema and serialization/deserialization for new habit fields.
- src/motido/cli/main.py - Added habit creation arguments and updated advance command to process recurrences.
- src/motido/core/utils.py - Updated process_day to handle habit recurrence generation.
- src/motido/core/scoring.py - Updated apply_penalties to calculate dynamic penalties based on task score and difficulty/duration.
- tests/test_scoring.py - Updated penalty tests to mock calculate_score and verify dynamic penalty logic.

### Removed
