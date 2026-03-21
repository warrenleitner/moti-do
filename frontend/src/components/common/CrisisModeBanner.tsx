import { Alert, Group, Button, Text } from '../../ui';
import { IconAlertTriangle } from '../../ui/icons';
import { useTaskStore } from '../../store';

/* v8 ignore start */
export default function CrisisModeBanner() {
  const { crisisModeActive, crisisTaskIds, tasks, exitCrisisMode } = useTaskStore();

  if (!crisisModeActive) {
    return null;
  }

  const visibleFocusCount =
    crisisTaskIds.filter((taskId) => tasks.some((task) => task.id === taskId)).length ||
    crisisTaskIds.length;

  return (
    <Alert
      color="orange"
      icon={<IconAlertTriangle size={20} />}
      mb="lg"
      radius="md"
      style={{
        border: '1px solid rgba(230, 81, 0, 0.2)',
        background:
          'linear-gradient(135deg, rgba(255, 224, 178, 0.5), rgba(255, 204, 188, 0.45))',
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <div>
          <Text fw={700} size="sm">
            Crisis mode is active
          </Text>
          <Text size="sm">
            Showing only {visibleFocusCount} selected task
            {visibleFocusCount === 1 ? '' : 's'} across task views so you can focus on what matters
            right now.
          </Text>
        </div>
        <Button
          variant="outline"
          color="dark"
          size="xs"
          onClick={exitCrisisMode}
        >
          Exit Crisis Mode
        </Button>
      </Group>
    </Alert>
  );
}
/* v8 ignore stop */
