import { Routes, Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import CalendarPage from './pages/CalendarPage';
import KanbanPage from './pages/KanbanPage';
import GraphPage from './pages/GraphPage';
import SettingsPage from './pages/SettingsPage';

function App() {
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
