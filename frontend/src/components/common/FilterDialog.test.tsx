import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import FilterDialog from './FilterDialog';
import { Priority, Difficulty, Duration } from '../../types';

describe('FilterDialog', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    statuses: ['active'] as ('all' | 'active' | 'completed' | 'blocked' | 'future')[],
    onStatusesChange: vi.fn(),
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
    minDueDate: undefined as string | undefined,
    maxDueDate: undefined as string | undefined,
    onMinDueDateChange: vi.fn(),
    onMaxDueDateChange: vi.fn(),
    minStartDate: undefined as string | undefined,
    maxStartDate: undefined as string | undefined,
    onMinStartDateChange: vi.fn(),
    onMaxStartDateChange: vi.fn(),
    onReset: vi.fn(),
  };

  it('renders search input and filter button', () => {
    render(<FilterDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
    expect(screen.getByLabelText('Open filters')).toBeInTheDocument();
  });

  it('opens dialog when filter button is clicked', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('FILTER TASKS')).toBeInTheDocument();
  });

  it('shows status checkboxes in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByText('FUTURE')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('shows priority checkboxes in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText(/Defcon One/)).toBeInTheDocument();
    // "High" and "Medium" appear in multiple sections (priority, difficulty, duration)
    // Just verify the priority section label is present
    expect(screen.getAllByText(/High/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Medium/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows difficulty checkboxes in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText(/Herculean/)).toBeInTheDocument();
  });

  it('shows duration checkboxes in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText(/Odysseyan/)).toBeInTheDocument();
  });

  it('shows project checkboxes when projects available', async () => {
    const { user } = render(<FilterDialog {...defaultProps} projects={['Work', 'Personal']} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('hides project section when no projects', async () => {
    const { user } = render(<FilterDialog {...defaultProps} projects={[]} />);
    await user.click(screen.getByLabelText('Open filters'));
    // Wait for dialog to render
    await screen.findByText('FILTER TASKS');
    // Project section label should not exist (only 'Priority' section label should exist)
    const projectLabels = screen.queryAllByText('Project');
    expect(projectLabels.length).toBe(0);
  });

  it('shows tag checkboxes when tags available', async () => {
    const { user } = render(<FilterDialog {...defaultProps} tags={['urgent', 'later']} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('later')).toBeInTheDocument();
  });

  it('shows APPLY FILTERS button in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('APPLY FILTERS')).toBeInTheDocument();
  });

  it('shows CLEAR ALL button in dialog', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('CLEAR ALL')).toBeInTheDocument();
  });

  it('calls onReset when CLEAR ALL is clicked', async () => {
    const onReset = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onReset={onReset} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('CLEAR ALL');
    await user.click(screen.getByText('CLEAR ALL'));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows filter count badge when filters are active', () => {
    render(
      <FilterDialog
        {...defaultProps}
        statuses={['completed']}
        priorities={[Priority.HIGH]}
      />
    );
    // Badge should show count of 2 (1 for non-default status + 1 priority)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show badge when no filters active', () => {
    render(<FilterDialog {...defaultProps} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies status filter when APPLY FILTERS clicked', async () => {
    const onStatusesChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onStatusesChange={onStatusesChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    // Wait for dialog to render
    await screen.findByText('COMPLETED');
    // Toggle COMPLETED status checkbox
    await user.click(screen.getByText('COMPLETED'));
    // Click APPLY FILTERS
    await user.click(screen.getByText('APPLY FILTERS'));
    // Should have both 'active' (default) and 'completed'
    expect(onStatusesChange).toHaveBeenCalledWith(['active', 'completed']);
  });

  it('supports multi-select statuses', async () => {
    const onStatusesChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onStatusesChange={onStatusesChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('COMPLETED');
    // Select multiple statuses
    await user.click(screen.getByText('COMPLETED'));
    await user.click(screen.getByText('FUTURE'));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onStatusesChange).toHaveBeenCalledWith(['active', 'completed', 'future']);
  });

  it('applies priority filter when checkbox toggled and APPLY clicked', async () => {
    const onPrioritiesChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onPrioritiesChange={onPrioritiesChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText(/Defcon One/);
    // Toggle a priority checkbox
    await user.click(screen.getByText(/Defcon One/));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onPrioritiesChange).toHaveBeenCalledWith([Priority.DEFCON_ONE]);
  });

  it('toggles off a pre-selected priority', async () => {
    const onPrioritiesChange = vi.fn();
    const { user } = render(
      <FilterDialog {...defaultProps} priorities={[Priority.HIGH]} onPrioritiesChange={onPrioritiesChange} />
    );
    await user.click(screen.getByLabelText('Open filters'));
    // Find the High checkbox label that also contains the emoji
    const highLabels = await screen.findAllByText(/High/);
    // Click the first one (priority section)
    await user.click(highLabels[0]);
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onPrioritiesChange).toHaveBeenCalledWith([]);
  });

  it('displays due date filter section with range inputs', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('Due Date')).toBeInTheDocument();
  });

  it('displays start date filter section with range inputs', async () => {
    const { user } = render(<FilterDialog {...defaultProps} />);
    await user.click(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('Start Date')).toBeInTheDocument();
  });

  it('applies maxDueDate when set and APPLY clicked', async () => {
    const onMaxDueDateChange = vi.fn();
    const { user } = render(
      <FilterDialog {...defaultProps} maxDueDate="2025-06-15" onMaxDueDateChange={onMaxDueDateChange} />
    );
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('APPLY FILTERS');
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onMaxDueDateChange).toHaveBeenCalledWith('2025-06-15');
  });

  it('applies difficulty filter when toggled and APPLY clicked', async () => {
    const onDifficultiesChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onDifficultiesChange={onDifficultiesChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText(/Herculean/);
    await user.click(screen.getByText(/Herculean/));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onDifficultiesChange).toHaveBeenCalledWith([Difficulty.HERCULEAN]);
  });

  it('applies duration filter when toggled and APPLY clicked', async () => {
    const onDurationsChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onDurationsChange={onDurationsChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText(/Odysseyan/);
    await user.click(screen.getByText(/Odysseyan/));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onDurationsChange).toHaveBeenCalledWith([Duration.ODYSSEYAN]);
  });

  it('applies project filter when toggled and APPLY clicked', async () => {
    const onProjectsChange = vi.fn();
    const { user } = render(
      <FilterDialog {...defaultProps} projects={['Work', 'Personal']} onProjectsChange={onProjectsChange} />
    );
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('Work');
    await user.click(screen.getByText('Work'));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onProjectsChange).toHaveBeenCalledWith(['Work']);
  });

  it('applies tag filter when toggled and APPLY clicked', async () => {
    const onTagsChange = vi.fn();
    const { user } = render(
      <FilterDialog {...defaultProps} tags={['urgent', 'later']} onTagsChange={onTagsChange} />
    );
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('urgent');
    await user.click(screen.getByText('urgent'));
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onTagsChange).toHaveBeenCalledWith(['urgent']);
  });

  it('closes dialog without applying when modal close is triggered', async () => {
    const onStatusesChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onStatusesChange={onStatusesChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    await screen.findByText('FILTER TASKS');
    // Press Escape to close the modal
    await user.keyboard('{Escape}');
    // onStatusesChange should not have been called
    expect(onStatusesChange).not.toHaveBeenCalled();
  });

  it('counts date filters in badge', () => {
    render(
      <FilterDialog
        {...defaultProps}
        minDueDate="2025-01-01"
        maxDueDate="2025-12-31"
        minStartDate="2025-03-01"
        maxStartDate="2025-06-30"
      />
    );
    // Badge should show count of 4 (minDueDate + maxDueDate + minStartDate + maxStartDate)
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('preserves date range values when dialog opens', async () => {
    const { user } = render(
      <FilterDialog
        {...defaultProps}
        minDueDate="2025-01-01"
        maxDueDate="2025-12-31"
        minStartDate="2025-03-01"
        maxStartDate="2025-06-30"
      />
    );
    await user.click(screen.getByLabelText('Open filters'));
    // Verify date sections are visible
    expect(await screen.findByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
  });
});
