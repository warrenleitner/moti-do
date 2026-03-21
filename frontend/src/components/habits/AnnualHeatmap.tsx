import { useMemo } from 'react';
import { Box, Tooltip } from '../../ui';
import { useMediaQuery } from '../../ui';
import type { Task } from '../../types';

interface AnnualHeatmapProps {
  habits: Task[];
  allTasks: Task[];
}

/** Aggregate completion counts per date across all habits and their child instances */
function getCompletionCounts(habits: Task[], allTasks: Task[]): Map<string, number> {
  const counts = new Map<string, number>();
  const habitIds = new Set(habits.map((h) => h.id));

  // Habit own completions
  for (const habit of habits) {
    if (habit.is_complete && habit.due_date) {
      const key = habit.due_date.slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  // Child instance completions
  for (const task of allTasks) {
    if (
      task.parent_habit_id &&
      habitIds.has(task.parent_habit_id) &&
      task.is_complete &&
      task.due_date
    ) {
      const key = task.due_date.slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return counts;
}

const INTENSITY_COLORS = [
  '#32343F', // 0 — surface-highest (no activity)
  '#004D5E', // 1 — dim cyan
  '#007799', // 2 — medium cyan
  '#00B5D9', // 3 — bright cyan
  '#00E5FF', // 4 — max cyan
];

function getIntensityIndex(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface DayCell {
  date: Date;
  dateKey: string;
  count: number;
  isFuture: boolean;
}

interface MonthLabel {
  label: string;
  weekIdx: number;
}

// UI-only component
/* v8 ignore start */
export default function AnnualHeatmap({ habits, allTasks }: AnnualHeatmapProps) {
  const isMobile = useMediaQuery('(max-width: 62em)');
  const cellSize = isMobile ? 3 : 12;
  const gap = isMobile ? 1 : 2;

  const { weeksData, monthLabels, maxCount } = useMemo(() => {
    const counts = getCompletionCounts(habits, allTasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back to fill ~52 complete weeks ending this week
    const endDate = new Date(today);
    // Start from the Monday 52 weeks ago
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() + 1); // current Monday
    start.setDate(start.getDate() - 52 * 7); // 52 weeks back

    const weeks: DayCell[][] = [];
    const months: MonthLabel[] = [];
    const cur = new Date(start);
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cur);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isFuture = date > endDate;
        const count = isFuture ? 0 : (counts.get(dateKey) || 0);

        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          months.push({
            label: date.toLocaleString('en', { month: 'short' }).toUpperCase(),
            weekIdx: w,
          });
        }

        week.push({ date, dateKey, count, isFuture });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }

    const max = Math.max(...weeks.flat().map((d) => d.count), 1);
    return { weeksData: weeks, monthLabels: months, maxCount: max };
  }, [habits, allTasks]);

  const dayLabels = ['M', '', 'W', '', 'F', '', ''];
  const dayLabelWidth = isMobile ? 0 : 24;

  return (
    <div
      style={{
        backgroundColor: '#10131C',
        border: '1px solid rgba(59, 73, 76, 0.15)',
        padding: isMobile ? '0.75rem' : '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Title label */}
      <div className="micro-meta" style={{ marginBottom: '0.75rem' }}>
        ANNUAL_COMMIT_HISTORY (365_DAYS)
      </div>

      {/* Scrollable heatmap container */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <div style={{ minWidth: 'fit-content' }}>
          {/* Grid with day labels */}
          <div style={{ display: 'flex', gap: `${gap}px` }}>
            {/* Day labels column */}
            {!isMobile && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${gap}px`,
                  marginRight: '4px',
                  flexShrink: 0,
                  width: dayLabelWidth,
                }}
              >
                {dayLabels.map((label, i) => (
                  <div
                    key={i}
                    className="font-data"
                    style={{
                      height: cellSize,
                      lineHeight: `${cellSize}px`,
                      fontSize: '9px',
                      color: '#9BA3AF',
                      textAlign: 'right',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}

            {/* Week columns */}
            {weeksData.map((week, weekIdx) => (
              <div
                key={weekIdx}
                style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}
              >
                {week.map((day, dayIdx) => {
                  const intensity = getIntensityIndex(day.count, maxCount);
                  const color = day.isFuture ? '#1a1d27' : INTENSITY_COLORS[intensity];
                  const hasGlow = intensity === 4 && day.count > 0;
                  return (
                    <Tooltip
                      key={dayIdx}
                      label={`${day.dateKey}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                      disabled={day.isFuture}
                    >
                      <Box
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: color,
                          cursor: day.isFuture ? 'default' : 'pointer',
                          transition: 'opacity 0.1s',
                          boxShadow: hasGlow
                            ? '0 0 4px rgba(0, 229, 255, 0.5)'
                            : 'none',
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Month labels row */}
          <div
            style={{
              display: 'flex',
              marginLeft: isMobile ? 0 : `${dayLabelWidth + 4}px`,
              marginTop: '4px',
            }}
          >
            {weeksData.map((_, weekIdx) => {
              const monthEntry = monthLabels.find((m) => m.weekIdx === weekIdx);
              return (
                <div
                  key={weekIdx}
                  style={{
                    width: cellSize + gap,
                    flexShrink: 0,
                    overflow: 'visible',
                  }}
                >
                  {monthEntry && (
                    <span
                      className="font-data"
                      style={{
                        fontSize: '9px',
                        color: '#9BA3AF',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {monthEntry.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '0.75rem',
        }}
      >
        <span
          className="font-data"
          style={{ fontSize: '9px', color: '#9BA3AF', marginRight: '2px' }}
        >
          LESS
        </span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: color,
            }}
          />
        ))}
        <span
          className="font-data"
          style={{ fontSize: '9px', color: '#9BA3AF', marginLeft: '2px' }}
        >
          MORE
        </span>
      </div>
    </div>
  );
}
/* v8 ignore stop */
