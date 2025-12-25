/**
 * Tests for App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test/utils';
import App from './App';
import { useAppInitialization } from './hooks';

// Mock the hooks module
vi.mock('./hooks', () => ({
  useAppInitialization: vi.fn(),
}));

// Mock the ProtectedRoute component to avoid auth complexity in these tests
vi.mock('./components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>,
}));

// Mock pages to keep tests simple
vi.mock('./pages', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard Page</div>,
  TasksPage: () => <div>Tasks Page</div>,
  HabitsPage: () => <div>Habits Page</div>,
  CalendarPage: () => <div>Calendar Page</div>,
  KanbanPage: () => <div>Kanban Page</div>,
  GraphPage: () => <div>Graph Page</div>,
  SettingsPage: () => <div>Settings Page</div>,
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

// Mock layout components
vi.mock('./components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('./components/common/InstallPrompt', () => ({
  InstallPrompt: () => <div data-testid="install-prompt">Install Prompt</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while initializing', () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: true,
      isInitialized: false,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading Motodo...')).toBeInTheDocument();
  });

  it('should not show loading when already initialized', () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: true,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading Motodo...')).not.toBeInTheDocument();
  });

  it('should show error state when initialization fails', () => {
    const mockRetry = vi.fn();
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: false,
      error: 'Failed to connect to server',
      retry: mockRetry,
    });

    render(<App />);

    // Check for error message (there are two instances - title and body)
    expect(screen.getAllByText('Failed to connect to server')).toHaveLength(2);
    expect(screen.getByText('Make sure the API server is running on http://localhost:8000')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    retryButton.click();
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show error when already initialized', () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: 'Some error',
      retry: vi.fn(),
    });

    render(<App />);

    expect(screen.queryByText('Failed to connect to server')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('should render routes when initialized successfully', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    // Should render the protected route wrapper
    await waitFor(() => {
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    // Should render dashboard by default
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('should render login page for /login route', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    // Set initial route to /login
    window.history.pushState({}, 'Login', '/login');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('should render with InstallPrompt component in protected routes', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    // Navigate to a protected route (not /login)
    window.history.pushState({}, 'Dashboard', '/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    });
  });

  it('should render MainLayout for protected routes', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    // Navigate to a protected route (not /login)
    window.history.pushState({}, 'Dashboard', '/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });
  });
});
