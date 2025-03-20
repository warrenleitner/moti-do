'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
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
import Todo from '@/components/Todo';

export default function TasksPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  
  const getActiveTasks = useAppStore((state) => state.getActiveTasks);
  const getFutureTasks = useAppStore((state) => state.getFutureTasks);
  const getCompletedTasks = useAppStore((state) => state.getCompletedTasks);
  const addTask = useAppStore((state) => state.addTask);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleAddTask = () => {
    addTask({
      title: 'New task',
      importance: 'Medium',
      difficulty: 'Medium',
      duration: 'Medium',
    });
  };
  
  const getTasks = () => {
    let tasks = [];
    
    switch (tabValue) {
      case 0: // Active
        tasks = getActiveTasks();
        break;
      case 1: // Future
        tasks = getFutureTasks();
        break;
      case 2: // Completed
        tasks = getCompletedTasks();
        break;
      default:
        tasks = getActiveTasks();
    }
    
    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort tasks
    return tasks.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
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
        case 'duration':
          const durationOrder = {
            'Odysseyan': 0,
            'Long': 1,
            'Medium': 2,
            'Short': 3,
            'Trivial': 4,
          };
          return durationOrder[a.duration] - durationOrder[b.duration];
        default:
          return 0;
      }
    });
  };
  
  const tasks = getTasks();
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Active" />
          <Tab label="Future" />
          <Tab label="Completed" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Search tasks..."
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
              <MenuItem value="dueDate">Due Date</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="importance">Importance</MenuItem>
              <MenuItem value="difficulty">Difficulty</MenuItem>
              <MenuItem value="duration">Duration</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {tasks.length > 0 ? (
        tasks.map((task) => <Todo key={task.id} task={task} />)
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {tabValue === 0
              ? "You don't have any active tasks. Create a new one!"
              : tabValue === 1
              ? "You don't have any future tasks scheduled."
              : "You haven't completed any tasks yet."}
          </Typography>
          {tabValue === 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddTask}
            >
              Create Task
            </Button>
          )}
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
        onClick={handleAddTask}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
} 