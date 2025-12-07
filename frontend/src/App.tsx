import { Routes, Route } from 'react-router-dom';
import { Box, Container, CircularProgress, Typography, Button, Alert } from '@mui/material';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import CalendarPage from './pages/CalendarPage';
import KanbanPage from './pages/KanbanPage';
import GraphPage from './pages/GraphPage';
import SettingsPage from './pages/SettingsPage';
import { useAppInitialization } from './hooks';

function App() {
  const { isLoading, error, retry, isInitialized } = useAppInitialization();

  // Show loading state while initializing
  if (isLoading && !isInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Loading Moti-Do...
        </Typography>
      </Box>
    );
  }

  // Show error state if initialization failed
  if (error && !isInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 400, width: '100%' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Failed to connect to server
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="contained" onClick={retry}>
          Try Again
        </Button>
        <Typography variant="caption" color="text.secondary">
          Make sure the API server is running on http://localhost:8000
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <MainLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Container>
      </MainLayout>
    </Box>
  );
}

export default App;
