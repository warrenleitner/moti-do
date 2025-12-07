/**
 * PWA Install Prompt Component
 *
 * Shows a prompt to users to install the app on their device.
 * Only displays when the app is installable (not already installed).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Snackbar,
  Button,
  IconButton,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

// Extended window interface for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Also check for iOS standalone
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      // Show our custom prompt after a delay
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;

    // Show the install prompt
    await installPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    // Clear the prompt
    setInstallPrompt(null);
    setIsVisible(false);
  }, [installPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Remember that user dismissed
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Don't render if already installed or no prompt available
  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <Snackbar
      open={isVisible}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2 }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          maxWidth: 400,
          borderRadius: 2,
        }}
      >
        <InstallMobileIcon color="primary" fontSize="large" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Install Moti-Do
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add to your home screen for quick access and offline use
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={handleInstall}
          sx={{ minWidth: 80 }}
        >
          Install
        </Button>
        <IconButton size="small" onClick={handleDismiss} aria-label="dismiss">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Snackbar>
  );
}
