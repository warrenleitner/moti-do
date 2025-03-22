'use client';

import React, { useEffect } from 'react';
import { Snackbar, Button } from '@mui/material';

interface UndoSnackbarProps {
  open: boolean;
  message: string;
  onUndo: () => void;
  onClose: () => void;
}

export default function UndoSnackbar({ open, message, onUndo, onClose }: UndoSnackbarProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Snackbar
      open={open}
      message={message}
      action={
        <Button color="secondary" size="small" onClick={onUndo}>
          UNDO
        </Button>
      }
      onClose={onClose}
    />
  );
} 