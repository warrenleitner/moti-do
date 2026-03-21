import { render, screen } from '../../test/utils';
import DifficultyChip from './DifficultyChip';
import { Difficulty } from '../../types';

describe('DifficultyChip', () => {
  it('renders with default (small) size', () => {
    render(<DifficultyChip difficulty={Difficulty.MEDIUM} />);
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
  });

  it('renders with medium size', () => {
    render(<DifficultyChip difficulty={Difficulty.HIGH} size="medium" />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });
});
