'use client';

import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Badge,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import TaskIcon from '@mui/icons-material/TaskAlt';
import HabitIcon from '@mui/icons-material/Loop';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWithinInterval, getDay } from 'date-fns';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';
import { WeekDay } from '@/models/Habit';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const tasks = useAppStore(state => state.tasks);
  const habits = useAppStore(state => state.habits);

  // Calendar navigation functions
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());
  
  // Get month days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day of week for the first of the month (0 = Sunday, 6 = Saturday)
  const startDay = getDay(monthStart);
  
  // Create blank cells for days before the first of the month
  const blanks = Array.from({ length: startDay }, (_, i) => (
    <Box 
      key={`blank-${i}`} 
      sx={{ 
        aspectRatio: '1/1',
        p: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        opacity: 0.5
      }}
    />
  ));
  
  // Function to get tasks and habits for a specific date
  const getItemsForDate = (date: Date) => {
    const tasksForDate = tasks.filter(task => 
      task.dueDate && isWithinInterval(new Date(task.dueDate), {
        start: new Date(date.setHours(0, 0, 0, 0)),
        end: new Date(date.setHours(23, 59, 59, 999))
      })
    );
    
    const habitsForDate = habits.filter(habit => {
      // For this simple version, we'll say a habit is due on a date if:
      // - For daily habits: it's always due
      // - For weekly habits: if the weekday matches
      // - For monthly habits: if the day of month matches
      
      if (habit.recurrence.type === 'daily') return true;
      
      if (habit.recurrence.type === 'weekly') {
        const dayOfWeek = format(date, 'EEEE').toLowerCase() as WeekDay;
        return habit.recurrence.weekDays?.includes(dayOfWeek);
      }
      
      if (habit.recurrence.type === 'monthly') {
        if (habit.recurrence.isLastDay) {
          const lastDayOfMonth = endOfMonth(date).getDate();
          return date.getDate() === lastDayOfMonth;
        }
        return habit.recurrence.dayOfMonth === date.getDate();
      }
      
      return false;
    });
    
    return { tasksForDate, habitsForDate };
  };
  
  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };
  
  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // Render calendar day cells
  const daySquares = monthDays.map(day => {
    const { tasksForDate, habitsForDate } = getItemsForDate(day);
    const taskCount = tasksForDate.length;
    const habitCount = habitsForDate.length;
    const isCurrentDay = isToday(day);
    
    return (
      <Box 
        key={day.toString()} 
        onClick={() => handleDayClick(day)}
        sx={{ 
          aspectRatio: '1/1',
          p: 1,
          border: '1px solid',
          borderColor: isCurrentDay ? 'primary.main' : 'divider',
          borderRadius: 1,
          bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
          color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: isCurrentDay ? 'primary.main' : 'action.hover',
          }
        }}
      >
        <Typography variant="body2" fontWeight={isCurrentDay ? 'bold' : 'regular'}>
          {format(day, 'd')}
        </Typography>
        
        <Box sx={{ display: 'flex', mt: 'auto', gap: 0.5 }}>
          {taskCount > 0 && (
            <Badge badgeContent={taskCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: '16px', minWidth: '16px' } }}>
              <TaskIcon fontSize="small" color="action" />
            </Badge>
          )}
          
          {habitCount > 0 && (
            <Badge badgeContent={habitCount} color="success" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: '16px', minWidth: '16px' } }}>
              <HabitIcon fontSize="small" color="action" />
            </Badge>
          )}
        </Box>
      </Box>
    );
  });
  
  // Combine blanks and days to form the complete calendar grid
  const calendarCells = [...blanks, ...daySquares];
  
  // Create weeks array for grid
  const weeks = [];
  const calendarCellsCopy = [...calendarCells];
  
  while (calendarCellsCopy.length > 0) {
    weeks.push(calendarCellsCopy.splice(0, 7));
  }
  
  // Render selected date dialog content
  const renderDialogContent = () => {
    if (!selectedDate) return null;
    
    const { tasksForDate, habitsForDate } = getItemsForDate(selectedDate);
    
    return (
      <>
        <DialogTitle>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Tasks
            </Typography>
            {tasksForDate.length > 0 ? (
              <List dense>
                {tasksForDate.map(task => (
                  <ListItem key={task.id}>
                    <ListItemText 
                      primary={task.title} 
                      secondary={`${task.importance} • ${task.difficulty} • ${task.score} pts`}
                      primaryTypographyProps={{
                        style: { 
                          textDecoration: task.completedAt ? 'line-through' : 'none',
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tasks due on this date.
              </Typography>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Habits
            </Typography>
            {habitsForDate.length > 0 ? (
              <List dense>
                {habitsForDate.map(habit => (
                  <ListItem key={habit.id}>
                    <ListItemText 
                      primary={habit.title} 
                      secondary={`Streak: ${habit.streak.current} • ${habit.score} pts`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No habits scheduled on this date.
              </Typography>
            )}
          </Box>
        </DialogContent>
      </>
    );
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your tasks and habits in a calendar format.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={prevMonth}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ mx: 2 }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            <IconButton onClick={nextMonth}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<CalendarIcon />}
            onClick={goToToday}
          >
            Today
          </Button>
        </Box>
        
        <Grid container columns={7} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box 
              key={day} 
              sx={{ 
                textAlign: 'center', 
                p: 1,
                fontWeight: 'bold',
                color: 'text.secondary'
              }}
            >
              {day}
            </Box>
          ))}
          
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={`week-${weekIndex}`}>
              {week.map((day, dayIndex) => (
                <React.Fragment key={`day-${weekIndex}-${dayIndex}`}>
                  {day}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </Grid>
      </Paper>
      
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {renderDialogContent()}
      </Dialog>
    </Layout>
  );
} 