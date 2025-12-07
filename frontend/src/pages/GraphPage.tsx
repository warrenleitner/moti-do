import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export default function GraphPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dependency Graph
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Graph view will be implemented in Phase B.6. This is a placeholder page.
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
            <li>Interactive dependency graph visualization</li>
            <li>Node highlighting and selection</li>
            <li>Filter by task or direction (upstream/downstream)</li>
            <li>Click to view task details</li>
            <li>Zoom and pan controls</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
}
