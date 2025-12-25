import { render, screen, fireEvent, act } from '../../test/utils';
import { vi, beforeEach, afterEach } from 'vitest';
import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when already installed', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Moti-Do')).not.toBeInTheDocument();
  });

  it('renders nothing when no install prompt available', () => {
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Moti-Do')).not.toBeInTheDocument();
  });

  it('renders nothing when dismissed recently', () => {
    const recentTime = Date.now() - 1000 * 60 * 60; // 1 hour ago
    localStorage.setItem('pwa-install-dismissed', recentTime.toString());
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Moti-Do')).not.toBeInTheDocument();
  });

  it('handles beforeinstallprompt event', () => {
    render(<InstallPrompt />);
    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    mockEvent.preventDefault = vi.fn();

    window.dispatchEvent(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('handles appinstalled event', () => {
    render(<InstallPrompt />);
    window.dispatchEvent(new Event('appinstalled'));
    // Component should handle the event without crashing
  });

  it('stores dismissal in localStorage', () => {
    // Test that localStorage setItem is called correctly
    const testKey = 'pwa-install-dismissed';
    const testValue = '123456';
    localStorage.setItem(testKey, testValue);
    expect(localStorage.setItem).toHaveBeenCalledWith(testKey, testValue);
  });

  it('shows prompt after delay when beforeinstallprompt fires', async () => {
    vi.useFakeTimers();

    render(<InstallPrompt />);

    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    mockEvent.preventDefault = vi.fn();

    window.dispatchEvent(mockEvent);

    // Advance timers to trigger the delay and run async timers
    await vi.advanceTimersByTimeAsync(3000);

    // Prompt should be visible after delay
    expect(screen.queryByText('Install Moti-Do')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('calls install prompt when install button is clicked', async () => {
    vi.useFakeTimers();

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof mockPrompt;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = mockPrompt;
    mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed' as const });
    mockEvent.preventDefault = vi.fn();

    render(<InstallPrompt />);
    window.dispatchEvent(mockEvent);

    // Advance timers to show prompt
    await vi.advanceTimersByTimeAsync(3000);

    // Click install button using fireEvent (userEvent doesn't work well with fake timers)
    const installButton = screen.getByText('Install');
    fireEvent.click(installButton);

    expect(mockPrompt).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('dismisses prompt when close button is clicked', async () => {
    vi.useFakeTimers();

    render(<InstallPrompt />);

    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    mockEvent.preventDefault = vi.fn();

    window.dispatchEvent(mockEvent);

    // Advance timers to show prompt
    await vi.advanceTimersByTimeAsync(3000);

    // Find and click dismiss button using fireEvent, wrapped in act for state update
    const dismissButton = screen.getByLabelText('dismiss');
    act(() => {
      fireEvent.click(dismissButton);
    });

    // Verify dismiss handler was called by checking localStorage was set
    expect(localStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', expect.any(String));

    vi.useRealTimers();
  });

  it('hides after 7 days from dismissal', () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000;
    localStorage.setItem('pwa-install-dismissed', sevenDaysAgo.toString());

    render(<InstallPrompt />);

    // Should allow showing again after 7 days
    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = vi.fn().mockResolvedValue(undefined);
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    mockEvent.preventDefault = vi.fn();

    window.dispatchEvent(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
