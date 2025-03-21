'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Fab,
  Grid,
  Paper,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Checkbox,
  FormGroup,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';
import HabitItem from '@/components/HabitItem';
import { DifficultyLevel, DurationLevel, ImportanceLevel } from '@/models/Task';
import { RecurrenceType, WeekDay } from '@/models/Habit';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export default function HabitsPage() {
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for new habit form
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [newHabitImportance, setNewHabitImportance] = useState<ImportanceLevel>('Medium');
  const [newHabitDifficulty, setNewHabitDifficulty] = useState<DifficultyLevel>('Medium');
  const [newHabitDuration, setNewHabitDuration] = useState<DurationLevel>('Medium');
  const [newHabitStartDate, setNewHabitStartDate] = useState<Date | null>(null);
  
  // Recurrence settings
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [interval, setInterval] = useState(1);
  const [weekDays, setWeekDays] = useState<WeekDay[]>(['monday', 'wednesday', 'friday']);
  const [isLastDay, setIsLastDay] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  
  const getActiveHabits = useAppStore((state) => state.getActiveHabits);
  const addHabit = useAppStore((state) => state.addHabit);
  
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleOpenDialog = () => {
    // Reset form fields
    setNewHabitTitle('');
    setNewHabitDescription('');
    setNewHabitImportance('Medium');
    setNewHabitDifficulty('Medium');
    setNewHabitDuration('Medium');
    setNewHabitStartDate(null);
    setRecurrenceType('daily');
    setInterval(1);
    setWeekDays(['monday', 'wednesday', 'friday']);
    setIsLastDay(false);
    setDayOfMonth(1);
    
    // Open dialog
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleWeekdayChange = (day: WeekDay) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setWeekDays([...weekDays, day]);
    } else {
      setWeekDays(weekDays.filter(d => d !== day));
    }
  };
  
  const handleAddHabit = () => {
    // Validate form
    if (!newHabitTitle.trim()) {
      return; // Don't submit if no title
    }
    
    // Prepare recurrence rule
    const recurrenceRule = {
      type: recurrenceType,
      interval: interval,
    } as any; // Using any to avoid TypeScript errors with the conditional properties
    
    // Add type-specific properties
    if (recurrenceType === 'weekly') {
      recurrenceRule.weekDays = weekDays;
    } else if (recurrenceType === 'monthly') {
      if (isLastDay) {
        recurrenceRule.isLastDay = true;
      } else {
        recurrenceRule.dayOfMonth = dayOfMonth;
      }
    }
    
    // Add the habit
    addHabit({
      title: newHabitTitle.trim(),
      description: newHabitDescription.trim() || undefined,
      importance: newHabitImportance,
      difficulty: newHabitDifficulty,
      duration: newHabitDuration,
      startDate: newHabitStartDate || undefined,
      recurrence: recurrenceRule,
      subtaskRecurrenceOption: 'default',
    });
    
    // Close dialog
    setDialogOpen(false);
  };
  
  const getHabits = () => {
    let habits = getActiveHabits();
    
    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      habits = habits.filter(
        (habit) =>
          habit.title.toLowerCase().includes(searchLower) ||
          (habit.description && habit.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort habits
    return habits.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'importance':
          const importanceOrder = {
            'Defcon One': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
          };
          return importanceOrder[a.importance] - importanceOrder[b.importance];
        case 'difficulty':
          const difficultyOrder = {
            'Herculean': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
            'Trivial': 4,
          };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'streak':
          return b.streak.current - a.streak.current;
        default:
          return 0;
      }
    });
  };
  
  const habits = getHabits();
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Habits
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Search habits..."
            value={searchText}
            onChange={handleSearch}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="sort-label">Sort By</InputLabel>
            <Select
              labelId="sort-label"
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
            >
              <MenuItem value="score">Score</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="importance">Importance</MenuItem>
              <MenuItem value="difficulty">Difficulty</MenuItem>
              <MenuItem value="streak">Current Streak</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {habits.length > 0 ? (
        habits.map((habit) => <HabitItem key={habit.id} habit={habit} />)
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No habits found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You don't have any habits yet. Create a new one to start building your routine!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Create Habit
          </Button>
        </Paper>
      )}
      
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={handleOpenDialog}
      >
        <AddIcon />
      </Fab>
      
      {/* New Habit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Habit
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ my: 1 }}>
            <TextField
              label="Title"
              fullWidth
              required
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              autoFocus
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newHabitDescription}
              onChange={(e) => setNewHabitDescription(e.target.value)}
            />
            
            <FormControl fullWidth>
              <InputLabel>Importance</InputLabel>
              <Select
                value={newHabitImportance}
                onChange={(e) => setNewHabitImportance(e.target.value as ImportanceLevel)}
                label="Importance"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Defcon One">Defcon One</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={newHabitDifficulty}
                onChange={(e) => setNewHabitDifficulty(e.target.value as DifficultyLevel)}
                label="Difficulty"
              >
                <MenuItem value="Trivial">Trivial</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Herculean">Herculean</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select
                value={newHabitDuration}
                onChange={(e) => setNewHabitDuration(e.target.value as DurationLevel)}
                label="Duration"
              >
                <MenuItem value="Trivial">Trivial</MenuItem>
                <MenuItem value="Short">Short</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Long">Long</MenuItem>
                <MenuItem value="Odysseyan">Odysseyan</MenuItem>
              </Select>
            </FormControl>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date (Optional)"
                value={newHabitStartDate}
                onChange={(newDate: Date | null) => setNewHabitStartDate(newDate)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
            
            <Divider sx={{ my: 1 }} />
            
            <FormControl component="fieldset">
              <FormLabel component="legend">Recurrence</FormLabel>
              <RadioGroup
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              >
                <FormControlLabel value="daily" control={<Radio />} label="Daily" />
                <FormControlLabel value="weekly" control={<Radio />} label="Weekly" />
                <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
              </RadioGroup>
            </FormControl>
            
            {recurrenceType === 'daily' && (
              <FormControl fullWidth>
                <InputLabel>Every X Days</InputLabel>
                <Select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  label="Every X Days"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <MenuItem key={n} value={n}>
                      {n === 1 ? 'Every day' : `Every ${n} days`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {recurrenceType === 'weekly' && (
              <FormControl component="fieldset">
                <FormLabel component="legend">Repeat on</FormLabel>
                <FormGroup row>
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('monday')} onChange={handleWeekdayChange('monday')} />}
                    label="Mon"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('tuesday')} onChange={handleWeekdayChange('tuesday')} />}
                    label="Tue"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('wednesday')} onChange={handleWeekdayChange('wednesday')} />}
                    label="Wed"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('thursday')} onChange={handleWeekdayChange('thursday')} />}
                    label="Thu"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('friday')} onChange={handleWeekdayChange('friday')} />}
                    label="Fri"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('saturday')} onChange={handleWeekdayChange('saturday')} />}
                    label="Sat"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={weekDays.includes('sunday')} onChange={handleWeekdayChange('sunday')} />}
                    label="Sun"
                  />
                </FormGroup>
              </FormControl>
            )}
            
            {recurrenceType === 'monthly' && (
              <Box>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={isLastDay ? 'last' : 'specific'}
                    onChange={(e) => setIsLastDay(e.target.value === 'last')}
                  >
                    <FormControlLabel value="specific" control={<Radio />} label="On day" />
                    <FormControlLabel value="last" control={<Radio />} label="On the last day" />
                  </RadioGroup>
                </FormControl>
                
                {!isLastDay && (
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Day of month</InputLabel>
                    <Select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      label="Day of month"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <MenuItem key={day} value={day}>
                          {day}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleAddHabit} 
            variant="contained" 
            disabled={!newHabitTitle.trim() || (recurrenceType === 'weekly' && weekDays.length === 0)}
          >
            Create Habit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 