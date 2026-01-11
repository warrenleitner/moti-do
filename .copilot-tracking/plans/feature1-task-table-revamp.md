<!-- markdownlint-disable-file -->
# Implementation Plan: Feature 1 – Task Table Revamp

## Analysis
- Relevant UI files: `frontend/src/components/tasks/TaskTable.tsx` (table rendering, column config, sorting), `frontend/src/components/tasks/ColumnConfigDialog.tsx` (column visibility/reorder), `frontend/src/components/common/FilterBar.tsx` (filters for table view), `frontend/src/pages/TasksPage.tsx` (wires table + filters + selection/bulk actions).
- Data + filtering: `frontend/src/store/taskStore.ts` (`useFilteredTasks`, filter state, local persistence) and `frontend/src/types/models.ts` (Task shape).
- Tests to update/add: `frontend/src/components/tasks/TaskTable.test.tsx`, `frontend/src/components/tasks/ColumnConfigDialog.test.tsx`, `frontend/src/components/common/FilterBar.test.tsx` (if missing, add), plus any store helpers tests (new utils).
- No backend changes per instructions; persistence should remain client-side (localStorage/Zustand). Implicit tags must be computed on the client from task data; filter visibility toggles and incremental loading can also be client-only.

## Tasks
- [x] 1. Add client-side implicit tag computation utility
  - Implement a pure helper that derives implicit tags from task title/description (e.g., `#tag` tokens) and merges them with explicit `task.tags`, returning a deduped list; ensure types align with `Task` interface.
  - File: create `frontend/src/utils/tags.ts` (or reuse existing utils directory) and, if appropriate, extend `taskStore.ts`.
  - Rationale: satisfy “implicit tags computed client-side” without backend persistence.

- [x] 2. Expose implicit tags in filtering options
  - When building `tags` list for `FilterBar`, include implicit tags computed for each task; ensure `useFilteredTasks` checks implicit tags when a tag filter is active (tasks should match if either explicit or implicit tag matches).
  - Files: `frontend/src/pages/TasksPage.tsx` and/or `taskStore.ts`.
  - Rationale: make implicit tags usable in the existing tag filter.

- [x] 3. Add filter visibility toggle with client persistence
  - Add a “Show/Hide Filters” control (e.g., icon button) for the table view, store preference in `localStorage`, and only render/expand `FilterBar` when enabled; ensure mobile drawer UX still works.
  - Files: `frontend/src/pages/TasksPage.tsx` and `frontend/src/components/common/FilterBar.tsx`.
  - Rationale: “filter visibility accepted” while keeping behavior client-only.

- [x] 4. Implement client-side additive loading for large task sets
  - Add state (e.g., `visibleRowCount` with an increment step) and render only the first N filtered tasks with a “Load more” control; keep bulk actions/select-all in sync with the visible slice; do not add backend pagination.
  - File: `frontend/src/pages/TasksPage.tsx` (table view section) and possibly a small helper component.
  - Rationale: “client-side additive fetching accepted” and avoids backend changes.

- [x] 5. Enhance TaskTable display to surface implicit tags
  - Adjust the `tags` column renderer to show both explicit and implicit tags (e.g., badge or tooltip indicating implicit); ensure CSV export uses the combined list; keep column config/localStorage behavior intact.
  - File: `frontend/src/components/tasks/TaskTable.tsx`.
  - Rationale: make computed tags visible in the revamped table.

- [x] 6. Update tests for new behavior
  - Cover implicit tag derivation, tag filtering with implicit tags, filter visibility toggle persistence, load-more flow, and combined tag rendering/export in TaskTable.
  - Files: `frontend/src/components/tasks/TaskTable.test.tsx`, `frontend/src/components/common/FilterBar.test.tsx` (add if missing), `frontend/src/store/taskStore` or new util tests, and any new helper test file under `frontend/src/utils/__tests__/tags.test.ts`.

## Risks and Mitigations
- Risk: Interpretation of “implicit tags” and “additive fetching” may differ from stakeholder intent. → Mitigation: Assumed parsing `#` tokens and client-side load-more; logic isolated for adjustments.
- Risk: Load-more slicing could desync bulk-select counts. → Mitigation: derive selection state from visible slice and write tests for select-all with limited rows.
- Risk: Filter visibility toggle could confuse existing mobile drawer behavior. → Mitigation: keep mobile drawer flow intact; toggle only controls whether bar is mounted/expanded and persist choice in localStorage.
