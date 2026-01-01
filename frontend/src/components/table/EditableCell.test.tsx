/**
 * Tests for EditableCell component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { EditableCell } from './EditableCell';

describe('EditableCell', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  const defaultProps = {
    value: 'test-value',
    taskId: 'task-123',
    field: 'priority' as const,
    displayComponent: <span data-testid="display">Test Display</span>,
    renderEditor: vi.fn(({ value, onChange }) => (
      <input
        data-testid="editor-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )),
    onSave: mockOnSave,
  };

  describe('display mode', () => {
    it('renders display component when not editing', () => {
      render(<EditableCell {...defaultProps} />);
      expect(screen.getByTestId('display')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-input')).not.toBeInTheDocument();
    });

    it('has clickable styling', () => {
      render(<EditableCell {...defaultProps} />);
      const displayCell = screen.getByTestId('editable-cell-display');
      expect(displayCell).toHaveStyle({ cursor: 'pointer' });
    });

    it('does not have clickable styling when disabled', () => {
      render(<EditableCell {...defaultProps} disabled />);
      const displayCell = screen.getByTestId('editable-cell-display');
      expect(displayCell).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('edit mode', () => {
    it('switches to edit mode on click', async () => {
      const { user } = render(<EditableCell {...defaultProps} />);
      await user.click(screen.getByTestId('editable-cell-display'));

      expect(screen.getByTestId('editor-input')).toBeInTheDocument();
      expect(screen.queryByTestId('display')).not.toBeInTheDocument();
    });

    it('does not switch to edit mode when disabled', async () => {
      const { user } = render(<EditableCell {...defaultProps} disabled />);
      await user.click(screen.getByTestId('editable-cell-display'));

      expect(screen.queryByTestId('editor-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('display')).toBeInTheDocument();
    });

    it('initializes editor with current value', async () => {
      const { user } = render(<EditableCell {...defaultProps} value="initial" />);
      await user.click(screen.getByTestId('editable-cell-display'));

      expect(screen.getByTestId('editor-input')).toHaveValue('initial');
    });

    it('calls renderEditor with correct props', async () => {
      const { user } = render(<EditableCell {...defaultProps} />);
      await user.click(screen.getByTestId('editable-cell-display'));

      expect(defaultProps.renderEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'test-value',
          onChange: expect.any(Function),
          onClose: expect.any(Function),
          onSave: expect.any(Function),
        })
      );
    });
  });

  describe('saving', () => {
    it('calls onSave with taskId and updates when value changes', async () => {
      const { user } = render(<EditableCell {...defaultProps} />);

      // Click to enter edit mode
      await user.click(screen.getByTestId('editable-cell-display'));

      // Change the value
      await user.clear(screen.getByTestId('editor-input'));
      await user.type(screen.getByTestId('editor-input'), 'new-value');

      // Click away to trigger save
      await user.click(document.body);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('task-123', {
          priority: 'new-value',
        });
      });
    });

    it('does not call onSave when value is unchanged', async () => {
      const { user } = render(<EditableCell {...defaultProps} />);

      // Click to enter edit mode
      await user.click(screen.getByTestId('editable-cell-display'));

      // Click away without changing
      await user.click(document.body);

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('returns to display mode after save', async () => {
      const { user } = render(<EditableCell {...defaultProps} />);

      await user.click(screen.getByTestId('editable-cell-display'));
      await user.clear(screen.getByTestId('editor-input'));
      await user.type(screen.getByTestId('editor-input'), 'new-value');
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.getByTestId('display')).toBeInTheDocument();
      });
    });

    it('returns to display mode even if save fails', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

      const { user } = render(<EditableCell {...defaultProps} />);

      await user.click(screen.getByTestId('editable-cell-display'));
      await user.clear(screen.getByTestId('editor-input'));
      await user.type(screen.getByTestId('editor-input'), 'new-value');
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.getByTestId('display')).toBeInTheDocument();
      });
    });
  });

  describe('cancellation', () => {
    it('cancels when onClose is called', async () => {
      // Test that calling onClose from editor closes the edit mode
      let capturedOnClose: (() => void) | null = null;

      const propsWithOnClose = {
        ...defaultProps,
        renderEditor: vi.fn(({ value, onChange, onClose }) => {
          capturedOnClose = onClose;
          return (
            <input
              data-testid="editor-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          );
        }),
      };

      const { user } = render(<EditableCell {...propsWithOnClose} />);

      await user.click(screen.getByTestId('editable-cell-display'));
      expect(screen.getByTestId('editor-input')).toBeInTheDocument();

      // Simulate editor calling onClose (e.g., on Escape)
      capturedOnClose!();

      await waitFor(() => {
        expect(screen.getByTestId('display')).toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('reverts to original value on cancel', async () => {
      let capturedOnClose: (() => void) | null = null;

      const propsWithOnClose = {
        ...defaultProps,
        value: 'original',
        renderEditor: vi.fn(({ value, onChange, onClose }) => {
          capturedOnClose = onClose;
          return (
            <input
              data-testid="editor-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          );
        }),
      };

      const { user } = render(<EditableCell {...propsWithOnClose} />);

      await user.click(screen.getByTestId('editable-cell-display'));
      await user.clear(screen.getByTestId('editor-input'));
      await user.type(screen.getByTestId('editor-input'), 'changed');

      // Simulate editor calling onClose (e.g., on Escape)
      capturedOnClose!();

      // Wait for edit mode to close
      await waitFor(() => {
        expect(screen.getByTestId('editable-cell-display')).toBeInTheDocument();
      });

      // Re-enter edit mode to verify value was reverted
      await user.click(screen.getByTestId('editable-cell-display'));
      expect(screen.getByTestId('editor-input')).toHaveValue('original');
    });
  });

  describe('value synchronization', () => {
    it('updates pending value when prop value changes externally', async () => {
      let capturedOnClose: (() => void) | null = null;

      const propsWithOnClose = {
        ...defaultProps,
        value: 'initial',
        renderEditor: vi.fn(({ value, onChange, onClose }) => {
          capturedOnClose = onClose;
          return (
            <input
              data-testid="editor-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          );
        }),
      };

      const { rerender, user } = render(<EditableCell {...propsWithOnClose} />);

      // Verify initial state
      await user.click(screen.getByTestId('editable-cell-display'));
      expect(screen.getByTestId('editor-input')).toHaveValue('initial');

      // Cancel to exit edit mode
      capturedOnClose!();

      // Wait for edit mode to close
      await waitFor(() => {
        expect(screen.getByTestId('editable-cell-display')).toBeInTheDocument();
      });

      // Rerender with new value
      rerender(<EditableCell {...propsWithOnClose} value="updated" />);

      // Enter edit mode again
      await user.click(screen.getByTestId('editable-cell-display'));
      expect(screen.getByTestId('editor-input')).toHaveValue('updated');
    });
  });
});
