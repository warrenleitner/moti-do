'use client';

import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';

export default function SettingsPage() {
  const user = useAppStore((state) => state.user);
  const updateUserPreferences = useAppStore((state) => state.updateUserPreferences);
  
  const [theme, setTheme] = useState(user.preferences.theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user.preferences.notificationsEnabled || false
  );
  const [habitReminders, setHabitReminders] = useState(
    user.preferences.habitReminders || false
  );
  const [taskReminders, setTaskReminders] = useState(
    user.preferences.taskReminders || false
  );
  
  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value as 'light' | 'dark' | 'system';
    setTheme(newTheme);
    updateUserPreferences({
      theme: newTheme
    });
  };
  
  const handleNotificationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotificationsEnabled(event.target.checked);
    updateUserPreferences({
      notificationsEnabled: event.target.checked
    });
  };
  
  const handleHabitRemindersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHabitReminders(event.target.checked);
    updateUserPreferences({
      habitReminders: event.target.checked
    });
  };
  
  const handleTaskRemindersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskReminders(event.target.checked);
    updateUserPreferences({
      taskReminders: event.target.checked
    });
  };

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your Moti-Do experience.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Theme
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <RadioGroup
            aria-label="theme"
            name="theme"
            value={theme}
            onChange={handleThemeChange}
          >
            <FormControlLabel value="light" control={<Radio />} label="Light" />
            <FormControlLabel value="dark" control={<Radio />} label="Dark" />
            <FormControlLabel value="system" control={<Radio />} label="System" />
          </RadioGroup>
        </FormControl>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Notifications
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={notificationsEnabled} 
                onChange={handleNotificationsChange} 
                name="notifications" 
              />
            }
            label="Enable notifications"
          />
          
          <Box sx={{ ml: 3, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={habitReminders} 
                  onChange={handleHabitRemindersChange} 
                  name="habitReminders"
                  disabled={!notificationsEnabled}
                />
              }
              label="Habit reminders"
            />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={taskReminders} 
                  onChange={handleTaskRemindersChange} 
                  name="taskReminders" 
                  disabled={!notificationsEnabled}
                />
              }
              label="Task reminders"
            />
          </Box>
        </FormControl>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Data Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button variant="outlined" color="primary">
            Export Data
          </Button>
          <Button variant="outlined" color="primary">
            Import Data
          </Button>
          <Button variant="outlined" color="error">
            Reset All Data
          </Button>
        </Box>
      </Paper>
    </Layout>
  );
} 