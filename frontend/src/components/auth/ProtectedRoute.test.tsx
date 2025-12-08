/**
 * Tests for ProtectedRoute component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { ProtectedRoute } from './ProtectedRoute';
import { authApi } from '../../services/api';

// Mock the authApi
vi.mock('../../services/api', () => ({
  authApi: {
    isAuthenticated: vi.fn(),
  },
}));

// Mock Navigate component
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, replace);
      return <div data-testid="navigate-mock">Redirecting to {to}</div>;
    },
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when user is authenticated', () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
  });

  it('should redirect to /login when user is not authenticated', () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(false);

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/login', true);
  });

  it('should check authentication status on render', () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);

    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );

    expect(authApi.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple children correctly when authenticated', () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);

    render(
      <ProtectedRoute>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});
