---
applyTo: '.copilot-tracking/changes/20251122-vision-implementation-changes.md'
---
<!-- markdownlint-disable-file -->
# Task Checklist: Vision Implementation

## Overview

Implement missing features from the `basic_idea.md` vision document, focusing on Habits, Advanced Scoring, and CLI enhancements.

## Objectives

- Implement Habit support with recurrence and streaks.
- Overhaul scoring system to match vision (penalties, bonuses).
- Add missing CLI commands (vacation, withdraw XP, advanced views).

## Research Summary

### Project Files
- src/motido/core/models.py - Task model needs updates for habits.
- src/motido/core/scoring.py - Scoring logic needs updates.
- src/motido/cli/main.py - CLI needs new commands.

### External References
- #file:../research/20251122-vision-audit-research.md - Audit findings and recommendations.

## Implementation Checklist

### [x] Phase 1: Habit Foundation

- [x] Task 1.1: Update Task Model for Habits
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 10-30)

- [x] Task 1.2: Implement Recurrence Logic
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 32-50)

- [x] Task 1.3: Update CLI for Habits
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 52-70)

### [ ] Phase 2: Scoring Overhaul

- [x] Task 2.1: Advanced Penalty Logic
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 75-95)

- [x] Task 2.2: Habit Bonuses & Status Bumps
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 97-115)

- [ ] Task 2.3: XP Management (Withdraw/Scale)
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 117-135)

### [ ] Phase 3: CLI Enhancements

- [ ] Task 3.1: Vacation Mode
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 140-155)

- [ ] Task 3.2: Advanced Views (Calendar/Graph)
  - Details: .copilot-tracking/details/20251122-vision-implementation-details.md (Lines 157-180)

## Dependencies

- rich (for advanced views)
- dateutil (for recurrence calculation - might need to add this dependency)

## Success Criteria

- Habits can be created and recur correctly.
- Penalties are calculated based on task value and difficulty.
- Users can withdraw XP and set vacation mode.
- Calendar and Graph views are functional.
