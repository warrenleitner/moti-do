import type { ReactNode } from 'react';
import { Box, Text, Progress, Avatar, useMediaQuery } from '../../ui';
import {
  IconLayoutDashboard,
  IconCheckbox,
  IconRepeat,
  IconCalendar,
  IconLayoutKanban,
  IconBinaryTree2,
  IconSettings,
  IconLogout,
  IconRefresh,
  IconPlus,
} from '../../ui/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store';
import { authApi } from '../../services/api';
import { useRefresh } from '../../hooks';
import PullToRefreshWrapper from '../common/PullToRefreshWrapper';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';

interface NavItem {
  text: string;
  icon: ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'DASHBOARD', icon: <IconLayoutDashboard size={20} />, path: '/' },
  { text: 'TASKS', icon: <IconCheckbox size={20} />, path: '/tasks' },
  { text: 'HABITS', icon: <IconRepeat size={20} />, path: '/habits' },
  { text: 'CALENDAR', icon: <IconCalendar size={20} />, path: '/calendar' },
  { text: 'KANBAN', icon: <IconLayoutKanban size={20} />, path: '/kanban' },
  { text: 'GRAPH', icon: <IconBinaryTree2 size={20} />, path: '/graph' },
  { text: 'SETTINGS', icon: <IconSettings size={20} />, path: '/settings' },
];

interface MainLayoutProps {
  children: ReactNode;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 62em)');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { refresh, isRefreshing } = useRefresh();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    authApi.logout();
  };

  // Calculate XP progress to next level (simplified — real formula can come later)
  const currentXP = user?.xp ?? 0;
  const currentLevel = user?.level ?? 1;
  const xpForNextLevel = currentLevel * 1000; // simplified
  const xpProgress = Math.min((currentXP / xpForNextLevel) * 100, 100);

  if (isMobile) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <MobileHeader onRefresh={refresh} isRefreshing={isRefreshing} />
        <Box
          component="main"
          style={{
            flex: 1,
            paddingTop: 56, // header height
            paddingBottom: 64, // bottom nav height
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <PullToRefreshWrapper>
            <Box px="md" py="md" className="page-content-enter">
              {children}
            </Box>
          </PullToRefreshWrapper>
        </Box>
        <BottomNav currentPath={location.pathname} onNavigate={handleNavClick} />
      </Box>
    );
  }

  // Desktop layout
  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Box
        component="nav"
        data-testid="desktop-sidebar"
        style={{
          width: 256,
          flexShrink: 0,
          backgroundColor: '#181B25',
          borderRight: '1px solid rgba(59, 73, 76, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          overflowY: 'auto',
        }}
      >
        {/* Profile Section */}
        {user && (
          <Box p="md" className="scanline-subtle" style={{ borderBottom: '1px solid rgba(59, 73, 76, 0.15)', position: 'relative' }}>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar
                size={40}
                radius={0}
                style={{
                  backgroundColor: '#272A34',
                  border: '2px solid #00E5FF',
                  color: '#00E5FF',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                }}
              >
                {currentLevel}
              </Avatar>
              <Box>
                <Text
                  size="xs"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#00E5FF',
                    fontWeight: 600,
                  }}
                >
                  LVL {currentLevel} OPERATOR
                </Text>
                <Text
                  size="xs"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#8A8F98',
                    fontSize: '0.625rem',
                  }}
                >
                  {user.username}
                </Text>
              </Box>
            </Box>

            {/* XP Progress Bar */}
            <Box style={{ marginBottom: 8 }}>
              <Text
                size="xs"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#8A8F98',
                  fontSize: '0.625rem',
                  marginBottom: 4,
                }}
              >
                {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </Text>
              <Progress
                value={xpProgress}
                color="#00E5FF"
                size={4}
                radius={0}
                styles={{
                  root: { backgroundColor: '#272A34' },
                  section: { boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)' },
                }}
              />
            </Box>

            {/* New Mission Button */}
            <Box
              component="button"
              onClick={() => navigate('/tasks')}
              className="arcade-btn arcade-btn-primary"
              style={{
                width: '100%',
                padding: '8px 16px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <IconPlus size={14} />
              NEW MISSION
            </Box>
          </Box>
        )}

        {/* Navigation Links */}
        <Box style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Box
                key={item.text}
                component="button"
                className="nav-item-stagger animate-slide-in-right sidebar-nav-item"
                onClick={() => handleNavClick(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  borderLeft: isActive ? '4px solid #FF007F' : '4px solid transparent',
                  backgroundColor: isActive ? '#10131C' : 'transparent',
                  color: isActive ? '#E0E0E0' : '#8A8F98',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.05em',
                  textAlign: 'left' as const,
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#272A34';
                    e.currentTarget.style.color = '#00E5FF';
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#8A8F98';
                  }
                }}
              >
                {item.icon}
                {item.text}
              </Box>
            );
          })}
        </Box>

        {/* Footer */}
        <Box
          style={{
            borderTop: '1px solid rgba(59, 73, 76, 0.15)',
            padding: '12px 16px',
          }}
        >
          <Box
            component="button"
            onClick={refresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#8A8F98',
              cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              transition: 'color 0.15s ease',
            }}
          >
            <IconRefresh
              size={16}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            REFRESH
          </Box>
          <Box
            component="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#8A8F98',
              cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              transition: 'color 0.15s ease',
            }}
          >
            <IconLogout size={16} />
            LOGOUT
          </Box>
          <Text
            mt="xs"
            ta="center"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.5625rem',
              color: '#5A5E66',
              letterSpacing: '0.1em',
            }}
          >
            v{__APP_VERSION__}
          </Text>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        style={{
          flex: 1,
          marginLeft: 256,
          minHeight: '100vh',
        }}
      >
        <Box px="xl" py="lg" maw={1200} mx="auto" className="page-content-enter">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
/* v8 ignore stop */
