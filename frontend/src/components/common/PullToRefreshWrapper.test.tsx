/**
 * Tests for PullToRefreshWrapper component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/utils';
import PullToRefreshWrapper from './PullToRefreshWrapper';

// Mock the useRefresh hook
vi.mock('../../hooks', () => ({
  useRefresh: vi.fn(() => ({
    refresh: vi.fn(),
    isRefreshing: false,
  })),
}));

// Mock useMediaQuery to control mobile/desktop behavior
const mockUseMediaQuery = vi.fn();
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery(),
  };
});

describe('PullToRefreshWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children on desktop (no wrapper)', () => {
    // Desktop: not mobile
    mockUseMediaQuery.mockReturnValue(false);

    render(
      <PullToRefreshWrapper>
        <div data-testid="child-content">Test Content</div>
      </PullToRefreshWrapper>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders children with pull-to-refresh wrapper on mobile', () => {
    // Mobile
    mockUseMediaQuery.mockReturnValue(true);

    render(
      <PullToRefreshWrapper>
        <div data-testid="child-content">Mobile Content</div>
      </PullToRefreshWrapper>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Mobile Content')).toBeInTheDocument();
  });

  it('renders multiple children correctly on desktop', () => {
    mockUseMediaQuery.mockReturnValue(false);

    render(
      <PullToRefreshWrapper>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </PullToRefreshWrapper>
    );

    expect(screen.getByTestId('first')).toBeInTheDocument();
    expect(screen.getByTestId('second')).toBeInTheDocument();
  });

  it('renders multiple children correctly on mobile', () => {
    mockUseMediaQuery.mockReturnValue(true);

    render(
      <PullToRefreshWrapper>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </PullToRefreshWrapper>
    );

    expect(screen.getByTestId('first')).toBeInTheDocument();
    expect(screen.getByTestId('second')).toBeInTheDocument();
  });
});
