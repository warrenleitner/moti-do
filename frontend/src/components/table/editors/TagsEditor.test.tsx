import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagsEditor } from './TagsEditor';

// Mock scrollIntoView for jsdom (Mantine Combobox uses it)
Element.prototype.scrollIntoView = vi.fn();

// Mock the userStore hook
vi.mock('../../../store/userStore', () => ({
  useDefinedTags: () => [
    { id: '1', name: 'urgent', color: '#ff0000' },
    { id: '2', name: 'important', color: '#00ff00' },
    { id: '3', name: 'work', color: '#0000ff' },
  ],
}));

describe('TagsEditor', () => {
  const defaultProps = {
    value: [] as string[],
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders tags editor with autocomplete', () => {
      render(<TagsEditor {...defaultProps} />);

      expect(screen.getByTestId('tags-editor')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with existing tags', () => {
      render(<TagsEditor {...defaultProps} value={['urgent', 'work']} />);

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('renders with placeholder when no tags', () => {
      render(<TagsEditor {...defaultProps} />);

      expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument();
    });

    it('does not show placeholder when tags exist', () => {
      render(<TagsEditor {...defaultProps} value={['urgent']} />);

      expect(screen.queryByPlaceholderText('Add tags...')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('shows tag options when typing', async () => {
      const user = userEvent.setup();
      render(<TagsEditor {...defaultProps} />);

      const input = screen.getByRole('textbox');
      // Mantine TagsInput renders options in DOM (may be hidden in jsdom)
      await user.type(input, 'u');

      await waitFor(() => {
        const options = document.querySelectorAll('[role="option"]');
        expect(options.length).toBeGreaterThan(0);
      });
    });

    it('calls onChange and onSave when tag is selected', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();
      const user = userEvent.setup();

      render(<TagsEditor {...defaultProps} onChange={onChange} onSave={onSave} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'u');

      await waitFor(() => {
        const option = document.querySelector('[role="option"]');
        expect(option).not.toBeNull();
      });

      const option = document.querySelector('[role="option"]') as HTMLElement;
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith(['urgent']);
      expect(onSave).toHaveBeenCalledWith(['urgent']);
    });

    it('can select multiple tags', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();
      const user = userEvent.setup();

      render(<TagsEditor {...defaultProps} value={['urgent']} onChange={onChange} onSave={onSave} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'w');

      await waitFor(() => {
        const option = document.querySelector('[role="option"]');
        expect(option).not.toBeNull();
      });

      const option = document.querySelector('[role="option"]') as HTMLElement;
      await user.click(option);

      expect(onChange).toHaveBeenCalledWith(['urgent', 'work']);
      expect(onSave).toHaveBeenCalledWith(['urgent', 'work']);
    });
  });

  describe('keyboard interactions', () => {
    it('calls onClose on Escape key', async () => {
      const onClose = vi.fn();
      render(<TagsEditor {...defaultProps} onClose={onClose} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('blur behavior', () => {
    it('calls onSave on blur', async () => {
      const onSave = vi.fn();
      render(<TagsEditor {...defaultProps} value={['urgent']} onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('removing tags', () => {
    it('displays pills for each tag', () => {
      render(<TagsEditor {...defaultProps} value={['urgent', 'work']} />);

      // Each tag should be rendered as text
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty initial value', () => {
      render(<TagsEditor {...defaultProps} value={[]} />);
      expect(screen.getByTestId('tags-editor')).toBeInTheDocument();
    });
  });
});
