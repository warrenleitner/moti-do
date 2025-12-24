import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import SearchInput from './SearchInput';

describe('SearchInput', () => {
  it('renders with default placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Search tasks" />);
    expect(screen.getByPlaceholderText('Search tasks')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<SearchInput value="test query" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when input changes', async () => {
    const onChange = vi.fn();
    const { user } = render(<SearchInput value="" onChange={onChange} debounceMs={0} />);
    await user.type(screen.getByRole('textbox'), 'new');
    // Wait for debounce to complete
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('clears input when clear button clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<SearchInput value="test" onChange={onChange} />);
    const clearButton = screen.getByRole('button');
    await user.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows clear button only when value is not empty', () => {
    const { rerender } = render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
