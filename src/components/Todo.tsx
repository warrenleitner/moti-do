'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Checkbox,
  IconButton,
  Chip,
  LinearProgress,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  Tooltip,
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Flag as FlagIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAppStore } from '@/store/AppStore';
import { Task, Subtask } from '@/models/Task';
import TaskEditDialog from './TaskEditDialog';

interface TodoProps {
  task: Task;
}

export default function Todo({ task }: TodoProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  const completeTask = useAppStore((state) => state.completeTask);
  const setTaskAsNext = useAppStore((state) => state.setTaskAsNext);
  const setTaskInProgress = useAppStore((state) => state.setTaskInProgress);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const addSubtask = useAppStore((state) => state.addSubtask);
  const completeSubtask = useAppStore((state) => state.completeSubtask);
  
  const handleToggle = () => {
    completeTask(task.id, !task.completedAt);
    
    if (!task.completedAt) {
      // Show confetti animation when completing a task
      createConfetti();
    }
  };
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  const handleSetNext = () => {
    setTaskAsNext(task.id);
  };
  
  const handleToggleInProgress = () => {
    setTaskInProgress(task.id, !task.inProgress);
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };
  
  const handleEdit = () => {
    setEditDialogOpen(true);
  };
  
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtask.trim()) {
      addSubtask(task.id, newSubtask.trim());
      setNewSubtask('');
    }
  };
  
  const handleSubtaskToggle = (subtask: Subtask) => {
    completeSubtask(task.id, subtask.id, !subtask.completed);
    
    if (!subtask.completed) {
      // Show confetti animation when completing a subtask
      createConfetti(task.score / (task.subtasks.length + 1));
    }
  };
  
  const createConfetti = (xpAmount = task.score) => {
    // Create and animate confetti particles
    const colors = ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0'];
    
    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.animationDuration = `${1 + Math.random() * 2}s`;
      document.body.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.remove();
      }, 3000);
    }
    
    // Show XP popup
    const xpPopup = document.createElement('div');
    xpPopup.className = 'xp-popup';
    xpPopup.textContent = `+${Math.round(xpAmount)} XP`;
    xpPopup.style.top = '50%';
    xpPopup.style.left = '50%';
    document.body.appendChild(xpPopup);
    
    // Remove XP popup after animation
    setTimeout(() => {
      xpPopup.remove();
    }, 1500);
  };
  
  // Calculate progress based on completed subtasks
  const progress = task.subtasks.length 
    ? Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)
    : 0;
  
  // Find project and tags details
  const project = task.projectId 
    ? projects.find(p => p.id === task.projectId)
    : undefined;
  
  const taskTags = task.tags
    .map(tagId => tags.find(t => t.id === tagId))
    .filter(Boolean);
  
  // Calculate how overdue the task is (0 = not overdue, 1-3 = overdue levels)
  const getOverdueLevel = () => {
    if (!task.dueDate || task.completedAt) return 0;
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    
    if (dueDate > now) return 0;
    
    const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 1; // Due today
    if (daysDiff < 3) return 2; // 1-2 days overdue
    return 3; // 3+ days overdue
  };
  
  const overdueLevel = getOverdueLevel();
  const overdueTintColor = overdueLevel === 1 ? 'rgba(255, 235, 59, 0.15)' : 
                          overdueLevel === 2 ? 'rgba(255, 152, 0, 0.15)' : 
                          overdueLevel === 3 ? 'rgba(244, 67, 54, 0.15)' : 
                          'transparent';
  const overdueTooltip = overdueLevel === 1 ? 'Due today' :
                        overdueLevel === 2 ? '1-2 days overdue' :
                        overdueLevel === 3 ? '3+ days overdue' : '';
  
  return (
    <>
      <Tooltip title={overdueTooltip} placement="top" arrow disableHoverListener={overdueLevel === 0}>
        <Card 
          sx={{ 
            mb: 2, 
            position: 'relative',
            opacity: task.completedAt ? 0.7 : 1,
            borderLeft: project ? `4px solid ${project.color}` : undefined,
            bgcolor: overdueTintColor
          }}
        >
          {task.isNext && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                right: 0,
                bgcolor: 'primary.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderBottomLeftRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              NEXT
            </Box>
          )}
          
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Checkbox 
                checked={Boolean(task.completedAt)} 
                onChange={handleToggle}
                sx={{ mt: -1, mr: 1 }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    textDecoration: task.completedAt ? 'line-through' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {task.title}
                  {task.inProgress && (
                    <Chip 
                      label="In Progress" 
                      size="small" 
                      color="secondary" 
                      sx={{ ml: 1, height: '20px' }}
                    />
                  )}
                </Typography>
                
                {task.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mt: 1, mb: 2 }}
                  >
                    {task.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {task.startDate && (
                    <Chip 
                      icon={<CalendarIcon />}
                      label={`Starts: ${format(new Date(task.startDate), 'MMM d, yyyy')}`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                  
                  {task.dueDate && (
                    <Chip 
                      icon={<CalendarIcon />}
                      label={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                  
                  {taskTags.map(tag => tag && (
                    <Chip 
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      sx={{ 
                        bgcolor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                      variant="outlined"
                    />
                  ))}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mr: 2,
                  }}>
                    <Box component="span" sx={{ mr: 0.5 }}>Importance:</Box>
                    <Box 
                      component="span" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: task.importance === 'Defcon One' 
                          ? 'error.main' 
                          : task.importance === 'High' 
                          ? 'warning.main' 
                          : 'inherit'
                      }}
                    >
                      {task.importance}
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mr: 2,
                  }}>
                    <Box component="span" sx={{ mr: 0.5 }}>Difficulty:</Box>
                    <Box component="span" sx={{ fontWeight: 'bold' }}>
                      {task.difficulty}
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}>
                    <Box component="span" sx={{ mr: 0.5 }}>Duration:</Box>
                    <Box component="span" sx={{ fontWeight: 'bold' }}>
                      {task.duration}
                    </Box>
                  </Box>
                  
                  <Box sx={{ flexGrow: 1 }} />
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: 'primary.main',
                  }}>
                    {task.score} pts
                  </Box>
                </Box>
                
                {task.subtasks.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={progress} sx={{ mb: 1 }} />
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}>
                      <span>Progress</span>
                      <span>{`${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} (${progress}%)`}</span>
                    </Box>
                  </Box>
                )}
              </Box>
              <Box sx={{ ml: 1, display: 'flex', flexDirection: 'column' }}>
                <IconButton 
                  size="small" 
                  onClick={handleEdit}
                  aria-label="edit"
                  sx={{ mb: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleSetNext}
                  aria-label="set as next"
                  color={task.isNext ? "primary" : "default"}
                  sx={{ mb: 0.5 }}
                >
                  <FlagIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleToggleInProgress}
                  aria-label={task.inProgress ? "stop progress" : "start progress"}
                  color={task.inProgress ? "secondary" : "default"}
                  sx={{ mb: 0.5 }}
                >
                  {task.inProgress ? <StopIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleDelete}
                  aria-label="delete"
                  color="error"
                  sx={{ mb: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleExpandClick}
                  aria-expanded={expanded}
                  aria-label="show more"
                >
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Subtasks
                </Typography>
                
                <List dense disablePadding>
                  {task.subtasks.map((subtask) => (
                    <ListItem key={subtask.id} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={subtask.completed}
                          onChange={() => handleSubtaskToggle(subtask)}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={subtask.title} 
                        primaryTypographyProps={{ 
                          variant: 'body2',
                          style: { 
                            textDecoration: subtask.completed ? 'line-through' : 'none',
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Box component="form" onSubmit={handleAddSubtask} sx={{ mt: 1, display: 'flex' }}>
                  <TextField
                    size="small"
                    placeholder="Add a subtask"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    fullWidth
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    size="small"
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      </Tooltip>
      
      <TaskEditDialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        task={task} 
      />
    </>
  );
} 