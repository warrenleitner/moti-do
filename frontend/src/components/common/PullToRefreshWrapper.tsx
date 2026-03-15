/**
 * Wrapper component that enables pull-to-refresh on mobile devices.
 * On desktop, it simply renders children without the pull-to-refresh functionality.
 */

import type { ReactNode } from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { Box, Loader, useMediaQuery } from '../../ui';
import { useRefresh } from '../../hooks';

interface PullToRefreshWrapperProps {
  children: ReactNode;
}

const RefreshIndicator = () => (
  <Box
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 8,
    }}
  >
    <Loader size={24} />
  </Box>
);

export default function PullToRefreshWrapper({ children }: PullToRefreshWrapperProps) {
  const isMobile = useMediaQuery('(max-width: 62em)');
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
