/**
 * Tests for LoginPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { authApi } from '../services/api';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock authApi
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form by default', () => {
      render(<LoginPage />);

      expect(screen.getByText('Moti-Do')).toBeInTheDocument();
      expect(screen.getByText('Task and Habit Tracker')).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      // Check for submit button (type="submit")
      const buttons = screen.getAllByRole('button', { name: /login/i });
      const submitButton = buttons.find((btn) => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeInTheDocument();
    });

    it('should not show confirm password field in login mode', () => {
      render(<LoginPage />);

      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    });

    it('should show confirm password field in register mode', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Mantine SegmentedControl uses radio inputs
      const registerRadio = screen.getByRole('radio', { name: /register/i });
      await user.click(registerRadio);

      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should switch from login to register mode', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      // Check that submit button exists (type="submit")
      const submitButton = screen.getByRole('button', { name: /register/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should clear password fields when switching modes', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'testpassword');

      // Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      expect(passwordField).toHaveValue('');
    });

    it('should clear errors when switching modes', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Trigger an error by submitting with short password
      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'short');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();

      // Switch to register mode - Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error if password is less than 8 characters', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'short');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should show error if passwords do not match in register mode', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Switch to register mode - Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      const passwordField = screen.getAllByLabelText(/password/i)[0];
      const confirmField = screen.getByLabelText(/confirm password/i);

      await user.type(passwordField, 'password123');
      await user.type(confirmField, 'password456');

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
      expect(authApi.register).not.toHaveBeenCalled();
    });
  });

  describe('Login', () => {
    it('should call authApi.login with correct credentials', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'test-token', token_type: 'bearer' });

      render(<LoginPage />);

      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/password/i);

      await user.clear(usernameField);
      await user.type(usernameField, 'testuser');
      await user.type(passwordField, 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith('testuser', 'password123');
      });
    });

    it('should navigate to dashboard on successful login', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'test-token', token_type: 'bearer' });

      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error message on failed login', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      });

      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    });

    it('should show generic error on network failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(new Error('Network error'));

      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
    });

    it('should disable form during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      vi.mocked(authApi.login).mockReturnValue(loginPromise as Promise<{ access_token: string; token_type: string }>);

      render(<LoginPage />);

      const passwordField = screen.getByLabelText(/password/i);
      await user.type(passwordField, 'password123');

      const submitButton = screen.getByRole('button', { name: /login/i });
      await user.click(submitButton);

      // Form should be disabled
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeDisabled();
        expect(passwordField).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise and wait for state update
      resolveLogin!({ access_token: 'test-token', token_type: 'bearer' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Registration', () => {
    it('should call authApi.register with correct credentials', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ access_token: 'test-token', token_type: 'bearer' });

      render(<LoginPage />);

      // Switch to register mode - Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getAllByLabelText(/password/i)[0];
      const confirmField = screen.getByLabelText(/confirm password/i);

      await user.clear(usernameField);
      await user.type(usernameField, 'newuser');
      await user.type(passwordField, 'password123');
      await user.type(confirmField, 'password123');

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith('newuser', 'password123');
      });
    });

    it('should navigate to dashboard on successful registration', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ access_token: 'test-token', token_type: 'bearer' });

      render(<LoginPage />);

      // Switch to register mode - Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      const passwordField = screen.getAllByLabelText(/password/i)[0];
      const confirmField = screen.getByLabelText(/confirm password/i);

      await user.type(passwordField, 'password123');
      await user.type(confirmField, 'password123');

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error message on failed registration', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue({
        response: { data: { detail: 'Username already exists' } },
      });

      render(<LoginPage />);

      // Switch to register mode - Mantine SegmentedControl uses radio inputs
      const registerToggle = screen.getByRole('radio', { name: /register/i });
      await user.click(registerToggle);

      const passwordField = screen.getAllByLabelText(/password/i)[0];
      const confirmField = screen.getByLabelText(/confirm password/i);

      await user.type(passwordField, 'password123');
      await user.type(confirmField, 'password123');

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      expect(await screen.findByText(/username already exists/i)).toBeInTheDocument();
    });
  });
});
