import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEditor } from './TextEditor';

describe('TextEditor', () => {
  const defaultProps = {
    value: 'Test value',
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders text input with value', () => {
      render(<TextEditor {...defaultProps} />);

      const input = screen.getByTestId('text-editor');
      expect(input).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test value')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<TextEditor {...defaultProps} value="" placeholder="Enter text..." />);

      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('auto-focuses the input on mount', async () => {
      render(<TextEditor {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe('interactions', () => {
    it('calls onChange when typing', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<TextEditor {...defaultProps} value="" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'New text');

      expect(onChange).toHaveBeenCalled();
    });

    it('calls onSave with trimmed value on Enter', async () => {
      const onSave = vi.fn();

      render(<TextEditor {...defaultProps} value="Original" onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '  New value  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('New value');
      });
    });

    it('calls onClose on Escape without saving', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(<TextEditor {...defaultProps} onSave={onSave} onClose={onClose} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onClose without saving when value unchanged', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <TextEditor
          {...defaultProps}
          value="Same value"
          onSave={onSave}
          onClose={onClose}
        />
      );

      const input = screen.getByRole('textbox');
      // Press Enter without changing the value
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    it('saves on blur', async () => {
      const onSave = vi.fn();

      render(<TextEditor {...defaultProps} value="Original" onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Changed value' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Changed value');
      });
    });
  });

  describe('validation', () => {
    it('shows error when required field is empty', async () => {
      const onSave = vi.fn();

      render(
        <TextEditor {...defaultProps} value="" required onSave={onSave} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    it('shows error when value is below minLength', async () => {
      const onSave = vi.fn();

      render(
        <TextEditor {...defaultProps} value="ab" minLength={3} onSave={onSave} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Minimum 3 characters required')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
      });
    });

    it('clears error when user types valid value', async () => {
      const user = userEvent.setup();

      render(<TextEditor {...defaultProps} value="" required />);

      const input = screen.getByRole('textbox');
      // Trigger validation error
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      // Type valid value
      await user.type(input, 'Valid text');

      await waitFor(() => {
        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
      });
    });

    it('treats whitespace-only as empty for required validation', async () => {
      const onSave = vi.fn();

      render(
        <TextEditor {...defaultProps} value="   " required onSave={onSave} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty initial value', () => {
      render(<TextEditor {...defaultProps} value="" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles very long text', async () => {
      const longText = 'A'.repeat(500);
      const onChange = vi.fn();

      render(<TextEditor {...defaultProps} value="" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: longText } });

      expect(onChange).toHaveBeenCalledWith(longText);
    });

    it('handles special characters', async () => {
      const onSave = vi.fn();
      const specialText = '<script>alert("xss")</script> & "quotes" \'single\'';

      render(<TextEditor {...defaultProps} value="" onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: specialText } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(specialText);
      });
    });
  });
});
