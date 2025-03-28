'use client';

import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useAppStore } from '@/store/AppStore';
import HabitItem from '@/components/HabitItem';
import { 
  Habit, 
  createHabit
} from '@/models/Habit';
import HabitEditDialog from '@/components/HabitEditDialog';

export default function HabitsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Fix hydration issues by only rendering date-dependent content on the client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const activeHabits = useAppStore((state) => state.getActiveHabits);
  const completedHabitsToday = useAppStore((state) => state.getCompletedHabitsToday);
  const futureHabits = useAppStore((state) => state.getFutureHabits);
  const addHabit = useAppStore((state) => state.addHabit);
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };
  
  const handleSortOrderChange = (event: SelectChangeEvent) => {
    setSortOrder(event.target.value as 'asc' | 'desc');
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleProjectChange = (event: SelectChangeEvent) => {
    setSelectedProject(event.target.value);
  };
  
  const handleTagChange = (event: SelectChangeEvent) => {
    setSelectedTag(event.target.value);
  };
  
  const handleOpenDialog = () => {
    // Open dialog
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const getHabits = () => {
    let habits = [];
    
    // Only fetch and display habits once client-side code is running
    if (!mounted) return [];
    
    switch (tabValue) {
      case 0: // Active
        habits = activeHabits();
        break;
      case 1: // Completed Today
        habits = completedHabitsToday();
        break;
      case 2: // Future
        habits = futureHabits();
        break;
      default:
        habits = activeHabits();
    }
    
    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      habits = habits.filter(
        (habit) =>
          habit.title.toLowerCase().includes(searchLower) ||
          (habit.description && habit.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by project
    if (selectedProject) {
      habits = habits.filter(habit => habit.projectId === selectedProject);
    }
    
    // Filter by tag
    if (selectedTag) {
      habits = habits.filter(habit => habit.tags.includes(selectedTag));
    }
    
    // Sort habits
    return habits.sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case 'score':
          result = b.score - a.score;
          break;
        case 'title':
          result = a.title.localeCompare(b.title);
          break;
        case 'importance':
          const importanceOrder = {
            'Defcon One': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
            'Not Set': 4,
          };
          result = importanceOrder[a.importance] - importanceOrder[b.importance];
          break;
        case 'difficulty':
          const difficultyOrder = {
            'Herculean': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
            'Trivial': 4,
            'Not Set': 5,
          };
          result = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        case 'streak':
          result = b.streak.current - a.streak.current;
          break;
        default:
          result = 0;
      }
      
      return sortOrder === 'asc' ? result : -result;
    });
  };
  
  const habits = getHabits();
  
  // Create a placeholder habit for the edit dialog
  const newHabitTemplate = createHabit({
    title: '',
    description: '',
    importance: 'Medium',
    difficulty: 'Medium',
    duration: 'Medium',
    recurrence: {
      type: 'daily',
      interval: 1
    }
  });
  
  const handleHabitSave = (habitData: Partial<Habit>) => {
    addHabit(habitData);
    handleCloseDialog();
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Habits
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
          <Tab label="Completed Today" />
          <Tab label="Future" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
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
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="sort-order-label">Order</InputLabel>
            <Select
              labelId="sort-order-label"
              value={sortOrder}
              onChange={handleSortOrderChange}
              label="Order"
            >
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="project-filter-label">Project</InputLabel>
            <Select
              labelId="project-filter-label"
              value={selectedProject}
              onChange={handleProjectChange}
              label="Project"
            >
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="tag-filter-label">Tag</InputLabel>
            <Select
              labelId="tag-filter-label"
              value={selectedTag}
              onChange={handleTagChange}
              label="Tag"
            >
              <MenuItem value="">All Tags</MenuItem>
              {tags.map(tag => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {habits.length > 0 ? (
        habits.map((habit) => {
          // Check if habit is completed today
          const isCompletedToday = habit.completions.some(c => {
            const today = new Date();
            const completionDate = new Date(c.date);
            return completionDate.getDate() === today.getDate() && 
                   completionDate.getMonth() === today.getMonth() &&
                   completionDate.getFullYear() === today.getFullYear() &&
                   c.completed;
          });
          return <HabitItem key={`${habit.id}-${isCompletedToday ? 'completed' : 'active'}-${Date.now()}`} habit={habit} />;
        })
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No habits found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You don&apos;t have any habits yet. Create a new one to start building your routine!
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
      <HabitEditDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleHabitSave}
        habit={newHabitTemplate}
      />
    </Box>
  );
} 