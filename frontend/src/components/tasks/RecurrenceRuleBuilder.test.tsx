/**
 * Tests for RecurrenceRuleBuilder component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import RecurrenceRuleBuilder from './RecurrenceRuleBuilder';

describe('RecurrenceRuleBuilder', () => {
  // Helper to get the interval input (first textbox, which is the NumberInput)
  const getIntervalInput = () => screen.getAllByRole('textbox')[0];

  describe('rendering', () => {
    it('renders with default daily pattern', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="" onChange={onChange} />);

      expect(screen.getByText('Every')).toBeInTheDocument();
      // First textbox is the NumberInput (interval)
      const intervalInput = getIntervalInput();
      expect(intervalInput).toHaveValue('1');
      expect(screen.getByText('Every day')).toBeInTheDocument();
    });

    it('renders with existing daily pattern', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY;INTERVAL=3" onChange={onChange} />);

      const intervalInput = getIntervalInput();
      expect(intervalInput).toHaveValue('3');
      expect(screen.getByText('Every 3 days')).toBeInTheDocument();
    });

    it('renders weekday toggles for weekly frequency', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY" onChange={onChange} />);

      expect(screen.getByText('On these days:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tue' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Wed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thu' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fri' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sat' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sun' })).toBeInTheDocument();
    });

    it('renders with selected weekdays', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY;BYDAY=MO,WE,FR" onChange={onChange} />);

      expect(screen.getByText('Every week on Mon, Wed, and Fri')).toBeInTheDocument();
    });

    it('renders monthly options for monthly frequency', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY" onChange={onChange} />);

      expect(screen.getByText('On day')).toBeInTheDocument();
      expect(screen.getByText('On the')).toBeInTheDocument();
    });

    it('renders disabled state', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} disabled />);

      // First textbox is the NumberInput (interval)
      const intervalInput = getIntervalInput();
      expect(intervalInput).toBeDisabled();
    });
  });

  describe('frequency changes', () => {
    // Note: Mantine Select dropdown interactions don't work reliably in JSDOM.
    // These interactions are covered by E2E tests (habits.spec.ts).
    // The component is marked with v8 ignore for coverage exclusion.
    it.skip('changes frequency to weekly', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} />);

      // Mantine Select dropdown doesn't open properly in JSDOM
      const frequencyInput = screen.getByDisplayValue('Day');
      await user.click(frequencyInput);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=WEEKLY');
      });
    });

    it.skip('changes frequency to monthly', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} />);

      const frequencyInput = screen.getByDisplayValue('Day');
      await user.click(frequencyInput);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.stringContaining('FREQ=MONTHLY'));
      });
    });

    it.skip('changes frequency to yearly', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} />);

      const frequencyInput = screen.getByDisplayValue('Day');
      await user.click(frequencyInput);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=YEARLY');
      });
    });
  });

  describe('interval changes', () => {
    it('changes interval value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} />);

      const intervalInput = getIntervalInput();
      // Triple-click to select all, then type new value
      await user.tripleClick(intervalInput);
      await user.keyboard('5');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=DAILY;INTERVAL=5');
      });
    });

    it('constrains interval to minimum 1', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY;INTERVAL=3" onChange={onChange} />);

      const intervalInput = getIntervalInput();
      await user.clear(intervalInput);
      await user.type(intervalInput, '0');

      await waitFor(() => {
        // Should constrain to 1
        expect(onChange).toHaveBeenCalledWith('FREQ=DAILY');
      });
    });
  });

  describe('weekly day selection', () => {
    it('toggles weekday selection on', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY" onChange={onChange} />);

      const mondayButton = screen.getByRole('button', { name: 'Mon' });
      await user.click(mondayButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=WEEKLY;BYDAY=MO');
      });
    });

    it('toggles multiple weekdays', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY;BYDAY=MO" onChange={onChange} />);

      const wednesdayButton = screen.getByRole('button', { name: 'Wed' });
      await user.click(wednesdayButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=WEEKLY;BYDAY=MO,WE');
      });
    });

    it('toggles weekday selection off', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY;BYDAY=MO,WE" onChange={onChange} />);

      const mondayButton = screen.getByRole('button', { name: 'Mon' });
      await user.click(mondayButton);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('FREQ=WEEKLY;BYDAY=WE');
      });
    });
  });

  describe('monthly mode', () => {
    it('selects day of month mode by default', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY" onChange={onChange} />);

      const dayOfMonthRadio = screen.getByRole('radio', { name: /on day/i });
      expect(dayOfMonthRadio).toBeChecked();
    });

    it('switches to weekday of month mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY;BYMONTHDAY=1" onChange={onChange} />);

      const weekdayRadio = screen.getByRole('radio', { name: /on the/i });
      await user.click(weekdayRadio);

      await waitFor(() => {
        // Should emit pattern with default weekday (1st Monday)
        expect(onChange).toHaveBeenCalledWith('FREQ=MONTHLY;BYDAY=1MO');
      });
    });

    it('renders with last day of month', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY;BYMONTHDAY=-1" onChange={onChange} />);

      expect(screen.getByText('Every month on the last day')).toBeInTheDocument();
    });

    it('renders with Nth weekday pattern', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY;BYDAY=2TU" onChange={onChange} />);

      expect(screen.getByText('Every month on the 2nd Tuesday')).toBeInTheDocument();
    });
  });

  describe('preview description', () => {
    it('shows daily description', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=DAILY" onChange={onChange} />);
      expect(screen.getByText('Every day')).toBeInTheDocument();
    });

    it('shows weekly with days description', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=WEEKLY;BYDAY=MO,WE,FR" onChange={onChange} />);
      expect(screen.getByText('Every week on Mon, Wed, and Fri')).toBeInTheDocument();
    });

    it('shows monthly day description', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=MONTHLY;BYMONTHDAY=15" onChange={onChange} />);
      expect(screen.getByText('Every month on the 15th')).toBeInTheDocument();
    });

    it('shows yearly description', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="FREQ=YEARLY" onChange={onChange} />);
      expect(screen.getByText('Every year')).toBeInTheDocument();
    });
  });

  describe('simple keyword parsing', () => {
    it('parses "daily" keyword', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="daily" onChange={onChange} />);
      expect(screen.getByText('Every day')).toBeInTheDocument();
    });

    it('parses "weekly" keyword', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="weekly" onChange={onChange} />);
      expect(screen.getByText('Every week')).toBeInTheDocument();
    });

    it('parses "every 3 days" format', () => {
      const onChange = vi.fn();
      render(<RecurrenceRuleBuilder value="every 3 days" onChange={onChange} />);
      expect(screen.getByText('Every 3 days')).toBeInTheDocument();
      // First textbox is the NumberInput (interval)
      const intervalInput = getIntervalInput();
      expect(intervalInput).toHaveValue('3');
    });
  });
});
