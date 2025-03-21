'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  ThemeProvider,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  CheckCircle as TaskIcon,
  Repeat as HabitIcon,
  CalendarToday as CalendarIcon,
  Tag as TagIcon,
  Psychology as ProjectIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  AccountTree as DependenciesIcon,
} from '@mui/icons-material';
import { lightTheme, darkTheme } from '@/lib/theme';
import { useAppStore } from '@/store/AppStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const drawerWidth = 280;

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = mode === 'light' ? lightTheme : darkTheme;
  
  const user = useAppStore((state) => state.user);
  const updateUserPreferences = useAppStore((state) => state.updateUserPreferences);
  const router = useRouter();
  
  useEffect(() => {
    // Set initial theme based on user preference or system preference
    const userTheme = user.preferences.theme;
    if (userTheme === 'system') {
      setMode(prefersDarkMode ? 'dark' : 'light');
    } else {
      setMode(userTheme === 'dark' ? 'dark' : 'light');
    }
  }, [user.preferences.theme, prefersDarkMode]);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    updateUserPreferences({
      theme: newMode,
    });
  };
  
  const menuItems = [
    { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' },
    { text: 'Habits', icon: <HabitIcon />, path: '/habits' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Dependencies', icon: <DependenciesIcon />, path: '/dependencies' },
    { text: 'Tags', icon: <TagIcon />, path: '/tags' },
    { text: 'Projects', icon: <ProjectIcon />, path: '/projects' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  const drawer = (
    <>
      <Toolbar>
        <Typography 
          variant="h6" 
          component={Link} 
          href="/" 
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': {
              cursor: 'pointer',
            },
          }}
        >
          Moti-Do
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ display: { sm: 'none' } }}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Box sx={{ px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton sx={{ mr: 1, bgcolor: theme.palette.primary.main, color: 'white' }}>
            <PersonIcon />
          </IconButton>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              XP: {user.xp}
            </Typography>
          </Box>
        </Box>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              href={item.path}
              onClick={() => setMobileOpen(false)}
              sx={{ 
                borderRadius: 2, 
                mx: 1,
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main + '20',
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
  
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              noWrap 
              component={Link} 
              href="/" 
              sx={{ 
                flexGrow: 1, 
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': {
                  cursor: 'pointer',
                },
              }}
            >
              Moti-Do
            </Typography>
            <IconButton color="inherit" onClick={toggleTheme}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Toolbar />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
} 