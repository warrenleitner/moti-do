---
applyTo: '.copilot-tracking/changes/20251116-motido-vision-alignment-changes.md'
---
<!-- markdownlint-disable-file -->
# Task Checklist: MotiDo Vision Alignment & Milestone Progression

## Overview

Systematically align MotiDo v0.1.0 CLI with the comprehensive vision document and progressively implement all 14 milestones (0.1 through 4.0) to transform from a basic CLI task manager into a full-featured PWA with habit tracking, gamification, and advanced visualizations.

## Objectives

- Activate all dormant Task model fields with CLI commands
- Fix XP persistence system to properly track user progression
- Implement complete scoring system with due date proximity and dependency chains
- Build Terminal User Interface (TUI) using Textual framework
- Deploy web application as PWA with Vercel serverless backend
- Add comprehensive habit tracking with recurrence patterns
- Implement advanced features (vacation mode, badges, Kanban, dependency graphs)

## Research Summary

### Project Files
- `src/motido/core/models.py` - Task/User dataclasses with 16 fields (8 unused in CLI)
- `src/motido/cli/main.py` - 934-line CLI with 8 commands, needs field activation
- `src/motido/core/scoring.py` - Score calculation with placeholder XP system
- `src/motido/data/scoring_config.json` - Configurable multipliers, missing advanced factors

### External References
- #file:../research/20251116-motido-vision-alignment-research.md - Comprehensive audit and technical research
- #githubRepo:"Textualize/textual" - TUI framework patterns for Milestone 0.5
- #fetch:"https://dateutil.readthedocs.io/en/stable/rrule.html" - Recurrence rules for Milestone 2.5+

### Standards References
- #file:../../.github/copilot-instructions.md - MotiDo architecture patterns and requirements
- #file:../../.github/instructions/python.instructions.md - Python coding conventions

## Implementation Checklist

- [x] Task 1.1: Fix XP persistence system
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 20-35)
- [x] Task 1.2: Add `describe` command for text_description field
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 37-52)

- [x] Task 1.3: Add `set-due` and `set-start` commands for date fields
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 54-72)

- [x] Task 1.4: Add `tag` command for tag management
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 74-92)

- [x] Task 1.5: Add `project` command for project assignment
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 94-110)

- [x] Task 1.6: Update `list` command to display new fields
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 112-128)

- [x] Task 1.7: Update `view` command to show all fields
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 130-145)

- [x] Task 1.8: Write comprehensive tests for new commands
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 147-165)

### [x] Phase 1: Foundation Completion (Milestone 0.1+ - Week 1-2)

### [ ] Phase 2: Enhanced Scoring System (Milestone 0.2 - Week 3-4)

- [x] Task 2.1: Implement due date proximity scoring
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 169-190)

- [x] Task 2.2: Add start date aging bonus
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 192-208)

- [x] Task 2.3: Implement dependency chain scoring
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 210-230)

- [ ] Task 2.4: Add tag/project multiplier configuration
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 232-250)

- [ ] Task 2.5: Add priority multiplier to scoring
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 252-268)

- [ ] Task 2.6: Write scoring integration tests
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 270-287)

### [ ] Phase 3: Incremental Completion (Milestone 0.3 - Week 5)

- [ ] Task 3.1: Add last_processed_date to User model
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 291-308)

- [ ] Task 3.2: Implement `advance` command for date progression
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 310-330)

- [ ] Task 3.3: Implement `skip-to` command for date jumping
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 332-350)

- [ ] Task 3.4: Add completion_date field to Task model
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 352-368)

- [ ] Task 3.5: Update complete command to support backdating
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 370-387)

### [ ] Phase 4: Terminal User Interface (Milestone 0.5 - Week 6-8)

- [ ] Task 4.1: Refactor CLI into service layer
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 391-413)

- [ ] Task 4.2: Install Textual and create TUI module structure
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 415-432)

- [ ] Task 4.3: Create TaskListScreen with keyboard navigation
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 434-458)

