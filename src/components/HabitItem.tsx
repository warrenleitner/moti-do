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

interface HabitItemProps {
  habit: Habit;
}

export default function HabitItem({ habit }: HabitItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const projects = useAppStore((state) => state.projects);
  const tags = useAppStore((state) => state.tags);
  const completeHabit = useAppStore((state) => state.completeHabit);
  const setTaskAsNext = useAppStore((state) => state.setTaskAsNext);
  const setTaskInProgress = useAppStore((state) => state.setTaskInProgress);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  
  const handleToggle = () => {
    completeHabit(habit.id, !isCompletedToday(), new Date());
    
    if (!isCompletedToday()) {
      // Show confetti animation when completing a habit
      createConfetti();
    }
  };
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  const handleSetNext = () => {
    setTaskAsNext(habit.id);
  };
  
  const handleToggleInProgress = () => {
    setTaskInProgress(habit.id, !habit.inProgress);
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this habit?')) {
      deleteHabit(habit.id);
    }
  };
  
  const isCompletedToday = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return habit.completions.some(
      c => format(new Date(c.date), 'yyyy-MM-dd') === todayStr && c.completed
    );
  };
  
  const createConfetti = () => {
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
    xpPopup.textContent = `+${habit.score} XP`;
    xpPopup.style.top = '50%';
    xpPopup.style.left = '50%';
    document.body.appendChild(xpPopup);
    
    // Remove XP popup after animation
    setTimeout(() => {
      xpPopup.remove();
    }, 1500);
  };
  
  // Calculate completion percentage
  const completionPercentage = habit.streak.totalCompletions 
    ? Math.round((habit.streak.totalCompletions / Math.max(1, habit.streak.totalOccurrences)) * 100)
    : 0;
  
  // Find project and tags details
  const project = habit.projectId 
    ? projects.find(p => p.id === habit.projectId)
    : undefined;
  
  const habitTags = habit.tags
    .map(tagId => tags.find(t => t.id === tagId))
    .filter(Boolean);
  
  // Create calendar data for the current month
  const today = new Date();
  const firstDayOfMonth = startOfMonth(today);
  const lastDayOfMonth = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        position: 'relative',
        borderLeft: project ? `4px solid ${project.color}` : undefined,
      }}
    >
      {habit.isNext && (
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
              {habit.inProgress && (
                <Chip 
                  label="In Progress" 
                  size="small" 
                  color="secondary" 
                  sx={{ ml: 1, height: '20px' }}
                />
              )}
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
                label={getRecurrenceText(habit)}
                size="small"
                variant="outlined"
                color="primary"
              />
              
              <Chip 
                icon={<StreakIcon />}
                label={`Streak: ${habit.streak.current}`}
                size="small"
                variant="outlined"
                color="secondary"
              />
              
              <Chip 
                icon={<FireIcon />}
                label={`Best: ${habit.streak.best}`}
                size="small"
                variant="outlined"
                sx={{ color: '#ff9800', borderColor: '#ff9800' }}
              />
              
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
            
            <Box sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={completionPercentage} 
                sx={{ mb: 1 }}
                color="secondary"
              />
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}>
                <span>Completion Rate</span>
                <span>{`${habit.streak.totalCompletions}/${habit.streak.totalOccurrences} (${completionPercentage}%)`}</span>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <IconButton 
              size="small" 
              onClick={handleSetNext}
              color={habit.isNext ? "primary" : "default"}
              title="Mark as next"
            >
              <FlagIcon />
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handleToggleInProgress}
              color={habit.inProgress ? "secondary" : "default"}
              title={habit.inProgress ? "Stop in-progress" : "Mark as in-progress"}
            >
              {habit.inProgress ? <StopIcon /> : <PlayIcon />}
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handleDelete}
              title="Delete habit"
            >
              <DeleteIcon />
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handleExpandClick}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {format(today, 'MMMM yyyy')} Calendar
            </Typography>
            
            <Grid container spacing={0.5} sx={{ mt: 1 }}>
              {daysInMonth.map((day) => {
                const dateString = format(day, 'yyyy-MM-dd');
                const isCompleted = habit.streak.completed[dateString];
                const isToday = isSameDay(day, new Date());
                
                return (
                  <Grid item key={dateString}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        borderRadius: '2px',
                        color: isToday ? 'white' : isCompleted ? 'white' : 'text.secondary',
                        backgroundColor: isToday 
                          ? 'primary.main' 
                          : isCompleted 
                          ? 'success.main' 
                          : 'action.disabledBackground',
                        border: isToday && !isCompleted ? '1px solid' : 'none',
                        borderColor: 'primary.main',
                      }}
                    >
                      {format(day, 'd')}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            
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
  );
}

function getRecurrenceText(habit: Habit): string {
  const { recurrence } = habit;
  
  switch (recurrence.type) {
    case 'daily':
      return recurrence.interval === 1 
        ? 'Daily' 
        : `Every ${recurrence.interval} days`;
    
    case 'weekly':
      if (recurrence.weekDays?.length === 7) return 'Daily';
      if (recurrence.weekDays?.length === 5 && 
          recurrence.weekDays.includes('monday') &&
          recurrence.weekDays.includes('tuesday') &&
          recurrence.weekDays.includes('wednesday') &&
          recurrence.weekDays.includes('thursday') &&
          recurrence.weekDays.includes('friday')) {
        return 'Weekdays';
      }
      if (recurrence.weekDays?.length === 2 && 
          recurrence.weekDays.includes('saturday') &&
          recurrence.weekDays.includes('sunday')) {
        return 'Weekends';
      }
      return `Weekly: ${recurrence.weekDays?.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ')}`;
    
    case 'monthly':
      return recurrence.isLastDay
        ? 'Last day of month'
        : `Monthly: Day ${recurrence.dayOfMonth}`;
    
    case 'yearly':
      return `Yearly: ${recurrence.monthOfYear}/${recurrence.dayOfMonth}`;
    
    case 'custom':
    default:
      return 'Custom';
  }
}
 