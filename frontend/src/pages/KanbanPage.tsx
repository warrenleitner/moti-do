import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function KanbanPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Kanban Board
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Kanban view will be implemented in Phase B.6. This is a placeholder page.
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
            <li>Backlog, To Do, In Progress, Blocked, Done columns</li>
            <li>Drag and drop between columns</li>
            <li>Task cards with quick actions</li>
            <li>Filter by project/tag</li>
            <li>WIP limits and column customization</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
