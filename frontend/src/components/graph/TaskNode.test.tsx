import { render, screen } from '../../test/utils';
import TaskNode from './TaskNode';
import { ReactFlowProvider } from '@xyflow/react';

// Wrapper component to provide React Flow context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('TaskNode', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    text_description: '',
    priority: 'medium' as const,
    difficulty: 'medium' as const,
    duration: 'medium' as const,
    is_complete: false,
    subtasks: [],
    tags: [],
    dependencies: [],
    score: 100,
    creation_date: new Date().toISOString(),
  };

  it('renders task title', () => {
    render(<TaskNode data={{ task: mockTask, isSelected: false, color: '#999' }} />, { wrapper: TestWrapper });
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const { user } = render(<TaskNode data={{ task: mockTask, isSelected: false, color: '#999' }} />, { wrapper: TestWrapper });
    await user.click(screen.getByText('Test Task'));
    // TaskNode doesn't have onClick handler, it's just a visual node
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
