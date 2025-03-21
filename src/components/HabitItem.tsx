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
  Grid,
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
  Whatshot as StreakIcon,
  LocalFireDepartment as FireIcon,
  Edit as EditIcon,
  Flag as FlagIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAppStore } from '@/store/AppStore';
import { Habit } from '@/models/Habit';
import HabitEditDialog from './HabitEditDialog';

interface HabitItemProps {
  habit: Habit;
}

export default function HabitItem({ habit }: HabitItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  const completeHabit = useAppStore((state) => state.completeHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  
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
  
  const isCompletedToday = () => {
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
  const currentMonthDays = eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  
  // Check if habit was completed on a specific day
  const wasCompletedOnDay = (day: Date) => {
    return habit.completions.some(c => 
      isSameDay(new Date(c.date), day) && c.completed
    );
  };
  
  // Get project and tags
  const project = habit.projectId 
    ? projects.find(p => p.id === habit.projectId) 
    : undefined;
    
  const habitTags = habit.tags
    .map(tagId => tags.find(t => t.id === tagId))
    .filter(Boolean);
  
  return (
    <>
      <Card 
        sx={{ 
          mb: 2, 
          position: 'relative',
          borderLeft: project ? `4px solid ${project.color}` : undefined,
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
              
              <Grid container spacing={0.5} sx={{ mt: 1 }}>
                {currentMonthDays.map((day, i) => (
                  <Grid item key={i}>
                    <Box 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        bgcolor: wasCompletedOnDay(day) ? 'success.main' : 'grey.100',
                        color: wasCompletedOnDay(day) ? 'white' : 'text.secondary',
                      }}
                    >
                      {day.getDate()}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Stats
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Current Streak
                      </Typography>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <StreakIcon sx={{ mr: 0.5, color: 'warning.main' }} />
                        {habit.streak.current} days
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Best Streak
                      </Typography>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <StreakIcon sx={{ mr: 0.5, color: 'success.main' }} />
                        {habit.streak.best} days
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        This Month
                      </Typography>
                      <Typography variant="h6">
                        {habit.completions.filter(c => 
                          c.completed && new Date(c.date).getMonth() === new Date().getMonth()
                        ).length} days
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="h6">
                        {habit.streak.totalCompletions} times
                      </Typography>
                    </Box>
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
      
      <HabitEditDialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        habit={habit} 
      />
    </>
  );
}
 