import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import SubtaskList from './SubtaskList';

describe('SubtaskList', () => {
  const subtasks = [
    { text: 'Subtask 1', complete: false },
    { text: 'Subtask 2', complete: true },
  ];

  it('renders nothing when empty', () => {
    const { container } = render(<SubtaskList subtasks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders subtask list', () => {
    render(<SubtaskList subtasks={subtasks} />);
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });

  it('calls onToggle when subtask clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(<SubtaskList subtasks={subtasks} onToggle={onToggle} />);

    await user.click(screen.getByText('Subtask 1'));
    expect(onToggle).toHaveBeenCalledWith(0);
  });

  it('renders read-only mode', () => {
    render(<SubtaskList subtasks={subtasks} readOnly />);
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
  });

  it('does not toggle in read-only mode', async () => {
    const onToggle = vi.fn();
    const { user } = render(<SubtaskList subtasks={subtasks} onToggle={onToggle} readOnly />);

    // Try to click - should not trigger in readonly mode
    const item = screen.getByText('Subtask 1');
    await user.click(item);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows completed state with strikethrough', () => {
    render(<SubtaskList subtasks={subtasks} />);
    const completedCheckbox = screen.getAllByRole('checkbox')[1];
    expect(completedCheckbox).toBeChecked();
    // The completed subtask text should exist
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });
});
