import { Typography, Tooltip } from '@mui/material';
import { CalendarToday, Warning } from '@mui/icons-material';
import { Box } from '@mui/material';

interface DateDisplayProps {
  date: string | undefined;
  label?: string;
  showIcon?: boolean;
  showRelative?: boolean;
}

function formatRelativeDate(dateStr: string): { text: string; color: string; isOverdue: boolean } {
  const date = new Date(dateStr);
  const today = new Date();
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
}: DateDisplayProps) {
  if (!date) {
    return null;
  }

  const dateObj = new Date(date);
  const fullDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { text, color, isOverdue } = showRelative
    ? formatRelativeDate(date)
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
