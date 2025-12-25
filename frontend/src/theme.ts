import { createTheme } from '@mantine/core';

// Use Mantine's default theme with minimal customizations
export const theme = createTheme({
  // Keep default Mantine blue as primary
  primaryColor: 'blue',
  // Use system fonts for better performance
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});
