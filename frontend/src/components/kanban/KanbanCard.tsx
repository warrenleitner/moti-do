import { Box, Text, Group, ActionIcon } from '../../ui';
import { IconEdit, IconClock, IconFlame, IconGripVertical, IconBolt, IconFolder } from '../../ui/icons';
import { Draggable } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import { DataBadge } from '../ui';

interface KanbanCardProps {
  task: Task;
  index: number;
  onEdit?: (task: Task) => void;
  isCrisisTask?: boolean;
}

/** Priority → left accent color (4px border) */
const priorityAccentColors: Record<string, string> = {
  'Defcon One': '#ff6b9b',   // magenta — critical
  'High': '#FFC775',         // amber — high
  'Medium': '#81ecff',       // cyan — medium
  'Low': '#454752',          // muted — low
  'Trivial': '#32343F',      // surface-highest — trivial
};

// UI component - tested via integration tests
/* v8 ignore start */
export default function KanbanCard({ task, index, onEdit, isCrisisTask = false }: KanbanCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_complete;
  const accentColor = priorityAccentColors[task.priority] || '#81ecff';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-testid="kanban-card"
          className={isCrisisTask ? 'crisis-card-amber-glow' : undefined}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging
              ? 'var(--kc-surface-high)'
              : 'var(--kc-surface)',
            border: '1px solid rgba(69, 71, 82, 0.15)',
            borderLeft: `4px solid ${accentColor}`,
            boxShadow: snapshot.isDragging
              ? '4px 4px 0px rgba(0, 0, 0, 0.5)'
              : '2px 2px 0px rgba(0, 0, 0, 0.3)',
            padding: '10px 12px',
            marginBottom: 8,
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
            cursor: 'grab',
          }}
        >
          {/* Title row + drag handle */}
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap={6}>
            {/* Drag handle */}
            <Box
              {...provided.dragHandleProps}
              style={{
                color: 'var(--kc-text-muted)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <IconGripVertical size={14} />
            </Box>

            {/* Title */}
            <Text
              size="sm"
              fw={600}
              style={{
                flex: 1,
                fontFamily: '"Space Grotesk", sans-serif',
                color: task.is_complete ? 'var(--kc-text-muted)' : 'var(--kc-text-primary)',
                textDecoration: task.is_complete ? 'line-through' : undefined,
                lineHeight: 1.3,
              }}
            >
              {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
              {task.title}
            </Text>

            {/* Edit button */}
            {onEdit && (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                aria-label="Edit task"
                style={{ color: 'var(--kc-text-muted)', flexShrink: 0 }}
              >
                <IconEdit size={14} data-testid="EditIcon" />
              </ActionIcon>
            )}
          </Group>

          {/* Meta row: due date, project tag, XP badge */}
          <Group gap={6} mt={8} wrap="wrap" align="center">
            {/* Due date */}
            {task.due_date && (
              <span
                className="font-data"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.6875rem',
                  color: isOverdue ? 'var(--kc-magenta)' : 'var(--kc-text-muted)',
                }}
              >
                <IconClock size={12} data-testid="ScheduleIcon" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}

            {/* Project tag */}
            {task.project && (
              <span
                className="font-data"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.6875rem',
                  color: 'var(--kc-text-secondary)',
                }}
              >
                <IconFolder size={12} />
                {task.project}
              </span>
            )}

            {/* Streak for habits */}
            {task.is_habit && task.streak_current > 0 && (
              <span
                className="font-data"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: '0.6875rem',
                  color: 'var(--kc-amber)',
                }}
              >
                <IconFlame size={12} />
                {task.streak_current}
              </span>
            )}

            {/* Spacer */}
            <span style={{ flex: 1 }} />

            {/* XP badge */}
            {task.score > 0 && (
              <DataBadge
                value={`${task.score} XP`}
                color="cyan"
                icon={<IconBolt size={10} />}
                size="sm"
              />
            )}
          </Group>

          {/* Subtask progress */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Box mt={6}>
              <Text
                size="xs"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.625rem',
                  color: 'var(--kc-text-muted)',
                  letterSpacing: '0.05em',
                }}
              >
                {task.subtasks.filter((s) => s.complete).length}/{task.subtasks.length} SUBTASKS
              </Text>
            </Box>
          )}
        </div>
      )}
    </Draggable>
  );
}
/* v8 ignore stop */
