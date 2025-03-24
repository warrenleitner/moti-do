'use client';

import React, { useState } from 'react';
import { 
  Typography, 
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Slider,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { HexColorPicker } from 'react-colorful';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';

export default function ProjectsPage() {
  const projects = useAppStore(state => state.projects);
  const tasks = useAppStore(state => state.tasks);
  const habits = useAppStore(state => state.habits);
  const user = useAppStore(state => state.user);
  const addProject = useAppStore(state => state.addProject);
  const updateProject = useAppStore(state => state.updateProject);
  const deleteProject = useAppStore(state => state.deleteProject);
  const updateUserPreferences = useAppStore(state => state.updateUserPreferences);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id?: string, name: string, color: string }>({
    name: '',
    color: '#4caf50'
  });
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectWeight, setProjectWeight] = useState(1);

  // Calculate project progress
  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    const projectHabits = habits.filter(habit => habit.projectId === projectId);
    
    const totalItems = projectTasks.length + projectHabits.length;
    if (totalItems === 0) return 0;
    
    const completedTasks = projectTasks.filter(task => task.completedAt).length;
    const completedHabits = projectHabits.reduce((acc, habit) => 
      acc + (habit.completions.filter(c => c.completed).length > 0 ? 1 : 0), 0);
      
    return Math.round((completedTasks + completedHabits) / totalItems * 100);
  };
  
  // Get project multiplier
  const getProjectMultiplier = (projectId: string) => {
    const multiplier = user.preferences.projectMultipliers.find(pm => pm.projectId === projectId);
    return multiplier ? multiplier.multiplier : 1;
  };
  
  const handleOpenDialog = (project?: { id: string, name: string, color: string }) => {
    if (project) {
      setEditingProject({
        id: project.id,
        name: project.name,
        color: project.color
      });
    } else {
      setEditingProject({
        name: '',
        color: '#4caf50'
      });
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleSaveProject = () => {
    if (!editingProject.name.trim()) return;
    
    if (editingProject.id) {
      updateProject(editingProject.id, {
        name: editingProject.name,
        color: editingProject.color
      });
    } else {
      addProject(editingProject.name, editingProject.color);
    }
    
    setDialogOpen(false);
  };
  
  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project? This will not delete associated tasks, but they will no longer be associated with this project.')) {
      deleteProject(id);
    }
  };
  
  const handleOpenWeightDialog = (projectId: string) => {
    setEditingProjectId(projectId);
    setProjectWeight(getProjectMultiplier(projectId));
    setWeightDialogOpen(true);
  };
  
  const handleSaveWeight = () => {
    if (!editingProjectId) return;
    
    // Update the project multiplier
    const currentMultipliers = [...user.preferences.projectMultipliers];
    const existingIndex = currentMultipliers.findIndex(pm => pm.projectId === editingProjectId);
    
    if (existingIndex >= 0) {
      currentMultipliers[existingIndex] = {
        projectId: editingProjectId,
        multiplier: projectWeight
      };
    } else {
      currentMultipliers.push({
        projectId: editingProjectId,
        multiplier: projectWeight
      });
    }
    
    updateUserPreferences({
      projectMultipliers: currentMultipliers
    });
    
    setWeightDialogOpen(false);
  };

  return (
    <Layout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Projects
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your projects and track their progress.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Project
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {projects.map(project => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {project.name}
                  </Typography>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(project)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={getProjectProgress(project.id)} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: `${project.color}22`,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: project.color
                        }
                      }} 
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {`${getProjectProgress(project.id)}%`}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Project Weight: {getProjectMultiplier(project.id)}x
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleOpenWeightDialog(project.id)}
                    sx={{ mt: 1 }}
                  >
                    Adjust Weight
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Add/Edit Project Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject.id ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={editingProject.name}
            onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Project Color
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <HexColorPicker 
              color={editingProject.color} 
              onChange={(color) => setEditingProject({...editingProject, color})}
            />
          </Box>
          <TextField
            margin="dense"
            label="Color Hex Code"
            fullWidth
            value={editingProject.color}
            onChange={(e) => setEditingProject({...editingProject, color: e.target.value})}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box 
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: editingProject.color 
                    }} 
                  />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProject} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Project Weight Dialog */}
      <Dialog open={weightDialogOpen} onClose={() => setWeightDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Project Weight</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Project weight multiplies the score of tasks and habits in this project.
          </Typography>
          
          <Box sx={{ px: 2, py: 4 }}>
            <Typography id="project-weight-slider" gutterBottom>
              Weight: {projectWeight}x
            </Typography>
            <Slider
              value={projectWeight}
              onChange={(_, value) => setProjectWeight(value as number)}
              aria-labelledby="project-weight-slider"
              step={0.1}
              marks
              min={0.1}
              max={5}
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeightDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveWeight} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
} 