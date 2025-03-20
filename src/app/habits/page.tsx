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
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';
import HabitItem from '@/components/HabitItem';

export default function HabitsPage() {
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  
  const getActiveHabits = useAppStore((state) => state.getActiveHabits);
  const addHabit = useAppStore((state) => state.addHabit);
  
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleAddHabit = () => {
    addHabit({
      title: 'New habit',
      importance: 'Medium',
      difficulty: 'Medium',
      duration: 'Medium',
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      subtaskRecurrenceOption: 'default',
    });
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
            onClick={handleAddHabit}
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
        onClick={handleAddHabit}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
} 