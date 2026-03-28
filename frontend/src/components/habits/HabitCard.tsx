import { ActionIcon } from '../../ui';
import { IconFlame, IconEdit, IconTrash } from '../../ui/icons';
import { GlowCard, XPProgressRing, ArcadeButton } from '../ui';
import type { Task } from '../../types';

interface HabitCardProps {
  habit: Task;
  onComplete: (id: string) => void;
  onEdit: (habit: Task) => void;
  onDelete: (id: string) => void;
}

// UI component — Kinetic Console redesign
/* v8 ignore start */
export default function HabitCard({ habit, onComplete, onEdit, onDelete }: HabitCardProps) {
  const isCompletedToday = habit.is_complete;
  const hasMilestone = habit.streak_current >= 30;
  const hasActiveStreak = habit.streak_current > 0 && !isCompletedToday;

  // Accent colour hierarchy: milestone > active streak > pending
  const accentColor: 'amber' | 'magenta' | 'cyan' = hasMilestone
    ? 'amber'
    : hasActiveStreak
      ? 'magenta'
      : 'cyan';

  const statusLabel = hasMilestone
    ? 'MILESTONE_UNLOCKED'
    : hasActiveStreak
      ? 'STREAK_ACTIVE'
      : 'PENDING_STATUS';

  const statusColorHex = hasMilestone
    ? '#FFC775'
    : hasActiveStreak
      ? '#ff6b9b'
      : '#81ecff';

  // Progress ring: streak relative to best or 30-day goal
  const target = Math.max(habit.streak_best, 30);
  const completionRate = target > 0 ? Math.min((habit.streak_current / target) * 100, 100) : 0;

  return (
    <GlowCard
      accentColor={accentColor}
      accentPosition="left"
      data-testid="habit-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        opacity: isCompletedToday ? 0.75 : 1,
        boxShadow: '2px 2px 0px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top row — status label + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          className="font-data"
          style={{
            fontSize: '0.625rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: statusColorHex,
            fontWeight: 600,
          }}
        >
          {statusLabel}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => onEdit(habit)}
            title="Edit habit"
            aria-label="Edit habit"
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => onDelete(habit.id)}
            title="Delete habit"
            aria-label="Delete habit"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </div>
      </div>

      {/* Title */}
      <div>
        {habit.icon && <span style={{ marginRight: '0.25rem' }}>{habit.icon}</span>}
        <span
          className="font-display"
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#e6e7f5',
            textDecoration: isCompletedToday ? 'line-through' : undefined,
          }}
        >
          {habit.title}
        </span>
      </div>

      {/* Streak + Progress ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconFlame
            size={24}
            color={habit.streak_current > 0 ? '#ff6b9b' : '#525560'}
          />
          <span
            className="font-data"
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e6e7f5' }}
          >
            {habit.streak_current}D
          </span>
        </div>
        <XPProgressRing
          size={64}
          strokeWidth={5}
          progress={completionRate}
          color={statusColorHex}
          label={`${Math.round(completionRate)}%`}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span
          className="font-data"
          style={{
            fontSize: '0.6875rem',
            color: '#9BA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          BEST_STREAK: {habit.streak_best}
        </span>
        <span
          className="font-data"
          style={{
            fontSize: '0.6875rem',
            color: '#9BA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {habit.streak_current} / 30 days
        </span>
      </div>

      {/* Recurrence rule */}
      <div
        className="font-data"
        style={{
          fontSize: '0.625rem',
          color: '#525560',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Repeats: {habit.recurrence_rule || 'Daily'}
      </div>

      {/* Action button */}
      <ArcadeButton
        variant={isCompletedToday ? 'ghost' : 'primary'}
        fullWidth
        disabled={isCompletedToday}
        onClick={() => onComplete(habit.id)}
        size="sm"
      >
        {isCompletedToday ? 'GOAL_ACHIEVED' : 'COMPLETE TODAY'}
      </ArcadeButton>
    </GlowCard>
  );
}
/* v8 ignore stop */
