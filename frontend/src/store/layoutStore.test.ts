import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  defaultLayoutPreferences,
  useLayoutStore,
} from './layoutStore';

describe('layoutStore', () => {
  beforeEach(() => {
    act(() => {
      useLayoutStore.setState({
        ...defaultLayoutPreferences,
      });
    });
    window.localStorage.removeItem('motido-layout-store');
  });

  it('starts with the default layout preferences', () => {
    expect(useLayoutStore.getState()).toMatchObject(defaultLayoutPreferences);
  });

  it('toggles the desktop navigation collapse state', () => {
    act(() => {
      useLayoutStore.getState().toggleDesktopNavCollapsed();
    });

    expect(useLayoutStore.getState().desktopNavCollapsed).toBe(true);
  });

  it('updates the tasks full-width preference', () => {
    act(() => {
      useLayoutStore.getState().setTasksViewUseFullWidth(true);
    });

    expect(useLayoutStore.getState().tasksViewUseFullWidth).toBe(true);
  });
});
