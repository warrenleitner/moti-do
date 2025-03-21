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
  InputLabel,
  Slider,
  Grid,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as InfoIcon 
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';

export default function SettingsPage() {
  const user = useAppStore((state) => state.user);
  const updateUserPreferences = useAppStore((state) => state.updateUserPreferences);
  const toggleVacationMode = useAppStore((state) => state.toggleVacationMode);
  
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
  
  // Create state for all scoring weights
  const [scoringWeights, setScoringWeights] = useState({
    dueDateWeight: user.preferences.scoringWeights.dueDate * 10,
    startDateWeight: user.preferences.scoringWeights.startDate * 10,
    taskAgeWeight: user.preferences.scoringWeights.taskAge * 10,
    isNextWeight: user.preferences.scoringWeights.isNext * 5,
    inProgressWeight: user.preferences.scoringWeights.inProgress * 5,
    dependencyMultiplierWeight: user.preferences.scoringWeights.dependencyMultiplier * 10,
    habitStreakMultiplierWeight: user.preferences.scoringWeights.habitStreakMultiplier * 100
  });
  
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
  
  const handleVacationModeToggle = () => {
    toggleVacationMode();
  };
  
  // Handle scoring weight changes
  const handleScoringWeightChange = (name: string) => (event: Event, newValue: number | number[]) => {
    setScoringWeights({
      ...scoringWeights,
      [name]: newValue as number
    });
    
    // Update the actual scoring weights in the store
    let updatedScoringWeights = { ...user.preferences.scoringWeights };
    
    switch (name) {
      case 'dueDateWeight':
        updatedScoringWeights.dueDate = (newValue as number) / 10;
        break;
      case 'startDateWeight':
        updatedScoringWeights.startDate = (newValue as number) / 10;
        break;
      case 'taskAgeWeight':
        updatedScoringWeights.taskAge = (newValue as number) / 10;
        break;
      case 'isNextWeight':
        updatedScoringWeights.isNext = (newValue as number) / 5;
        break;
      case 'inProgressWeight':
        updatedScoringWeights.inProgress = (newValue as number) / 5;
        break;
      case 'dependencyMultiplierWeight':
        updatedScoringWeights.dependencyMultiplier = (newValue as number) / 10;
        break;
      case 'habitStreakMultiplierWeight':
        updatedScoringWeights.habitStreakMultiplier = (newValue as number) / 100;
        break;
    }
    
    updateUserPreferences({
      scoringWeights: updatedScoringWeights
    });
  };

  // Function to render a slider with tooltip
  const renderWeightSlider = (
    name: string, 
    label: string, 
    value: number, 
    min: number, 
    max: number, 
    step: number,
    tooltip: string
  ) => {
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Tooltip title={tooltip} placement="top">
            <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </Tooltip>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleScoringWeightChange(name)}
              aria-labelledby={`${name}-slider`}
            />
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              {value}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
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
          Scoring Algorithm
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Customize how task and habit scores are calculated. Higher scores indicate higher priority.
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Scoring Weights</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderWeightSlider(
                'dueDateWeight', 
                'Due Date Weight', 
                scoringWeights.dueDateWeight, 
                0, 
                30, 
                1,
                'How much weight to give to tasks with approaching due dates. Higher values prioritize tasks due soon.'
              )}
              
              {renderWeightSlider(
                'startDateWeight', 
                'Start Date Weight', 
                scoringWeights.startDateWeight, 
                0, 
                10, 
                0.5,
                'How much weight to give to tasks with approaching start dates.'
              )}
              
              {renderWeightSlider(
                'taskAgeWeight', 
                'Task Age Weight', 
                scoringWeights.taskAgeWeight, 
                0, 
                10, 
                0.5,
                'How much weight to give to older tasks. Higher values prioritize tasks that have been in your list longer.'
              )}
              
              {renderWeightSlider(
                'isNextWeight', 
                'Next Task Boost', 
                scoringWeights.isNextWeight, 
                0, 
                20, 
                1,
                'Additional points given to tasks marked as "Next".'
              )}
              
              {renderWeightSlider(
                'inProgressWeight', 
                'In Progress Boost', 
                scoringWeights.inProgressWeight, 
                0, 
                20, 
                1,
                'Additional points given to tasks marked as "In Progress".'
              )}
              
              {renderWeightSlider(
                'dependencyMultiplierWeight', 
                'Dependency Multiplier', 
                scoringWeights.dependencyMultiplierWeight, 
                0, 
                20, 
                1,
                'How much to boost tasks that other tasks depend on. Higher values prioritize tasks that block others.'
              )}
              
              {renderWeightSlider(
                'habitStreakMultiplierWeight', 
                'Habit Streak Multiplier', 
                scoringWeights.habitStreakMultiplierWeight, 
                0, 
                50, 
                1,
                'How much to boost habits based on current streak length. Higher values reward maintaining longer streaks.'
              )}
            </AccordionDetails>
          </Accordion>
          
          <FormControlLabel
            control={
              <Switch 
                checked={user.preferences.vacationMode} 
                onChange={handleVacationModeToggle} 
                name="vacationMode" 
              />
            }
            label="Vacation Mode"
            sx={{ mt: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
            When enabled, all tasks and habits scoring is paused. Use this when you're on vacation or need a break.
          </Typography>
        </Box>
        
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