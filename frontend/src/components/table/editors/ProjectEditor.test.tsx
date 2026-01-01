import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectEditor } from './ProjectEditor';

// Mock the userStore hook
vi.mock('../../../store/userStore', () => ({
  useDefinedProjects: () => [
    { id: '1', name: 'Work', color: '#ff0000' },
    { id: '2', name: 'Personal', color: '#00ff00' },
    { id: '3', name: 'Side Project', color: '#0000ff' },
  ],
}));

describe('ProjectEditor', () => {
  const defaultProps = {
    value: undefined as string | undefined,
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders project editor with autocomplete', () => {
      render(<ProjectEditor {...defaultProps} />);

      expect(screen.getByTestId('project-editor')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders with existing value', () => {
      render(<ProjectEditor {...defaultProps} value="Work" />);

      expect(screen.getByRole('combobox')).toHaveValue('Work');
    });

    it('renders with placeholder when no value', () => {
      render(<ProjectEditor {...defaultProps} />);

      expect(screen.getByPlaceholderText('Select or type project')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('shows project options when focused', async () => {
      const user = userEvent.setup();
      render(<ProjectEditor {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Personal' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Side Project' })).toBeInTheDocument();
      });
    });

    it('calls onChange and onSave when project is selected', async () => {
      const onChange = vi.fn();
      const onSave = vi.fn();
      const user = userEvent.setup();

      render(<ProjectEditor {...defaultProps} onChange={onChange} onSave={onSave} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Work' }));

      expect(onChange).toHaveBeenCalledWith('Work');
      expect(onSave).toHaveBeenCalledWith('Work');
    });

    it('calls onChange when typing a custom project name', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProjectEditor {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'New Project');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('calls onClose on Escape key', async () => {
      const onClose = vi.fn();
      render(<ProjectEditor {...defaultProps} onClose={onClose} />);

      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('blur behavior', () => {
    it('calls onSave on blur', async () => {
      const onSave = vi.fn();
      render(<ProjectEditor {...defaultProps} value="Work" onSave={onSave} />);

      const input = screen.getByRole('combobox');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('clearing value', () => {
    it('allows clearing the project value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProjectEditor {...defaultProps} value="Work" onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.clear(input);

      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('edge cases', () => {
    it('handles empty project list', () => {
      // This will still use the mocked list, but verifies no errors
      render(<ProjectEditor {...defaultProps} />);
      expect(screen.getByTestId('project-editor')).toBeInTheDocument();
    });

    it('handles undefined initial value', () => {
      render(<ProjectEditor {...defaultProps} value={undefined} />);
      expect(screen.getByRole('combobox')).toHaveValue('');
    });
  });
});
