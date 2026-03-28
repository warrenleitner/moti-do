import { Box, SimpleGrid, Tabs, Stack } from '../../ui';
import { useState } from 'react';
import type { Task } from '../../types';
import { EmptyState } from '../common';
import HabitCard from './HabitCard';
import AnnualHeatmap from './AnnualHeatmap';
import HabitStats from './HabitStats';
import { IconRepeat, IconPlus } from '../../ui/icons';

interface HabitListProps {
  habits: Task[];
  allTasks: Task[];
  onComplete: (id: string) => void;
  onEdit: (habit: Task) => void;
  onDelete: (id: string) => void;
  onCreateNew?: () => void;
}

// UI component — Kinetic Console redesign
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
        description="Initialize behavior protocols to build consistency and track your streaks."
        actionLabel={onCreateNew ? 'Create Habit' : undefined}
        onAction={onCreateNew}
      />
    );
  }

  return (
    <Box>
      {/* KPI statistics row */}
      <HabitStats habits={rootHabits} />

      {/* View tabs — Kinetic Console styled */}
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
              <div className="micro-meta" style={{ marginBottom: '0.75rem' }}>
                Pending ({pendingHabits.length})
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {pendingHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={onComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* Completed habits */}
          {completedHabits.length > 0 && (
            <Box mb="lg">
              <div className="micro-meta" style={{ marginBottom: '0.75rem' }}>
                Completed Today ({completedHabits.length})
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {completedHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={onComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </SimpleGrid>
            </Box>
          )}

          {/* "Add New Habit" card */}
          {onCreateNew && (
            <Box mt="md">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <div
                  onClick={onCreateNew}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCreateNew(); }}
                  style={{
                    border: '2px dashed #454752',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    minHeight: '200px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#81ecff';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(129, 236, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#454752';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <IconPlus size={48} color="#525560" style={{ transition: 'transform 0.15s ease' }} />
                  <span
                    className="font-data"
                    style={{
                      fontSize: '0.75rem',
                      color: '#9BA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginTop: '0.75rem',
                    }}
                  >
                    INITIALIZE NEW PROTOCOL
                  </span>
                </div>
              </SimpleGrid>
            </Box>
          )}
        </>
      ) : (
        <Stack gap="md">
          {/* Annual aggregate heatmap */}
          <AnnualHeatmap habits={rootHabits} allTasks={allTasks} />
        </Stack>
      )}
    </Box>
  );
}
/* v8 ignore stop */
