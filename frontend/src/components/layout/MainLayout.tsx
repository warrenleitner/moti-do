import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CheckBox as TasksIcon,
  Loop as HabitsIcon,
  CalendarMonth as CalendarIcon,
  ViewKanban as KanbanIcon,
  AccountTree as GraphIcon,
  Settings as SettingsIcon,
  EmojiEvents as XPIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store';
import { authApi } from '../../services/api';
import { useRefresh } from '../../hooks';
import PullToRefreshWrapper from '../common/PullToRefreshWrapper';

const DRAWER_WIDTH = 240;

interface NavItem {
  text: string;
  icon: ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
  { text: 'Habits', icon: <HabitsIcon />, path: '/habits' },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
  { text: 'Kanban', icon: <KanbanIcon />, path: '/kanban' },
  { text: 'Graph', icon: <GraphIcon />, path: '/graph' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

interface MainLayoutProps {
  children: ReactNode;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { refresh, isRefreshing } = useRefresh();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo-wordmark.png" alt="Motodo" style={{ height: 128, objectFit: 'contain' }} />
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavClick(item.path)}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User XP Display */}
      {user && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user.level}
            </Avatar>
            <Typography variant="body2" fontWeight="medium" sx={{ flexGrow: 1 }}>
              Level {user.level}
            </Typography>
            <IconButton onClick={handleLogout} size="small" title="Logout">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
          <Chip
            icon={<XPIcon sx={{ fontSize: 16 }} />}
            label={`${user.xp} XP`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, textAlign: 'center' }}
          >
            v{__APP_VERSION__}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Mobile App Bar - only shown on small screens */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', md: 'none' },
          backgroundColor: '#334155', // Slate - contrasts with logo gradient
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <img src="/logo-wordmark.png" alt="Motodo" style={{ height: 64, objectFit: 'contain' }} />
          </Box>
          <IconButton
            color="inherit"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <RefreshIcon
              sx={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 8, md: 0 },
          p: { xs: 2, md: 3 },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <PullToRefreshWrapper>{children}</PullToRefreshWrapper>
      </Box>
    </>
  );
}
/* v8 ignore stop */
