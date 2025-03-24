'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box
} from '@mui/material';

interface ResetConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetConfirmationDialog({ open, onClose, onConfirm }: ResetConfirmationDialogProps) {
  const [step, setStep] = useState(1);
  const [typedInput, setTypedInput] = useState('');

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && typedInput === 'RESET') {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setTypedInput('');
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    // reset internal state
    setStep(1);
    setTypedInput('');
    onClose();
  };

  const renderContent = () => {
    if (step === 1) {
      return (
        <Typography>
          Are you sure you want to reset your profile? This will erase all tasks, XP, badges, and settings.
        </Typography>
      );
    } else if (step === 2) {
      return (
        <Box>
          <Typography mb={2}>
            Please type <strong>RESET</strong> to confirm.
          </Typography>
          <TextField
            fullWidth
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type RESET here"
          />
        </Box>
      );
    } else if (step === 3) {
      return (
        <Typography>
          This action is irreversible. Click &apos;Reset&apos; to finalize resetting your profile.
        </Typography>
      );
    }
  };

  const renderActions = () => {
    if (step === 1) {
      return (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleNext} color="primary">Next</Button>
        </DialogActions>
      );
    } else if (step === 2) {
      return (
        <DialogActions>
          <Button onClick={handleBack}>Back</Button>
          <Button onClick={handleNext} color="primary" disabled={typedInput !== 'RESET'}>Next</Button>
        </DialogActions>
      );
    } else if (step === 3) {
      return (
        <DialogActions>
          <Button onClick={handleBack}>Back</Button>
          <Button onClick={handleConfirm} color="error">Reset</Button>
        </DialogActions>
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reset All Data</DialogTitle>
      <DialogContent>
        {renderContent()}
      </DialogContent>
      {renderActions()}
    </Dialog>
  );
} 