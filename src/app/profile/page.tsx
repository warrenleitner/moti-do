'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Stack,
  Chip,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import { 
  Star as StarIcon,
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  BarChart as BarChartIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useAppStore } from '@/store/AppStore';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Task } from '@/models/Task';
import { Habit } from '@/models/Habit';
import { User, XPTransaction } from '@/models/User';
import ScoreBankDialog from '@/components/ScoreBankDialog';
import ResetProfileDialog from '@/components/ResetProfileDialog';
import UndoSnackbar from '@/components/UndoSnackbar';

// Chart component using canvas
const Chart = ({ data, color, height = 100, labels = [] }: { data: number[], color: string, height?: number, labels?: string[] }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const maxValue = Math.max(...data, 1); // Prevent division by zero
    const width = canvas.width;
    const barWidth = width / data.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * height;
      const x = index * barWidth;
      const y = height - barHeight;
      
      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 2, barHeight);
      
      // Draw label if provided
      if (labels[index]) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth / 2, height - 2);
      }
    });
  }, [data, color, height, labels]);
  
  return (
    <canvas ref={canvasRef} width={500} height={height} style={{ maxWidth: '100%', height: 'auto' }} />
  );
};

// Level calculation from XP
const calculateLevel = (xp: number) => {
  // Each level requires 20% more XP than the previous
  // Level 1: 100 XP
  // Level 2: 220 XP
  // Level 3: 364 XP, etc.
  let level = 0;
  let xpForNextLevel = 100;
  let totalXpForCurrentLevel = 0;
  
  while (xp >= xpForNextLevel) {
    totalXpForCurrentLevel += xpForNextLevel;
    level++;
    xpForNextLevel = Math.round(100 * Math.pow(1.2, level));
    
    // Cap at level 100 to prevent infinite loops
    if (level >= 100) break;
  }
  
  const currentLevelXp = xp - totalXpForCurrentLevel;
  const progress = Math.round((currentLevelXp / xpForNextLevel) * 100) || 0;
  
  return {
    level: level + 1, // Start at level 1
    xpForCurrentLevel: currentLevelXp,
    xpForNextLevel,
    progress
  };
};

interface Badge {
  id: string;
  name: string;
  description: string;
  glyph: string;
  dateEarned: Date;
}

// Generate badges based on user progress
const generateBadges = (user: User, tasks: Task[], habits: Habit[]): Badge[] => {
  const badges: Badge[] = [];
  
  // Use existing badges if any
  if (user.badges && user.badges.length > 0) {
    return user.badges;
  }
  
  // Task completion badges
  const completedTasks = tasks.filter(t => t.completedAt).length;
  if (completedTasks >= 1) {
    badges.push({
      id: 'first-task',
      name: 'First Step',
      description: 'Complete your first task',
      glyph: '🎯',
      dateEarned: new Date()
    });
  }
  
  if (completedTasks >= 10) {
    badges.push({
      id: 'task-master-10',
      name: 'Task Apprentice',
      description: 'Complete 10 tasks',
      glyph: '✅',
      dateEarned: new Date()
    });
  }
  
  if (completedTasks >= 50) {
    badges.push({
      id: 'task-master-50',
      name: 'Task Master',
      description: 'Complete 50 tasks',
      glyph: '🏆',
      dateEarned: new Date()
    });
  }
  
  // Habit badges
  const maxStreak = habits.reduce((max: number, h: Habit) => Math.max(max, h.streak.current), 0);
  if (maxStreak >= 3) {
    badges.push({
      id: 'habit-starter',
      name: 'Habit Starter',
      description: 'Maintain a habit for 3 days',
      glyph: '🔥',
      dateEarned: new Date()
    });
  }
  
  if (maxStreak >= 7) {
    badges.push({
      id: 'habit-weekly',
      name: 'Week Warrior',
      description: 'Maintain a habit for 7 days',
      glyph: '📆',
      dateEarned: new Date()
    });
  }
  
  if (maxStreak >= 30) {
    badges.push({
      id: 'habit-monthly',
      name: 'Habit Former',
      description: 'Maintain a habit for 30 days',
      glyph: '🌟',
      dateEarned: new Date()
    });
  }
  
  // XP badges
  if (user.xp >= 100) {
    badges.push({
      id: 'xp-100',
      name: 'XP Hunter',
      description: 'Earn 100 XP',
      glyph: '💯',
      dateEarned: new Date()
    });
  }
  
  if (user.xp >= 1000) {
    badges.push({
      id: 'xp-1000',
      name: 'XP Collector',
      description: 'Earn 1000 XP',
      glyph: '🌠',
      dateEarned: new Date()
    });
  }
  
  return badges;
};

