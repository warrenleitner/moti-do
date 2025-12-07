import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Settings page will be fully implemented in later phases. This is a placeholder.
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
            <li>User profile management</li>
            <li>Tag and project definitions</li>
            <li>Scoring configuration</li>
            <li>Theme selection (light/dark)</li>
            <li>Notification preferences</li>
            <li>Vacation mode toggle</li>
            <li>Data export/import</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
