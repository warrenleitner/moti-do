import { render, screen } from '../../test/utils';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size={100} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(<LoadingSpinner message="Loading tasks..." />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('renders fullscreen variant', () => {
    render(<LoadingSpinner fullscreen />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders fullscreen with message', () => {
    render(<LoadingSpinner fullscreen message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders inline variant', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
