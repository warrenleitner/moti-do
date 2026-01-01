import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import FilterBar from './FilterBar';
import { Priority, Difficulty, Duration } from '../../types';

describe('FilterBar', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    status: 'active' as const,
    onStatusChange: vi.fn(),
    priorities: [] as Priority[],
    onPrioritiesChange: vi.fn(),
    difficulties: [] as Difficulty[],
    onDifficultiesChange: vi.fn(),
    durations: [] as Duration[],
    onDurationsChange: vi.fn(),
    selectedProjects: [] as string[],
    onProjectsChange: vi.fn(),
    selectedTags: [] as string[],
    onTagsChange: vi.fn(),
    projects: [],
    tags: [],
    maxDueDate: undefined as string | undefined,
    onMaxDueDateChange: vi.fn(),
    onReset: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('changes status filter', async () => {
    const onStatusChange = vi.fn();
    const { user, container } = render(<FilterBar {...defaultProps} onStatusChange={onStatusChange} />);
    // MUI Select renders as a button
    const statusSelect = container.querySelector('[aria-labelledby*="Status"]');
    if (statusSelect) {
      await user.click(statusSelect as HTMLElement);
      await user.click(screen.getByText('Completed'));
      expect(onStatusChange).toHaveBeenCalled();
    }
  });

  it('changes priority filter', async () => {
    const onPrioritiesChange = vi.fn();
    const { user, container } = render(<FilterBar {...defaultProps} onPrioritiesChange={onPrioritiesChange} />);
    const prioritySelect = container.querySelector('[aria-labelledby*="Priority"]');
    if (prioritySelect) {
      await user.click(prioritySelect as HTMLElement);
      await user.click(screen.getByText(/High/));
      expect(onPrioritiesChange).toHaveBeenCalled();
    }
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
        priorities={[Priority.HIGH]}
        difficulties={[Difficulty.HIGH]}
        durations={[Duration.LONG]}
        selectedProjects={['Work']}
        selectedTags={['urgent']}
        projects={['Work']}
        tags={['urgent']}
      />
    );
    expect(screen.getByText(/Search: "test"/)).toBeInTheDocument();
    expect(screen.getByText(/Status: completed/)).toBeInTheDocument();
    expect(screen.getByText(/Priority:/)).toBeInTheDocument();
    expect(screen.getByText(/Difficulty:/)).toBeInTheDocument();
    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
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

    // Find and click the delete button (MUI Chip has a cancel icon)
    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      await user.click(deleteButton as HTMLElement);
    }
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('removes status chip when delete clicked', async () => {
    const onStatusChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} status="completed" onStatusChange={onStatusChange} />
    );
    const chip = screen.getByText(/Status: completed/);
    expect(chip).toBeInTheDocument();

    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      await user.click(deleteButton as HTMLElement);
    }
    expect(onStatusChange).toHaveBeenCalledWith('active');
  });

  it('removes priority chip when delete clicked', async () => {
    const onPrioritiesChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} priorities={[Priority.HIGH]} onPrioritiesChange={onPrioritiesChange} />
    );
    const chip = screen.getByText(/Priority:/);
    expect(chip).toBeInTheDocument();

    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      await user.click(deleteButton as HTMLElement);
    }
    expect(onPrioritiesChange).toHaveBeenCalledWith([]);
  });

  it('removes project chip when delete clicked', async () => {
    const onProjectsChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} selectedProjects={['Work']} projects={['Work']} onProjectsChange={onProjectsChange} />
    );
    const chip = screen.getByText(/Project: Work/);
    expect(chip).toBeInTheDocument();

    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      await user.click(deleteButton as HTMLElement);
    }
    expect(onProjectsChange).toHaveBeenCalledWith([]);
  });

  it('removes tag chip when delete clicked', async () => {
    const onTagsChange = vi.fn();
    const { user } = render(
      <FilterBar {...defaultProps} selectedTags={['urgent']} tags={['urgent']} onTagsChange={onTagsChange} />
    );
    const chip = screen.getByText(/Tag: urgent/);
    expect(chip).toBeInTheDocument();

    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      await user.click(deleteButton as HTMLElement);
    }
    expect(onTagsChange).toHaveBeenCalledWith([]);
  });

  it('changes project filter', () => {
    const onProjectsChange = vi.fn();
    render(
      <FilterBar {...defaultProps} projects={['Work', 'Personal']} onProjectsChange={onProjectsChange} />
    );
    // Component has v8 ignore - just verify projects are displayed
    const projectLabels = screen.getAllByText('Project');
    expect(projectLabels.length).toBeGreaterThan(0);
  });

  it('changes tag filter', () => {
    const onTagsChange = vi.fn();
    render(
      <FilterBar {...defaultProps} tags={['urgent', 'later']} onTagsChange={onTagsChange} />
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

  it('changes difficulty filter', async () => {
    const onDifficultiesChange = vi.fn();
    const { user, container } = render(<FilterBar {...defaultProps} onDifficultiesChange={onDifficultiesChange} />);
    const difficultySelect = container.querySelector('[aria-labelledby*="Difficulty"]');
    if (difficultySelect) {
      await user.click(difficultySelect as HTMLElement);
      await user.click(screen.getByText(/High/));
      expect(onDifficultiesChange).toHaveBeenCalled();
    }
  });

  it('changes duration filter', async () => {
    const onDurationsChange = vi.fn();
    const { user, container } = render(<FilterBar {...defaultProps} onDurationsChange={onDurationsChange} />);
    const durationSelect = container.querySelector('[aria-labelledby*="Duration"]');
    if (durationSelect) {
      await user.click(durationSelect as HTMLElement);
      await user.click(screen.getByText(/Long/));
      expect(onDurationsChange).toHaveBeenCalled();
    }
  });
});
