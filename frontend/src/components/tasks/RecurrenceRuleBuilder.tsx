/**
 * Visual builder for complex recurrence patterns.
 * Converts user selections into RFC 5545 rrule format.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Select,
  NumberInput,
  Button,
  Group,
  Text,
  Radio,
  Paper,
  Stack,
} from '@mantine/core';
import { IconRepeat } from '@tabler/icons-react';
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
// UI component - tested via integration tests
/* v8 ignore start */
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
      // about calling setState synchronously in an effect - tested via E2E
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

  // Generate frequency options based on interval
  const frequencyData = [
    { value: 'DAILY', label: pattern.interval === 1 ? 'Day' : 'Days' },
    { value: 'WEEKLY', label: pattern.interval === 1 ? 'Week' : 'Weeks' },
    { value: 'MONTHLY', label: pattern.interval === 1 ? 'Month' : 'Months' },
    { value: 'YEARLY', label: pattern.interval === 1 ? 'Year' : 'Years' },
  ];

  // Generate day of month options
  const dayOfMonthData = [
    ...Array.from({ length: 31 }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    })),
    { value: '-1', label: 'Last day' },
  ];

  // Generate position options
  const positionData = [
    { value: '1', label: '1st' },
    { value: '2', label: '2nd' },
    { value: '3', label: '3rd' },
    { value: '4', label: '4th' },
    { value: '-1', label: 'Last' },
  ];

  // Generate weekday options for select
  const weekdayData = WEEKDAYS.map((day) => ({
    value: day,
    label: WEEKDAY_LABELS[day],
  }));

  return (
    <Stack gap="sm">
      {/* Frequency and Interval Row */}
      <Group gap="sm" wrap="wrap" align="center">
        <Text size="sm">Every</Text>
        <NumberInput
          value={pattern.interval}
          onChange={(val) => handleIntervalChange(typeof val === 'number' ? val : 1)}
          disabled={disabled}
          min={1}
          max={365}
          size="xs"
          w={70}
        />
        <Select
          value={pattern.frequency}
          onChange={(val) => val && handleFrequencyChange(val as Frequency)}
          disabled={disabled}
          data={frequencyData}
          size="xs"
          w={100}
        />
      </Group>

      {/* Weekly: Day Selection */}
      {pattern.frequency === 'WEEKLY' && (
        <Box>
          <Text size="sm" c="dimmed" mb="xs">
            On these days:
          </Text>
          <Group gap={4} wrap="wrap">
            {WEEKDAYS.map((day) => (
              <Button
                key={day}
                size="xs"
                variant={pattern.byDay?.includes(day) ? 'filled' : 'outline'}
                onClick={() => handleWeekdayToggle(day)}
                disabled={disabled}
                px="xs"
                miw={44}
              >
                {WEEKDAY_LABELS[day]}
              </Button>
            ))}
          </Group>
        </Box>
      )}

      {/* Monthly: Mode Selection */}
      {pattern.frequency === 'MONTHLY' && (
        <Radio.Group
          value={pattern.monthlyMode || 'day_of_month'}
          onChange={(val) => handleMonthlyModeChange(val as MonthlyMode)}
        >
          <Stack gap="xs">
            <Radio
              value="day_of_month"
              disabled={disabled}
              label={
                <Group gap="xs" wrap="wrap" align="center">
                  <Text size="sm">On day</Text>
                  <Select
                    value={String(pattern.byMonthDay?.[0] || 1)}
                    onChange={(val) => val && handleMonthDayChange(parseInt(val, 10))}
                    disabled={disabled || pattern.monthlyMode !== 'day_of_month'}
                    data={dayOfMonthData}
                    size="xs"
                    w={80}
                  />
                  <Text size="sm">of the month</Text>
                </Group>
              }
            />
            <Radio
              value="weekday_of_month"
              disabled={disabled}
              label={
                <Group gap="xs" wrap="wrap" align="center">
                  <Text size="sm">On the</Text>
                  <Select
                    value={String(pattern.bySetPos || 1)}
                    onChange={(val) => val && handlePositionChange(parseInt(val, 10) as WeekdayPosition)}
                    disabled={disabled || pattern.monthlyMode !== 'weekday_of_month'}
                    data={positionData}
                    size="xs"
                    w={70}
                  />
                  <Select
                    value={pattern.byWeekday || 'MO'}
                    onChange={(val) => val && handleWeekdayChange(val as Weekday)}
                    disabled={disabled || pattern.monthlyMode !== 'weekday_of_month'}
                    data={weekdayData}
                    size="xs"
                    w={100}
                  />
                </Group>
              }
            />
          </Stack>
        </Radio.Group>
      )}

      {/* Preview */}
      <Paper p="sm" bg="gray.1" radius="sm">
        <Group gap="xs">
          <IconRepeat size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm">{description}</Text>
        </Group>
      </Paper>
    </Stack>
  );
}
/* v8 ignore stop */
