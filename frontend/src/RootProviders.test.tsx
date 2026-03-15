import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RootProviders } from './RootProviders';
import * as store from './store';

vi.mock('./store', () => ({
  useTaskStore: vi.fn(),
}));

vi.mock('./App', () => ({
  default: () => <div data-testid="mock-app">Mock App</div>,
}));

describe('RootProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.classList.remove('crisis-mode');
  });

  it('renders the app without crisis mode styling by default', () => {
    vi.mocked(store.useTaskStore).mockImplementation((selector) =>
      selector({ crisisModeActive: false } as ReturnType<typeof store.useTaskStore>)
    );

    render(<RootProviders />);

    expect(screen.getByTestId('mock-app')).toBeInTheDocument();
    expect(document.body.classList.contains('crisis-mode')).toBe(false);
  });

  it('applies and cleans up crisis mode body styling', () => {
    vi.mocked(store.useTaskStore).mockImplementation((selector) =>
      selector({ crisisModeActive: true } as ReturnType<typeof store.useTaskStore>)
    );

    const { unmount } = render(<RootProviders />);

    expect(document.body.classList.contains('crisis-mode')).toBe(true);

    unmount();

    expect(document.body.classList.contains('crisis-mode')).toBe(false);
  });
});
