import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import TagChip from './TagChip';

describe('TagChip', () => {
  it('renders tag label', () => {
    render(<TagChip tag="urgent" />);
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    render(<TagChip tag="test" color="#ff0000" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders small size', () => {
    render(<TagChip tag="test" size="small" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders medium size', () => {
    render(<TagChip tag="test" size="medium" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(<TagChip tag="test" onClick={onClick} />);
    await user.click(screen.getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });

  it('calls onDelete when delete clicked', async () => {
    const onDelete = vi.fn();
    const { user } = render(<TagChip tag="test" onDelete={onDelete} />);
    await user.click(screen.getByTestId('CancelIcon'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('renders without onClick handler', () => {
    render(<TagChip tag="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders without onDelete handler', () => {
    render(<TagChip tag="test" />);
    expect(screen.queryByTestId('CancelIcon')).not.toBeInTheDocument();
  });
});
