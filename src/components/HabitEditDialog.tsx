'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Chip,
  Box,
  Typography,
  Checkbox,
  Stack,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Habit, RecurrenceType, WeekDay } from '@/models/Habit';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';
import { Task } from '@/models/Task';

interface HabitEditDialogProps {
  open: boolean;
  onClose: () => void;
  habit: Habit | null;
}

export default function HabitEditDialog({ open, onClose, habit }: HabitEditDialogProps) {
  const updateHabit = useAppStore((state) => state.updateHabit);
  const tags = useAppStore((state) => state.tags);
  const projects = useAppStore((state) => state.projects);
  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [importance, setImportance] = useState('Medium');
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState('Medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  
  // Dependencies
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [selectedDependency, setSelectedDependency] = useState<Task | null>(null);
  
  // Recurrence settings
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedWeekDays, setSelectedWeekDays] = useState<WeekDay[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [monthOfYear, setMonthOfYear] = useState(1);
  const [isLastDay, setIsLastDay] = useState(false);
  
  // Advanced recurrence settings
  const [advanceDisplay, setAdvanceDisplay] = useState(0);
  const [advanceDisplayUnit, setAdvanceDisplayUnit] = useState<'immediate' | 'days' | 'weeks' | 'months'>('days');
  const [advanceDisplayNumber, setAdvanceDisplayNumber] = useState(1);

  // Initialize form with habit data when opened
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setStartDate(habit.startDate ? new Date(habit.startDate) : null);
      setDueDate(habit.dueDate ? new Date(habit.dueDate) : null);
      setImportance(habit.importance);
      setDifficulty(habit.difficulty);
      setDuration(habit.duration);
      setSelectedTags(habit.tags);
      setSelectedProject(habit.projectId);
      setDependencies(habit.dependencies || []);
      
      // Set recurrence options
      const recurrence = habit.recurrence;
      setRecurrenceType(recurrence.type);
      setRecurrenceInterval(recurrence.interval || 1);
      setSelectedWeekDays(recurrence.weekDays || []);
      setDayOfMonth(recurrence.dayOfMonth || 1);
      setMonthOfYear(recurrence.monthOfYear || 1);
      setIsLastDay(recurrence.isLastDay || false);
      
      // Set advance display
      if (recurrence.advanceDisplay !== undefined) {
        if (recurrence.advanceDisplay === 0) {
          setAdvanceDisplayUnit('immediate');
          setAdvanceDisplayNumber(1);
        } else if (recurrence.advanceDisplay % 30 === 0) {
          setAdvanceDisplayUnit('months');
          setAdvanceDisplayNumber(recurrence.advanceDisplay / 30);
        } else if (recurrence.advanceDisplay % 7 === 0) {
          setAdvanceDisplayUnit('weeks');
          setAdvanceDisplayNumber(recurrence.advanceDisplay / 7);
        } else {
          setAdvanceDisplayUnit('days');
          setAdvanceDisplayNumber(recurrence.advanceDisplay);
        }
        setAdvanceDisplay(recurrence.advanceDisplay);
      }
    }
  }, [habit]);

  const handleSave = () => {
    if (!habit) return;
    
    // Calculate advance display days based on unit
    let calculatedAdvanceDisplay = 0;
    if (advanceDisplayUnit === 'immediate') {
      calculatedAdvanceDisplay = 0;
    } else if (advanceDisplayUnit === 'days') {
      calculatedAdvanceDisplay = advanceDisplayNumber;
    } else if (advanceDisplayUnit === 'weeks') {
      calculatedAdvanceDisplay = advanceDisplayNumber * 7;
    } else if (advanceDisplayUnit === 'months') {
      calculatedAdvanceDisplay = advanceDisplayNumber * 30;
    }
    
    // Build recurrence rule based on selected type
    const recurrence = {
      type: recurrenceType,
      interval: recurrenceInterval,
      weekDays: recurrenceType === 'weekly' ? selectedWeekDays : undefined,
      dayOfMonth: recurrenceType === 'monthly' || recurrenceType === 'yearly' ? dayOfMonth : undefined,
      monthOfYear: recurrenceType === 'yearly' ? monthOfYear : undefined,
      isLastDay: recurrenceType === 'monthly' ? isLastDay : undefined,
      advanceDisplay: calculatedAdvanceDisplay
    };
    
    updateHabit(habit.id, {
      title,
      description,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      importance: importance as Habit['importance'],
      difficulty: difficulty as Habit['difficulty'],
      duration: duration as Habit['duration'],
      tags: selectedTags,
      projectId: selectedProject,
      recurrence,
      dependencies
    });
    
    onClose();
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  const handleWeekDayToggle = (day: WeekDay) => {
    setSelectedWeekDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddDependency = () => {
    if (selectedDependency && !dependencies.includes(selectedDependency.id)) {
      setDependencies([...dependencies, selectedDependency.id]);
      setSelectedDependency(null);
    }
  };

  const handleRemoveDependency = (dependencyId: string) => {
    setDependencies(dependencies.filter(id => id !== dependencyId));
  };

  // Get available dependencies (tasks that aren't already dependencies and aren't completed)
  const getAvailableTasks = () => {
    return tasks.filter(t => 
      !dependencies.includes(t.id) &&
      !t.completedAt // Don't show completed tasks
    );
  };

  // Get task by ID
  const getTaskById = (id: string) => {
    return tasks.find(t => t.id === id);
  };

  if (!habit) return null;

  const weekdays: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Habit</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Initial Due Date"
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Importance</InputLabel>
              <Select
                value={importance}
                label="Importance"
                onChange={(e) => setImportance(e.target.value)}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Defcon One">Defcon One</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={difficulty}
                label="Difficulty"
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <MenuItem value="Trivial">Trivial</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Herculean">Herculean</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Duration</InputLabel>
              <Select
                value={duration}
                label="Duration"
                onChange={(e) => setDuration(e.target.value)}
              >
                <MenuItem value="Trivial">Trivial</MenuItem>
                <MenuItem value="Short">Short</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Long">Long</MenuItem>
                <MenuItem value="Odysseyan">Odysseyan</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Recurrence Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="recurrence-type-label">Recurrence</InputLabel>
                  <Select
                    labelId="recurrence-type-label"
                    id="recurrence-type"
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    label="Recurrence"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Repeat Every"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                  InputProps={{
                    inputProps: { min: 1 }
                  }}
                  size="small"
                />
              </Grid>
              
              {recurrenceType === 'weekly' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Repeat on
                  </Typography>
                  <FormGroup row>
                    {weekdays.map((day) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            checked={selectedWeekDays.includes(day)}
                            onChange={() => handleWeekDayToggle(day)}
                          />
                        }
                        label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      />
                    ))}
                  </FormGroup>
                </Grid>
              )}
              
              {recurrenceType === 'monthly' && (
                <Grid item xs={12}>
                  <FormControl fullWidth margin="normal">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isLastDay}
                          onChange={(e) => setIsLastDay(e.target.checked)}
                        />
                      }
                      label="Last day of month"
                    />
                    {!isLastDay && (
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="day-of-month-label">Day of month</InputLabel>
                        <Select
                          labelId="day-of-month-label"
                          value={dayOfMonth}
                          label="Day of month"
                          onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        >
                          {[...Array(31)].map((_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              {recurrenceType === 'yearly' && (
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="month-of-year-label">Month</InputLabel>
                        <Select
                          labelId="month-of-year-label"
                          value={monthOfYear}
                          label="Month"
                          onChange={(e) => setMonthOfYear(Number(e.target.value))}
                        >
                          {months.map((month, index) => (
                            <MenuItem key={index + 1} value={index + 1}>{month}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="yearly-day-label">Day</InputLabel>
                        <Select
                          labelId="yearly-day-label"
                          value={dayOfMonth}
                          label="Day"
                          onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        >
                          {[...Array(31)].map((_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Next Occurrence Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              When should the next occurrence show up after completing a habit?
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Time before next occurrence"
              value={advanceDisplayNumber}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setAdvanceDisplayNumber(value);
              }}
              InputProps={{
                inputProps: { min: 1 }
              }}
              size="small"
              disabled={advanceDisplayUnit === 'immediate'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="advance-display-unit-label">Unit</InputLabel>
              <Select
                labelId="advance-display-unit-label"
                id="advance-display-unit"
                value={advanceDisplayUnit}
                onChange={(e) => {
                  setAdvanceDisplayUnit(e.target.value as 'immediate' | 'days' | 'weeks' | 'months');
                  if (e.target.value === 'immediate') {
                    setAdvanceDisplayNumber(1);
                  }
                }}
                label="Unit"
              >
                <MenuItem value="immediate">Immediate (next day)</MenuItem>
                <MenuItem value="days">Days before due date</MenuItem>
                <MenuItem value="weeks">Weeks before due date</MenuItem>
                <MenuItem value="months">Months before due date</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Dependencies
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={10}>
                  <Autocomplete
                    options={getAvailableTasks()}
                    getOptionLabel={(option) => option.title}
                    value={selectedDependency}
                    onChange={(_, newValue) => setSelectedDependency(newValue)}
                    renderInput={(params) => <TextField {...params} label="Add Dependency" fullWidth />}
                  />
                </Grid>
                <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button 
                    variant="contained" 
                    onClick={handleAddDependency}
                    disabled={!selectedDependency}
                    fullWidth
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            {dependencies.length > 0 ? (
              <List>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  This habit depends on these tasks:
                </Typography>
                {dependencies.map((depId) => {
                  const dependencyTask = getTaskById(depId);
                  return dependencyTask ? (
                    <ListItem key={depId} dense divider>
                      <ListItemText 
                        primary={dependencyTask.title} 
                        secondary={dependencyTask.completedAt ? 'Completed' : 'Pending'}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => handleRemoveDependency(depId)}>
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ) : null;
                })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                This habit has no dependencies.
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
              Project
            </Typography>
            <Stack direction="row" spacing={1}>
              <FormControl fullWidth>
                <Select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || undefined)}
                  displayEmpty
                  renderValue={(value) => {
                    if (!value) return "None";
                    const project = projects.find(p => p.id === value);
                    return project ? project.name : "None";
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      <Box 
                        component="span" 
                        sx={{ 
                          display: 'inline-block', 
                          width: 12, 
                          height: 12, 
                          bgcolor: project.color, 
                          borderRadius: '50%', 
                          mr: 1 
                        }} 
                      />
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  color={selectedTags.includes(tag.id) ? "primary" : "default"}
                  variant={selectedTags.includes(tag.id) ? "filled" : "outlined"}
                  onClick={() => handleTagToggle(tag.id)}
                  sx={{ 
                    bgcolor: selectedTags.includes(tag.id) ? `${tag.color}40` : 'transparent',
                    color: selectedTags.includes(tag.id) ? tag.color : 'inherit',
                    borderColor: tag.color,
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          variant="contained" 
          color="primary"
          disabled={!title.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
} 