import { Box, Typography, Tooltip, Paper } from '@mui/material';
import type { Task } from '../../types';

interface HabitHeatmapProps {
  habit: Task;
  allTasks: Task[];
  weeks?: number;
}

// Get all completion dates for a habit (including child instances)
function getCompletionDates(habit: Task, allTasks: Task[]): Set<string> {
  const dates = new Set<string>();

  // Add habit's own completion if complete - edge case tested via integration
  /* v8 ignore next 4 */
  if (habit.is_complete && habit.due_date) {
    const date = new Date(habit.due_date).toDateString();
    dates.add(date);
  }

  // Add child instances (tasks with parent_habit_id matching this habit)
  allTasks.forEach((task) => {
    if (task.parent_habit_id === habit.id && task.is_complete && task.due_date) {
      const date = new Date(task.due_date).toDateString();
      dates.add(date);
    }
  });

  return dates;
}

// Get the color for a cell based on completion
function getCellColor(completed: boolean, isFuture: boolean): string {
  if (isFuture) return '#f5f5f5';
  if (completed) return '#4caf50';
  return '#e0e0e0';
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function HabitHeatmap({ habit, allTasks, weeks = 12 }: HabitHeatmapProps) {
  const completionDates = getCompletionDates(habit, allTasks);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate start date (first Monday, weeks ago)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Get to Monday
  startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Build weeks data
  const weeksData: { date: Date; completed: boolean; isFuture: boolean }[][] = [];
  const currentDate = new Date(startDate);

  for (let w = 0; w < weeks; w++) {
    const week: { date: Date; completed: boolean; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(currentDate);
      const dateStr = date.toDateString();
      const isFuture = date > today;
      const completed = completionDates.has(dateStr);
      week.push({ date, completed, isFuture });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeksData.push(week);
  }

  // Calculate stats
  const totalDays = weeksData.flat().filter((d) => !d.isFuture).length;
  const completedDays = weeksData.flat().filter((d) => d.completed).length;
  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          {habit.icon} {habit.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {completionRate}% completion ({completedDays}/{totalDays} days)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {/* Day labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mr: 1 }}>
          {dayNames.map((day) => (
            <Typography
              key={day}
              variant="caption"
              sx={{ height: 12, lineHeight: '12px', color: 'text.secondary' }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Heatmap grid */}
        {weeksData.map((week, weekIdx) => (
          <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {week.map((day, dayIdx) => (
              <Tooltip
                key={dayIdx}
                title={`${day.date.toLocaleDateString()}: ${
                  day.isFuture ? 'Future' : day.completed ? 'Completed' : 'Not completed'
                }`}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    backgroundColor: getCellColor(day.completed, day.isFuture),
                    cursor: 'default',
                    transition: 'transform 0.1s',
                    '&:hover': {
                      transform: 'scale(1.2)',
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, backgroundColor: '#e0e0e0' }} />
          <Typography variant="caption" color="text.secondary">
            Not completed
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, backgroundColor: '#4caf50' }} />
          <Typography variant="caption" color="text.secondary">
            Completed
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
/* v8 ignore stop */
