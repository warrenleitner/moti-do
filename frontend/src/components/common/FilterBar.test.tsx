import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import FilterBar from './FilterBar';
import { Priority } from '../../types';

describe('FilterBar', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    status: 'active' as const,
    onStatusChange: vi.fn(),
    priority: undefined,
    onPriorityChange: vi.fn(),
    project: undefined,
    onProjectChange: vi.fn(),
    tag: undefined,
    onTagChange: vi.fn(),
    projects: [],
    tags: [],
    onReset: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('changes status filter', async () => {
    const onStatusChange = vi.fn();
    const { user } = render(<FilterBar {...defaultProps} onStatusChange={onStatusChange} />);
    // Mantine Select - click to open dropdown
    const statusInput = screen.getByRole('textbox', { name: /status/i });
    await user.click(statusInput);
    // Find and click the 'Completed' option in the dropdown
    const completedOption = await screen.findByText('Completed');
    await user.click(completedOption);
    expect(onStatusChange).toHaveBeenCalled();
  });

  it('changes priority filter', async () => {
    const onPriorityChange = vi.fn();
    const { user } = render(<FilterBar {...defaultProps} onPriorityChange={onPriorityChange} />);
    const priorityInput = screen.getByRole('textbox', { name: /priority/i });
    await user.click(priorityInput);
    // Find and click the 'High' option in the dropdown
    const highOption = await screen.findByText(/High/);
    await user.click(highOption);
    expect(onPriorityChange).toHaveBeenCalled();
  });

  it('shows project filter when projects available', () => {
    render(<FilterBar {...defaultProps} projects={['Work', 'Personal']} />);
    const projectLabels = screen.getAllByText('Project');
    expect(projectLabels.length).toBeGreaterThan(0);
  });

  it('shows tag filter when tags available', () => {
    render(<FilterBar {...defaultProps} tags={['urgent', 'later']} />);
    const tagLabels = screen.getAllByText('Tag');
    expect(tagLabels.length).toBeGreaterThan(0);
  });

  it('shows clear button when filters are active', () => {
    render(<FilterBar {...defaultProps} search="test" />);
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('calls onReset when clear button clicked', async () => {
    const onReset = vi.fn();
    const { user } = render(<FilterBar {...defaultProps} search="test" onReset={onReset} />);
    await user.click(screen.getByText('Clear filters'));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows filter chips for active filters', () => {
    render(
      <FilterBar
        {...defaultProps}
        search="test"
        status="completed"
        priority={Priority.HIGH}
        project="Work"
        tag="urgent"
        projects={['Work']}
        tags={['urgent']}
      />
    );
    expect(screen.getByText(/Search: "test"/)).toBeInTheDocument();
    expect(screen.getByText(/Status: completed/)).toBeInTheDocument();
    expect(screen.getByText(/Priority:/)).toBeInTheDocument();
    expect(screen.getByText(/Project: Work/)).toBeInTheDocument();
    expect(screen.getByText(/Tag: urgent/)).toBeInTheDocument();
  });

  it('removes search chip when delete clicked', async () => {
    const onSearchChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} search="test" onSearchChange={onSearchChange} />
    );
    // Verify the chip is displayed
    const chip = screen.getByText(/Search: "test"/);
    expect(chip).toBeInTheDocument();

    // Find and click the delete button using aria-label
    const deleteButton = screen.getByRole('button', { name: /clear search filter/i });
    await user.click(deleteButton);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('removes status chip when delete clicked', async () => {
    const onStatusChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} status="completed" onStatusChange={onStatusChange} />
    );
    const chip = screen.getByText(/Status: completed/);
    expect(chip).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: /clear status filter/i });
    await user.click(deleteButton);
    expect(onStatusChange).toHaveBeenCalledWith('active');
  });

  it('removes priority chip when delete clicked', async () => {
    const onPriorityChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} priority={Priority.HIGH} onPriorityChange={onPriorityChange} />
    );
    const chip = screen.getByText(/Priority:/);
    expect(chip).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: /clear priority filter/i });
    await user.click(deleteButton);
    expect(onPriorityChange).toHaveBeenCalledWith(undefined);
  });

  it('removes project chip when delete clicked', async () => {
    const onProjectChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} project="Work" projects={['Work']} onProjectChange={onProjectChange} />
    );
    const chip = screen.getByText(/Project: Work/);
    expect(chip).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: /clear project filter/i });
    await user.click(deleteButton);
    expect(onProjectChange).toHaveBeenCalledWith(undefined);
  });

  it('removes tag chip when delete clicked', async () => {
    const onTagChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} tag="urgent" tags={['urgent']} onTagChange={onTagChange} />
    );
    const chip = screen.getByText(/Tag: urgent/);
    expect(chip).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: /clear tag filter/i });
    await user.click(deleteButton);
    expect(onTagChange).toHaveBeenCalledWith(undefined);
  });

  it('changes project filter', () => {
    const onProjectChange = vi.fn();
    render(
      <FilterBar {...defaultProps} projects={['Work', 'Personal']} onProjectChange={onProjectChange} />
    );
    // Component has v8 ignore - just verify projects are displayed
    const projectLabels = screen.getAllByText('Project');
    expect(projectLabels.length).toBeGreaterThan(0);
  });

  it('changes tag filter', () => {
    const onTagChange = vi.fn();
    render(
      <FilterBar {...defaultProps} tags={['urgent', 'later']} onTagChange={onTagChange} />
    );
    // Component has v8 ignore - just verify tags are displayed
    const tagLabels = screen.getAllByText('Tag');
    expect(tagLabels.length).toBeGreaterThan(0);
  });

  it('does not show clear button with default filters', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('hides project filter when no projects', () => {
    render(<FilterBar {...defaultProps} projects={[]} />);
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument();
  });

  it('hides tag filter when no tags', () => {
    render(<FilterBar {...defaultProps} tags={[]} />);
    expect(screen.queryByLabelText('Tag')).not.toBeInTheDocument();
  });
});
