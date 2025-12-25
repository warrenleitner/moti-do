import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import DifficultyChip from './DifficultyChip';
import { Difficulty } from '../../types';

describe('DifficultyChip', () => {
  it('renders with trivial difficulty', () => {
    render(<DifficultyChip difficulty={Difficulty.TRIVIAL} />);
    expect(screen.getByText(/Trivial/i)).toBeInTheDocument();
  });

  it('renders with low difficulty', () => {
    render(<DifficultyChip difficulty={Difficulty.LOW} />);
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('renders with medium difficulty', () => {
    render(<DifficultyChip difficulty={Difficulty.MEDIUM} />);
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('renders with high difficulty', () => {
    render(<DifficultyChip difficulty={Difficulty.HIGH} />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('renders with herculean difficulty', () => {
    render(<DifficultyChip difficulty={Difficulty.HERCULEAN} />);
    expect(screen.getByText(/Herculean/i)).toBeInTheDocument();
  });

  it('applies small size', () => {
    const { container } = render(<DifficultyChip difficulty={Difficulty.MEDIUM} size="small" />);
    expect(container.querySelector('.mantine-Badge-root')).toBeInTheDocument();
  });

  it('applies medium size', () => {
    const { container } = render(<DifficultyChip difficulty={Difficulty.MEDIUM} size="medium" />);
    expect(container.querySelector('.mantine-Badge-root')).toBeInTheDocument();
  });
});
