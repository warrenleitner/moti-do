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
  Avatar,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AirplaneTicket as VacationIcon,
  ColorLens as ColorIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3f51b5');
  const [tempColor, setTempColor] = useState('#3f51b5');
  const [colorEditMode, setColorEditMode] = useState<'tag' | 'project'>('tag');
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
  
  useEffect(() => {
    // Initialize weights from user preferences
    const { scoringWeights } = user.preferences;
    setImportanceWeight(scoringWeights.importance.Medium);
    setDifficultyWeight(scoringWeights.difficulty.Medium);
    setDurationWeight(scoringWeights.duration.Medium);
    setDueDateWeight(scoringWeights.dueDate);
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
  
  // Project dialog functions
  const openAddProjectDialog = () => {
    setNewProjectName('');
    setNewProjectColor('#3f51b5');
    setEditMode(false);
    setProjectDialogOpen(true);
  };
  
  const openEditProjectDialog = (project: any) => {
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
  
  const handleProjectColorChange = (color: any) => {
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
  
  const openEditTagDialog = (tag: any) => {
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
  
  const handleTagColorChange = (color: any) => {
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
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your experience and preferences
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="General" />
          <Tab label="Scoring" />
          <Tab label="Projects" />
          <Tab label="Tags" />
        </Tabs>
      </Paper>
      
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Theme & Display
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        <DarkModeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Theme Mode
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={user.preferences.theme === 'dark'}
                            onChange={(e) => 
                              updateUserPreferences({ 
                                theme: e.target.checked ? 'dark' : 'light' 
                              })
                            }
                          />
                        }
                        label="Dark Mode"
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        <VacationIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Vacation Mode
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={user.preferences.vacationMode}
                            onChange={handleVacationToggle}
                          />
                        }
                        label="Enable Vacation Mode"
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tasks and habits won't accumulate while you're away
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Scoring Algorithm
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Adjust the weights used to calculate task and habit scores
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Importance Weight
                  </Typography>
                  <Slider
                    value={importanceWeight}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={handleImportanceChange}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0.1, label: '0.1' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Difficulty Weight
                  </Typography>
                  <Slider
                    value={difficultyWeight}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={handleDifficultyChange}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0.1, label: '0.1' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Duration Weight
                  </Typography>
                  <Slider
                    value={durationWeight}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={handleDurationChange}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0.1, label: '0.1' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Due Date Urgency Weight
                  </Typography>
                  <Slider
                    value={dueDateWeight}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={handleDueDateChange}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0.1, label: '0.1' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ]}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
    </Layout>
  );
} 