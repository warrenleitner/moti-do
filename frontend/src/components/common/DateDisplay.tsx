import { Typography, Tooltip } from '@mui/material';
import { CalendarToday, Warning } from '@mui/icons-material';
import { Box } from '@mui/material';

interface DateDisplayProps {
  date: string | undefined;
  label?: string;
  showIcon?: boolean;
  showRelative?: boolean;
  /** Reference date for relative calculations (e.g., current processing date). Defaults to today. */
  referenceDate?: string;
}

/**
 * Extract date-only portion from a date string.
 * Handles both YYYY-MM-DD and ISO datetime (YYYY-MM-DDTHH:mm:ss.sssZ) formats.
 */
function extractDateParts(dateStr: string): [number, number, number] {
  // Handle ISO datetime format by extracting just the date part
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = dateOnly.split('-').map(Number);
  return [year, month, day];
}

function formatRelativeDate(
  dateStr: string,
  referenceDate?: string
): { text: string; color: string; isOverdue: boolean } {
  // Parse date as local time to avoid timezone issues
  const [year, month, day] = extractDateParts(dateStr);
  const date = new Date(year, month - 1, day);

  // Use reference date (e.g., current processing date) if provided, otherwise use real today
  let today: Date;
  if (referenceDate) {
    const [refYear, refMonth, refDay] = extractDateParts(referenceDate);
    today = new Date(refYear, refMonth - 1, refDay);
  } else {
    today = new Date();
  }
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      text: absDays === 1 ? 'Yesterday' : `${absDays} days overdue`,
      color: 'error.main',
      isOverdue: true,
    };
  }
  if (diffDays === 0) {
    return { text: 'Today', color: 'warning.main', isOverdue: false };
  }
  if (diffDays === 1) {
    return { text: 'Tomorrow', color: 'info.main', isOverdue: false };
  }
  if (diffDays <= 7) {
    return { text: `In ${diffDays} days`, color: 'text.secondary', isOverdue: false };
  }

  // Default case for dates > 7 days away
  return {
    text: targetDate.toLocaleDateString(),
    color: 'text.secondary',
    isOverdue: false,
  };
}

export default function DateDisplay({
  date,
  label,
  showIcon = true,
  showRelative = true,
  referenceDate,
}: DateDisplayProps) {
  if (!date) {
    return null;
  }

  // Parse date as local time to avoid timezone issues
  const [year, month, day] = extractDateParts(date);
  const dateObj = new Date(year, month - 1, day);

  const fullDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { text, color, isOverdue } = showRelative
    ? formatRelativeDate(date, referenceDate)
    : { text: dateObj.toLocaleDateString(), color: 'text.secondary', isOverdue: false };

  const Icon = isOverdue ? Warning : CalendarToday;

  return (
    <Tooltip title={`${label ? `${label}: ` : ''}${fullDate}`}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {showIcon && <Icon sx={{ fontSize: 16, color }} />}
        <Typography variant="body2" sx={{ color }}>
          {text}
        </Typography>
      </Box>
    </Tooltip>
  );
}