// Calculate personal bests
const calculatePersonalBests = (tasks: Task[], habits: Habit[]) => {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  
  // Tasks completed in various time ranges
  const tasksCompletedToday = tasks.filter(t => 
    t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd
  ).length;
  
  const tasksCompletedThisWeek = tasks.filter(t => 
    t.completedAt && t.completedAt >= weekStart && t.completedAt <= weekEnd
  ).length;
  
  const tasksCompletedThisMonth = tasks.filter(t => 
    t.completedAt && t.completedAt >= monthStart && t.completedAt <= monthEnd
  ).length;
  
  const tasksCompletedThisYear = tasks.filter(t => 
    t.completedAt && t.completedAt >= yearStart && t.completedAt <= yearEnd
  ).length;
  
  // Habits completed in various time ranges
  const habitsCompletedToday = habits.filter(h => 
    h.completions.some(c => 
      c.completed && c.date >= dayStart && c.date <= dayEnd
    )
  ).length;
  
  const habitsCompletedThisWeek = habits.filter(h => 
    h.completions.some(c => 
      c.completed && c.date >= weekStart && c.date <= weekEnd
    )
  ).length;
  
  const habitsCompletedThisMonth = habits.filter(h => 
    h.completions.some(c => 
      c.completed && c.date >= monthStart && c.date <= monthEnd
    )
  ).length;
  
  const habitsCompletedThisYear = habits.filter(h => 
    h.completions.some(c => 
      c.completed && c.date >= yearStart && c.date <= yearEnd
    )
  ).length;
  
  // Calculate max scores
  const taskScores = tasks.map(t => t.score);
  const habitScores = habits.map(h => h.score);
  
  const maxTaskScore = taskScores.length > 0 ? Math.max(...taskScores) : 0;
  const maxHabitScore = habitScores.length > 0 ? Math.max(...habitScores) : 0;
  
  return {
    tasks: {
      daily: tasksCompletedToday,
      weekly: tasksCompletedThisWeek,
      monthly: tasksCompletedThisMonth,
      yearly: tasksCompletedThisYear,
      maxScore: maxTaskScore
    },
    habits: {
      daily: habitsCompletedToday,
      weekly: habitsCompletedThisWeek,
      monthly: habitsCompletedThisMonth,
      yearly: habitsCompletedThisYear,
      maxScore: maxHabitScore,
      maxStreak: habits.reduce((max: number, h: Habit) => Math.max(max, h.streak.current), 0)
    }
  };
};

// Generate historical data for charts
const generateChartData = (tasks: Task[], habits: Habit[], transactions: XPTransaction[]) => {
  // Last 7 days
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  
  // XP earned per day
  const xpData = days.map(day => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    
    return transactions
      .filter(t => t.timestamp >= dayStart && t.timestamp <= dayEnd)
      .reduce((sum, t) => sum + t.amount, 0);
  });
  
  // Tasks completed per day
  const taskData = days.map(day => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    
    return tasks.filter(t => 
      t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd
    ).length;
  });
  
  // Habits completed per day
  const habitData = days.map(day => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    
    return habits.filter(h => 
      h.completions.some(c => 
        c.completed && c.date >= dayStart && c.date <= dayEnd
      )
    ).length;
  });
  
  // Average score of completed items per day
  const scoreData = days.map(day => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    
    const completedTasks = tasks.filter(t => 
      t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd
    );
    
    if (completedTasks.length === 0) return 0;
    
    const totalScore = completedTasks.reduce((sum, t) => sum + t.score, 0);
    return Math.round(totalScore / completedTasks.length);
  });
  
  // Date labels
  const dateLabels = days.map(day => format(day, 'MM/dd'));
  
  return { xpData, taskData, habitData, scoreData, dateLabels };
};

