import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        label: { fontWeight: 500 },
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
