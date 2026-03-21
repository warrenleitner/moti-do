import { Center, Loader, Stack, Box } from '../../ui';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullscreen?: boolean;
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 40,
  fullscreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <Center p="xl">
      <Stack align="center" gap="sm">
        <Loader size={size} color="#00E5FF" role="progressbar" />
        {message && (
          <span
            className="font-data micro-meta"
            style={{ color: '#5A5E66' }}
          >
            {message}
          </span>
        )}
      </Stack>
    </Center>
  );

  // Full screen mode tested via integration tests
  /* v8 ignore next 17 */
  if (fullscreen) {
    return (
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(11, 14, 23, 0.85)',
          backdropFilter: 'blur(20px)',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
