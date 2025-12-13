/**
 * Tests for PriorityChip component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import PriorityChip from './PriorityChip';
import { Priority } from '../../types';

describe('PriorityChip', () => {
  it('renders with high priority', () => {
    render(<PriorityChip priority={Priority.HIGH} />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('renders with low priority', () => {
    render(<PriorityChip priority={Priority.LOW} />);
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('renders with medium priority', () => {
    render(<PriorityChip priority={Priority.MEDIUM} />);
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it('renders with defcon one priority', () => {
    render(<PriorityChip priority={Priority.DEFCON_ONE} />);
    expect(screen.getByText(/Defcon One/i)).toBeInTheDocument();
  });

  it('renders with trivial priority', () => {
    render(<PriorityChip priority={Priority.TRIVIAL} />);
    expect(screen.getByText(/Trivial/i)).toBeInTheDocument();
  });

  it('renders emoji only when showLabel is false', () => {
    render(<PriorityChip priority={Priority.HIGH} showLabel={false} />);
    expect(screen.queryByText(/High/i)).not.toBeInTheDocument();
  });

  it('applies correct size', () => {
    const { container } = render(<PriorityChip priority={Priority.HIGH} size="medium" />);
    const chip = container.querySelector('.MuiChip-sizeMedium');
    expect(chip).toBeInTheDocument();
  });
});
