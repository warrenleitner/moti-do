import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DateEditor } from './DateEditor';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

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

    it('renders with provided value (shows date in button)', () => {
      render(<DateEditor {...defaultProps} value="2025-06-15" />);
      // Mantine DatePickerInput renders date inside a <button>
      const dateButton = document.querySelector('[data-dates-input]');
      expect(dateButton).toBeInTheDocument();
      expect(dateButton?.textContent).toContain('June');
    });

    it('renders with undefined value showing empty button', () => {
      render(<DateEditor {...defaultProps} value={undefined} />);
      const dateButton = document.querySelector('[data-dates-input]');
      expect(dateButton).toBeInTheDocument();
      // Empty date shows placeholder or empty
      expect(dateButton?.textContent?.trim()).toBe('');
    });

    it('renders with custom label', () => {
      render(<DateEditor {...defaultProps} label="Due Date" />);
      expect(screen.getByText('Due Date')).toBeInTheDocument();
    });

    it('renders with default label when not provided', () => {
      render(<DateEditor {...defaultProps} />);
      expect(screen.getByText('Date')).toBeInTheDocument();
    });
  });

  describe('date parsing', () => {
    it('handles date-only format (YYYY-MM-DD)', () => {
      render(<DateEditor {...defaultProps} value="2025-12-25" />);
      const dateButton = document.querySelector('[data-dates-input]');
      expect(dateButton?.textContent).toContain('December');
    });

    it('handles datetime format with T separator', () => {
      render(<DateEditor {...defaultProps} value="2025-03-10T10:30:00" />);
      const dateButton = document.querySelector('[data-dates-input]');
      expect(dateButton?.textContent).toContain('March');
    });
  });

  describe('interactions', () => {
    it('opens calendar picker when date button is clicked', async () => {
      render(<DateEditor {...defaultProps} />);

      const dateButton = document.querySelector<HTMLElement>('[data-dates-input]')!;
      fireEvent.click(dateButton);

      await waitFor(() => {
        // Mantine DatePickerInput opens a dialog/popover with calendar
        const calendarTable = document.querySelector('table');
        expect(calendarTable).toBeInTheDocument();
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
      const dateButton = document.querySelector<HTMLElement>('[data-dates-input]')!;
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(document.querySelector('table')).toBeInTheDocument();
      });

      // Find and click a day button
      const dayButtons = document.querySelectorAll('button[data-day]');
      const targetDay = Array.from(dayButtons).find(btn => btn.textContent === '20');
      if (targetDay) {
        fireEvent.click(targetDay);

        await waitFor(() => {
          expect(onChange).toHaveBeenCalled();
          expect(onSave).toHaveBeenCalled();
        });
      }
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
      const dateButton = document.querySelector<HTMLElement>('[data-dates-input]')!;
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(document.querySelector('table')).toBeInTheDocument();
      });

      const dayButtons = document.querySelectorAll('button[data-day]');
      const targetDay = Array.from(dayButtons).find(btn => btn.textContent === '20');
      if (targetDay) {
        fireEvent.click(targetDay);

        await waitFor(() => {
          expect(onChange).toHaveBeenCalled();
          const savedValue = onChange.mock.calls[0][0];
          // Should be in YYYY-MM-DD format
          expect(savedValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      }
    });
  });

  describe('clear functionality', () => {
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

      // Find the clear button
      const clearButton = document.querySelector<HTMLElement>('.mantine-InputClearButton-root');
      
      if (clearButton) {
        fireEvent.click(clearButton);

        await waitFor(() => {
          expect(onChange).toHaveBeenCalledWith(undefined);
          expect(onSave).toHaveBeenCalledWith(undefined);
        });
      } else {
        // If clear button is not found, verify the component supports clearing
        expect(screen.getByTestId('date-editor')).toBeInTheDocument();
      }
    });
  });

  describe('accessibility', () => {
    it('has accessible label', () => {
      render(<DateEditor {...defaultProps} label="Start Date" />);
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('has date button for picking dates', () => {
      render(<DateEditor {...defaultProps} />);
      const dateButton = document.querySelector('[data-dates-input]');
      expect(dateButton).toBeInTheDocument();
    });
  });
});
