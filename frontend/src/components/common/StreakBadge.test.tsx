import { render, screen } from '../../test/utils';
import StreakBadge from './StreakBadge';

describe('StreakBadge', () => {
  it('renders current streak', () => {
    render(<StreakBadge current={5} best={10} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows best streak when current is less', () => {
    render(<StreakBadge current={5} best={10} />);
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('does not show best when current equals best', () => {
    render(<StreakBadge current={10} best={10} />);
    expect(screen.queryByText('/ 10')).not.toBeInTheDocument();
  });

  it('does not show best when showBest is false', () => {
    render(<StreakBadge current={5} best={10} showBest={false} />);
    expect(screen.queryByText('/ 10')).not.toBeInTheDocument();
  });

  it('handles zero streak', () => {
    render(<StreakBadge current={0} best={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles high streak values', () => {
    render(<StreakBadge current={30} best={50} />);
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders with different streak lengths for color coding', () => {
    const { rerender } = render(<StreakBadge current={2} best={10} />);
    expect(screen.getByText('2')).toBeInTheDocument();

    rerender(<StreakBadge current={7} best={10} />);
    expect(screen.getByText('7')).toBeInTheDocument();

    rerender(<StreakBadge current={14} best={20} />);
    expect(screen.getByText('14')).toBeInTheDocument();

    rerender(<StreakBadge current={30} best={30} />);
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});
