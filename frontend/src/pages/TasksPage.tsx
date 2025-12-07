import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function TasksPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Task list component will be implemented in Phase B.4. This is a placeholder page.
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
            <li>Task list with filtering and sorting</li>
            <li>Task cards with priority indicators</li>
            <li>Quick actions (complete, edit, delete)</li>
            <li>Create new task form</li>
            <li>Subtask management</li>
            <li>Dependency visualization</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
