import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagsEditor } from './TagsEditor';

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
      expect(screen.getByRole('combobox')).toBeInTheDocument();
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
    it('shows tag options when focused', async () => {
      const user = userEvent.setup();
      render(<TagsEditor {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'urgent' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'important' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'work' })).toBeInTheDocument();
      });
    });

    it('calls onChange and onSave when tag is selected', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();
      const user = userEvent.setup();

      render(<TagsEditor {...defaultProps} onChange={onChange} onSave={onSave} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'urgent' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'urgent' }));

      expect(onChange).toHaveBeenCalledWith(['urgent']);
      expect(onSave).toHaveBeenCalledWith(['urgent']);
    });

    it('can select multiple tags', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();
      const user = userEvent.setup();

      render(<TagsEditor {...defaultProps} value={['urgent']} onChange={onChange} onSave={onSave} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'work' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'work' }));

      expect(onChange).toHaveBeenCalledWith(['urgent', 'work']);
      expect(onSave).toHaveBeenCalledWith(['urgent', 'work']);
    });
  });

  describe('keyboard interactions', () => {
    it('calls onClose on Escape key', async () => {
      const onClose = vi.fn();
      render(<TagsEditor {...defaultProps} onClose={onClose} />);

      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('blur behavior', () => {
    it('calls onSave on blur', async () => {
      const onSave = vi.fn();
      render(<TagsEditor {...defaultProps} value={['urgent']} onSave={onSave} />);

      const input = screen.getByRole('combobox');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('removing tags', () => {
    it('displays chips for each tag with delete buttons', () => {
      render(<TagsEditor {...defaultProps} value={['urgent', 'work']} />);

      const chips = screen.getAllByRole('button');
      // Each chip has a delete button
      expect(chips.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty initial value', () => {
      render(<TagsEditor {...defaultProps} value={[]} />);
      expect(screen.getByTestId('tags-editor')).toBeInTheDocument();
    });
  });
});
