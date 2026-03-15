/**
 * UI adapter layer — all components import UI primitives from here.
 * To swap UI framework, rewrite this file (and icons.ts) instead of
 * touching every component.
 */

// Layout
export {
  Box,
  Center,
  Container,
  Flex,
  Grid,
  Group,
  SimpleGrid,
  Space,
  Stack,
} from '@mantine/core';

// Typography
export { Text, Title } from '@mantine/core';

// Inputs
export {
  ActionIcon,
  Autocomplete,
  Button,
  Checkbox,
  CloseButton,
  NumberInput,
  PasswordInput,
  Radio,
  SegmentedControl,
  Select,
  Switch,
  TagsInput,
  Textarea,
  TextInput,
} from '@mantine/core';

// Data display
export {
  Accordion,
  Avatar,
  Badge,
  Card,
  ColorSwatch,
  Indicator,
  Table,
  ThemeIcon,
  Timeline,
} from '@mantine/core';

// Feedback
export { Alert, Loader, Progress, Skeleton } from '@mantine/core';

// Overlays
export { Drawer, Menu, Modal, Popover, Tooltip } from '@mantine/core';

// Navigation
export { Burger, NavLink, Tabs } from '@mantine/core';

// Miscellaneous
export { Collapse, Divider, Paper, ScrollArea, Transition } from '@mantine/core';

// Dates
export { DatePickerInput, DateTimePicker } from '@mantine/dates';

// Notifications
export { notifications } from '@mantine/notifications';

// Hooks (re-export commonly used ones)
export { useClickOutside, useDisclosure, useMediaQuery } from '@mantine/hooks';

// App shell (used by MainLayout)
export { AppShell } from '@mantine/core';
