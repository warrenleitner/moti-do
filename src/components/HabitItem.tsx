'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Checkbox,
  IconButton,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Tooltip,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon from '@mui/icons-material/Delete';
import StreakIcon from '@mui/icons-material/Whatshot';
import FireIcon from '@mui/icons-material/LocalFireDepartment';
import EditIcon from '@mui/icons-material/Edit';
import MinusIcon from '@mui/icons-material/Remove';
import PlusIcon from '@mui/icons-material/Add';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAppStore } from '@/store/AppStore';
import { Habit } from '@/models/Habit';
import HabitEditDialog from './HabitEditDialog';
import { Project, Tag } from '@/models/Task';

interface HabitItemProps {
  habit: Habit;
}

export default function HabitItem({ habit }: HabitItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const completeHabit = useAppStore((state) => state.completeHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  const updateHabit = useAppStore((state) => state.updateHabit);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleToggle = () => {
    completeHabit(habit.id, !isCompletedToday());
  };
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this habit?')) {
      deleteHabit(habit.id);
    }
  };
  
  const handleEdit = () => {
    setEditDialogOpen(true);
  };
  
  const handleIncrement = () => {
    const newCount = habit.currentOccurrences + 1;
    if (newCount >= habit.requiredOccurrences) {
      completeHabit(habit.id, true);
    } else {
      updateHabit(habit.id, { currentOccurrences: newCount });
    }
  };
  
  const handleDecrement = () => {
    if (habit.currentOccurrences > 0) {
      updateHabit(habit.id, { currentOccurrences: habit.currentOccurrences - 1 });
    }
  };
  
  const isCompletedToday = () => {
    if (!mounted) return false;
    return habit.completions.some(c => 
      isToday(new Date(c.date)) && c.completed
    );
  };
  
  // Format recurrence rule as text
  const getRecurrenceText = () => {
    const { recurrence } = habit;
    
    switch (recurrence.type) {
      case 'daily':
        if (!recurrence.interval || recurrence.interval === 1) return 'Daily';
        return `Every ${recurrence.interval} days`;
        
      case 'weekly':
        if (!recurrence.weekDays || recurrence.weekDays.length === 0) return 'Weekly';
        if (recurrence.weekDays.length === 7) return 'Daily';
        return `Weekly on ${recurrence.weekDays.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}`;
        
      case 'monthly':
        if (recurrence.isLastDay) return 'Monthly on the last day';
        return `Monthly on day ${recurrence.dayOfMonth}`;
        
      case 'yearly':
        const month = new Date(0, (recurrence.monthOfYear || 1) - 1).toLocaleString('default', { month: 'long' });
        return `Yearly on ${month} ${recurrence.dayOfMonth || 1}`;
        
      default:
        return 'Custom';
    }
  };
  
  // Get the current month's calendar days for the habit completion visualization
  const currentMonthDays = mounted ? eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }) : [];
  
  // Check if habit was completed on a specific day
  const wasCompletedOnDay = (day: Date) => {
    return habit.completions.some(c => 
      isSameDay(new Date(c.date), day) && c.completed
    );
  };
  
  // Get project and tags
  const project = habit.projectId 
    ? projects.find((p: Project) => p.id === habit.projectId) 
    : undefined;
    
  const habitTags = habit.tags
    .map((tagId: string) => tags.find((t: Tag) => t.id === tagId))
    .filter(Boolean);
  
  // Calculate how overdue the habit is (0 = not overdue, 1-3 = overdue levels)
  const getOverdueLevel = () => {
    if (!mounted) return 0;
    if (isCompletedToday() || !habit.dueDate) return 0;
    
    const now = new Date();
    const dueDate = new Date(habit.dueDate);
    
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
            borderLeft: project ? `4px solid ${project.color}` : undefined,
            bgcolor: overdueTintColor
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Checkbox 
                checked={isCompletedToday()} 
                onChange={handleToggle}
                sx={{ mt: -1, mr: 1 }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {habit.title}
                  
                  <Chip 
                    icon={<FireIcon />}
                    label={`${habit.streak.current} day streak`}
                    size="small" 
                    color={habit.streak.current >= 3 ? "success" : "default"}
                    sx={{ ml: 1, height: '20px' }}
                  />
                </Typography>
                
                {/* New counter controls for counter-based habits */}
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Progress: {habit.currentOccurrences} / {habit.requiredOccurrences}
                  </Typography>
                  <IconButton onClick={handleDecrement} size="small">
                    <MinusIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={handleIncrement} size="small">
                    <PlusIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {habit.description && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mt: 1, mb: 2 }}
                  >
                    {habit.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  <Chip 
                    icon={<CalendarIcon />}
                    label={getRecurrenceText()}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                  
                  {habit.startDate && (
                    <Chip 
                      icon={<CalendarIcon />}
                      label={`Starts: ${format(new Date(habit.startDate), 'MMM d, yyyy')}`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                  
                  {habitTags.map(tag => tag && (
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
                        color: habit.importance === 'Defcon One' 
                          ? 'error.main' 
                          : habit.importance === 'High' 
                          ? 'warning.main' 
                          : 'inherit'
                      }}
                    >
                      {habit.importance}
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
                      {habit.difficulty}
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
                      {habit.duration}
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
                    {habit.score} pts
                  </Box>
                </Box>
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
                  Monthly Overview
                </Typography>
                
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {currentMonthDays.map((day, i) => (
                    <Grid size={{ xs: 'auto' }} key={i}>
                      <Box 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: wasCompletedOnDay(day) ? 'success.main' : 'grey.100',
                          color: wasCompletedOnDay(day) ? 'white' : 'text.secondary',
                          border: isToday(day) ? '1px solid' : 'none',
                          borderColor: 'primary.main',
                          fontSize: '0.75rem'
                        }}
                      >
                        {format(day, 'd')}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Stats
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Current Streak
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <StreakIcon sx={{ mr: 0.5, color: 'warning.main' }} />
                          {habit.streak.current} days
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Best Streak
                        </Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <StreakIcon sx={{ mr: 0.5, color: 'success.main' }} />
                          {habit.streak.best} days
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          This Month
                        </Typography>
                        <Typography variant="body1">
                          {habit.completions.filter(c => 
                            c.completed && new Date(c.date).getMonth() === new Date().getMonth()
                          ).length} days
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Total
                        </Typography>
                        <Typography variant="body1">
                          {habit.streak.totalCompletions} times
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper elevation={0} sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                          Completion Rate
                        </Typography>
                        <Typography variant="body1">
                          {habit.streak.totalOccurrences > 0 
                            ? Math.round((habit.streak.totalCompletions / habit.streak.totalOccurrences) * 100) 
                            : 0}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                
                {habit.subtasks.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Subtasks
                    </Typography>
                    
                    <List dense disablePadding>
                      {habit.subtasks.map((subtask) => (
                        <ListItem key={subtask.id} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              edge="start"
                              checked={subtask.completed}
                              size="small"
                              disabled
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
                  </Box>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      </Tooltip>
      
      <HabitEditDialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        habit={habit} 
      />
    </>
  );
}
 