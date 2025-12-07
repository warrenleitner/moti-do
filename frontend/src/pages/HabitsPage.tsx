import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function HabitsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Habits
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Habit views will be implemented in Phase B.5. This is a placeholder page.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will include:
          </Typography>
          <ul>
            <li>Habit list with streak information</li>
            <li>Completion heatmap visualization</li>
            <li>Habit statistics and trends</li>
            <li>Create new habit form</li>
            <li>Recurrence rule configuration</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
