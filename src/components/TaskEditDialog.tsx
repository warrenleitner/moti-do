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
  IconButton,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Task } from '@/models/Task';
import { Add as AddIcon, Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onSave?: (taskData: Partial<Task>) => void;
}

export default function TaskEditDialog({ open, onClose, task, onSave }: TaskEditDialogProps) {
  const updateTask = useAppStore((state) => state.updateTask);
  const tasks = useAppStore((state) => state.tasks);
  const tags = useAppStore((state) => state.tags);
  const projects = useAppStore((state) => state.projects);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [importance, setImportance] = useState('Medium');
  const [difficulty, setDifficulty] = useState('Medium');
  const [duration, setDuration] = useState('Medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [selectedDependency, setSelectedDependency] = useState<Task | null>(null);

  // Initialize form with task data when opened
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStartDate(task.startDate ? new Date(task.startDate) : null);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      setImportance(task.importance);
      setDifficulty(task.difficulty);
      setDuration(task.duration);
      setSelectedTags(task.tags);
      setSelectedProject(task.projectId);
      setDependencies(task.dependencies || []);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;
    
    const taskData = {
      title,
      description,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      importance: importance as Task['importance'],
      difficulty: difficulty as Task['difficulty'],
      duration: duration as Task['duration'],
      tags: selectedTags,
      projectId: selectedProject,
      dependencies
    };
    
    if (onSave) {
      onSave(taskData);
    } else {
      updateTask(task.id, taskData);
    }
    
    onClose();
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAddDependency = () => {
    if (selectedDependency && !dependencies.includes(selectedDependency.id) && selectedDependency.id !== task?.id) {
      setDependencies([...dependencies, selectedDependency.id]);
      setSelectedDependency(null);
    }
  };

  const handleRemoveDependency = (dependencyId: string) => {
    setDependencies(dependencies.filter(id => id !== dependencyId));
  };

  // Get available dependencies (tasks that aren't the current task and aren't already dependencies)
  const getAvailableTasks = () => {
    return tasks.filter(t => 
      t.id !== task?.id && 
      !dependencies.includes(t.id) &&
      !t.completedAt // Don't show completed tasks
    );
  };

  // Get task by ID
  const getTaskById = (id: string) => {
    return tasks.find(t => t.id === id);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{task && task.id ? 'Edit Task' : 'Create New Task'}</DialogTitle>
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
          
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={(date) => setDueDate(date)}
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
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
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
                  This task depends on:
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
                This task has no dependencies.
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