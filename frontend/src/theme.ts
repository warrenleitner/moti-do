import { createTheme, type MantineColorsTuple, rem } from '@mantine/core';

// Kinetic Console neon palette
const neonCyan: MantineColorsTuple = [
  '#e0feff', '#c3f5ff', '#87ecff', '#81ecff', '#00d9ff',
  '#00c8f0', '#00b5d9', '#009bb8', '#007d94', '#00626e',
];

const neonMagenta: MantineColorsTuple = [
  '#ffe0f0', '#ffc2e0', '#ff85c0', '#ff47a0', '#ff007f',
  '#e60072', '#e30071', '#b3005a', '#99004d', '#800040',
];

const neonAmber: MantineColorsTuple = [
  '#fff8e0', '#ffefb8', '#ffe690', '#ffdd68', '#ffc775',
  '#e6b366', '#cc9f5a', '#b38b4e', '#997742', '#806336',
];

export const theme = createTheme({
  primaryColor: 'neon-cyan',
  colors: {
    'neon-cyan': neonCyan,
    'neon-magenta': neonMagenta,
    'neon-amber': neonAmber,
  },
  fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  headings: {
    fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 2,
  cursorType: 'pointer',
  black: '#e6e7f5',
  white: '#0B0E17',
  components: {
    Button: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.1s ease',
          '&:active': {
            transform: 'translate(1px, 1px)',
            boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.8)',
          },
        },
        label: { fontWeight: 600 },
      },
    },
    Card: {
      defaultProps: {
        radius: 4,
        shadow: 'none',
      },
      styles: {
        root: {
          backgroundColor: '#10131C',
          border: '1px solid rgba(69, 71, 82, 0.15)',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          fontWeight: 500,
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 2,
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.7,
          blur: 20,
        },
      },
      styles: {
        content: {
          backgroundColor: '#10131C',
          border: '1px solid rgba(69, 71, 82, 0.15)',
        },
        header: {
          backgroundColor: '#10131C',
        },
      },
    },
    Drawer: {
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.7,
          blur: 20,
        },
      },
      styles: {
        content: {
          backgroundColor: '#10131C',
        },
        header: {
          backgroundColor: '#10131C',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          fontFamily: '"JetBrains Mono", monospace',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      },
    },
    Textarea: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          fontFamily: '"JetBrains Mono", monospace',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      },
    },
    Select: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
        },
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
        option: {
          color: '#e6e7f5',
          '&[data-combobox-selected]': {
            backgroundColor: '#272A34',
          },
          '&:hover': {
            backgroundColor: '#272A34',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          transition: 'all 0.1s ease',
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          backgroundColor: '#10131C',
        },
      },
    },
    NavLink: {
      defaultProps: {
        radius: 2,
      },
    },
    Tabs: {
      styles: {
        tab: {
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          fontSize: rem(12),
          fontWeight: 500,
          color: '#a8aab7',
          borderColor: 'transparent',
          '&[data-active]': {
            color: '#81ecff',
            borderColor: '#81ecff',
          },
        },
        tabsList: {
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
      },
    },
    Table: {
      styles: {
        table: {
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
        th: {
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.15em',
          fontSize: rem(11),
          fontWeight: 500,
          color: '#a8aab7',
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
        td: {
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
        },
        tr: {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: '#181B25',
          },
        },
      },
    },
    Switch: {
      defaultProps: {
        radius: 2,
      },
    },
    Tooltip: {
      styles: {
        tooltip: {
          backgroundColor: '#272A34',
          color: '#e6e7f5',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          border: '1px solid rgba(69, 71, 82, 0.15)',
        },
      },
    },
    Alert: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
      },
    },
    Progress: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          backgroundColor: '#272A34',
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        root: {
          backgroundColor: '#181B25',
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          fontSize: rem(12),
          fontWeight: 500,
        },
      },
    },
    Accordion: {
      defaultProps: {
        radius: 2,
      },
    },
    ColorInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
        },
      },
    },
    TagsInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
        },
      },
    },
    Autocomplete: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
        },
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
      },
    },
    DatePickerInput: {
      defaultProps: {
        radius: 2,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
        },
      },
    },
    Menu: {
      styles: {
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
        item: {
          color: '#e6e7f5',
          '&:hover': {
            backgroundColor: '#272A34',
          },
        },
      },
    },
    Popover: {
      styles: {
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
      },
    },
    Divider: {
      styles: {
        root: {
          borderColor: 'rgba(69, 71, 82, 0.15)',
        },
      },
    },
    Checkbox: {
      defaultProps: {
        radius: 2,
      },
    },
    Radio: {
      defaultProps: {
        radius: 2,
      },
    },
    Loader: {
      defaultProps: {
        color: '#81ecff',
      },
    },
    Skeleton: {
      styles: {
        root: {
          '&::before': {
            backgroundColor: '#181B25',
          },
          '&::after': {
            backgroundColor: '#272A34',
          },
        },
      },
    },
  },
});
