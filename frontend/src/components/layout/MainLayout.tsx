import type { ReactNode } from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Badge,
  ActionIcon,
  Stack,
  Divider,
  Box,
  useDisclosure,
  useMediaQuery,
} from '../../ui';
import {
  IconLayoutDashboard,
  IconCheckbox,
  IconRepeat,
  IconCalendar,
  IconLayoutKanban,
  IconBinaryTree2,
  IconSettings,
  IconTrophy,
  IconLogout,
  IconRefresh,
} from '../../ui/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store';
import { authApi } from '../../services/api';
import { useRefresh } from '../../hooks';
import PullToRefreshWrapper from '../common/PullToRefreshWrapper';

interface NavItem {
  text: string;
  icon: ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <IconLayoutDashboard size={20} />, path: '/' },
  { text: 'Tasks', icon: <IconCheckbox size={20} />, path: '/tasks' },
  { text: 'Habits', icon: <IconRepeat size={20} />, path: '/habits' },
  { text: 'Calendar', icon: <IconCalendar size={20} />, path: '/calendar' },
  { text: 'Kanban', icon: <IconLayoutKanban size={20} />, path: '/kanban' },
  { text: 'Graph', icon: <IconBinaryTree2 size={20} />, path: '/graph' },
  { text: 'Settings', icon: <IconSettings size={20} />, path: '/settings' },
];

interface MainLayoutProps {
  children: ReactNode;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function MainLayout({ children }: MainLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const isMobile = useMediaQuery('(max-width: 62em)');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { refresh, isRefreshing } = useRefresh();

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      close();
    }
  };

  const handleLogout = () => {
    authApi.logout();
  };

  const currentPageTitle =
    navItems.find((item) => item.path === location.pathname)?.text || 'Moti-Do';

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Text size="lg" fw={600} visibleFrom="md">
              {currentPageTitle}
            </Text>
            <Text size="lg" fw={600} hiddenFrom="md">
              Moti-Do
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            size="lg"
          >
            <IconRefresh
              size={20}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      {/* Navbar / Sidebar */}
      <AppShell.Navbar p="md">
        <AppShell.Section>
          {/* Logo/Brand */}
          <Box mb="md" style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logo-wordmark.png"
              alt="Motodo"
              style={{ height: 128, objectFit: 'contain' }}
            />
          </Box>
        </AppShell.Section>

        {/* Navigation Links */}
        <AppShell.Section grow>
          <Stack gap={4}>
            {navItems.map((item) => (
              <NavLink
                key={item.text}
                label={item.text}
                leftSection={item.icon}
                active={location.pathname === item.path}
                onClick={() => handleNavClick(item.path)}
                variant="filled"
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            ))}
          </Stack>
        </AppShell.Section>

        {/* User XP Display */}
        {user && (
          <AppShell.Section>
            <Divider my="sm" />
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Avatar size="sm" color="violet" radius="xl">
                  {user.level}
                </Avatar>
                <Text size="sm" fw={500}>
                  Level {user.level}
                </Text>
              </Group>
              <ActionIcon
                variant="subtle"
                onClick={handleLogout}
                title="Logout"
                size="sm"
              >
                <IconLogout size={16} />
              </ActionIcon>
            </Group>
            <Badge
              leftSection={<IconTrophy size={12} />}
              variant="outline"
              color="blue"
              size="sm"
            >
              {user.xp} XP
            </Badge>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              v{__APP_VERSION__}
            </Text>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <PullToRefreshWrapper>{children}</PullToRefreshWrapper>
      </AppShell.Main>
    </AppShell>
  );
}
/* v8 ignore stop */
