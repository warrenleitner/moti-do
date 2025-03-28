'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/Brightness4';
import LightModeIcon from '@mui/icons-material/Brightness7';
import VacationIcon from '@mui/icons-material/AirplaneTicket';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { SketchPicker, ColorResult } from 'react-color';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';
import { Project, Tag } from '@/models/Task';

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  
  // Dialog states
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3f51b5');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3f51b5');
  const [editMode, setEditMode] = useState(false);
  
  const user = useAppStore((state) => state.user);
  const updateUserPreferences = useAppStore((state) => state.updateUserPreferences);
  const toggleVacationMode = useAppStore((state) => state.toggleVacationMode);
  
  // Tag and project state
  const tags = useAppStore((state) => state.tags);
  const projects = useAppStore((state) => state.projects);
  const addTag = useAppStore((state) => state.addTag);
  const updateTag = useAppStore((state) => state.updateTag);
  const deleteTag = useAppStore((state) => state.deleteTag);
  const addProject = useAppStore((state) => state.addProject);
  const updateProject = useAppStore((state) => state.updateProject);
  const deleteProject = useAppStore((state) => state.deleteProject);
  
  // Task weights
  const [importanceWeight, setImportanceWeight] = useState(1);
  const [difficultyWeight, setDifficultyWeight] = useState(1);
  const [durationWeight, setDurationWeight] = useState(1);
  const [dueDateWeight, setDueDateWeight] = useState(1);
  const [baseTaskWeight, setBaseTaskWeight] = useState(1);
  
  useEffect(() => {
    // Initialize weights from user preferences
    const { scoringWeights } = user.preferences;
    setImportanceWeight(scoringWeights.importance.Medium);
    setDifficultyWeight(scoringWeights.difficulty.Medium);
    setDurationWeight(scoringWeights.duration.Medium);
    setDueDateWeight(scoringWeights.dueDate);
    setBaseTaskWeight(scoringWeights.baseTaskWeight || 1);
  }, [user.preferences]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleImportanceChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setImportanceWeight(value);
    
    // Update user preferences
    const oldWeights = user.preferences.scoringWeights.importance;
    updateUserPreferences({
      scoringWeights: {
        ...user.preferences.scoringWeights,
        importance: {
          ...oldWeights,
          'Low': value * 0.5,
          'Medium': value,
          'High': value * 2,
          'Defcon One': value * 4
        }
      }
    });
  };
  
  const handleDifficultyChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setDifficultyWeight(value);
    
    // Update user preferences
    const oldWeights = user.preferences.scoringWeights.difficulty;
    updateUserPreferences({
      scoringWeights: {
        ...user.preferences.scoringWeights,
        difficulty: {
          ...oldWeights,
          'Trivial': 0,
          'Low': value * 0.5,
          'Medium': value,
          'High': value * 2,
          'Herculean': value * 3
        }
      }
    });
  };
  
  const handleDurationChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setDurationWeight(value);
    
    // Update user preferences
    const oldWeights = user.preferences.scoringWeights.duration;
    updateUserPreferences({
      scoringWeights: {
        ...user.preferences.scoringWeights,
        duration: {
          ...oldWeights,
          'Trivial': 0,
          'Short': value * 0.5,
          'Medium': value,
          'Long': value * 2,
          'Odysseyan': value * 3
        }
      }
    });
  };
  
  const handleDueDateChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setDueDateWeight(value);
    
    // Update user preferences
    updateUserPreferences({
      scoringWeights: {
        ...user.preferences.scoringWeights,
        dueDate: value
      }
    });
  };
  
  const handleVacationToggle = () => {
    toggleVacationMode();
  };
  
  const handleBaseTaskWeightChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setBaseTaskWeight(value);
    
    updateUserPreferences({
      scoringWeights: {
        ...user.preferences.scoringWeights,
        baseTaskWeight: value
      }
    });
  };
  
  // Project dialog functions
  const openAddProjectDialog = () => {
    setNewProjectName('');
    setNewProjectColor('#3f51b5');
    setEditMode(false);
    setProjectDialogOpen(true);
  };
  
  const openEditProjectDialog = (project: Project) => {
    setNewProjectName(project.name);
    setNewProjectColor(project.color);
    setEditItemId(project.id);
    setEditMode(true);
    setProjectDialogOpen(true);
  };
  
  const handleProjectDialogClose = () => {
    setProjectDialogOpen(false);
    setEditItemId(null);
  };
  
  const handleProjectColorChange = (color: ColorResult) => {
    setNewProjectColor(color.hex);
  };
  
  const handleProjectSave = () => {
    if (newProjectName.trim() === '') return;
    
    if (editMode && editItemId) {
      updateProject(editItemId, {
        name: newProjectName,
        color: newProjectColor
      });
    } else {
      addProject(newProjectName, newProjectColor);
    }
    
    setProjectDialogOpen(false);
    setEditItemId(null);
  };
  
  const handleProjectDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project? Tasks associated with this project will remain but will no longer be linked to any project.')) {
      deleteProject(id);
    }
  };
  
  // Tag dialog functions
  const openAddTagDialog = () => {
    setNewTagName('');
    setNewTagColor('#3f51b5');
    setEditMode(false);
    setTagDialogOpen(true);
  };
  
  const openEditTagDialog = (tag: Tag) => {
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setEditItemId(tag.id);
    setEditMode(true);
    setTagDialogOpen(true);
  };
  
  const handleTagDialogClose = () => {
    setTagDialogOpen(false);
    setEditItemId(null);
  };
  
  const handleTagColorChange = (color: ColorResult) => {
    setNewTagColor(color.hex);
  };
  
  const handleTagSave = () => {
    if (newTagName.trim() === '') return;
    
    if (editMode && editItemId) {
      updateTag(editItemId, {
        name: newTagName,
        color: newTagColor
      });
    } else {
      addTag(newTagName, newTagColor);
    }
    
    setTagDialogOpen(false);
    setEditItemId(null);
  };
  
  const handleTagDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tag? This tag will be removed from all tasks.')) {
      deleteTag(id);
    }
  };
  
  const handleResetStorage = () => {
    if (confirm('Are you sure you want to reset all data? This will remove all tasks, habits, projects, and tags.')) {
      localStorage.removeItem('moti-do-storage');
      alert('Storage has been reset. Please refresh the page to see the changes.');
      window.location.reload();
    }
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your experience and set your preferences.
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Application" />
          <Tab label="Scoring" />
          <Tab label="Tags" />
          <Tab label="Projects" />
        </Tabs>
        
        {/* Application settings tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Theme
                </Typography>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user.preferences.theme === 'dark'}
                          onChange={(e) => updateUserPreferences({ theme: e.target.checked ? 'dark' : 'light' })}
                          icon={<LightModeIcon />}
                          checkedIcon={<DarkModeIcon />}
                        />
                      }
                      label={user.preferences.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    />
                  </CardContent>
                </Card>
                
                <Typography variant="h6" gutterBottom>
                  Vacation Mode
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user.preferences.vacationMode}
                          onChange={handleVacationToggle}
                          icon={<span />}
                          checkedIcon={<VacationIcon />}
                        />
                      }
                      label={user.preferences.vacationMode ? 'Vacation Mode On' : 'Vacation Mode Off'}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      When vacation mode is on, tasks and habits won&apos;t generate XP or contribute to streaks.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                {/* Add more application settings here */}
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Scoring settings tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Task Scoring Weights
            </Typography>
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography id="base-task-weight-slider" gutterBottom>
                    Base Task Weight: {baseTaskWeight}
                  </Typography>
                  <Slider
                    aria-labelledby="base-task-weight-slider"
                    value={baseTaskWeight}
                    onChange={handleBaseTaskWeightChange}
                    step={0.1}
                    marks
                    min={0.1}
                    max={3}
                    valueLabelDisplay="auto"
                    sx={{ maxWidth: 500 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    This is the base multiplier applied to all tasks. Higher values make tasks worth more XP overall.
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography id="importance-weight-slider" gutterBottom>
                    Importance Weight: {importanceWeight}
                  </Typography>
                  <Slider
                    aria-labelledby="importance-weight-slider"
                    value={importanceWeight}
                    onChange={handleImportanceChange}
                    step={0.1}
                    marks
                    min={0.1}
                    max={3}
                    valueLabelDisplay="auto"
                    sx={{ maxWidth: 500 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Low: {(importanceWeight * 0.5).toFixed(1)}, Medium: {importanceWeight.toFixed(1)}, 
                    High: {(importanceWeight * 2).toFixed(1)}, Defcon One: {(importanceWeight * 4).toFixed(1)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography id="difficulty-weight-slider" gutterBottom>
                    Difficulty Weight: {difficultyWeight}
                  </Typography>
                  <Slider
                    aria-labelledby="difficulty-weight-slider"
                    value={difficultyWeight}
                    onChange={handleDifficultyChange}
                    step={0.1}
                    marks
                    min={0.1}
                    max={3}
                    valueLabelDisplay="auto"
                    sx={{ maxWidth: 500 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Trivial: 0, Low: {(difficultyWeight * 0.5).toFixed(1)}, Medium: {difficultyWeight.toFixed(1)}, 
                    High: {(difficultyWeight * 2).toFixed(1)}, Herculean: {(difficultyWeight * 3).toFixed(1)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography id="duration-weight-slider" gutterBottom>
                    Duration Weight: {durationWeight}
                  </Typography>
                  <Slider
                    aria-labelledby="duration-weight-slider"
                    value={durationWeight}
                    onChange={handleDurationChange}
                    step={0.1}
                    marks
                    min={0.1}
                    max={3}
                    valueLabelDisplay="auto"
                    sx={{ maxWidth: 500 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Trivial: 0, Short: {(durationWeight * 0.5).toFixed(1)}, Medium: {durationWeight.toFixed(1)}, 
                    Long: {(durationWeight * 2).toFixed(1)}, Odysseyan: {(durationWeight * 3).toFixed(1)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography id="due-date-weight-slider" gutterBottom>
                    Due Date Weight: {dueDateWeight}
                  </Typography>
                  <Slider
                    aria-labelledby="due-date-weight-slider"
                    value={dueDateWeight}
                    onChange={handleDueDateChange}
                    step={0.1}
                    marks
                    min={0}
                    max={3}
                    valueLabelDisplay="auto"
                    sx={{ maxWidth: 500 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Higher values increase the importance of due dates in scoring.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
        
        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Projects
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAddProjectDialog}
                  >
                    Add Project
                  </Button>
                </Box>
                
                {projects.length > 0 ? (
                  <List>
                    {projects.map((project) => (
                      <ListItem
                        key={project.id}
                        secondaryAction={
                          <Box>
                            <IconButton edge="end" onClick={() => openEditProjectDialog(project)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleProjectDelete(project.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                        divider
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  borderRadius: '50%', 
                                  bgcolor: project.color,
                                  mr: 1 
                                }} 
                              />
                              {project.name}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No projects created yet. Add a project to organize your tasks.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {tabValue === 3 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Tags
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAddTagDialog}
                  >
                    Add Tag
                  </Button>
                </Box>
                
                {tags.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        sx={{ 
                          bgcolor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: tag.color,
                          mb: 1
                        }}
                        variant="outlined"
                        onDelete={() => handleTagDelete(tag.id)}
                        onClick={() => openEditTagDialog(tag)}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No tags created yet. Add tags to categorize your tasks.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Paper>
      
      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onClose={handleProjectDialogClose}>
        <DialogTitle>{editMode ? 'Edit Project' : 'Add New Project'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Project Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: newProjectColor,
                  mr: 2,
                  cursor: 'pointer',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                }}
              />
              <SketchPicker
                color={newProjectColor}
                onChangeComplete={handleProjectColorChange}
                disableAlpha
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProjectDialogClose}>Cancel</Button>
          <Button onClick={handleProjectSave} color="primary" startIcon={<SaveIcon />}>
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onClose={handleTagDialogClose}>
        <DialogTitle>{editMode ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tag Name"
            fullWidth
            variant="outlined"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tag Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: newTagColor,
                  mr: 2,
                  cursor: 'pointer',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                }}
              />
              <SketchPicker
                color={newTagColor}
                onChangeComplete={handleTagColorChange}
                disableAlpha
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTagDialogClose}>Cancel</Button>
          <Button onClick={handleTagSave} color="primary" startIcon={<SaveIcon />}>
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Button
        variant="contained"
        color="error"
        onClick={handleResetStorage}
        sx={{ mt: 2 }}
      >
        Reset All Data
      </Button>
    </Layout>
  );
} 