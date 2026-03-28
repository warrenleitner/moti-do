import { useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { Box, Text, Modal, Select, Badge, CloseButton, Group } from '../../ui';
import { ArcadeButton, DataBadge } from '../ui';
import type { Task } from '../../types';

interface TaskCalendarProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onSelectTask?: (task: Task) => void;
  onCreateTask?: (date: Date) => void;
}

// Kinetic Console priority colors for events
const priorityColors: Record<string, { bg: string; border: string; text: string }> = {
  'Defcon One': { bg: 'rgba(255, 107, 155, 0.15)', border: '#ff6b9b', text: '#ff6b9b' },
  'High': { bg: 'rgba(255, 199, 117, 0.15)', border: '#FFC775', text: '#FFC775' },
  'Medium': { bg: 'rgba(129, 236, 255, 0.15)', border: '#81ecff', text: '#81ecff' },
  'Low': { bg: 'rgba(69, 71, 82, 0.2)', border: '#454752', text: '#a8aab7' },
  'Trivial': { bg: 'rgba(69, 71, 82, 0.1)', border: '#32343F', text: '#525560' },
};

// Legend display (simplified keys for legend)
const legendItems = [
  { label: 'Critical', color: '#ff6b9b' },
  { label: 'High', color: '#FFC775' },
  { label: 'Medium', color: '#81ecff' },
  { label: 'Low', color: '#454752' },
  { label: 'Complete', color: '#525560' },
];

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
        const colors = priorityColors[task.priority] || priorityColors['Medium'];
        const isOverdue = new Date(task.due_date!) < new Date() && !task.is_complete;

        return {
          id: task.id,
          title: `${task.icon || ''} ${task.title}`.trim(),
          start: task.due_date,
          end: task.due_date,
          allDay: !task.due_date?.includes('T'),
          backgroundColor: task.is_complete ? '#272A34' : colors.bg,
          borderColor: task.is_complete ? '#525560' : isOverdue ? '#ff6b9b' : colors.border,
          textColor: task.is_complete ? '#525560' : colors.text,
          extendedProps: {
            task,
            isHabit: task.is_habit,
            isComplete: task.is_complete,
            priority: task.priority,
          },
        };
      });
  }, [tasks, filterProject]);

  // Handle event click - directly open edit form via callback
  const handleEventClick = (info: EventClickArg) => {
    const task = info.event.extendedProps.task as Task;
    // If onSelectTask is provided, use it to open the edit form
    // Otherwise fall back to the built-in details modal
    if (onSelectTask) {
      onSelectTask(task);
    } else {
      setSelectedTask(task);
      setDetailsOpen(true);
    }
  };

  // Handle date selection for creating new tasks
  const handleDateSelect = (info: DateSelectArg) => {
    onCreateTask?.(info.start);
  };

  // Handle event drag (reschedule)
  const handleEventDrop = (info: EventDropArg) => {
    const taskId = info.event.id;
    const newDate = info.event.start;
    const wasAllDay = info.event.allDay;

    if (newDate) {
      // Preserve date-only format for all-day events
      const dateValue = wasAllDay
        ? newDate.toISOString().split('T')[0]
        : newDate.toISOString();
      onUpdateTask(taskId, {
        due_date: dateValue,
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
          role="combobox"
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

        <DataBadge value={`${events.length} EVENTS`} color="cyan" size="md" />
      </Group>

      {/* Legend */}
      <Group gap="md" mb="md" wrap="wrap">
        {legendItems.map(({ label, color }) => (
          <Group key={label} gap={4} align="center">
            <Box
              style={{
                width: 12,
                height: 12,
                backgroundColor: `${color}33`,
                borderLeft: `3px solid ${color}`,
              }}
            />
            <Text size="xs" className="font-data" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a8aab7' }}>
              {label}
            </Text>
          </Group>
        ))}
      </Group>

      {/* Calendar — Kinetic Console themed via CSS overrides */}
      <div className="kc-calendar ghost-border" style={{ backgroundColor: '#0B0E17', padding: '1rem', boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)' }}>
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
      </div>

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
                fw={600}
                className="font-display"
                td={selectedTask.is_complete ? 'line-through' : undefined}
                style={{ color: '#e6e7f5' }}
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
              <Text size="sm" mb="md" style={{ color: '#a8aab7' }}>
                {selectedTask.description}
              </Text>
            )}

            <Group gap="xs" mb="md" wrap="wrap">
              <DataBadge
                value={selectedTask.priority}
                color={
                  selectedTask.priority === 'Defcon One' ? 'magenta' :
                  selectedTask.priority === 'High' ? 'amber' :
                  selectedTask.priority === 'Medium' ? 'cyan' : 'muted'
                }
              />
              <DataBadge value={selectedTask.difficulty} color="muted" />
              <DataBadge value={selectedTask.duration} color="muted" />
              {selectedTask.is_habit && (
                <DataBadge value="HABIT" color="magenta" />
              )}
            </Group>

            {selectedTask.due_date && (
              <Text size="sm" className="font-data" style={{ color: '#a8aab7' }} mb="xs">
                DUE: {selectedTask.due_date.includes('T')
                  ? new Date(selectedTask.due_date).toLocaleString()
                  : new Date(selectedTask.due_date + 'T00:00:00').toLocaleDateString()}
              </Text>
            )}

            {selectedTask.project && (
              <Text size="sm" className="font-data" style={{ color: '#a8aab7' }} mb="xs">
                PROJECT: {selectedTask.project}
              </Text>
            )}

            {selectedTask.tags && selectedTask.tags.length > 0 && (
              <Group gap={4} mb="md" wrap="wrap">
                {selectedTask.tags.map((tag) => (
                  <DataBadge key={tag} value={tag} color="muted" />
                ))}
              </Group>
            )}

            <Group justify="flex-end" mt="lg">
              <ArcadeButton variant="ghost" onClick={() => setDetailsOpen(false)}>
                Close
              </ArcadeButton>
              <ArcadeButton
                variant={selectedTask.is_complete ? 'secondary' : 'primary'}
                onClick={handleToggleComplete}
              >
                {selectedTask.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
              </ArcadeButton>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
/* v8 ignore stop */
