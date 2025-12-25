import { Box, Card, CardContent, Typography, LinearProgress, Chip, Stack, Grid, Alert, Divider } from '@mui/material';
import {
  EmojiEvents as XPIcon,
  CheckCircle as CompletedIcon,
  TrendingUp as StreakIcon,
  Star as BadgeIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useUserStore, useTaskStore } from '../store';
import { useUserStats, useSystemStatus } from '../store/userStore';

// UI component - tested via integration tests
/* v8 ignore start */
export default function Dashboard() {
  const { user } = useUserStore();
  const { tasks } = useTaskStore();
  const stats = useUserStats();
  const systemStatus = useSystemStatus();

  // Calculate stats from tasks (fallback if API stats not available)
  const completedToday = tasks.filter(
    (t) =>
      t.is_complete &&
      t.completion_date &&
      new Date(t.completion_date).toDateString() === new Date().toDateString()
  ).length;

  const activeTasks = stats?.pending_tasks ?? tasks.filter((t) => !t.is_complete).length;
  const habitsCount = stats?.habits_count ?? tasks.filter((t) => t.is_habit && !t.is_complete).length;
  const dueToday = tasks.filter((t) => {
    if (!t.due_date || t.is_complete) return false;
    return new Date(t.due_date).toDateString() === new Date().toDateString();
  }).length;

  // XP progress to next level (100 XP per level)
  const totalXP = stats?.total_xp ?? user?.xp ?? 0;
  const currentLevel = stats?.level ?? user?.level ?? 1;
  const xpProgress = totalXP % 100;
  const badgesEarned = stats?.badges_earned ?? user?.badges.length ?? 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back{user ? `, ${user.username}` : ''}!
      </Typography>

      {/* Pending days warning */}
      {systemStatus && systemStatus.pending_days > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          You have {systemStatus.pending_days} day{systemStatus.pending_days > 1 ? 's' : ''} to process.
          Visit Settings to advance the date and apply any pending penalties.
        </Alert>
      )}

      {/* Vacation mode notice */}
      {systemStatus?.vacation_mode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Vacation mode is active. No penalties will be applied until you disable it in Settings.
        </Alert>
      )}

      {/* Date Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                Today: <strong>{new Date().toLocaleDateString()}</strong>
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Typography variant="body2" color="text.secondary">
              Last Processed: <strong>{systemStatus?.last_processed_date || 'Never'}</strong>
            </Typography>
            {systemStatus && systemStatus.pending_days > 0 && (
              <>
                <Divider orientation="vertical" flexItem />
                <Typography variant="body2" color="error.main">
                  <strong>{systemStatus.pending_days} day{systemStatus.pending_days > 1 ? 's' : ''} behind</strong>
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* XP Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <XPIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Experience
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {totalXP} XP
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={xpProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {xpProgress}/100 to Level {currentLevel + 1}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Completed Today Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CompletedIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Completed Today
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {completedToday}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dueToday} due today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Tasks Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StreakIcon color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Active Tasks
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {activeTasks}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {habitsCount} habits pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Badges Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BadgeIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Badges Earned
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {badgesEarned}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Level {currentLevel}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Badges */}
      {user && user.badges.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Badges
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {user.badges.slice(-5).map((badge) => (
                <Chip
                  key={badge.id}
                  icon={<span>{badge.glyph}</span>}
                  label={badge.name}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Start
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the sidebar to navigate to Tasks, view your Calendar, or see your habits.
            This dashboard will show your daily progress and achievements.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
/* v8 ignore stop */
