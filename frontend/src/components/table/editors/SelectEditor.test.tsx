/**
 * Tests for SelectEditor component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../../../test/utils';
import { SelectEditor } from './SelectEditor';

// Sample options for testing
const TEST_OPTIONS = ['Option A', 'Option B', 'Option C'] as const;
type TestOption = (typeof TEST_OPTIONS)[number];

const TEST_LABELS: Record<TestOption, string> = {
  'Option A': 'First Option',
  'Option B': 'Second Option',
  'Option C': 'Third Option',
};

const TEST_EMOJIS: Record<TestOption, string> = {
  'Option A': '🅰️',
  'Option B': '🅱️',
  'Option C': '©️',
};

describe('SelectEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    value: 'Option A' as TestOption,
    options: TEST_OPTIONS,
    onChange: mockOnChange,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  describe('rendering', () => {
    it('renders a select with the current value', () => {
      render(<SelectEditor {...defaultProps} />);
      const select = screen.getByTestId('select-editor');
      expect(select).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<SelectEditor {...defaultProps} />);

      // MUI Select opens a portal, so we need to look at the entire document
      TEST_OPTIONS.forEach((option) => {
        expect(screen.getByTestId(`option-${option}`)).toBeInTheDocument();
      });
    });

    it('renders options with labels when provided', () => {
      render(<SelectEditor {...defaultProps} labels={TEST_LABELS} />);

      const optionA = screen.getByTestId('option-Option A');
      expect(within(optionA).getByText('First Option')).toBeInTheDocument();
    });

    it('renders options with emojis when provided', () => {
      render(<SelectEditor {...defaultProps} emojis={TEST_EMOJIS} />);

      const optionA = screen.getByTestId('option-Option A');
      expect(optionA.textContent).toContain('🅰️');
    });

    it('renders options with both emojis and labels', () => {
      render(
        <SelectEditor
          {...defaultProps}
          labels={TEST_LABELS}
          emojis={TEST_EMOJIS}
        />
      );

      const optionB = screen.getByTestId('option-Option B');
      expect(optionB.textContent).toContain('🅱️');
      expect(optionB.textContent).toContain('Second Option');
    });

    it('uses option value as label when labels not provided', () => {
      render(<SelectEditor {...defaultProps} />);

      const optionC = screen.getByTestId('option-Option C');
      expect(optionC.textContent).toContain('Option C');
    });
  });

  describe('interaction', () => {
    it('calls onChange and onSave when option is selected', async () => {
      const { user } = render(<SelectEditor {...defaultProps} />);

      const optionB = screen.getByTestId('option-Option B');
      await user.click(optionB);

      expect(mockOnChange).toHaveBeenCalledWith('Option B');
      expect(mockOnSave).toHaveBeenCalled();
    });

    it('calls onClose when dropdown closes', async () => {
      const { user } = render(<SelectEditor {...defaultProps} />);

      // Press Escape to close the dropdown
      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('with different option types', () => {
    it('works with string enum values', () => {
      const priorityOptions = ['Trivial', 'Low', 'Medium', 'High'] as const;
      type Priority = (typeof priorityOptions)[number];

      render(
        <SelectEditor<Priority>
          value="Medium"
          options={priorityOptions}
          onChange={vi.fn()}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByTestId('option-Medium')).toBeInTheDocument();
      expect(screen.getByTestId('option-High')).toBeInTheDocument();
    });
  });
});
