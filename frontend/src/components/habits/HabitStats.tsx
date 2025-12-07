import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import {
  LocalFireDepartment,
  TrendingUp,
  EmojiEvents,
  CalendarMonth,
} from '@mui/icons-material';
import type { Task } from '../../types';

interface HabitStatsProps {
  habits: Task[];
}

export default function HabitStats({ habits }: HabitStatsProps) {
  // Calculate aggregate statistics
  const activeHabits = habits.filter((h) => !h.parent_habit_id);
  const totalStreakDays = activeHabits.reduce((sum, h) => sum + h.streak_current, 0);
  const avgStreak =
    activeHabits.length > 0
      ? Math.round(totalStreakDays / activeHabits.length)
      : 0;
  const bestStreak = Math.max(...activeHabits.map((h) => h.streak_best), 0);
  const longestCurrentStreak = Math.max(...activeHabits.map((h) => h.streak_current), 0);

  // Habits with active streaks (7+ days)
  const hotHabits = activeHabits.filter((h) => h.streak_current >= 7);

  const stats = [
    {
      icon: <LocalFireDepartment sx={{ fontSize: 32 }} />,
      label: 'Total Streak Days',
      value: totalStreakDays,
      color: '#ff9800',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 32 }} />,
      label: 'Average Streak',
      value: `${avgStreak} days`,
      color: '#2196f3',
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 32 }} />,
      label: 'Best Ever Streak',
      value: `${bestStreak} days`,
      color: '#4caf50',
    },
    {
      icon: <CalendarMonth sx={{ fontSize: 32 }} />,
      label: 'Active Habits',
      value: `${activeHabits.length}`,
      color: '#9c27b0',
    },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Habit Statistics
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
                <Typography variant="h5" fontWeight="bold">
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Hot habits (7+ day streaks) */}
      {hotHabits.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LocalFireDepartment /> Hot Streaks (7+ days)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {hotHabits.map((habit) => (
                <Box
                  key={habit.id}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    backgroundColor: 'warning.light',
                    color: 'warning.contrastText',
                  }}
                >
                  {habit.icon && <span>{habit.icon}</span>}
                  <Typography variant="body2" fontWeight="medium">
                    {habit.title}
                  </Typography>
                  <Typography variant="caption">
                    ({habit.streak_current} days)
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Longest current streak */}
      {longestCurrentStreak > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Your longest active streak is {longestCurrentStreak} days. Keep it going!
        </Typography>
      )}
    </Box>
  );
}
