import { createTheme, type MantineColorsTuple, rem } from '@mantine/core';

// Kinetic Console neon palette
const neonCyan: MantineColorsTuple = [
  '#e0feff', '#c3f5ff', '#87ecff', '#47e2ff', '#00d9ff',
  '#00c8f0', '#00b5d9', '#009bb8', '#007d94', '#00626e',
];

const neonMagenta: MantineColorsTuple = [
  '#ffe0f0', '#ffc2e0', '#ff85c0', '#ff47a0', '#ff007f',
  '#e60072', '#cc0066', '#b3005a', '#99004d', '#800040',
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
  defaultRadius: 0,
  cursorType: 'pointer',
  black: '#E0E0E0',
  white: '#0B0E17',
  components: {
    Button: {
      defaultProps: {
        radius: 0,
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
        radius: 0,
        shadow: 'none',
      },
      styles: {
        root: {
          backgroundColor: '#10131C',
          border: '1px solid rgba(59, 73, 76, 0.15)',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: 0,
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
        radius: 0,
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.7,
          blur: 20,
        },
      },
      styles: {
        content: {
          backgroundColor: '#10131C',
          border: '1px solid rgba(59, 73, 76, 0.15)',
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
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          fontFamily: '"JetBrains Mono", monospace',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#8A8F98',
        },
      },
    },
    Textarea: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#8A8F98',
        },
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          fontFamily: '"JetBrains Mono", monospace',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#8A8F98',
        },
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#8A8F98',
        },
      },
    },
    Select: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
        },
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
        option: {
          color: '#E0E0E0',
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
          color: '#8A8F98',
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        root: {
          transition: 'all 0.1s ease',
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        root: {
          backgroundColor: '#10131C',
        },
      },
    },
    NavLink: {
      defaultProps: {
        radius: 0,
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
          color: '#8A8F98',
          borderColor: 'transparent',
          '&[data-active]': {
            color: '#00E5FF',
            borderColor: '#00E5FF',
          },
        },
        tabsList: {
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
      },
    },
    Table: {
      styles: {
        table: {
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
        th: {
          fontFamily: '"JetBrains Mono", monospace',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.15em',
          fontSize: rem(11),
          fontWeight: 500,
          color: '#8A8F98',
          backgroundColor: '#181B25',
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
        td: {
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
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
        radius: 0,
      },
    },
    Tooltip: {
      styles: {
        tooltip: {
          backgroundColor: '#272A34',
          color: '#E0E0E0',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: rem(11),
          border: '1px solid rgba(59, 73, 76, 0.15)',
        },
      },
    },
    Alert: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        root: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
      },
    },
    Progress: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        root: {
          backgroundColor: '#272A34',
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        radius: 0,
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
        radius: 0,
      },
    },
    ColorInput: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
        },
      },
    },
    TagsInput: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
        },
      },
    },
    Autocomplete: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
        },
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
      },
    },
    DatePickerInput: {
      defaultProps: {
        radius: 0,
      },
      styles: {
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
        },
      },
    },
    Menu: {
      styles: {
        dropdown: {
          backgroundColor: '#181B25',
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
        item: {
          color: '#E0E0E0',
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
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
      },
    },
    Divider: {
      styles: {
        root: {
          borderColor: 'rgba(59, 73, 76, 0.15)',
        },
      },
    },
    Checkbox: {
      defaultProps: {
        radius: 0,
      },
    },
    Radio: {
      defaultProps: {
        radius: 0,
      },
    },
    Loader: {
      defaultProps: {
        color: '#00E5FF',
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
