import { Routes, Route } from 'react-router-dom';
import { Box, Center, Container, Loader, Text, Button, Alert, Stack } from '@mantine/core';
import MainLayout from './components/layout/MainLayout';
import { InstallPrompt } from './components/common/InstallPrompt';
import { ProtectedRoute } from './components/auth';
import {
  Dashboard,
  TasksPage,
  HabitsPage,
  CalendarPage,
  KanbanPage,
  GraphPage,
  SettingsPage,
  LoginPage,
} from './pages';
import { useAppInitialization } from './hooks';

function App() {
  const { isLoading, error, retry, isInitialized } = useAppInitialization();

  // Show loading state while initializing
  if (isLoading && !isInitialized) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="md">
          <Loader size={48} />
          <Text size="lg" c="dimmed">
            Loading Moti-Do...
          </Text>
        </Stack>
      </Center>
    );
  }

  // Show error state if initialization failed
  if (error && !isInitialized) {
    return (
      <Center mih="100vh" p="lg">
        <Stack align="center" gap="md" maw={400} w="100%">
          <Alert color="red" title="Failed to connect to server" w="100%">
            <Text size="sm">{error}</Text>
          </Alert>
          <Button onClick={retry}>
            Try Again
          </Button>
          <Text size="xs" c="dimmed">
            Make sure the API server is running on http://localhost:8000
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Routes>
      {/* Public route - Login page */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes - require authentication */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Box style={{ display: 'flex', minHeight: '100vh' }}>
              <MainLayout>
                <Container size="xl" py="lg">
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
              <InstallPrompt />
            </Box>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
