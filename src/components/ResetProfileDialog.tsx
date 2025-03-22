import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material';

interface ResetProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetProfileDialog({ open, onClose, onConfirm }: ResetProfileDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = () => {
    if (confirmationText === 'RESET') {
      onConfirm();
      setConfirmationText('');
      onClose();
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Reset Profile</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography>
            To reset your profile, please type 'RESET' in the box below. This action cannot be undone.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Confirmation"
            fullWidth
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={confirmationText !== 'RESET'}
        >
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
} 