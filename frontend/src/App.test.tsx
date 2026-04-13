/**
 * Tests for App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test/utils';
import App from './App';
import { useAppInitialization } from './hooks';

const suspendedRoutes = {
  dashboard: false,
  login: false,
};

const neverResolvingPromise = new Promise<never>(() => {});

// Mock the hooks module
vi.mock('./hooks', () => ({
  useAppInitialization: vi.fn(),
}));

// Mock the ProtectedRoute component to avoid auth complexity in these tests
vi.mock('./components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>,
}));

// Mock pages to keep tests simple
vi.mock('./pages/Dashboard', () => ({
  default: () => {
    if (suspendedRoutes.dashboard) {
      throw neverResolvingPromise;
    }

    return <div data-testid="dashboard">Dashboard Page</div>;
  },
}));

vi.mock('./pages/TasksPage', () => ({
  default: () => <div>Tasks Page</div>,
}));

vi.mock('./pages/HabitsPage', () => ({
  default: () => <div>Habits Page</div>,
}));

vi.mock('./pages/CalendarPage', () => ({
  default: () => <div>Calendar Page</div>,
}));

vi.mock('./pages/KanbanPage', () => ({
  default: () => <div>Kanban Page</div>,
}));

vi.mock('./pages/GraphPage', () => ({
  default: () => <div>Graph Page</div>,
}));

vi.mock('./pages/SettingsPage', () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => {
    if (suspendedRoutes.login) {
      throw neverResolvingPromise;
    }

    return <div data-testid="login-page">Login Page</div>;
  },
}));

// Mock layout components
vi.mock('./components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('./components/common/InstallPrompt', () => ({
  InstallPrompt: () => <div data-testid="install-prompt">Install Prompt</div>,
}));

vi.mock('./components/common/AppUpdatePrompt', () => ({
  default: () => <div data-testid="app-update-prompt">App Update Prompt</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    suspendedRoutes.dashboard = false;
    suspendedRoutes.login = false;
    window.history.pushState({}, 'Dashboard', '/');
  });

  it('should show loading state while initializing', () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: true,
      isInitialized: false,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    expect(screen.getByTestId('app-loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading Motodo...')).toBeInTheDocument();
  });

  it('should not show app initialization loading when already initialized', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: true,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('app-loading-state')).not.toBeInTheDocument();
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

  it('should show route loading fallback while a protected page is still loading', () => {
    suspendedRoutes.dashboard = true;

    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    expect(screen.getByTestId('route-loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('app-loading-state')).not.toBeInTheDocument();
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

  it.each([
    ['/tasks', 'Tasks Page'],
    ['/habits', 'Habits Page'],
    ['/calendar', 'Calendar Page'],
    ['/kanban', 'Kanban Page'],
    ['/graph', 'Graph Page'],
    ['/settings', 'Settings Page'],
  ])('should render the %s route when initialized', async (path, expectedText) => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    window.history.pushState({}, expectedText, path);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  it('should show full-page loading fallback while the login page is still loading', () => {
    suspendedRoutes.login = true;

    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    window.history.pushState({}, 'Login', '/login');

    render(<App />);

    expect(screen.getByTestId('app-loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading Motodo...')).toBeInTheDocument();
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

  it('should render the global app update prompt when initialized', async () => {
    vi.mocked(useAppInitialization).mockReturnValue({
      isLoading: false,
      isInitialized: true,
      error: null,
      retry: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('app-update-prompt')).toBeInTheDocument();
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
