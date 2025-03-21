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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';
import Todo from '@/components/Todo';
import { DifficultyLevel, DurationLevel, ImportanceLevel } from '@/models/Task';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export default function TasksPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for new task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskImportance, setNewTaskImportance] = useState<ImportanceLevel>('Medium');
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<DifficultyLevel>('Medium');
  const [newTaskDuration, setNewTaskDuration] = useState<DurationLevel>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(null);
  
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
  
  const handleOpenDialog = () => {
    // Reset form fields
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskImportance('Medium');
    setNewTaskDifficulty('Medium');
    setNewTaskDuration('Medium');
    setNewTaskDueDate(null);
    
    // Open dialog
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleAddTask = () => {
    // Validate form
    if (!newTaskTitle.trim()) {
      return; // Don't submit if no title
    }
    
    // Add the task
    addTask({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      importance: newTaskImportance,
      difficulty: newTaskDifficulty,
      duration: newTaskDuration,
      dueDate: newTaskDueDate || undefined
    });
    
    // Close dialog
    setDialogOpen(false);
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
              onClick={handleOpenDialog}
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
        onClick={handleOpenDialog}
      >
        <AddIcon />
      </Fab>

      {/* New Task Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Task
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
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />
            
            <FormControl fullWidth>
              <InputLabel>Importance</InputLabel>
              <Select
                value={newTaskImportance}
                onChange={(e) => setNewTaskImportance(e.target.value as ImportanceLevel)}
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
                value={newTaskDifficulty}
                onChange={(e) => setNewTaskDifficulty(e.target.value as DifficultyLevel)}
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
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value as DurationLevel)}
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
                label="Due Date (Optional)"
                value={newTaskDueDate}
                onChange={(newDate) => setNewTaskDueDate(newDate)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleAddTask} 
            variant="contained" 
            disabled={!newTaskTitle.trim()}
          >
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 