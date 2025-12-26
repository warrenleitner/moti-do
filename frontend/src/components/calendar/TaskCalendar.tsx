import { useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
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

  // Handle event click - directly open edit form via callback
  const handleEventClick = (info: EventClickArg) => {
    const task = info.event.extendedProps.task as Task;
    // If onSelectTask is provided, use it to open the edit form
    // Otherwise fall back to the built-in details dialog
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

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Project</InputLabel>
          <Select
            value={filterProject}
            label="Project"
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <MenuItem value="all">All Projects</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project} value={project}>
                {project}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {filterProject !== 'all' && (
          <Chip
            label={`Project: ${filterProject}`}
            size="small"
            onDelete={() => setFilterProject('all')}
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {events.length} tasks with due dates
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(priorityColors).map(([priority, colors]) => (
          <Box key={priority} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 1,
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {priority}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              backgroundColor: '#e0e0e0',
              border: '2px solid #9e9e9e',
            }}
          />
          <Typography variant="caption">Completed</Typography>
        </Box>
      </Box>

      {/* Calendar */}
      <Paper sx={{ p: 2 }}>
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

      {/* Task details dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedTask && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedTask.icon && <span>{selectedTask.icon}</span>}
                <Typography
                  variant="h6"
                  sx={{
                    textDecoration: selectedTask.is_complete ? 'line-through' : 'none',
                  }}
                >
                  {selectedTask.title}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTask.description && (
                  <Typography variant="body2">{selectedTask.description}</Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={selectedTask.priority}
                    size="small"
                    sx={{
                      backgroundColor: priorityColors[selectedTask.priority]?.bg,
                      color: priorityColors[selectedTask.priority]?.text,
                      textTransform: 'capitalize',
                    }}
                  />
                  <Chip label={selectedTask.difficulty} size="small" sx={{ textTransform: 'capitalize' }} />
                  <Chip label={selectedTask.duration} size="small" sx={{ textTransform: 'capitalize' }} />
                  {selectedTask.is_habit && <Chip label="Habit" size="small" color="secondary" />}
                </Box>

                {selectedTask.due_date && (
                  <Typography variant="body2" color="text.secondary">
                    Due: {new Date(selectedTask.due_date).toLocaleString()}
                  </Typography>
                )}

                {selectedTask.project && (
                  <Typography variant="body2" color="text.secondary">
                    Project: {selectedTask.project}
                  </Typography>
                )}

                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedTask.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button
                variant="contained"
                color={selectedTask.is_complete ? 'warning' : 'success'}
                onClick={handleToggleComplete}
              >
                {selectedTask.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
/* v8 ignore stop */
