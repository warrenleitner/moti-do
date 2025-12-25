import { Box, Text, Tabs, Stack } from '@mantine/core';
import { useState } from 'react';
import type { Task } from '../../types';
import { EmptyState } from '../common';
import HabitCard from './HabitCard';
import HabitHeatmap from './HabitHeatmap';
import HabitStats from './HabitStats';
import { IconRepeat } from '@tabler/icons-react';

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
        icon={<IconRepeat size={64} />}
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
      <Tabs value={view} onChange={(v) => setView(v as 'list' | 'heatmap')} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="list">List View</Tabs.Tab>
          <Tabs.Tab value="heatmap">Heatmap View</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {view === 'list' ? (
        <>
          {/* Pending habits */}
          {pendingHabits.length > 0 && (
            <Box mb="lg">
              <Text size="sm" c="dimmed" mb="xs">
                Pending ({pendingHabits.length})
              </Text>
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
              <Text size="sm" c="dimmed" mb="xs">
                Completed Today ({completedHabits.length})
              </Text>
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
        <Stack gap="md">
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
