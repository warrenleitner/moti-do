import { createTheme } from '@mantine/core';
import type { MantineColorsTuple } from '@mantine/core';

// Custom blue to match MUI primary (#1976d2)
const blue: MantineColorsTuple = [
  '#e3f2fd',
  '#bbdefb',
  '#90caf9',
  '#64b5f6',
  '#42a5f5',
  '#1976d2', // main (index 5)
  '#1565c0', // dark
  '#0d47a1',
  '#0a3d91',
  '#082f70',
];

// Custom violet to match MUI secondary (#9c27b0)
const violet: MantineColorsTuple = [
  '#f3e5f5',
  '#e1bee7',
  '#ce93d8',
  '#ba68c8',
  '#ab47bc',
  '#9c27b0', // main (index 5)
  '#8e24aa',
  '#7b1fa2',
  '#6a1b9a',
  '#4a148c',
];

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue,
    violet,
  },
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  headings: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '2.5rem' },
      h2: { fontSize: '2rem' },
      h3: { fontSize: '1.75rem' },
      h4: { fontSize: '1.5rem' },
      h5: { fontSize: '1.25rem' },
      h6: { fontSize: '1rem' },
    },
  },
  radius: {
    xs: '4px',
    sm: '6px', // Chip radius
    md: '8px', // Button radius
    lg: '12px', // Card radius
    xl: '16px',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          textTransform: 'none',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
  },
});
