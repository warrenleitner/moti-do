'use client';

import React, { useState, useEffect } from 'react';
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
  Collapse,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useAppStore } from '@/store/AppStore';
import Todo from '@/components/Todo';
import { Task, createTask } from '@/models/Task';
import TaskEditDialog from '@/components/TaskEditDialog';
import { TransitionGroup } from 'react-transition-group';

export default function TasksPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [undoInfo, setUndoInfo] = useState<{ action: string, taskId: string } | null>(null);
  
  // Fix hydration issues by only rendering date-dependent content on the client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const getActiveTasks = useAppStore((state) => state.getActiveTasks);
  const getFutureTasks = useAppStore((state) => state.getFutureTasks);
  const getCompletedTasks = useAppStore((state) => state.getCompletedTasks);
  const addTask = useAppStore((state) => state.addTask);
  const removeTask = useAppStore((state) => state.removeTask);
  
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
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // Create a placeholder task for the edit dialog
  const newTaskTemplate = createTask({
    title: '',
    description: '',
    importance: 'Not Set',
    difficulty: 'Not Set',
    duration: 'Not Set'
  });
  
  const handleTaskSave = (taskData: Partial<Task>) => {
    const addedTask = addTask(taskData);
    setUndoInfo({ action: 'add', taskId: addedTask.id });
    handleCloseDialog();
  };
  
  const handleUndo = () => {
    if (undoInfo && undoInfo.action === 'add') {
      removeTask(undoInfo.taskId);
    }
    setUndoInfo(null);
  };
  
  const getTasks = (): Task[] => {
    let tasks: Task[] = [];
    
    // Only fetch and display tasks once client-side code is running
    if (!mounted) return [];
    
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
      tasks = tasks.filter((task: Task) => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by project
    if (selectedProject) {
      tasks = tasks.filter((task: Task) => task.projectId === selectedProject);
    }
    
    // Filter by tag
    if (selectedTag) {
      tasks = tasks.filter((task: Task) => task.tags.includes(selectedTag));
    }
    
    // Sort tasks
    return tasks.sort((a: Task, b: Task) => {
      let result = 0;
      
      switch (sortBy) {
        case 'score':
          result = b.score - a.score;
          break;
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          result = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'title':
          result = a.title.localeCompare(b.title);
          break;
        case 'importance':
          const importanceOrder: Record<import('@/models/Task').ImportanceLevel, number> = {
            'Defcon One': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
            'Not Set': 4,
          };
          result = importanceOrder[a.importance] - importanceOrder[b.importance];
          break;
        case 'difficulty':
          const difficultyOrder: Record<import('@/models/Task').DifficultyLevel, number> = {
            'Herculean': 0,
            'High': 1,
            'Medium': 2,
            'Low': 3,
            'Trivial': 4,
            'Not Set': 5,
          };
          result = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        case 'duration':
          const durationOrder: Record<import('@/models/Task').DurationLevel, number> = {
            'Odysseyan': 0,
            'Long': 1,
            'Medium': 2,
            'Short': 3,
            'Trivial': 4,
            'Not Set': 5,
          };
          result = durationOrder[a.duration] - durationOrder[b.duration];
          break;
        default:
          result = 0;
      }
      
      return sortOrder === 'asc' ? result : -result;
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
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            placeholder="Search tasks..."
            value={searchText}
            onChange={handleSearch}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="sort-label">Sort By</InputLabel>
            <Select
              labelId="sort-label"
              id="sort-select"
              label="Sort By"
              value={sortBy}
              onChange={handleSortChange}
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
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="sort-order-label">Order</InputLabel>
            <Select
              labelId="sort-order-label"
              id="sort-order-select"
              label="Order"
              value={sortOrder}
              onChange={handleSortOrderChange}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="project-filter-label">Project</InputLabel>
            <Select
              labelId="project-filter-label"
              id="project-filter-select"
              label="Project"
              value={selectedProject}
              onChange={handleProjectChange}
            >
              <MenuItem value="">All Projects</MenuItem>
              <MenuItem value="personal">Personal</MenuItem>
              <MenuItem value="work">Work</MenuItem>
              <MenuItem value="study">Study</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel id="tag-filter-label">Tag</InputLabel>
            <Select
              labelId="tag-filter-label"
              id="tag-filter-select"
              label="Tag"
              value={selectedTag}
              onChange={handleTagChange}
            >
              <MenuItem value="">All Tags</MenuItem>
              <MenuItem value="important">Important</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="later">Later</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {tasks.length > 0 ? (
        <TransitionGroup>
          {tasks.map((task) => (
            <Collapse key={task.id}>
              <Todo task={task} />
            </Collapse>
          ))}
        </TransitionGroup>
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
      <TaskEditDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleTaskSave}
        task={newTaskTemplate}
      />

      {/* Undo Snackbar */}
      {undoInfo && (
        <Snackbar
          open={true}
          message={'Task added'}
          action={
            <Button color='secondary' size='small' onClick={handleUndo}>
              Undo
            </Button>
          }
          autoHideDuration={5000}
          onClose={() => setUndoInfo(null)}
        />
      )}
    </Box>
  );
} 