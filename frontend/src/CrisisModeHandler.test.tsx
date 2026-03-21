import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from './test/utils';
import { CrisisModeHandler } from './CrisisModeHandler';

describe('CrisisModeHandler', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-crisis');
    document.body.classList.remove('crisis-mode');
  });

  it('sets data-crisis="false" when crisis mode is inactive', () => {
    render(<CrisisModeHandler />);
    expect(document.documentElement.getAttribute('data-crisis')).toBe('false');
    expect(document.body.classList.contains('crisis-mode')).toBe(false);
  });

  it('cleans up data-crisis attribute on unmount', () => {
    const { unmount } = render(<CrisisModeHandler />);
    expect(document.documentElement.getAttribute('data-crisis')).toBe('false');
    unmount();
    expect(document.documentElement.getAttribute('data-crisis')).toBeNull();
  });
});
