# Implementation Plan: Add Duplicate Task Option & Bulk Confirmations

## Tasks
- [x] Step 1: Update Task Store
- [x] Step 2: Update Task Card
- [x] Step 3: Update Task List
- [x] Step 4: Update Task Table
- [x] Step 5: Implement Page Logic

## Analysis
The user wants to add a "Duplicate" option for tasks, both as a single action and a bulk action. Additionally, bulk actions (Complete, Delete, Duplicate) and single Delete must have confirmation dialogs.

## Affected Files
1. `frontend/src/store/taskStore.ts`: Need to add `duplicateTask` action.
2. `frontend/src/components/tasks/TaskTable.tsx`: Add "Duplicate" to bulk toolbar and row actions.
3. `frontend/src/components/tasks/TaskCard.tsx`: Add "Duplicate" to card actions.
4. `frontend/src/components/tasks/TaskList.tsx`: Pass `onDuplicate` prop down to `TaskCard`.
5. `frontend/src/pages/TasksPage.tsx`: Implement handlers, confirmation states, and dialogs.

## Dependencies
- `@mui/icons-material`: Need `ContentCopy` (or `FileCopy`) icon for duplicate action.

## Implementation Steps
1. Update Task Store: Add `duplicateTask` function to `TaskState` and `useTaskStore`. Logic: find task by ID, create copy of its data (excluding ID, creation date, history, completion status), and call `createTask`.
2. Update Task Card: Add `onDuplicate?: (id: string) => void` to props, import `ContentCopy` icon, and add IconButton for duplication in `CardActions`.
3. Update Task List: Add `onDuplicate?: (id: string) => void` to props and pass `onDuplicate` to `TaskCard`.
4. Update Task Table: Import `ContentCopy` icon, add `onDuplicate?: (taskId: string) => void` and `onBulkDuplicate?: (taskIds: string[]) => void` to props, add "Duplicate Selected" to bulk actions toolbar, and add "Duplicate" button to the row actions column.
5. Implement Page Logic: Add state for `bulkCompleteDialogOpen` and `bulkDuplicateDialogOpen`; add state for `tasksToComplete` and `tasksToDuplicate`; modify `handleBulkComplete` to open dialog instead of immediate execution; implement `handleDuplicate`; implement `handleBulkDuplicateClick` and `handleBulkDuplicateConfirm`; render `ConfirmDialog` for Bulk Complete and Bulk Duplicate; pass `onDuplicate` and `onBulkDuplicate` to `TaskTable` and `TaskList`.

## Test Plan
- Type Checking: Ensure all prop updates match interfaces.
- Logic Verification: Confirm duplication copies valid fields and resets status/ID; confirm bulk complete uses a dialog; confirm bulk delete dialog still present; confirm bulk duplicate dialog works; confirm single delete dialog still present; confirm single duplicate executes immediately.
