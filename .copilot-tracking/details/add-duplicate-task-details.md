# Details: Add Duplicate Task Option & Bulk Confirmations

## Step 1: Update Task Store
- Add `duplicateTask` to `TaskState` and implement in `useTaskStore`.
- Logic: locate task by ID; build payload copying fields (title, description, priority, due date, recurrence, subtasks, tags, etc.) while removing `id`, completion state, creation metadata, and history; call `createTask` to persist the copy.

## Step 2: Update Task Card
- Add optional `onDuplicate` handler prop.
- Import and render a duplicate icon button (use `ContentCopy`) in `CardActions` that triggers the handler with the task ID.

## Step 3: Update Task List
- Add optional `onDuplicate` prop and pass it through to each `TaskCard`.

## Step 4: Update Task Table
- Add optional `onDuplicate` and `onBulkDuplicate` props.
- Import `ContentCopy` icon.
- Add "Duplicate" action per row.
- Add "Duplicate Selected" bulk action button alongside complete/delete.

## Step 5: Implement Page Logic
- Add state for confirmation dialogs: bulk complete, bulk duplicate.
- Track selected IDs for bulk complete and duplicate.
- Single duplicate should call `duplicateTask` directly.
- Bulk complete should show confirmation before executing.
- Bulk duplicate should show confirmation before executing.
- Ensure single delete confirmation remains; bulk delete confirmation remains.
- Pass new handlers to `TaskTable` and `TaskList`.
- Render `ConfirmDialog` components for new confirmations.
