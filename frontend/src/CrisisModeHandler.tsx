import { useEffect } from 'react';
import { useTaskStore } from './store';

/**
 * Syncs crisis-mode state from the store to the DOM so CSS custom properties
 * (defined in index.css) can restyle the app without a JS theme object.
 */
export function CrisisModeHandler() {
  const crisisModeActive = useTaskStore((state) => state.crisisModeActive);

  useEffect(() => {
    document.documentElement.setAttribute('data-crisis', String(crisisModeActive));
    document.body.classList.toggle('crisis-mode', crisisModeActive);

    return () => {
      document.documentElement.removeAttribute('data-crisis');
      document.body.classList.remove('crisis-mode');
    };
  }, [crisisModeActive]);

  return null;
}
