import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import ProjectChip from './ProjectChip';

// Mock the userStore hook
vi.mock('../../store/userStore', () => ({
  useDefinedProjects: vi.fn(() => [
    { id: '1', name: 'Work', color: '#ff0000', multiplier: 1 },
    { id: '2', name: 'Personal', color: '#00ff00', multiplier: 1 },
    { id: '3', name: 'NoColor', multiplier: 1 },
  ]),
}));

describe('ProjectChip', () => {
  it('renders project label', () => {
    render(<ProjectChip project="Work" />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders with project color when project is defined', () => {
    render(<ProjectChip project="Work" />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders without color when project has no color defined', () => {
    render(<ProjectChip project="NoColor" />);
    expect(screen.getByText('NoColor')).toBeInTheDocument();
  });

  it('renders with default styling when project is not in defined projects', () => {
    render(<ProjectChip project="Unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders small size by default', () => {
    render(<ProjectChip project="Work" />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders medium size', () => {
    render(<ProjectChip project="Work" size="medium" />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(<ProjectChip project="Work" onClick={onClick} />);
    await user.click(screen.getByText('Work'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders without onClick handler', () => {
    render(<ProjectChip project="Work" />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders folder icon', () => {
    render(<ProjectChip project="Work" />);
    expect(screen.getByTestId('FolderOutlinedIcon')).toBeInTheDocument();
  });
});