- [ ] Task 4.4: Create TaskFormScreen for task creation/editing
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 460-485)

- [ ] Task 4.5: Create TaskDetailScreen for full task view
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 487-508)

- [ ] Task 4.6: Implement MotiDoApp with screen navigation
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 510-532)

- [ ] Task 4.7: Add TUI entry point and CSS styling
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 534-553)

- [ ] Task 4.8: Write TUI integration tests
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 555-573)

### [ ] Phase 5: Web Backend Architecture (Milestone 0.7 - Week 9-11)

- [ ] Task 5.1: Design REST API specification
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 577-598)

- [ ] Task 5.2: Create Vercel Postgres data manager
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 600-625)

- [ ] Task 5.3: Implement serverless function endpoints
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 627-652)

- [ ] Task 5.4: Build React frontend with Material-UI
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 654-680)

- [ ] Task 5.5: Configure Vercel deployment
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 682-703)

- [ ] Task 5.6: Add E2E tests with Playwright
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 705-723)

### [ ] Phase 6: Progressive Web App (Milestone 1.0 - Week 12-13)

- [ ] Task 6.1: Add PWA manifest and service worker
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 727-748)

- [ ] Task 6.2: Implement offline support with IndexedDB
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 750-770)

- [ ] Task 6.3: Configure push notifications
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 772-792)

- [ ] Task 6.4: Test and optimize mobile experience
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 794-813)

### [ ] Phase 7: Habit Tracking Foundation (Milestone 2.5 - Week 14-15)

- [ ] Task 7.1: Install python-dateutil and extend Task model
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 817-840)

- [ ] Task 7.2: Implement recurrence rule engine
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 842-865)

- [ ] Task 7.3: Add habit creation and completion commands
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 867-890)

- [ ] Task 7.4: Update TUI and web UI for habits
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 892-913)

### [ ] Phase 8: Advanced Habit Features (Milestone 3.0 - Week 16-17)

- [ ] Task 8.1: Implement completion history and streak calculation
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 917-940)

- [ ] Task 8.2: Build heat map data generation
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 942-963)

- [ ] Task 8.3: Create frontend heat map component
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 965-985)

- [ ] Task 8.4: Add habit-specific scoring bonuses
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 987-1007)

### [ ] Phase 9: Advanced Features (Milestone 4.0 - Week 18-20)

- [ ] Task 9.1: Implement vacation mode
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1011-1032)

- [ ] Task 9.2: Create badge system with rewards
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1034-1058)

- [ ] Task 9.3: Build Kanban board view
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1060-1083)

- [ ] Task 9.4: Implement dependency graph visualization
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1085-1108)

- [ ] Task 9.5: Add bulk editing functionality
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1110-1132)

- [ ] Task 9.6: Implement undo/redo system
  - Details: .copilot-tracking/details/20251116-motido-vision-alignment-details.md (Lines 1134-1155)

## Dependencies

- **Phase 1**: None (uses existing infrastructure)
- **Phase 2**: Phase 1 complete (needs date fields accessible)
- **Phase 3**: Phase 2 complete (needs enhanced scoring)
- **Phase 4**: Phase 3 complete, `textual` library installed
- **Phase 5**: Phase 4 complete, Vercel account, Node.js/npm
- **Phase 6**: Phase 5 complete (web app deployed)
- **Phase 7**: Phase 6 complete, `python-dateutil` library
- **Phase 8**: Phase 7 complete (basic habits working)
- **Phase 9**: Phase 8 complete (full habit system)

## Success Criteria

- All 16 Task model fields accessible and functional
- XP system persists correctly and drives user progression
- Scoring algorithm includes all vision-specified factors
- TUI provides efficient keyboard-driven workflow
- Web app deployed as installable PWA
- Habits support complex recurrence patterns with streaks
- Advanced visualizations (Kanban, graphs, heat maps) operational
- 100% test coverage maintained throughout
- Pylint 10.0/10.0 score maintained throughout
