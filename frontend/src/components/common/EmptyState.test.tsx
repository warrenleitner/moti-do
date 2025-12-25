import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<EmptyState title="No items" description="Add some items to get started" />);
    expect(screen.getByText('Add some items to get started')).toBeInTheDocument();
  });

  it('renders default icon when no custom icon provided', () => {
    const { container } = render(<EmptyState title="No items" />);
    // Tabler IconInbox renders as an SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    const customIcon = <div data-testid="custom-icon">Custom</div>;
    render(<EmptyState title="No items" icon={customIcon} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Add Item" onAction={onAction} />);
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('calls onAction when action button clicked', async () => {
    const onAction = vi.fn();
    const { user } = render(
      <EmptyState title="No items" actionLabel="Add Item" onAction={onAction} />
    );
    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('does not render action button without onAction', () => {
    render(<EmptyState title="No items" actionLabel="Add Item" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
