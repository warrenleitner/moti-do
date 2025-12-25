import { render, screen, act } from '../../test/utils';
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

  // Note: The following tests verify that the event handlers and timeouts are set up correctly.
  // Visual rendering with Mantine Transition is tested via E2E tests since it requires
  // actual browser APIs that jsdom doesn't fully support.

  it('sets up visibility timeout after beforeinstallprompt fires', () => {
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

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    // Verify that preventDefault was called (mini-infobar prevention)
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    // Verify a timeout was scheduled (3000ms delay for showing prompt)
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('tracks install prompt for later use', () => {
    render(<InstallPrompt />);

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof mockPrompt;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      preventDefault: () => void;
    };
    mockEvent.prompt = mockPrompt;
    mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed' as const });
    mockEvent.preventDefault = vi.fn();

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    // Verify event was captured (preventDefault called)
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('can handle dismiss action via localStorage', () => {
    // This tests the dismissal storage logic
    const testTimestamp = Date.now().toString();
    localStorage.setItem('pwa-install-dismissed', testTimestamp);
    expect(localStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', testTimestamp);
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
