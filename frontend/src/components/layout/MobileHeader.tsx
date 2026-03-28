import { Box, Avatar, ActionIcon } from '../../ui';
import { IconRefresh } from '../../ui/icons';
import { useUserStore } from '../../store';

interface MobileHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

/* v8 ignore start */
export function MobileHeader({ onRefresh, isRefreshing }: MobileHeaderProps) {
  const { user } = useUserStore();
  const currentLevel = user?.level ?? 1;

  return (
    <Box
      component="header"
      data-testid="mobile-header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        backgroundColor: '#0B0E17',
        borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
        boxShadow: '0 4px 0px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
      }}
    >
      {/* Logo */}
      <img src="/logo-wordmark.png" alt="Motodo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />

      {/* Right section */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ActionIcon
          variant="subtle"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh data"
          size="sm"
          style={{ color: '#a8aab7' }}
        >
          <IconRefresh
            size={18}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </ActionIcon>
        {user && (
          <Avatar
            size={32}
            radius={0}
            style={{
              backgroundColor: '#272A34',
              border: '1px solid #81ecff',
              color: '#81ecff',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            {currentLevel}
          </Avatar>
        )}
      </Box>
    </Box>
  );
}
/* v8 ignore stop */
