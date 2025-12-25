import { render, screen } from '../../test/utils';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    // Mantine Loader renders as a span with specific class
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<LoadingSpinner size={100} />);
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(<LoadingSpinner message="Loading tasks..." />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('renders fullscreen variant', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('renders fullscreen with message', () => {
    render(<LoadingSpinner fullScreen message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders inline variant', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });
});
