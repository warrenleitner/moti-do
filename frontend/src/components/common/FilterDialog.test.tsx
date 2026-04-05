import { render, screen, waitFor } from '../../test/utils';
import { vi } from 'vitest';
import FilterDialog from './FilterDialog';
import { Priority, Difficulty, Duration } from '../../types';

describe('FilterDialog', () => {
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

  it('shows status tabs in dialog', async () => {
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
        priorities={[Priority.HIGH]}
        difficulties={[Difficulty.HIGH]}
      />
    );
    // Badge should show count of 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show badge when no filters active', () => {
    render(<FilterDialog {...defaultProps} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies status filter when APPLY FILTERS clicked', async () => {
    const onStatusChange = vi.fn();
    const { user } = render(<FilterDialog {...defaultProps} onStatusChange={onStatusChange} />);
    await user.click(screen.getByLabelText('Open filters'));
    // Wait for dialog to render
    await screen.findByText('COMPLETED');
    // Click on COMPLETED status tab
    await user.click(screen.getByText('COMPLETED'));
    // Click APPLY FILTERS
    await user.click(screen.getByText('APPLY FILTERS'));
    expect(onStatusChange).toHaveBeenCalledWith('completed');
  });
});
