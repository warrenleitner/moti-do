'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Box,
  Typography
} from '@mui/material';
import { User, XPTransaction } from '@/models/User';

// Props for ScoreBankDialog. We assume a user object is passed in with scoreBank and scoreTransactions.
interface ScoreBankDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

export default function ScoreBankDialog({ open, onClose, user }: ScoreBankDialogProps) {
  // Local state for new manual entry
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);

  // In a full implementation, these actions would update the user's store. Here we just log.
  const handleDeposit = () => {
    console.log('Deposit', amount, description);
    // Reset form
    setDescription('');
    setAmount(0);
  };

  const handleWithdraw = () => {
    console.log('Withdraw', amount, description);
    // Reset form
    setDescription('');
    setAmount(0);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Score Bank Ledger</DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="h6">Current Score Bank: {user.scoreBank} pts</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {user.scoreTransactions.map((tx: XPTransaction) => (
              <TableRow key={tx.id}>
                <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell align="right">{tx.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box mt={2}>
          <Typography variant="subtitle1">Add Manual Entry</Typography>
          <TextField
            label="Description"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
          />
          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            margin="normal"
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Button variant="contained" color="primary" onClick={handleDeposit}>Deposit</Button>
            <Button variant="contained" color="secondary" onClick={handleWithdraw}>Withdraw</Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 