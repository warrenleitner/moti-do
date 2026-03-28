import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl, Loader, Alert } from '../ui';
import { GlowCard, ArcadeButton, TerminalInput } from '../components/ui';
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
    <div
      className="scanline-overlay"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0E17',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(129, 236, 255, 0.04) 0%, #0B0E17 70%)',
      }}
    >
      <div style={{ maxWidth: 400, width: '100%' }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo-wordmark.png" alt="Motodo" style={{ width: 280, height: 'auto', objectFit: 'contain' }} />
          <p
            className="font-data micro-meta"
            style={{
              margin: '0.5rem 0 0',
              color: '#525560',
            }}
          >
            SYSTEM ACCESS
          </p>
        </div>

        <GlowCard accentColor="cyan" accentPosition="top">
          <SegmentedControl
            value={mode}
            onChange={handleModeChange}
            data={[
              { value: 'login', label: 'LOGIN' },
              { value: 'register', label: 'REGISTER' },
            ]}
            fullWidth
            style={{ marginBottom: '1.5rem' }}
          />

          {error && (
            <Alert
              color="red"
              mb="md"
              styles={{
                root: {
                  backgroundColor: 'rgba(255, 107, 155, 0.08)',
                  borderColor: 'rgba(255, 107, 155, 0.3)',
                  borderLeft: '3px solid #ff6b9b',
                },
                message: {
                  color: '#ff6b9b',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <TerminalInput
                label="USERNAME"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder="ENTER USERNAME"
              />
              <span
                className="font-data"
                style={{ fontSize: '0.625rem', color: '#525560', display: 'block', marginTop: 4 }}
              >
                Single-user mode: use &apos;default_user&apos;
              </span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <TerminalInput
                label="PASSWORD"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="ENTER PASSWORD"
              />
              <span
                className="font-data"
                style={{ fontSize: '0.625rem', color: '#525560', display: 'block', marginTop: 4 }}
              >
                Minimum 8 characters
              </span>
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: '1rem' }}>
                <TerminalInput
                  label="CONFIRM PASSWORD"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="RE-ENTER PASSWORD"
                />
              </div>
            )}

            <ArcadeButton
              type="submit"
              fullWidth
              size="lg"
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {loading ? (
                <Loader size="sm" color="#00626E" />
              ) : mode === 'login' ? (
                'AUTHENTICATE'
              ) : (
                'REGISTER'
              )}
            </ArcadeButton>
          </form>
        </GlowCard>

        {/* Footer */}
        <p
          className="micro-meta"
          style={{ textAlign: 'center', marginTop: '1.5rem', color: '#32343F' }}
        >
          v2.0 // KINETIC_CONSOLE
        </p>
      </div>
    </div>
  );
}
/* v8 ignore stop */
