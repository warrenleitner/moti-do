import { useEffect, useState } from 'react';
import { Box, CloseButton, Group, Text } from '../../ui';
import { IconRefresh } from '../../ui/icons';
import { ArcadeButton } from '../ui';
import {
  forceAppUpdate,
  isAppUpdateAvailable,
  subscribeToAppUpdate,
} from '../../services/appUpdate';

export default function AppUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(isAppUpdateAvailable());
  const [dismissed, setDismissed] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => subscribeToAppUpdate(setUpdateAvailable), []);

  const handleUpdate = async () => {
    setIsApplyingUpdate(true);
    setErrorMessage(null);

    try {
      await forceAppUpdate();
    } catch (error) {
      console.error('Failed to apply proactive frontend update:', error);
      setErrorMessage('Could not load the latest frontend build. Use Settings if this keeps happening.');
      setIsApplyingUpdate(false);
    }
  };

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <Box
      data-testid="app-update-prompt"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(40rem, calc(100vw - 2rem))',
        zIndex: 1100,
      }}
    >
      <Box
        style={{
          padding: '1rem 1.125rem',
          borderRadius: 'var(--mantine-radius-md)',
          border: '1px solid rgba(129, 236, 255, 0.35)',
          background:
            'linear-gradient(135deg, rgba(11, 14, 23, 0.96), rgba(24, 27, 37, 0.98))',
          boxShadow: '0 18px 50px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb={6} wrap="nowrap">
              <IconRefresh size={16} color="#81ecff" />
              <Text fw={700} size="sm" style={{ color: '#e6e7f5' }}>
                A newer frontend build is ready
              </Text>
            </Group>
            <Text size="sm" style={{ color: '#a8aab7', lineHeight: 1.6 }}>
              {errorMessage ??
                'Motodo detected a fresher Vercel deployment. Updating now will sync the frontend shell with the backend version.'}
            </Text>
          </Box>

          <Group gap="xs" align="center" wrap="nowrap">
            <ArcadeButton
              variant="secondary"
              onClick={handleUpdate}
              disabled={isApplyingUpdate}
              loading={isApplyingUpdate}
              style={{ minHeight: 40 }}
            >
              UPDATE NOW
            </ArcadeButton>
            <ArcadeButton
              variant="ghost"
              onClick={() => setDismissed(true)}
              disabled={isApplyingUpdate}
              style={{ minHeight: 40 }}
            >
              LATER
            </ArcadeButton>
            <CloseButton
              aria-label="dismiss app update prompt"
              onClick={() => setDismissed(true)}
              disabled={isApplyingUpdate}
            />
          </Group>
        </Group>
      </Box>
    </Box>
  );
}