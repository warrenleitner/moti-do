import { Alert, Box, Button, Typography } from '@mui/material';
import { PriorityHigh as CrisisIcon } from '@mui/icons-material';
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
      severity="warning"
      icon={<CrisisIcon />}
      sx={{
        mb: 3,
        borderRadius: 2,
        border: '1px solid rgba(230, 81, 0, 0.2)',
        background:
          'linear-gradient(135deg, rgba(255, 224, 178, 0.5), rgba(255, 204, 188, 0.45))',
      }}
      action={
        <Button
          color="inherit"
          size="small"
          variant="outlined"
          onClick={exitCrisisMode}
        >
          Exit Crisis Mode
        </Button>
      }
    >
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          Crisis mode is active
        </Typography>
        <Typography variant="body2">
          Showing only {visibleFocusCount} selected task
          {visibleFocusCount === 1 ? '' : 's'} across task views so you can focus on what matters
          right now.
        </Typography>
      </Box>
    </Alert>
  );
}
/* v8 ignore stop */
