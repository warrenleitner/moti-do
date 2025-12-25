import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import DurationChip from './DurationChip';
import { Duration } from '../../types';

describe('DurationChip', () => {
  it('renders with minuscule duration', () => {
    render(<DurationChip duration={Duration.MINUSCULE} />);
    expect(screen.getByText(/Minuscule/i)).toBeInTheDocument();
  });

  it('renders with short duration', () => {
    render(<DurationChip duration={Duration.SHORT} />);
    expect(screen.getByText(/Short/i)).toBeInTheDocument();
  });

  it('renders with medium duration', () => {
    render(<DurationChip duration={Duration.MEDIUM} />);
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('renders with long duration', () => {
    render(<DurationChip duration={Duration.LONG} />);
    expect(screen.getByText(/Long/i)).toBeInTheDocument();
  });

  it('renders with odysseyan duration', () => {
    render(<DurationChip duration={Duration.ODYSSEYAN} />);
    expect(screen.getByText(/Odysseyan/i)).toBeInTheDocument();
  });

  it('applies small size', () => {
    const { container } = render(<DurationChip duration={Duration.MEDIUM} size="small" />);
    expect(container.querySelector('.mantine-Badge-root')).toBeInTheDocument();
  });

  it('applies medium size', () => {
    const { container } = render(<DurationChip duration={Duration.MEDIUM} size="medium" />);
    expect(container.querySelector('.mantine-Badge-root')).toBeInTheDocument();
  });
});
