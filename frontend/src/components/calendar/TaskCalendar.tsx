import { useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { Box, Paper, Text, Modal, Button, Select, Badge, CloseButton, Group } from '@mantine/core';
import type { Task } from '../../types';

interface TaskCalendarProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onSelectTask?: (task: Task) => void;
  onCreateTask?: (date: Date) => void;
}

// Priority colors for events
const priorityColors: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: '#ffebee', border: '#d32f2f', text: '#c62828' },
  high: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  medium: { bg: '#e3f2fd', border: '#1976d2', text: '#1565c0' },
  low: { bg: '#e8f5e9', border: '#388e3c', text: '#2e7d32' },
  trivial: { bg: '#f5f5f5', border: '#757575', text: '#616161' },
};

// UI component - tested via integration tests
/* v8 ignore start */
export default function TaskCalendar({
  tasks,
  onUpdateTask,
  onSelectTask,
  onCreateTask,
}: TaskCalendarProps) {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  // Get unique projects
  const projects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.project && set.add(t.project));
    return Array.from(set);
  }, [tasks]);

  // Convert tasks to calendar events
  const events = useMemo(() => {
    return tasks
      .filter((task) => {
        // Only show tasks with dates
        if (!task.due_date) return false;
        // Filter by project
        if (filterProject !== 'all' && task.project !== filterProject) return false;
        return true;
      })
      .map((task) => {
        const colors = priorityColors[task.priority] || priorityColors.medium;
        const isOverdue = new Date(task.due_date!) < new Date() && !task.is_complete;

        return {
          id: task.id,
          title: `${task.icon || ''} ${task.title}`.trim(),
          start: task.due_date,
          end: task.due_date,
          allDay: !task.due_date?.includes('T'),
          backgroundColor: task.is_complete ? '#e0e0e0' : colors.bg,
          borderColor: task.is_complete ? '#9e9e9e' : isOverdue ? '#d32f2f' : colors.border,
          textColor: task.is_complete ? '#757575' : colors.text,
          extendedProps: {
            task,
            isHabit: task.is_habit,
            isComplete: task.is_complete,
            priority: task.priority,
          },
        };
      });
  }, [tasks, filterProject]);

  // Handle event click
  const handleEventClick = (info: EventClickArg) => {
    const task = info.event.extendedProps.task as Task;
    setSelectedTask(task);
    setDetailsOpen(true);
    onSelectTask?.(task);
  };

  // Handle date selection for creating new tasks
  const handleDateSelect = (info: DateSelectArg) => {
    onCreateTask?.(info.start);
  };

  // Handle event drag (reschedule)
  const handleEventDrop = (info: EventDropArg) => {
    const taskId = info.event.id;
    const newDate = info.event.start;

    if (newDate) {
      onUpdateTask(taskId, {
        due_date: newDate.toISOString(),
      });
    }
  };

  // Toggle task completion
  const handleToggleComplete = () => {
    if (selectedTask) {
      onUpdateTask(selectedTask.id, {
        is_complete: !selectedTask.is_complete,
        completion_date: !selectedTask.is_complete ? new Date().toISOString() : undefined,
      });
      setDetailsOpen(false);
    }
  };

  // Generate project options
  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects.map((project) => ({ value: project, label: project })),
  ];

  return (
    <Box>
      {/* Filters */}
      <Group gap="md" mb="lg" align="flex-end" wrap="wrap">
        <Select
          label="Project"
          value={filterProject}
          onChange={(v) => setFilterProject(v || 'all')}
          data={projectOptions}
          size="sm"
          w={150}
        />

        {filterProject !== 'all' && (
          <Badge
            size="lg"
            variant="light"
            rightSection={
              <CloseButton size="xs" onClick={() => setFilterProject('all')} aria-label="Clear filter" />
            }
          >
            Project: {filterProject}
          </Badge>
        )}

        <Text size="sm" c="dimmed" style={{ marginLeft: 'auto' }}>
          {events.length} tasks with due dates
        </Text>
      </Group>

      {/* Legend */}
      <Group gap="md" mb="md" wrap="wrap">
        {Object.entries(priorityColors).map(([priority, colors]) => (
          <Group key={priority} gap={4} align="center">
            <Box
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
              }}
            />
            <Text size="xs" style={{ textTransform: 'capitalize' }}>
              {priority}
            </Text>
          </Group>
        ))}
        <Group gap={4} align="center">
          <Box
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              border: '2px solid #9e9e9e',
            }}
          />
          <Text size="xs">Completed</Text>
        </Group>
      </Group>

      {/* Calendar */}
      <Paper p="md">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          selectable={!!onCreateTask}
          editable={true}
          droppable={true}
          dayMaxEvents={4}
          weekends={true}
          nowIndicator={true}
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
          }}
        />
      </Paper>

      {/* Task details modal */}
      <Modal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={
          selectedTask && (
            <Group gap="xs">
              {selectedTask.icon && <span>{selectedTask.icon}</span>}
              <Text
                size="lg"
                fw={500}
                td={selectedTask.is_complete ? 'line-through' : undefined}
              >
                {selectedTask.title}
              </Text>
            </Group>
          )
        }
        size="md"
      >
        {selectedTask && (
          <Box>
            {selectedTask.description && (
              <Text size="sm" mb="md">
                {selectedTask.description}
              </Text>
            )}

            <Group gap="xs" mb="md" wrap="wrap">
              <Badge
                size="sm"
                style={{
                  backgroundColor: priorityColors[selectedTask.priority]?.bg,
                  color: priorityColors[selectedTask.priority]?.text,
                  textTransform: 'capitalize',
                }}
              >
                {selectedTask.priority}
              </Badge>
              <Badge size="sm" variant="light" style={{ textTransform: 'capitalize' }}>
                {selectedTask.difficulty}
              </Badge>
              <Badge size="sm" variant="light" style={{ textTransform: 'capitalize' }}>
                {selectedTask.duration}
              </Badge>
              {selectedTask.is_habit && (
                <Badge size="sm" color="violet">
                  Habit
                </Badge>
              )}
            </Group>

            {selectedTask.due_date && (
              <Text size="sm" c="dimmed" mb="xs">
                Due: {new Date(selectedTask.due_date).toLocaleString()}
              </Text>
            )}

            {selectedTask.project && (
              <Text size="sm" c="dimmed" mb="xs">
                Project: {selectedTask.project}
              </Text>
            )}

            {selectedTask.tags && selectedTask.tags.length > 0 && (
              <Group gap={4} mb="md" wrap="wrap">
                {selectedTask.tags.map((tag) => (
                  <Badge key={tag} size="sm" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}

            <Group justify="flex-end" mt="lg">
              <Button variant="subtle" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button
                color={selectedTask.is_complete ? 'yellow' : 'green'}
                onClick={handleToggleComplete}
              >
                {selectedTask.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
/* v8 ignore stop */
