import { useState, useMemo, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SimpleGrid, notifications, useMediaQuery } from '../ui';
import {
  IconAlertTriangle,
  IconBolt,
  IconFlame,
  IconCheck,
  IconChevronRight,
} from '../ui/icons';
import { useUserStore, useTaskStore } from '../store';
import { useUserStats, useSystemStatus } from '../store/userStore';
import { ConfirmDialog } from '../components/common';
import {
  XPProgressRing,
  GlowCard,
  StatCard,
  DataBadge,
  ArcadeButton,
  TerminalInput,
} from '../components/ui';
import { isTaskDeferred, isTaskFuture } from '../utils/taskStatus';
import type { Task, Priority } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Level threshold: XP needed to reach a given level */
const getLevelThreshold = (level: number): number => level * 1000;

/** XP progress within current level as a percentage (0–100) */
const getLevelProgress = (xp: number, level: number) => {
  const prevThreshold = getLevelThreshold(level - 1);
  const nextThreshold = getLevelThreshold(level);
  const range = nextThreshold - prevThreshold;
  if (range <= 0) return 100;
  const progress = ((xp - prevThreshold) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

/** Map a task priority to the CSS-variable based left-border color */
const priorityBorderColor: Record<Priority, string> = {
  Trivial: 'var(--kc-surface-highest)',
  Low: 'var(--kc-outline-variant)',
  Medium: 'var(--kc-cyan)',
  High: 'var(--kc-amber)',
  'Defcon One': 'var(--kc-magenta)',
};

/** Sort comparator: priority desc then due_date asc */
const priorityOrder: Record<Priority, number> = {
  'Defcon One': 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Trivial: 1,
};

const getTaskDueDate = (dueDate?: string): Date | undefined => {
  if (!dueDate) return undefined;

  const dateOnly = dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
  const [year, month, day] = dateOnly.split('-').map(Number);

  if (![year, month, day].every(Number.isFinite)) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
};

const sortActiveTasks = (a: Task, b: Task) => {
  const pa = priorityOrder[a.priority] ?? 0;
  const pb = priorityOrder[b.priority] ?? 0;
  if (pa !== pb) return pb - pa;
  const aDueDate = getTaskDueDate(a.due_date);
  const bDueDate = getTaskDueDate(b.due_date);
  if (aDueDate && bDueDate) return aDueDate.getTime() - bDueDate.getTime();
  if (aDueDate) return -1;
  if (bDueDate) return 1;
  return 0;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// UI component - tested via integration tests
/* v8 ignore start */
export default function Dashboard() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 62em)');
  const { user, resetScoreTracking, advanceDate } = useUserStore();
  const { tasks, completeTask, createTask } = useTaskStore();
  const stats = useUserStats();
  const systemStatus = useSystemStatus();

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [quickTaskValue, setQuickTaskValue] = useState('');

  // ---- Derived data -------------------------------------------------------

  const totalXP = stats?.total_xp ?? user?.xp ?? 0;
  const currentLevel = stats?.level ?? user?.level ?? 1;
  const levelProgress = getLevelProgress(totalXP, currentLevel);
  const nextThreshold = getLevelThreshold(currentLevel);
  const prevThreshold = getLevelThreshold(currentLevel - 1);
  const xpInLevel = totalXP - prevThreshold;
  const xpNeeded = nextThreshold - prevThreshold;

  const badgesEarned = stats?.badges_earned ?? user?.badges.length ?? 0;
  const streakCurrent = stats?.current_streak ?? 0;
  const pendingTasks = stats?.pending_tasks ?? tasks.filter((t) => !t.is_complete).length;

  const completedToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.is_complete &&
          t.completion_date &&
          new Date(t.completion_date).toDateString() === new Date().toDateString(),
      ).length,
    [tasks],
  );

  const activeTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            !t.is_complete &&
            !isTaskFuture(t, systemStatus?.last_processed_date) &&
            !isTaskDeferred(t, systemStatus?.last_processed_date),
        )
        .sort(sortActiveTasks),
    [systemStatus?.last_processed_date, tasks],
  );

  const topTasks = activeTasks.slice(0, 8);
  const topMobileTasks = activeTasks.slice(0, 4);
  const recentBadges = useMemo(() => (user?.badges ?? []).slice(-6), [user?.badges]);

  const processingDate = systemStatus?.last_processed_date
    ? (() => {
        const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
        return new Date(year, month - 1, day + 1).toLocaleDateString();
      })()
    : '—';

  const pendingDays = systemStatus?.pending_days ?? 0;

  // ---- Handlers -----------------------------------------------------------

  const handleComplete = async (id: string) => {
    try {
      const response = await completeTask(id);
      notifications.show({
        message: `+${response.xp_earned} XP earned!`,
        color: 'cyan',
        autoClose: 2500,
      });
    } catch {
      notifications.show({
        message: 'Failed to complete task',
        color: 'red',
        autoClose: 3000,
      });
    }
  };

  const handleQuickAdd = async () => {
    const title = quickTaskValue.trim();
    if (!title) return;
    try {
      await createTask({ title });
      setQuickTaskValue('');
      notifications.show({
        message: 'Task deployed!',
        color: 'cyan',
        autoClose: 2000,
      });
    } catch {
      notifications.show({
        message: 'Failed to create task',
        color: 'red',
        autoClose: 3000,
      });
    }
  };

  const handleQuickAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleQuickAdd();
    }
  };

  const handleDefuse = async () => {
    try {
      await advanceDate();
      notifications.show({
        message: 'Date advanced successfully',
        color: 'cyan',
        autoClose: 3000,
      });
    } catch {
      navigate('/settings');
    }
  };

  const handleResetScoreTracking = async () => {
    try {
      await resetScoreTracking();
      notifications.show({
        message: 'Score tracking reset. XP, badges, and processing date were reset.',
        color: 'green',
        autoClose: 4000,
      });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Failed to reset score tracking',
        color: 'red',
        autoClose: 4000,
      });
    } finally {
      setResetDialogOpen(false);
    }
  };

  // ---- Shared sub-components -----------------------------------------------

  /** Task checkbox row used on both desktop and mobile */
  const TaskRow = ({ task, compact = false }: { task: Task; compact?: boolean }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: compact ? '0.5rem 0.75rem' : '0.625rem 0.75rem',
        borderLeft: `4px solid ${priorityBorderColor[task.priority]}`,
        backgroundColor: 'var(--kc-surface)',
        opacity: task.is_complete ? 0.6 : 1,
        transition: 'background-color 0.15s ease',
      }}
      className="ghost-border"
    >
      {/* Custom square checkbox */}
      <button
        type="button"
        onClick={() => !task.is_complete && handleComplete(task.id)}
        disabled={task.is_complete}
        aria-label={task.is_complete ? 'Task completed' : `Complete "${task.title}"`}
        style={{
          width: 20,
          height: 20,
          minWidth: 20,
          border: task.is_complete
            ? '2px solid var(--kc-cyan)'
            : '2px solid var(--kc-outline-variant)',
          backgroundColor: task.is_complete ? 'var(--kc-cyan)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: task.is_complete ? 'default' : 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {task.is_complete && <IconCheck size={14} color="#0B0E17" />}
      </button>

      {/* Title */}
      <span
        className="font-display"
        style={{
          flex: 1,
          fontSize: compact ? '0.8125rem' : '0.875rem',
          fontWeight: 500,
          color: 'var(--kc-text-primary)',
          textDecoration: task.is_complete ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {task.title}
      </span>

      {/* Due date */}
      {(() => {
        const dueDate = getTaskDueDate(task.due_date);
        if (!dueDate) return null;

        return (
        <span
          className="font-data"
          style={{
            fontSize: '0.625rem',
            color: 'var(--kc-text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {dueDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        );
      })()}

      {/* XP badge */}
      <DataBadge
        value={`${task.score ?? 0}`}
        color="cyan"
        icon={<IconBolt size={10} />}
        size="sm"
      />
    </div>
  );

  /** Badge tile used in both layouts */
  const BadgeTile = ({
    badge,
    tileSize = 48,
  }: {
    badge: { id: string; name: string; glyph: string };
    tileSize?: number;
  }) => (
    <div
      key={badge.id}
      title={badge.name}
      className="ghost-border"
      style={{
        width: tileSize,
        height: tileSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--kc-surface-high)',
        fontSize: tileSize * 0.45,
        flexShrink: 0,
      }}
    >
      {badge.glyph || badge.name.charAt(0).toUpperCase()}
    </div>
  );

  // =========================================================================
  // DESKTOP LAYOUT (≥ 62em / 992px) — 3-column grid
  // =========================================================================
  if (isDesktop) {
    return (
      <Box>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '4fr 5fr 3fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* ============ LEFT COLUMN (4/12) ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* XP Progress Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <XPProgressRing
                size={192}
                progress={levelProgress}
                color="#81ecff"
                label={`LVL ${currentLevel}`}
                sublabel={`${xpInLevel} / ${xpNeeded} XP`}
                glowColor="rgba(129, 236, 255, 0.25)"
              />
              <span
                className="micro-meta"
                style={{ marginTop: '0.75rem', color: 'var(--kc-text-muted)' }}
              >
                CORE_SYSTEM_XP_LOADER
              </span>
            </div>

            {/* Processing date */}
            <GlowCard>
              <span className="micro-meta" style={{ display: 'block', marginBottom: '0.25rem' }}>
                SOL_DATE
              </span>
              <span
                className="font-data"
                style={{ fontSize: '1.125rem', color: 'var(--kc-text-primary)', fontWeight: 600 }}
              >
                {processingDate}
              </span>
            </GlowCard>

            {/* Crisis alert */}
            {pendingDays > 0 && (
              <GlowCard accentColor="amber" accentPosition="left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <IconAlertTriangle size={16} color="var(--kc-amber)" />
                  <span
                    className="font-display"
                    style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--kc-amber)' }}
                  >
                    CRISIS DETECTED
                  </span>
                </div>
                <span
                  className="font-data"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: 'var(--kc-text-secondary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {pendingDays} CYCLES UNPROCESSED
                </span>
                <ArcadeButton
                  variant="secondary"
                  size="xs"
                  onClick={handleDefuse}
                  fullWidth
                >
                  DEFUSE
                </ArcadeButton>
              </GlowCard>
            )}

            {/* Vacation mode notice */}
            {systemStatus?.vacation_mode && (
              <GlowCard accentColor="cyan" accentPosition="left">
                <span
                  className="font-data"
                  style={{ fontSize: '0.75rem', color: 'var(--kc-cyan)' }}
                >
                  VACATION MODE ACTIVE — NO PENALTIES
                </span>
              </GlowCard>
            )}
          </div>

          {/* ============ CENTER COLUMN (5/12) ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                className="font-display"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--kc-text-primary)',
                }}
              >
                QUICK TASKS
              </span>
              <DataBadge value={activeTasks.length} color="cyan" size="sm" />
            </div>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {topTasks.length === 0 && (
                <GlowCard>
                  <span
                    className="font-data"
                    style={{ fontSize: '0.75rem', color: 'var(--kc-text-muted)' }}
                  >
                    NO ACTIVE MISSIONS — DEPLOY A TASK BELOW
                  </span>
                </GlowCard>
              )}
              {topTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>

            {/* Terminal input for quick add */}
            <TerminalInput
              placeholder="DEPLOY NEW TASK..."
              value={quickTaskValue}
              onChange={(e) => setQuickTaskValue(e.currentTarget.value)}
              onKeyDown={handleQuickAddKey}
            />
          </div>

          {/* ============ RIGHT COLUMN (3/12) ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Stat cards */}
            <StatCard label="COMPLETED_TODAY" value={completedToday} accentColor="cyan" />
            <StatCard label="STREAK_DAYS" value={streakCurrent} accentColor="magenta" />
            <StatCard label="ACTIVE_TASKS" value={pendingTasks} accentColor="amber" />
            <StatCard label="TOTAL_BADGES" value={badgesEarned} accentColor="cyan" />

            {/* Badge grid */}
            {recentBadges.length > 0 && (
              <div>
                <span
                  className="micro-meta"
                  style={{ display: 'block', marginBottom: '0.5rem' }}
                >
                  RECENT BADGES
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 48px)',
                    gap: '0.5rem',
                  }}
                >
                  {recentBadges.map((b) => (
                    <BadgeTile key={b.id} badge={b} tileSize={48} />
                  ))}
                </div>
              </div>
            )}

            {/* VIEW ARMORY link */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="font-data"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--kc-cyan)',
                fontSize: '0.6875rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: 0,
                textAlign: 'left',
              }}
            >
              VIEW ARMORY <IconChevronRight size={14} />
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={resetDialogOpen}
          title="Reset Score Tracking"
          message="Reset XP, earned badges, and the processing date back to today? Your tasks will stay in place, but score tracking will start over from zero."
          confirmLabel="Reset Tracking"
          confirmColor="warning"
          onConfirm={handleResetScoreTracking}
          onCancel={() => setResetDialogOpen(false)}
        />
      </Box>
    );
  }

  // =========================================================================
  // MOBILE LAYOUT (< 62em / 992px) — single column
  // =========================================================================

  const streakPercent = streakCurrent > 0 ? Math.min((streakCurrent / 30) * 100, 100) : 0;

  return (
    <Box>
      {/* XP Progress Ring — centred & prominent */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
        <XPProgressRing
          size={200}
          progress={levelProgress}
          color="#81ecff"
          label={`LVL ${currentLevel}`}
          sublabel={`${xpInLevel} / ${xpNeeded} XP`}
          glowColor="rgba(129, 236, 255, 0.25)"
        />
        <span className="micro-meta" style={{ marginTop: '0.75rem', color: 'var(--kc-text-muted)' }}>
          CORE_SYSTEM_XP_LOADER
        </span>
      </div>

      {/* Streak indicator */}
      {streakCurrent > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <IconFlame size={18} color="var(--kc-amber)" />
          <span
            className="font-data"
            style={{ fontSize: '0.75rem', color: 'var(--kc-amber)', letterSpacing: '0.08em' }}
          >
            {streakCurrent} DAY STREAK ACTIVE
          </span>
        </div>
      )}

      {/* Crisis alert (mobile) */}
      {pendingDays > 0 && (
        <GlowCard
          accentColor="amber"
          accentPosition="left"
          style={{ marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <IconAlertTriangle size={16} color="var(--kc-amber)" />
            <span className="font-display" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--kc-amber)' }}>
              CRISIS DETECTED
            </span>
          </div>
          <span
            className="font-data"
            style={{ display: 'block', fontSize: '0.75rem', color: 'var(--kc-text-secondary)', marginBottom: '0.75rem' }}
          >
            {pendingDays} CYCLES UNPROCESSED
          </span>
          <ArcadeButton variant="secondary" size="xs" onClick={handleDefuse} fullWidth>
            DEFUSE
          </ArcadeButton>
        </GlowCard>
      )}

      {/* Stats grid 2×2 */}
      <SimpleGrid cols={2} spacing="sm" mb="lg">
        <StatCard label="TASKS_DONE" value={completedToday} accentColor="cyan" />
        <StatCard label="XP_EARNED" value={totalXP} accentColor="magenta" />
        <StatCard
          label="CONSISTENCY"
          value={`${Math.round(streakPercent)}%`}
          accentColor="amber"
          progress={streakPercent}
        />
        <StatCard label="ACTIVE_TASKS" value={pendingTasks} accentColor="cyan" />
      </SimpleGrid>

      {/* Recent badges — horizontal scroll */}
      {recentBadges.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="micro-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>
            RECENT BADGES
          </span>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem',
            }}
          >
            {recentBadges.map((b) => (
              <BadgeTile key={b.id} badge={b} tileSize={64} />
            ))}
          </div>
        </div>
      )}

      {/* Priority missions (top 4) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span
            className="font-display"
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--kc-text-primary)',
            }}
          >
            PRIORITY MISSIONS
          </span>
          <DataBadge value={activeTasks.length} color="cyan" size="sm" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {topMobileTasks.length === 0 && (
            <GlowCard>
              <span className="font-data" style={{ fontSize: '0.75rem', color: 'var(--kc-text-muted)' }}>
                NO ACTIVE MISSIONS
              </span>
            </GlowCard>
          )}
          {topMobileTasks.map((task) => (
            <TaskRow key={task.id} task={task} compact />
          ))}
        </div>
      </div>

      {/* INITIATE NEW MISSION button */}
      <ArcadeButton
        variant="gradient"
        fullWidth
        onClick={() => navigate('/tasks')}
        style={{ marginBottom: '1rem' }}
      >
        INITIATE NEW MISSION
      </ArcadeButton>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset Score Tracking"
        message="Reset XP, earned badges, and the processing date back to today? Your tasks will stay in place, but score tracking will start over from zero."
        confirmLabel="Reset Tracking"
        confirmColor="warning"
        onConfirm={handleResetScoreTracking}
        onCancel={() => setResetDialogOpen(false)}
      />
    </Box>
  );
}
/* v8 ignore stop */