export default function ProfilePage() {
  const [tabValue, setTabValue] = useState(0);
  const [scoreBankDialogOpen, setScoreBankDialogOpen] = useState(false);
  const [resetProfileDialogOpen, setResetProfileDialogOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  
  const user = useAppStore((state) => state.user);
  const tasks = useAppStore((state) => state.tasks);
  const habits = useAppStore((state) => state.habits);
  
  // Calculate level info
  const { level, xpForCurrentLevel, xpForNextLevel, progress } = calculateLevel(user.xp);
  
  // Generate badges based on progress
  const badges = generateBadges(user, tasks, habits);
  
  // Calculate personal bests
  const personalBests = calculatePersonalBests(tasks, habits);
  
  // Generate chart data
  const { xpData, taskData, habitData, scoreData, dateLabels } = generateChartData(
    tasks, 
    habits, 
    user.xpTransactions
  );
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your progress, view stats, and earn achievements.
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 80, 
                  height: 80,
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                {level}
              </Avatar>
              <Box sx={{ ml: 2, flexGrow: 1 }}>
                <Typography variant="h6">
                  Level {level}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {xpForCurrentLevel} / {xpForNextLevel} XP
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ mt: 1, height: 8, borderRadius: 4, width: '100%' }}
                />
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Stats
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total XP
                        </Typography>
                        <Typography variant="h6">
                          {user.xp}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tasks Completed
                        </Typography>
                        <Typography variant="h6">
                          {tasks.filter(t => t.completedAt).length}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FireIcon sx={{ color: 'error.main', mr: 1 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Best Streak
                        </Typography>
                        <Typography variant="h6">
                          {personalBests.habits.maxStreak}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrophyIcon sx={{ color: 'warning.main', mr: 1 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Badges
                        </Typography>
                        <Typography variant="h6">
                          {badges.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Personal Bests
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="center">Daily</TableCell>
                    <TableCell align="center">Weekly</TableCell>
                    <TableCell align="center">Monthly</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">Tasks</TableCell>
                    <TableCell align="center">{personalBests.tasks.daily}</TableCell>
                    <TableCell align="center">{personalBests.tasks.weekly}</TableCell>
                    <TableCell align="center">{personalBests.tasks.monthly}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Habits</TableCell>
                    <TableCell align="center">{personalBests.habits.daily}</TableCell>
                    <TableCell align="center">{personalBests.habits.weekly}</TableCell>
                    <TableCell align="center">{personalBests.habits.monthly}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Badges & Achievements
            </Typography>
            
            <List>
              {badges.map(badge => (
                <ListItem key={badge.id} alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      {badge.glyph}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={badge.name}
                    secondary={
                      <>
                        <Typography variant="body2" component="span" color="text.primary">
                          {badge.description}
                        </Typography>
                        {badge.dateEarned && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Earned on {format(new Date(badge.dateEarned), 'MMM d, yyyy')}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
              
              {badges.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No badges earned yet. Complete tasks and maintain habits to earn achievements!
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                textColor="primary"
                indicatorColor="primary"
                variant="fullWidth"
              >
                <Tab label="Progress" />
                <Tab label="Activity" />
                <Tab label="Achievements" />
              </Tabs>
            </Box>
            
            {tabValue === 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Recent Progress (Last 7 days)
                </Typography>
                
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    XP Earned
                  </Typography>
                  <Chart data={xpData} color="rgba(63, 81, 181, 0.7)" labels={dateLabels} />
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Tasks Completed
                      </Typography>
                      <Chart data={taskData} color="rgba(76, 175, 80, 0.7)" labels={dateLabels} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Habits Completed
                      </Typography>
                      <Chart data={habitData} color="rgba(244, 67, 54, 0.7)" labels={dateLabels} />
                    </Box>
                  </Grid>
                </Grid>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average Task Score
                  </Typography>
                  <Chart data={scoreData} color="rgba(255, 152, 0, 0.7)" labels={dateLabels} />
                </Box>
              </Box>
            )}
            
            {tabValue === 1 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Recent Activity
                </Typography>
                
                <List>
                  {user.xpTransactions.slice(0, 10).map((transaction, index) => (
                    <ListItem key={index} divider={index < 9}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">
                              {transaction.description}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount} XP
                            </Typography>
                          </Box>
                        }
                        secondary={transaction.timestamp ? format(new Date(transaction.timestamp), 'MMM d, yyyy, h:mm a') : '-'}
                      />
                    </ListItem>
                  ))}
                  
                  {user.xpTransactions.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No recent activity. Complete tasks and habits to earn XP!
                    </Typography>
                  )}
                </List>
              </Box>
            )}
            
            {tabValue === 2 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Achievement Progress
                </Typography>
                
                <List>
                  {[
                    { 
                      name: 'Task Master', 
                      description: 'Complete 50 tasks', 
                      current: tasks.filter(t => t.completedAt).length,
                      target: 50,
                      progress: Math.min(tasks.filter(t => t.completedAt).length / 50, 1) * 100 
                    },
                    { 
                      name: 'Habit Former', 
                      description: 'Maintain a 30-day streak on any habit', 
                      current: personalBests.habits.maxStreak,
                      target: 30,
                      progress: Math.min(personalBests.habits.maxStreak / 30, 1) * 100 
                    },
                    { 
                      name: 'Diversified', 
                      description: 'Use 5 different tags', 
                      current: Array.from(new Set(tasks.flatMap(t => t.tags || []))).length,
                      target: 5,
                      progress: Math.min(Array.from(new Set(tasks.flatMap(t => t.tags || []))).length / 5, 1) * 100 
                    },
                    { 
                      name: 'Project Manager', 
                      description: 'Complete 3 projects', 
                      current: Array.from(new Set(tasks.filter(t => t.completedAt && t.projectId).map(t => t.projectId))).length,
                      target: 3,
                      progress: Math.min(Array.from(new Set(tasks.filter(t => t.completedAt && t.projectId).map(t => t.projectId))).length / 3, 1) * 100 
                    },
                    { 
                      name: 'XP Hunter', 
                      description: 'Earn 1000 XP', 
                      current: user.xp,
                      target: 1000,
                      progress: Math.min(user.xp / 1000, 1) * 100 
                    }
                  ].map((achievement, index) => (
                    <ListItem key={index} divider={index < 4}>
                      <ListItemText
                        primary={achievement.name}
                        secondary={`${achievement.description} (${achievement.current}/${achievement.target})`}
                      />
                      <Box sx={{ width: '40%', ml: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={achievement.progress} 
                          color={achievement.progress >= 100 ? 'success' : 'primary'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary" align="right" display="block">
                          {Math.round(achievement.progress)}%
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Additional User Actions */}
      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <Button variant="outlined" onClick={() => setScoreBankDialogOpen(true)}>
          Score Bank
        </Button>
        <Button variant="outlined" color="error" onClick={() => setResetProfileDialogOpen(true)}>
          Reset Profile
        </Button>
      </Box>
      
      <ScoreBankDialog 
        open={scoreBankDialogOpen} 
        onClose={() => setScoreBankDialogOpen(false)} 
        user={user}
      />
      
      <ResetProfileDialog 
        open={resetProfileDialogOpen} 
        onClose={() => setResetProfileDialogOpen(false)} 
        onConfirm={() => {
          // Implement profile reset logic here
          console.log('Profile has been reset.');
          alert('Profile has been reset successfully.');
        }}
      />
      
      {/* Example usage of UndoSnackbar (not fully integrated): */}
      <UndoSnackbar 
        open={undoOpen} 
        message="Action completed" 
        onUndo={() => {
          // Implement undo action
          console.log('Undo action triggered');
          setUndoOpen(false);
        }} 
        onClose={() => setUndoOpen(false)}
      />
    </Layout>
  );
} 