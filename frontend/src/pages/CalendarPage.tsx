import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function CalendarPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Calendar
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Calendar view will be implemented in Phase B.6. This is a placeholder page.
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
            <li>Month, week, and day views</li>
            <li>Tasks displayed by due date</li>
            <li>Drag and drop to reschedule</li>
            <li>Quick task creation from calendar</li>
            <li>Color coding by priority/project</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
