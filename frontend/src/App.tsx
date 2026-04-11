import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Center, Loader, Text, Button, Alert, Stack } from './ui';
import MainLayout from './components/layout/MainLayout';
import { InstallPrompt } from './components/common/InstallPrompt';
import CrisisModeBanner from './components/common/CrisisModeBanner';
import { ProtectedRoute } from './components/auth';
import { useAppInitialization } from './hooks';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const HabitsPage = lazy(() => import('./pages/HabitsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const GraphPage = lazy(() => import('./pages/GraphPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function FullPageLoader() {
  return (
    <Center mih="100vh" data-testid="app-loading-state">
      <Stack align="center" gap="md">
        <Loader size={48} role="progressbar" />
        <Text size="lg" c="dimmed">
          Loading Motodo...
        </Text>
      </Stack>
    </Center>
  );
}

function RouteLoader() {
  return (
    <Center mih="60vh" data-testid="route-loading-state">
      <Stack align="center" gap="md">
        <Loader size={40} role="progressbar" />
        <Text size="md" c="dimmed">
          Loading page...
        </Text>
      </Stack>
    </Center>
  );
}

function App() {
  const { isLoading, error, retry, isInitialized } = useAppInitialization();

  // Show loading state while initializing
  if (isLoading && !isInitialized) {
    return <FullPageLoader />;
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
    <>
      <Routes>
        {/* Public route - Login page */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />

        {/* Protected routes - require authentication */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CrisisModeBanner />
                <Suspense fallback={<RouteLoader />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/habits" element={<HabitsPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/kanban" element={<KanbanPage />} />
                    <Route path="/graph" element={<GraphPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Suspense>
                <InstallPrompt />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <SpeedInsights />
    </>
  );
}

export default App;
