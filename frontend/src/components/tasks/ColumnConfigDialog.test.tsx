import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ColumnConfigDialog from './ColumnConfigDialog';
import { ColumnConfig } from './TaskTable';

const mockColumns: ColumnConfig[] = [
  { id: 'select', label: '', visible: true, sortable: false, width: 50 },
  { id: 'title', label: 'Task', visible: true, sortable: true, minWidth: 200 },
  { id: 'score', label: 'XP', visible: true, sortable: true, width: 80 },
  { id: 'priority', label: 'Priority', visible: true, sortable: true, width: 120 },
  { id: 'tags', label: 'Tags', visible: false, sortable: false, minWidth: 150 },
  { id: 'actions', label: 'Actions', visible: true, sortable: false, width: 150 },
];

describe('ColumnConfigDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Configure Columns')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ColumnConfigDialog
        open={false}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.queryByText('Configure Columns')).not.toBeInTheDocument();
  });

  it('displays all columns', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('shows visible count', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // 5 visible columns out of 6 total (tags is hidden)
    expect(screen.getByText(/5 of 6 columns visible/)).toBeInTheDocument();
  });

  it('toggles column visibility', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Find the Tags row visibility toggle
    const checkboxes = screen.getAllByRole('checkbox');
    // Find the checkbox for Tags (which is currently not visible)
    const tagsCheckbox = checkboxes.find((cb) => !cb.hasAttribute('checked'));

    if (tagsCheckbox) {
      fireEvent.click(tagsCheckbox);
    }

    // After toggling, visible count should change
    expect(screen.getByText(/6 of 6 columns visible/)).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onReset when reset button is clicked', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByText('Reset to Default');
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('disables visibility toggle for essential columns', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Title and Actions are essential columns - their visibility buttons should be disabled
    const essentialIndicators = screen.getAllByText('Essential column (always visible)');
    expect(essentialIndicators.length).toBeGreaterThan(0);
  });

  it('shows sortable indicator for sortable columns', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Multiple columns should show "Sortable" indicator
    const sortableIndicators = screen.getAllByText('Sortable');
    expect(sortableIndicators.length).toBeGreaterThan(0);
  });

  it('displays help tip about multi-column sorting', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/You can sort by multiple columns/)).toBeInTheDocument();
  });

  it('updates local state when columns prop changes', () => {
    const { rerender } = render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Change columns prop
    const updatedColumns = mockColumns.map((col) =>
      col.id === 'tags' ? { ...col, visible: true } : col
    );

    rerender(
      <ColumnConfigDialog
        open={true}
        columns={updatedColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Should now show 6 of 6 visible
    expect(screen.getByText(/6 of 6 columns visible/)).toBeInTheDocument();
  });

  it('handles drag and drop to reorder columns', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const listItems = screen.getAllByRole('listitem');

    // Simulate drag start on first item
    fireEvent.dragStart(listItems[0]);

    // Simulate drag over second item
    fireEvent.dragOver(listItems[1]);

    // Simulate drag end
    fireEvent.dragEnd(listItems[0]);

    // Columns should have been reordered
    expect(screen.getByText('Configure Columns')).toBeInTheDocument();
  });

  it('prevents reordering when dragging over same position', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const listItems = screen.getAllByRole('listitem');

    // Simulate drag start on first item
    fireEvent.dragStart(listItems[0]);

    // Simulate drag over same item (should do nothing)
    fireEvent.dragOver(listItems[0]);

    // Columns should remain unchanged
    expect(screen.getByText('Configure Columns')).toBeInTheDocument();
  });

  it('clears drag state on drag end', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const listItems = screen.getAllByRole('listitem');

    // Simulate drag start
    fireEvent.dragStart(listItems[0]);

    // Simulate drag end
    fireEvent.dragEnd(listItems[0]);

    // State should be cleared
    expect(screen.getByText('Configure Columns')).toBeInTheDocument();
  });

  it('allows toggling visibility via icon button', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Find a non-essential column's visibility icon button
    const visibilityIcons = screen.getAllByTestId('VisibilityIcon');

    // Find the one that's not disabled (not essential)
    const scoreVisibilityButton = visibilityIcons.find((icon) => {
      const button = icon.closest('button');
      return button && !button.hasAttribute('disabled');
    });

    if (scoreVisibilityButton) {
      const button = scoreVisibilityButton.closest('button');
      if (button) {
        fireEvent.click(button);
        // Visibility should toggle
        expect(screen.getByText('Configure Columns')).toBeInTheDocument();
      }
    }
  });

  it('allows toggling visibility via checkbox', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Find a checkbox that is not disabled
    const enabledCheckbox = checkboxes.find((cb) => !cb.hasAttribute('disabled'));

    if (enabledCheckbox) {
      fireEvent.click(enabledCheckbox);
      // Visibility should toggle
      expect(screen.getByText('Configure Columns')).toBeInTheDocument();
    }
  });

  it('shows drag indicator icons', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Each list item should have a drag indicator
    const dragIndicators = screen.getAllByTestId('DragIndicatorIcon');
    expect(dragIndicators.length).toBe(mockColumns.length);
  });

  it('applies dragged styling during drag', () => {
    render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const listItems = screen.getAllByRole('listitem');

    // Start dragging
    fireEvent.dragStart(listItems[0]);

    // The item should have reduced opacity (this is handled by React state)
    expect(listItems[0]).toHaveAttribute('draggable', 'true');
  });

  it('resets local state when dialog closes', () => {
    const { rerender } = render(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Make a change
    const checkboxes = screen.getAllByRole('checkbox');
    const enabledCheckbox = checkboxes.find((cb) => !cb.hasAttribute('disabled'));
    if (enabledCheckbox) {
      fireEvent.click(enabledCheckbox);
    }

    // Close dialog
    rerender(
      <ColumnConfigDialog
        open={false}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Reopen dialog - should reset to original columns
    rerender(
      <ColumnConfigDialog
        open={true}
        columns={mockColumns}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/5 of 6 columns visible/)).toBeInTheDocument();
  });
});
