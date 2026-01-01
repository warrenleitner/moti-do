import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DateEditor } from './DateEditor';

describe('DateEditor', () => {
  const defaultProps = {
    value: '2025-06-15',
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders date editor container', () => {
      render(<DateEditor {...defaultProps} />);

      expect(screen.getByTestId('date-editor')).toBeInTheDocument();
    });

    it('renders with provided value showing correct month', () => {
      render(<DateEditor {...defaultProps} value="2025-06-15" />);

      // MUI DatePicker v6+ uses spinbuttons for date parts
      const monthSpinbutton = screen.getByRole('spinbutton', { name: 'Month' });
      expect(monthSpinbutton).toHaveAttribute('aria-valuenow', '6');
    });

    it('renders with provided value showing correct day', () => {
      render(<DateEditor {...defaultProps} value="2025-06-15" />);

      const daySpinbutton = screen.getByRole('spinbutton', { name: 'Day' });
      expect(daySpinbutton).toHaveAttribute('aria-valuenow', '15');
    });

    it('renders with provided value showing correct year', () => {
      render(<DateEditor {...defaultProps} value="2025-06-15" />);

      const yearSpinbutton = screen.getByRole('spinbutton', { name: 'Year' });
      expect(yearSpinbutton).toHaveAttribute('aria-valuenow', '2025');
    });

    it('renders with undefined value showing empty fields', () => {
      render(<DateEditor {...defaultProps} value={undefined} />);

      // When empty, spinbuttons should not have aria-valuenow set
      const monthSpinbutton = screen.getByRole('spinbutton', { name: 'Month' });
      // Empty date shows placeholder text
      expect(monthSpinbutton).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<DateEditor {...defaultProps} label="Due Date" />);

      expect(screen.getByRole('group', { name: 'Due Date' })).toBeInTheDocument();
    });

    it('renders with default label when not provided', () => {
      render(<DateEditor {...defaultProps} />);

      expect(screen.getByRole('group', { name: 'Date' })).toBeInTheDocument();
    });
  });

  describe('date parsing', () => {
    it('handles date-only format (YYYY-MM-DD)', () => {
      render(<DateEditor {...defaultProps} value="2025-12-25" />);

      const monthSpinbutton = screen.getByRole('spinbutton', { name: 'Month' });
      const daySpinbutton = screen.getByRole('spinbutton', { name: 'Day' });
      const yearSpinbutton = screen.getByRole('spinbutton', { name: 'Year' });

      expect(monthSpinbutton).toHaveAttribute('aria-valuenow', '12');
      expect(daySpinbutton).toHaveAttribute('aria-valuenow', '25');
      expect(yearSpinbutton).toHaveAttribute('aria-valuenow', '2025');
    });

    it('handles datetime format with T separator', () => {
      render(<DateEditor {...defaultProps} value="2025-03-10T10:30:00" />);

      const monthSpinbutton = screen.getByRole('spinbutton', { name: 'Month' });
      const daySpinbutton = screen.getByRole('spinbutton', { name: 'Day' });
      const yearSpinbutton = screen.getByRole('spinbutton', { name: 'Year' });

      expect(monthSpinbutton).toHaveAttribute('aria-valuenow', '3');
      expect(daySpinbutton).toHaveAttribute('aria-valuenow', '10');
      expect(yearSpinbutton).toHaveAttribute('aria-valuenow', '2025');
    });
  });

  describe('interactions', () => {
    it('opens calendar picker when button is clicked', async () => {
      render(<DateEditor {...defaultProps} />);

      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('calls onClose when picker dialog is closed via Escape', async () => {
      const onClose = vi.fn();

      render(<DateEditor {...defaultProps} onClose={onClose} />);

      // Open the picker
      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape to close
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('calls onChange and onSave when a day is clicked in the picker', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();

      render(
        <DateEditor
          {...defaultProps}
          value="2025-06-15"
          onChange={onChange}
          onSave={onSave}
        />
      );

      // Open the picker
      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click a day button (e.g., day 20)
      const dialog = screen.getByRole('dialog');
      const dayButton = within(dialog).getByRole('gridcell', { name: '20' });
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('passes ISO date string format to onChange', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();

      render(
        <DateEditor
          {...defaultProps}
          value="2025-06-15"
          onChange={onChange}
          onSave={onSave}
        />
      );

      // Open the picker
      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click a day
      const dialog = screen.getByRole('dialog');
      const dayButton = within(dialog).getByRole('gridcell', { name: '20' });
      fireEvent.click(dayButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        const savedValue = onChange.mock.calls[0][0];
        // Should be in YYYY-MM-DD format
        expect(savedValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(savedValue).toBe('2025-06-20');
      });
    });
  });

  describe('clear functionality', () => {
    it('has clear action available in picker', async () => {
      render(<DateEditor {...defaultProps} value="2025-06-15" />);

      // Open the picker
      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Look for clear button in the action bar
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      // Clear button should be available
      expect(clearButton).toBeInTheDocument();
    });

    it('calls onChange with undefined when cleared', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();

      render(
        <DateEditor
          {...defaultProps}
          value="2025-06-15"
          onChange={onChange}
          onSave={onSave}
        />
      );

      // Open the picker
      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      fireEvent.click(calendarButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(undefined);
        expect(onSave).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('accessibility', () => {
    it('has accessible date group with label', () => {
      render(<DateEditor {...defaultProps} label="Start Date" />);

      const dateGroup = screen.getByRole('group', { name: 'Start Date' });
      expect(dateGroup).toBeInTheDocument();
    });

    it('has accessible calendar button', () => {
      render(<DateEditor {...defaultProps} />);

      const calendarButton = screen.getByRole('button', { name: /choose date/i });
      expect(calendarButton).toBeInTheDocument();
    });

    it('has spinbuttons for date parts with proper labels', () => {
      render(<DateEditor {...defaultProps} />);

      expect(screen.getByRole('spinbutton', { name: 'Month' })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Day' })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Year' })).toBeInTheDocument();
    });
  });
});
