---
mode: agent
model: Claude Sonnet 4
---
<!-- markdownlint-disable-file -->
# Implementation Prompt: MotiDo Vision Alignment & Milestone Progression

## Implementation Instructions

### Step 1: Create Changes Tracking File

You WILL create `20251116-motido-vision-alignment-changes.md` in #file:../changes/ if it does not exist.

### Step 2: Execute Implementation

You WILL follow #file:../../.github/instructions/task-implementation.instructions.md
You WILL systematically implement #file:../plans/20251116-motido-vision-alignment-plan.instructions.md task-by-task
You WILL follow ALL project standards and conventions:
- #file:../../.github/copilot-instructions.md - MotiDo architecture patterns
- #file:../../.github/instructions/python.instructions.md - Python coding standards
- Backend abstraction pattern (ALWAYS use `get_data_manager()` factory)
- Enum display pattern (implement `emoji()` and `display_style()` methods)
- 100% test coverage requirement
- Pylint 10.0/10.0 score requirement
- Type hints on all functions

**CRITICAL**: If ${input:phaseStop:true} is true, you WILL stop after each Phase for user review.
**CRITICAL**: If ${input:taskStop:false} is true, you WILL stop after each Task for user review.

### Step 3: Cleanup

When ALL Phases are checked off (`[x]`) and completed you WILL do the following:

1. You WILL provide a markdown style link and a summary of all changes from #file:../changes/20251116-motido-vision-alignment-changes.md to the user:
   - You WILL keep the overall summary brief
   - You WILL add spacing around any lists
   - You MUST wrap any reference to a file in a markdown style link

2. You WILL provide markdown style links to:
   - [.copilot-tracking/plans/20251116-motido-vision-alignment-plan.instructions.md](.copilot-tracking/plans/20251116-motido-vision-alignment-plan.instructions.md)
   - [.copilot-tracking/details/20251116-motido-vision-alignment-details.md](.copilot-tracking/details/20251116-motido-vision-alignment-details.md)
   - [.copilot-tracking/research/20251116-motido-vision-alignment-research.md](.copilot-tracking/research/20251116-motido-vision-alignment-research.md)
   
   You WILL recommend cleaning these files up as well.

3. **MANDATORY**: You WILL attempt to delete `.copilot-tracking/prompts/implement-motido-vision-alignment.prompt.md`

## Implementation Phases

This is a large multi-phase project. The plan is organized into 9 phases spanning 20 weeks:

**Phase 1: Foundation Completion** (Week 1-2)
- Fix XP persistence
- Activate all dormant Task fields (due_date, start_date, tags, projects, text_description)
- Update CLI commands to access new fields
- Comprehensive testing

**Phase 2: Enhanced Scoring** (Week 3-4)
- Due date proximity scoring (exponential)
- Start date aging bonus
- Dependency chain scoring
- Tag/project custom multipliers
- Priority multiplier integration

**Phase 3: Incremental Completion** (Week 5)
- Date tracking in User model
- Advance and skip-to commands
- Backdated task completion
- Virtual date processing

**Phase 4: Terminal User Interface** (Week 6-8)
- Service layer refactoring
- Textual framework integration
- TUI screens (TaskList, TaskForm, TaskDetail)
- Keyboard navigation and styling

**Phase 5: Web Backend** (Week 9-11)
- REST API design
- Vercel Postgres data manager
- Serverless function endpoints
- React + Material-UI frontend
- Deployment configuration

**Phase 6: Progressive Web App** (Week 12-13)
- PWA manifest and service worker
- IndexedDB offline support
- Push notifications
- Mobile optimization

**Phase 7: Habit Tracking Foundation** (Week 14-15)
- python-dateutil installation
- Recurrence rule engine
- Habit CLI commands
- Habit UI components

**Phase 8: Advanced Habit Features** (Week 16-17)
- Completion history and streaks
- Heat map data generation
- Heat map frontend visualization
- Streak-based scoring bonuses

**Phase 9: Advanced Features** (Week 18-20)
- Vacation mode
- Badge system
- Kanban board view
- Dependency graph visualization
- Bulk editing
- Undo/redo system

## Success Criteria

- [ ] All 9 phases implemented with working code
- [ ] All 50+ tasks completed as specified in details document
- [ ] 100% test coverage maintained throughout
- [ ] Pylint 10.0/10.0 score maintained throughout
- [ ] All project conventions followed (backend abstraction, enum patterns, type hints)
- [ ] TUI functional and responsive
- [ ] Web app deployed as PWA
- [ ] Habits working with complex recurrence patterns
- [ ] Advanced visualizations operational
- [ ] Changes file comprehensively updated with all modifications
