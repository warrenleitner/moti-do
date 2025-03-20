'use client';

import React, { useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Button } from '@mui/material';
import { useAppStore } from '@/store/AppStore';
import Todo from '@/components/Todo';
import HabitItem from '@/components/HabitItem';

export default function Home() {
  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  const getTasksDueToday = useAppStore((state) => state.getTasksDueToday);
  const getHabitsDueToday = useAppStore((state) => state.getHabitsDueToday);
  const user = useAppStore((state) => state.user);

  // Sample task and habit data for initial usage
  useEffect(() => {
    // Only add sample data if there are no tasks or habits
    if (tasks.length === 0 && habits.length === 0) {
      initializeSampleData();
    }
  }, [tasks.length, habits.length]);

  const initializeSampleData = () => {
    const addTask = useAppStore.getState().addTask;
    const addHabit = useAppStore.getState().addHabit;
    const addTag = useAppStore.getState().addTag;
    const addProject = useAppStore.getState().addProject;

    // Add sample tags
    addTag('Work', '#2196f3');
    addTag('Personal', '#4caf50');
    addTag('Health', '#f44336');
    
    // Add sample projects
    addProject('Career', '#3f51b5');
    addProject('Fitness', '#ff9800');
    
    // Add sample tasks
    addTask({
      title: 'Complete project proposal',
      description: 'Finish writing the proposal for the new project',
      importance: 'High',
      difficulty: 'Medium',
      duration: 'Medium',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      tags: ['0'], // Work tag
      projectId: '0', // Career project
      subtasks: [
        { id: '0', title: 'Write executive summary', completed: false, createdAt: new Date() },
        { id: '1', title: 'Create timeline', completed: false, createdAt: new Date() },
        { id: '2', title: 'Estimate budget', completed: false, createdAt: new Date() },
      ],
    });

    addTask({
      title: 'Go grocery shopping',
      description: 'Buy ingredients for the week',
      importance: 'Medium',
      difficulty: 'Low',
      duration: 'Short',
      dueDate: new Date(), // Today
      tags: ['1'], // Personal tag
    });
    
    // Add sample habits
    addHabit({
      title: 'Daily exercise',
      description: 'Workout for at least 30 minutes',
      importance: 'High',
      difficulty: 'Medium',
      duration: 'Medium',
      tags: ['2'], // Health tag
      projectId: '1', // Fitness project
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      subtaskRecurrenceOption: 'default',
    });

    addHabit({
      title: 'Read a book',
      description: 'Read for at least 20 minutes',
      importance: 'Medium',
      difficulty: 'Low',
      duration: 'Short',
      tags: ['1'], // Personal tag
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      subtaskRecurrenceOption: 'default',
    });
  };

  const tasksToday = getTasksDueToday();
  const habitsToday = getHabitsDueToday();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Your Progress
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                <Box sx={{ 
                  width: 150, 
                  height: 150, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'white',
                }}>
                  <Typography variant="h4">{user.xp}</Typography>
                  <Typography variant="body1">XP</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Tasks Due Today
              </Typography>
              <Typography variant="h4" sx={{ textAlign: 'center', py: 3 }}>
                {tasksToday.length}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                href="/tasks"
              >
                View Tasks
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Habits Due Today
              </Typography>
              <Typography variant="h4" sx={{ textAlign: 'center', py: 3 }}>
                {habitsToday.length}
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth
                href="/habits"
              >
                View Habits
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      {/* Today's Tasks */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Today's Tasks
        </Typography>
        
        {tasksToday.length > 0 ? (
          tasksToday.map((task) => (
            <Todo key={task.id} task={task} />
          ))
        ) : (
          <Card>
            <CardContent>
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                No tasks due today
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
      
      {/* Today's Habits */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Today's Habits
        </Typography>
        
        {habitsToday.length > 0 ? (
          habitsToday.map((habit) => (
            <HabitItem key={habit.id} habit={habit} />
          ))
        ) : (
          <Card>
            <CardContent>
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                No habits due today
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
} 