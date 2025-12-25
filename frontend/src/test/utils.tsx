/**
 * Test utilities for rendering components with providers.
 */

/* eslint-disable react-refresh/only-export-components */

import type { ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MantineProvider } from '@mantine/core';
import { theme as mantineTheme } from '../theme';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Simple theme for testing
const theme = createTheme();

interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MantineProvider theme={mantineTheme}>
          <BrowserRouter>{children}</BrowserRouter>
        </MantineProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Custom render that wraps components with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: AllProviders, ...options }),
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
