import userEvent from '@testing-library/user-event';
import { act, render, screen } from '../../test/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppUpdatePrompt from './AppUpdatePrompt';
import {
  forceAppUpdate,
  isAppUpdateAvailable,
  subscribeToAppUpdate,
} from '../../services/appUpdate';

vi.mock('../../services/appUpdate', () => ({
  forceAppUpdate: vi.fn(),
  isAppUpdateAvailable: vi.fn(() => false),
  subscribeToAppUpdate: vi.fn(() => vi.fn()),
}));

describe('AppUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(isAppUpdateAvailable).mockReturnValue(false);
    vi.mocked(subscribeToAppUpdate).mockImplementation(() => vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no app update is waiting', () => {
    const { container } = render(<AppUpdatePrompt />);

    expect(container.firstChild).toBeNull();
  });

  it('renders when an app update is already available', () => {
    vi.mocked(isAppUpdateAvailable).mockReturnValue(true);

    render(<AppUpdatePrompt />);

    expect(screen.getByTestId('app-update-prompt')).toBeInTheDocument();
    expect(screen.getByText('A newer frontend build is ready')).toBeInTheDocument();
  });

  it('shows the prompt when the update listener reports a waiting build', async () => {
    let updateListener: ((value: boolean) => void) | undefined;
    vi.mocked(subscribeToAppUpdate).mockImplementation((listener) => {
      updateListener = listener;
      return vi.fn();
    });

    render(<AppUpdatePrompt />);
    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();

    await act(async () => {
      updateListener?.(true);
    });

    expect(screen.getByTestId('app-update-prompt')).toBeInTheDocument();
  });

  it('dismisses the prompt when later is clicked', async () => {
    vi.mocked(isAppUpdateAvailable).mockReturnValue(true);
    const user = userEvent.setup();

    render(<AppUpdatePrompt />);

    await user.click(screen.getByRole('button', { name: /later/i }));

    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();
  });

  it('dismisses the prompt when the close button is clicked', async () => {
    vi.mocked(isAppUpdateAvailable).mockReturnValue(true);
    const user = userEvent.setup();

    render(<AppUpdatePrompt />);

    await user.click(screen.getByRole('button', { name: /dismiss app update prompt/i }));

    expect(screen.queryByTestId('app-update-prompt')).not.toBeInTheDocument();
  });

  it('calls forceAppUpdate when update now is clicked', async () => {
    vi.mocked(isAppUpdateAvailable).mockReturnValue(true);
    vi.mocked(forceAppUpdate).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<AppUpdatePrompt />);

    await user.click(screen.getByRole('button', { name: /update now/i }));

    expect(forceAppUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when applying the update fails', async () => {
    vi.mocked(isAppUpdateAvailable).mockReturnValue(true);
    vi.mocked(forceAppUpdate).mockRejectedValue(new Error('update failed'));
    const user = userEvent.setup();

    render(<AppUpdatePrompt />);

    await user.click(screen.getByRole('button', { name: /update now/i }));

    expect(await screen.findByText(/could not load the latest frontend build/i)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to apply proactive frontend update:',
      expect.any(Error)
    );
    expect(screen.getByRole('button', { name: /update now/i })).toBeEnabled();
  });
});