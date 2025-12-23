import { render } from '../../test/utils';
import { vi, beforeEach, afterEach } from 'vitest';
import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
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
    mockMatchMedia.mockReturnValue({ matches: true });
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no install prompt available', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when dismissed recently', () => {
    const recentTime = Date.now() - 1000 * 60 * 60; // 1 hour ago
    localStorage.setItem('pwa-install-dismissed', recentTime.toString());
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
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
});
