import { Modal, Text, Stack } from '../../ui';
import { ArcadeButton } from '../ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

// Map confirm colors to ArcadeButton variants and accent colors
const confirmVariantMap: Record<string, 'primary' | 'secondary' | 'ghost'> = {
  primary: 'primary',
  secondary: 'secondary',
  error: 'secondary',
  warning: 'secondary',
  info: 'primary',
  success: 'primary',
};

const accentBorderMap: Record<string, string> = {
  primary: '#00E5FF',
  secondary: '#FF007F',
  error: '#FF007F',
  warning: '#FFC775',
  info: '#00E5FF',
  success: '#00E5FF',
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDestructive = confirmColor === 'error' || confirmColor === 'warning';
  const accentColor = accentBorderMap[confirmColor] || '#00E5FF';

  return (
    <Modal
      opened={open}
      onClose={onCancel}
      title={
        <span
          className="font-display"
          style={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isDestructive ? '#FF007F' : '#E0E0E0',
          }}
        >
          {title}
        </span>
      }
      size="xs"
      centered
      transitionProps={{ duration: 0 }}
      styles={{
        content: {
          borderTop: `3px solid ${accentColor}`,
        },
      }}
    >
      <Stack>
        <Text style={{ color: '#8A8F98' }} size="sm">{message}</Text>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <ArcadeButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </ArcadeButton>
          <ArcadeButton variant={confirmVariantMap[confirmColor] || 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </ArcadeButton>
        </div>
      </Stack>
    </Modal>
  );
}
