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
  FormGroup
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Habit, RecurrenceType, WeekDay } from '@/models/Habit';
import { useAppStore } from '@/store/AppStore';

interface HabitEditDialogProps {
  open: boolean;
  onClose: () => void;
  habit: Habit | null;
}

export default function HabitEditDialog({ open, onClose, habit }: HabitEditDialogProps) {
  const updateHabit = useAppStore((state) => state.updateHabit);
  const tags = useAppStore((state) => state.tags);
  const projects = useAppStore((state) => state.projects);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [importance, setImportance] = useState('Medium');
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState('Medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  
  // Recurrence settings
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedWeekDays, setSelectedWeekDays] = useState<WeekDay[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [monthOfYear, setMonthOfYear] = useState(1);
  const [isLastDay, setIsLastDay] = useState(false);

  // Initialize form with habit data when opened
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setStartDate(habit.startDate ? new Date(habit.startDate) : null);
      setImportance(habit.importance);
      setDifficulty(habit.difficulty);
      setDuration(habit.duration);
      setSelectedTags(habit.tags);
      setSelectedProject(habit.projectId);
      
      // Set recurrence options
      const recurrence = habit.recurrence;
      setRecurrenceType(recurrence.type);
      setRecurrenceInterval(recurrence.interval || 1);
      setSelectedWeekDays(recurrence.weekDays || []);
      setDayOfMonth(recurrence.dayOfMonth || 1);
      setMonthOfYear(recurrence.monthOfYear || 1);
      setIsLastDay(recurrence.isLastDay || false);
    }
  }, [habit]);

  const handleSave = () => {
    if (!habit) return;
    
    // Build recurrence rule based on selected type
    const recurrence = {
      type: recurrenceType,
      interval: recurrenceType === 'daily' ? recurrenceInterval : undefined,
      weekDays: recurrenceType === 'weekly' ? selectedWeekDays : undefined,
      dayOfMonth: recurrenceType === 'monthly' || recurrenceType === 'yearly' ? dayOfMonth : undefined,
      monthOfYear: recurrenceType === 'yearly' ? monthOfYear : undefined,
      isLastDay: recurrenceType === 'monthly' ? isLastDay : undefined
    };
    
    updateHabit(habit.id, {
      title,
      description,
      startDate: startDate || undefined,
      importance: importance as Habit['importance'],
      difficulty: difficulty as Habit['difficulty'],
      duration: duration as Habit['duration'],
      tags: selectedTags,
      projectId: selectedProject,
      recurrence
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
          
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
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
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
              Recurrence
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Recurrence Type</InputLabel>
              <Select
                value={recurrenceType}
                label="Recurrence Type"
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
            
            {recurrenceType === 'daily' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Repeat every
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    type="number"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 30 }}
                    sx={{ width: 80 }}
                  />
                  <Typography>
                    {recurrenceInterval === 1 ? 'day' : 'days'}
                  </Typography>
                </Stack>
              </Box>
            )}
            
            {recurrenceType === 'weekly' && (
              <Box sx={{ mt: 2 }}>
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
              </Box>
            )}
            
            {recurrenceType === 'monthly' && (
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isLastDay}
                      onChange={(e) => setIsLastDay(e.target.checked)}
                    />
                  }
                  label="Last day of month"
                />
                
                {!isLastDay && (
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">
                      Day of month:
                    </Typography>
                    <TextField
                      type="number"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 31 }}
                      sx={{ width: 80 }}
                    />
                  </Stack>
                )}
              </Box>
            )}
            
            {recurrenceType === 'yearly' && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={monthOfYear}
                      label="Month"
                      onChange={(e) => setMonthOfYear(Number(e.target.value))}
                    >
                      {months.map((month, index) => (
                        <MenuItem key={month} value={index + 1}>
                          {month}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Typography variant="subtitle2">
                    Day:
                  </Typography>
                  <TextField
                    type="number"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 31 }}
                    sx={{ width: 80 }}
                  />
                </Stack>
              </Box>
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