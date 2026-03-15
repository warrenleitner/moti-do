import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useTaskStore } from './store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const createAppTheme = (crisisModeActive: boolean) =>
  createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: crisisModeActive ? '#e65100' : '#1976d2',
        light: crisisModeActive ? '#ff9800' : '#42a5f5',
        dark: crisisModeActive ? '#bf360c' : '#1565c0',
      },
      secondary: {
        main: crisisModeActive ? '#ff7043' : '#9c27b0',
        light: crisisModeActive ? '#ffab91' : '#ba68c8',
        dark: crisisModeActive ? '#e64a19' : '#7b1fa2',
      },
      error: {
        main: '#d32f2f',
      },
      warning: {
        main: crisisModeActive ? '#ef6c00' : '#ff9800',
      },
      success: {
        main: '#2e7d32',
      },
      background: {
        default: crisisModeActive ? '#fff7ed' : '#fafafa',
        paper: crisisModeActive ? '#fffaf4' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: crisisModeActive ? 700 : 500,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: crisisModeActive
              ? '1px solid rgba(230, 81, 0, 0.12)'
              : undefined,
            boxShadow: crisisModeActive
              ? '0 10px 24px rgba(230, 81, 0, 0.08)'
              : undefined,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
    },
  });

export function RootProviders() {
  const crisisModeActive = useTaskStore((state) => state.crisisModeActive);
  const theme = useMemo(
    () => createAppTheme(crisisModeActive),
    [crisisModeActive]
  );

  useEffect(() => {
    document.body.classList.toggle('crisis-mode', crisisModeActive);
    return () => {
      document.body.classList.remove('crisis-mode');
    };
  }, [crisisModeActive]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
