import { render, screen } from '../../test/utils';
import XPDisplay from './XPDisplay';

describe('XPDisplay', () => {
  it('renders XP value', () => {
    render(<XPDisplay xp={150} />);
    expect(screen.getByText('150 XP')).toBeInTheDocument();
  });

  it('renders zero XP', () => {
    render(<XPDisplay xp={0} />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
  });

  it('renders large XP values', () => {
    render(<XPDisplay xp={9999} />);
    expect(screen.getByText('9999 XP')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<XPDisplay xp={100} variant="h6" />);
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    render(<XPDisplay xp={100} color="primary" />);
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });
});
