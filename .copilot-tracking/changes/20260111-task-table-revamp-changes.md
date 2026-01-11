<!-- markdownlint-disable-file -->
# Release Changes: Feature 1 – Task Table Revamp

**Related Plan**: feature1-task-table-revamp.md  
**Implementation Date**: 2026-01-11

## Summary

Implemented client-side implicit tag support, filter visibility persistence, additive task loading, and surfaced combined tags in the task table with supporting tests.

## Changes

### Added

- frontend/src/utils/tags.ts - Added utilities to extract implicit hashtags from task text and merge them with explicit tags.
- frontend/src/utils/__tests__/tags.test.ts - Added unit coverage for implicit tag extraction and merging helpers.

### Modified

- frontend/src/store/taskStore.ts - Updated tag filtering to include implicit hashtags via combined tag computation.
- frontend/src/pages/TasksPage.tsx - Included implicit tags when building tag options for the filter bar, added a persisted show/hide toggle for filters in table view, introduced client-side load-more slicing for the task table, and always render the load-more control (disabled when exhausted).
- frontend/src/pages/TasksPage.tsx - Derived visible task selections without effect-based state updates to avoid cascading renders.
- frontend/src/components/tasks/TaskTable.tsx - Displayed combined explicit and implicit tags (with implicit tag cues), defaulted the tags column to visible, and ensured CSV exports expose combined tags even when Blob lacks a text reader with a typed fallback for Blob.text to satisfy linting.
- frontend/src/store/taskStore.test.ts - Added a regression ensuring implicit hashtags satisfy tag filters.
- frontend/src/components/tasks/TaskTable.test.tsx - Covered implicit tag rendering and CSV export content for combined tags.
- frontend/src/pages/TasksPage.test.tsx - Tested filter visibility persistence and load-more behavior in table view.
- frontend/src/pages/TasksPage.test.tsx - Mocked the task store filtering hook directly to keep the load-more control enabled during table view tests.
- frontend/src/pages/TasksPage.test.tsx - Ensured the store-level filtered tasks mock supplies data for list view rendering to avoid undefined access.
- frontend/src/utils/__tests__/tags.test.ts - Added coverage for missing-text handling and duplicate tag casing preservation.

### Removed

- Pending

## Release Summary

**Total Files Affected**: 10

### Files Created (4)

- .copilot-tracking/plans/feature1-task-table-revamp.md - Plan tracking for the task table revamp.
- .copilot-tracking/changes/20260111-task-table-revamp-changes.md - Change log for the revamp release.
- frontend/src/utils/tags.ts - Helper functions to derive and combine implicit tags.
- frontend/src/utils/__tests__/tags.test.ts - Unit tests for implicit tag utilities.

### Files Modified (6)

- frontend/src/store/taskStore.ts - Included implicit tags in tag filtering.
- frontend/src/pages/TasksPage.tsx - Added filter visibility persistence, implicit tag options, and load-more slicing.
- frontend/src/components/tasks/TaskTable.tsx - Rendered combined tags with implicit cues and exported them in CSV.
- frontend/src/store/taskStore.test.ts - Added coverage for implicit tag filtering.
- frontend/src/components/tasks/TaskTable.test.tsx - Tested implicit tag rendering and CSV export content.
- frontend/src/pages/TasksPage.test.tsx - Verified filter toggle persistence and load-more behavior.

### Files Removed (0)

- None

### Dependencies & Infrastructure

- **New Dependencies**: None
- **Updated Dependencies**: None
- **Infrastructure Changes**: None
- **Configuration Updates**: None

### Deployment Notes

Pending completion of all tasks.
