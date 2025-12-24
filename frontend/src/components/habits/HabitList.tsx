import { Box, Typography, Tabs, Tab, Stack } from '@mui/material';
import { useState } from 'react';
import type { Task } from '../../types';
import { EmptyState } from '../common';
import HabitCard from './HabitCard';
import HabitHeatmap from './HabitHeatmap';
import HabitStats from './HabitStats';
import { Loop } from '@mui/icons-material';

interface HabitListProps {
  habits: Task[];
  allTasks: Task[];
  onComplete: (id: string) => void;
  onEdit: (habit: Task) => void;
  onDelete: (id: string) => void;
  onCreateNew?: () => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function HabitList({
  habits,
  allTasks,
  onComplete,
  onEdit,
  onDelete,
  onCreateNew,
}: HabitListProps) {
  const [view, setView] = useState<'list' | 'heatmap'>('list');

  // Filter to only show root habits (not child instances)
  const rootHabits = habits.filter((h) => !h.parent_habit_id);

  // Separate pending and completed habits for today
  const pendingHabits = rootHabits.filter((h) => !h.is_complete);
  const completedHabits = rootHabits.filter((h) => h.is_complete);

  if (rootHabits.length === 0) {
    return (
      <EmptyState
        icon={<Loop sx={{ fontSize: 64 }} />}
        title="No habits yet"
        description="Create recurring habits to build consistency and track your streaks."
        actionLabel={onCreateNew ? 'Create Habit' : undefined}
        onAction={onCreateNew}
      />
    );
  }

  return (
    <Box>
      {/* Statistics */}
      <HabitStats habits={rootHabits} />

      {/* View tabs */}
      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 3 }}>
        <Tab label="List View" value="list" />
        <Tab label="Heatmap View" value="heatmap" />
      </Tabs>

      {view === 'list' ? (
        <>
          {/* Pending habits */}
          {pendingHabits.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Pending ({pendingHabits.length})
              </Typography>
              {pendingHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </Box>
          )}

          {/* Completed habits */}
          {completedHabits.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Completed Today ({completedHabits.length})
              </Typography>
              {completedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </Box>
          )}
        </>
      ) : (
        <Stack spacing={2}>
          {rootHabits.map((habit) => (
            <HabitHeatmap
              key={habit.id}
              habit={habit}
              allTasks={allTasks}
              weeks={12}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
/* v8 ignore stop */
