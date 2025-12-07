/**
 * Tests for PriorityChip component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import PriorityChip from './PriorityChip';

describe('PriorityChip', () => {
  it('renders with high priority', () => {
    render(<PriorityChip priority="high" />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('renders with low priority', () => {
    render(<PriorityChip priority="low" />);
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('renders with medium priority', () => {
    render(<PriorityChip priority="medium" />);
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('renders with critical priority', () => {
    render(<PriorityChip priority="critical" />);
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it('renders with trivial priority', () => {
    render(<PriorityChip priority="trivial" />);
    expect(screen.getByText(/Trivial/i)).toBeInTheDocument();
  });

  it('renders emoji only when showLabel is false', () => {
    render(<PriorityChip priority="high" showLabel={false} />);
    expect(screen.queryByText(/High/i)).not.toBeInTheDocument();
  });

  it('applies correct size', () => {
    const { container } = render(<PriorityChip priority="high" size="medium" />);
    const chip = container.querySelector('.MuiChip-sizeMedium');
    expect(chip).toBeInTheDocument();
  });
});
