import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import App from './App';
import { theme as mantineTheme } from './theme';
import { useTaskStore } from './store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/**
 * Syncs crisis-mode state from the store to the DOM so CSS custom properties
 * (defined in index.css) can restyle the app without a JS theme object.
 */
function CrisisModeHandler() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={mantineTheme}>
        <Notifications position="top-right" />
        <CrisisModeHandler />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>
);
