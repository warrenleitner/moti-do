<!-- markdownlint-disable-file -->
# Details: Feature 1 – Task Table Revamp

## Task 1: Add client-side implicit tag computation utility
- Create `frontend/src/utils/tags.ts` (or extend existing utils) with a pure helper that derives implicit tags from task title/description (parse `#tag` tokens).
- Merge derived implicit tags with explicit `task.tags`, deduped, and typed per `Task`.
- Keep logic client-side; no persistence changes.

## Task 2: Expose implicit tags in filtering options
- When building the `tags` list for `FilterBar` in the tasks page/store, include implicit tags for each task.
- Ensure `useFilteredTasks` considers implicit tags when a tag filter is active (match if explicit OR implicit tag matches).
- Keep existing filter behavior otherwise unchanged.

## Task 3: Add filter visibility toggle with client persistence
- Add a “Show/Hide Filters” control in the table view.
- Persist the preference in `localStorage`.
- Only render/expand `FilterBar` when enabled; mobile drawer UX should still work.

## Task 4: Implement client-side additive loading for large task sets
- Introduce a visible row count with an increment step (e.g., Load more).
- Render only the first N filtered tasks and allow loading more without backend pagination.
- Keep bulk actions/select-all behavior consistent with the visible slice.

## Task 5: Enhance TaskTable display to surface implicit tags
- Update the tags column renderer to show both explicit and implicit tags (badge/tooltip acceptable).
- Ensure CSV export uses the combined list of tags.
- Preserve column config/localStorage behavior.

## Task 6: Update tests for new behavior
- Add tests for implicit tag derivation and tag filtering using implicit tags.
- Cover filter visibility toggle persistence, load-more flow, and combined tag rendering/export in TaskTable.
- Update or add tests in the referenced component/store/util test files.
