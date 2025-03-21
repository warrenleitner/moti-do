'use client';

import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
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

export default function TagsPage() {
  const tags = useAppStore(state => state.tags);
  const tasks = useAppStore(state => state.tasks);
  const habits = useAppStore(state => state.habits);
  const user = useAppStore(state => state.user);
  const addTag = useAppStore(state => state.addTag);
  const updateTag = useAppStore(state => state.updateTag);
  const deleteTag = useAppStore(state => state.deleteTag);
  const updateUserPreferences = useAppStore(state => state.updateUserPreferences);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id?: string, name: string, color: string }>({
    name: '',
    color: '#4caf50'
  });
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagWeight, setTagWeight] = useState(1);

  // Calculate tag usage stats
  const getTagUsage = (tagId: string) => {
    const tagTasks = tasks.filter(task => task.tags.includes(tagId));
    const tagHabits = habits.filter(habit => habit.tags.includes(tagId));
    return tagTasks.length + tagHabits.length;
  };
  
  // Get tag multiplier
  const getTagMultiplier = (tagId: string) => {
    const multiplier = user.preferences.tagMultipliers.find(tm => tm.tagId === tagId);
    return multiplier ? multiplier.multiplier : 1;
  };
  
  const handleOpenDialog = (tag?: { id: string, name: string, color: string }) => {
    if (tag) {
      setEditingTag({
        id: tag.id,
        name: tag.name,
        color: tag.color
      });
    } else {
      setEditingTag({
        name: '',
        color: '#4caf50'
      });
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleSaveTag = () => {
    if (!editingTag.name.trim()) return;
    
    if (editingTag.id) {
      updateTag(editingTag.id, {
        name: editingTag.name,
        color: editingTag.color
      });
    } else {
      addTag(editingTag.name, editingTag.color);
    }
    
    setDialogOpen(false);
  };
  
  const handleDeleteTag = (id: string) => {
    if (confirm('Are you sure you want to delete this tag? This will not delete associated tasks, but they will no longer be tagged with this tag.')) {
      deleteTag(id);
    }
  };
  
  const handleOpenWeightDialog = (tagId: string) => {
    setEditingTagId(tagId);
    setTagWeight(getTagMultiplier(tagId));
    setWeightDialogOpen(true);
  };
  
  const handleSaveWeight = () => {
    if (!editingTagId) return;
    
    // Update the tag multiplier
    const currentMultipliers = [...user.preferences.tagMultipliers];
    const existingIndex = currentMultipliers.findIndex(tm => tm.tagId === editingTagId);
    
    if (existingIndex >= 0) {
      currentMultipliers[existingIndex] = {
        tagId: editingTagId,
        multiplier: tagWeight
      };
    } else {
      currentMultipliers.push({
        tagId: editingTagId,
        multiplier: tagWeight
      });
    }
    
    updateUserPreferences({
      tagMultipliers: currentMultipliers
    });
    
    setWeightDialogOpen(false);
  };

  return (
    <Layout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tags
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and organize your tags for tasks and habits.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Tag
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Your Tags
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          {tags.map(tag => (
            <Card key={tag.id} sx={{ minWidth: 200 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={tag.name}
                    sx={{ 
                      bgcolor: tag.color,
                      color: 'white',
                      fontWeight: 'bold',
                      px: 1
                    }}
                  />
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(tag)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Used in {getTagUsage(tag.id)} items
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Weight: {getTagMultiplier(tag.id)}x
                </Typography>
                
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => handleOpenWeightDialog(tag.id)}
                  sx={{ mt: 1 }}
                >
                  Adjust Weight
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>
      
      {/* Add/Edit Tag Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTag.id ? 'Edit Tag' : 'Add New Tag'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tag Name"
            fullWidth
            value={editingTag.name}
            onChange={(e) => setEditingTag({...editingTag, name: e.target.value})}
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle2" gutterBottom>
            Tag Color
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <HexColorPicker 
              color={editingTag.color} 
              onChange={(color) => setEditingTag({...editingTag, color})}
            />
          </Box>
          <TextField
            margin="dense"
            label="Color Hex Code"
            fullWidth
            value={editingTag.color}
            onChange={(e) => setEditingTag({...editingTag, color: e.target.value})}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box 
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: editingTag.color 
                    }} 
                  />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTag} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Tag Weight Dialog */}
      <Dialog open={weightDialogOpen} onClose={() => setWeightDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Tag Weight</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Tag weight multiplies the score of tasks and habits with this tag.
          </Typography>
          
          <Box sx={{ px: 2, py: 4 }}>
            <Typography id="tag-weight-slider" gutterBottom>
              Weight: {tagWeight}x
            </Typography>
            <Slider
              value={tagWeight}
              onChange={(_, value) => setTagWeight(value as number)}
              aria-labelledby="tag-weight-slider"
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