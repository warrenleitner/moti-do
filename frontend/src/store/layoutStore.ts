import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface LayoutPreferences {
  desktopNavCollapsed: boolean;
  tasksViewUseFullWidth: boolean;
}

interface LayoutState extends LayoutPreferences {
  setDesktopNavCollapsed: (collapsed: boolean) => void;
  toggleDesktopNavCollapsed: () => void;
  setTasksViewUseFullWidth: (useFullWidth: boolean) => void;
}

export const defaultLayoutPreferences: LayoutPreferences = {
  desktopNavCollapsed: false,
  tasksViewUseFullWidth: false,
};

export const useLayoutStore = create<LayoutState>()(
  devtools(
    persist(
      (set) => ({
        ...defaultLayoutPreferences,
        setDesktopNavCollapsed: (desktopNavCollapsed) =>
          set({ desktopNavCollapsed }),
        toggleDesktopNavCollapsed: () =>
          set((state) => ({
            desktopNavCollapsed: !state.desktopNavCollapsed,
          })),
        setTasksViewUseFullWidth: (tasksViewUseFullWidth) =>
          set({ tasksViewUseFullWidth }),
      }),
      {
        name: 'motido-layout-store',
        partialize: (state) => ({
          desktopNavCollapsed: state.desktopNavCollapsed,
          tasksViewUseFullWidth: state.tasksViewUseFullWidth,
        }),
      }
    ),
    { name: 'LayoutStore' }
  )
);
