import type { ReactNode } from 'react';
import { Stack, Box } from '../../ui';
import { ArcadeButton } from '../ui';
import { IconInbox } from '../../ui/icons';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" ta="center" py="xl" px="lg">
      <Box mb="sm" style={{ color: '#3B494C' }}>
        {icon || <IconInbox size={64} stroke={1.5} data-testid="InboxOutlinedIcon" />}
      </Box>
      <span
        className="font-data"
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#5A5E66',
        }}
      >
        {title}
      </span>
      {description && (
        <span
          style={{
            fontSize: '0.8125rem',
            color: '#5A5E66',
            maxWidth: 400,
          }}
        >
          {description}
        </span>
      )}
      {actionLabel && onAction && (
        <ArcadeButton onClick={onAction} variant="ghost" style={{ marginTop: '0.75rem' }}>
          {actionLabel}
        </ArcadeButton>
      )}
    </Stack>
  );
}
