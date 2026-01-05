/**
 * Wrapper component that enables pull-to-refresh on mobile devices.
 * On desktop, it simply renders children without the pull-to-refresh functionality.
 */

import type { ReactNode } from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useMediaQuery, useTheme, Box, CircularProgress } from '@mui/material';
import { useRefresh } from '../../hooks';

interface PullToRefreshWrapperProps {
  children: ReactNode;
}

const RefreshIndicator = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      py: 2,
    }}
  >
    <CircularProgress size={24} />
  </Box>
);

export default function PullToRefreshWrapper({ children }: PullToRefreshWrapperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { refresh } = useRefresh();

  // Only enable pull-to-refresh on mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      onRefresh={refresh}
      pullingContent={<RefreshIndicator />}
      refreshingContent={<RefreshIndicator />}
    >
      {children}
    </PullToRefresh>
  );
}
