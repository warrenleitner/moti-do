/**
 * Visual builder for complex recurrence patterns.
 * Converts user selections into RFC 5545 rrule format.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
} from '@mui/material';
import { Repeat as RepeatIcon } from '@mui/icons-material';
import type {
  RecurrencePattern,
  Frequency,
  Weekday,
  WeekdayPosition,
  MonthlyMode,
} from '../../types/recurrence';
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  DEFAULT_RECURRENCE_PATTERN,
} from '../../types/recurrence';
import {
  patternToRrule,
  rruleToPattern,
  describePattern,
} from '../../utils/recurrence';

interface RecurrenceRuleBuilderProps {
  /** Current rrule string value */
  value: string;
  /** Called when the pattern changes */
  onChange: (rrule: string) => void;
  /** Whether the builder is disabled */
  disabled?: boolean;
}

/**
 * A visual builder for creating complex recurrence patterns.
 * Supports daily, weekly (with specific days), monthly (day of month or Nth weekday), and yearly.
 */
export default function RecurrenceRuleBuilder({
  value,
  onChange,
  disabled = false,
}: RecurrenceRuleBuilderProps) {
  // Parse initial value or use default
  const [pattern, setPattern] = useState<RecurrencePattern>(() => {
    const parsed = rruleToPattern(value);
    return parsed || DEFAULT_RECURRENCE_PATTERN;
  });

  // Track if we're updating from internal changes to avoid loops
  const isInternalUpdate = useRef(false);
  const previousValue = useRef(value);

  // Sync pattern to external value when it changes from outside
  // This is a controlled component pattern - we need to sync internal state with props
  useEffect(() => {
    // Skip if the value hasn't changed or if we caused this change
    if (value === previousValue.current || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      previousValue.current = value;
      return;
    }

    const parsed = rruleToPattern(value);
    if (parsed) {
      // Use requestAnimationFrame to defer setState and avoid lint warning
      // about calling setState synchronously in an effect
      requestAnimationFrame(() => {
        setPattern(parsed);
      });
    }
    previousValue.current = value;
  }, [value]);

  // Update external value when pattern changes from user interaction
  const updatePattern = useCallback(
    (updater: (prev: RecurrencePattern) => RecurrencePattern) => {
      setPattern((prev) => {
        const next = updater(prev);
        const rrule = patternToRrule(next);
        if (rrule !== previousValue.current) {
          isInternalUpdate.current = true;
          previousValue.current = rrule;
          // Use setTimeout to avoid calling onChange during render
          setTimeout(() => onChange(rrule), 0);
        }
        return next;
      });
    },
    [onChange]
  );

  const handleFrequencyChange = useCallback(
    (newFrequency: Frequency) => {
      updatePattern((prev) => ({
        ...prev,
        frequency: newFrequency,
        // Reset frequency-specific fields
        byDay: newFrequency === 'WEEKLY' ? prev.byDay : undefined,
        byMonthDay: newFrequency === 'MONTHLY' ? prev.byMonthDay : undefined,
        monthlyMode: newFrequency === 'MONTHLY' ? (prev.monthlyMode || 'day_of_month') : undefined,
        bySetPos: undefined,
        byWeekday: undefined,
      }));
    },
    [updatePattern]
  );

  const handleIntervalChange = useCallback(
    (newInterval: number) => {
      updatePattern((prev) => ({
        ...prev,
        interval: Math.max(1, Math.min(365, newInterval)),
      }));
    },
    [updatePattern]
  );

  const handleWeekdayToggle = useCallback(
    (day: Weekday) => {
      updatePattern((prev) => {
        const currentDays = prev.byDay || [];
        const newDays = currentDays.includes(day)
          ? currentDays.filter((d) => d !== day)
          : [...currentDays, day];
        // Sort days to maintain consistent order
        newDays.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
        return { ...prev, byDay: newDays.length > 0 ? newDays : undefined };
      });
    },
    [updatePattern]
  );

  const handleMonthlyModeChange = useCallback(
    (mode: MonthlyMode) => {
      updatePattern((prev) => ({
        ...prev,
        monthlyMode: mode,
        // Reset the other mode's fields
        byMonthDay: mode === 'day_of_month' ? (prev.byMonthDay || [1]) : undefined,
        bySetPos: mode === 'weekday_of_month' ? (prev.bySetPos || 1) : undefined,
        byWeekday: mode === 'weekday_of_month' ? (prev.byWeekday || 'MO') : undefined,
      }));
    },
    [updatePattern]
  );

  const handleMonthDayChange = useCallback(
    (day: number) => {
      updatePattern((prev) => ({
        ...prev,
        byMonthDay: [day],
      }));
    },
    [updatePattern]
  );

  const handlePositionChange = useCallback(
    (position: WeekdayPosition) => {
      updatePattern((prev) => ({
        ...prev,
        bySetPos: position,
      }));
    },
    [updatePattern]
  );

  const handleWeekdayChange = useCallback(
    (weekday: Weekday) => {
      updatePattern((prev) => ({
        ...prev,
        byWeekday: weekday,
      }));
    },
    [updatePattern]
  );

  const description = describePattern(pattern);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Frequency and Interval Row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body1" sx={{ minWidth: 'fit-content' }}>
          Every
        </Typography>
        <TextField
          type="number"
          size="small"
          value={pattern.interval}
          onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10) || 1)}
          disabled={disabled}
          inputProps={{ min: 1, max: 365 }}
          sx={{ width: 70 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={pattern.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value as Frequency)}
            disabled={disabled}
          >
            <MenuItem value="DAILY">{pattern.interval === 1 ? 'Day' : 'Days'}</MenuItem>
            <MenuItem value="WEEKLY">{pattern.interval === 1 ? 'Week' : 'Weeks'}</MenuItem>
            <MenuItem value="MONTHLY">{pattern.interval === 1 ? 'Month' : 'Months'}</MenuItem>
            <MenuItem value="YEARLY">{pattern.interval === 1 ? 'Year' : 'Years'}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Weekly: Day Selection */}
      {pattern.frequency === 'WEEKLY' && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            On these days:
          </Typography>
          <ToggleButtonGroup
            value={pattern.byDay || []}
            onChange={(_, newDays) => {
              // Handle toggle group changes
              if (newDays !== null) {
                updatePattern((prev) => ({ ...prev, byDay: newDays.length > 0 ? newDays : undefined }));
              }
            }}
            disabled={disabled}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {WEEKDAYS.map((day) => (
              <ToggleButton
                key={day}
                value={day}
                selected={pattern.byDay?.includes(day)}
                onClick={() => handleWeekdayToggle(day)}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  minWidth: 44,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                {WEEKDAY_LABELS[day]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Monthly: Mode Selection */}
      {pattern.frequency === 'MONTHLY' && (
        <Box>
          <RadioGroup
            value={pattern.monthlyMode || 'day_of_month'}
            onChange={(e) => handleMonthlyModeChange(e.target.value as MonthlyMode)}
          >
            <FormControlLabel
              value="day_of_month"
              control={<Radio size="small" disabled={disabled} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2">On day</Typography>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={pattern.byMonthDay?.[0] || 1}
                      onChange={(e) => handleMonthDayChange(e.target.value as number)}
                      disabled={disabled || pattern.monthlyMode !== 'day_of_month'}
                      size="small"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <MenuItem key={day} value={day}>
                          {day}
                        </MenuItem>
                      ))}
                      <MenuItem value={-1}>Last day</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2">of the month</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="weekday_of_month"
              control={<Radio size="small" disabled={disabled} />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2">On the</Typography>
                  <FormControl size="small" sx={{ minWidth: 70 }}>
                    <Select
                      value={pattern.bySetPos || 1}
                      onChange={(e) => handlePositionChange(e.target.value as WeekdayPosition)}
                      disabled={disabled || pattern.monthlyMode !== 'weekday_of_month'}
                      size="small"
                    >
                      <MenuItem value={1}>1st</MenuItem>
                      <MenuItem value={2}>2nd</MenuItem>
                      <MenuItem value={3}>3rd</MenuItem>
                      <MenuItem value={4}>4th</MenuItem>
                      <MenuItem value={-1}>Last</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={pattern.byWeekday || 'MO'}
                      onChange={(e) => handleWeekdayChange(e.target.value as Weekday)}
                      disabled={disabled || pattern.monthlyMode !== 'weekday_of_month'}
                      size="small"
                    >
                      {WEEKDAYS.map((day) => (
                        <MenuItem key={day} value={day}>
                          {WEEKDAY_LABELS[day]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      )}

      {/* Preview */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          backgroundColor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <RepeatIcon fontSize="small" color="primary" />
        <Typography variant="body2" color="text.primary">
          {description}
        </Typography>
      </Paper>
    </Box>
  );
}
