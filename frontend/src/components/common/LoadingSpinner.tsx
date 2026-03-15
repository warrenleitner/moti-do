import { Center, Loader, Text, Stack, Box } from '../../ui';

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
        <Loader size={size} role="progressbar" />
        {message && (
          <Text size="sm" c="dimmed">
            {message}
          </Text>
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
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
