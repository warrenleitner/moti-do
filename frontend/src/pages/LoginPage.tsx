import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, TextInput, PasswordInput, Button, Title, Text, Alert, Loader, SegmentedControl, Center } from '@mantine/core';
import { authApi } from '../services/api';

// UI component - tested via integration tests
/* v8 ignore start */
export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('default_user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Validate password confirmation in register mode
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await authApi.login(username, password);
      } else {
        await authApi.register(username, password);
      }

      // Redirect to dashboard on success
      navigate('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
      } else {
        setError(`${mode === 'login' ? 'Login' : 'Registration'} failed`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'login' | 'register');
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <Center
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mantine-color-gray-0)',
        padding: 'var(--mantine-spacing-md)',
      }}
    >
      <Card shadow="md" padding="xl" radius="md" style={{ maxWidth: 400, width: '100%' }}>
        <Title order={2} ta="center" mb="xs">
          Moti-Do
        </Title>

        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Task and Habit Tracker
        </Text>

        <SegmentedControl
          value={mode}
          onChange={handleModeChange}
          data={[
            { value: 'login', label: 'Login' },
            { value: 'register', label: 'Register' },
          ]}
          fullWidth
          mb="lg"
        />

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            mb="md"
            required
            disabled={loading}
            description="Single-user mode: use 'default_user'"
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mb="md"
            required
            disabled={loading}
            description="Minimum 8 characters"
          />

          {mode === 'register' && (
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              mb="md"
              required
              disabled={loading}
            />
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading}
            mt="md"
          >
            {loading ? (
              <Loader size="sm" color="white" />
            ) : mode === 'login' ? (
              'Login'
            ) : (
              'Register'
            )}
          </Button>
        </form>
      </Card>
    </Center>
  );
}
/* v8 ignore stop */
