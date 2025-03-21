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
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Task } from '@/models/Task';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAppStore } from '@/store/AppStore';

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
}

export default function TaskEditDialog({ open, onClose, task }: TaskEditDialogProps) {
  const updateTask = useAppStore((state) => state.updateTask);
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
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;
    
    updateTask(task.id, {
      title,
      description,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      importance: importance as Task['importance'],
      difficulty: difficulty as Task['difficulty'],
      duration: duration as Task['duration'],
      tags: selectedTags,
      projectId: selectedProject
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

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Task</DialogTitle>
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