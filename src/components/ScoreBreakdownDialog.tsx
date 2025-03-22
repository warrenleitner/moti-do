'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  DialogActions,
  Button
} from '@mui/material';
import { Task, ImportanceLevel, DifficultyLevel, DurationLevel } from '@/models/Task';
import { useAppStore } from '@/store/AppStore';

type ScoreBreakdownDialogProps = {
  open: boolean;
  onClose: () => void;
  task: Task;
};

const importanceMap: Record<ImportanceLevel, number> = {
  'Not Set': 0,
  'Low': 0.5,
  'Medium': 1,
  'High': 2,
  'Defcon One': 4,
};

const difficultyMap: Record<DifficultyLevel, number> = {
  'Not Set': 0,
  'Trivial': 0,
  'Low': 0.5,
  'Medium': 1,
  'High': 2,
  'Herculean': 3,
};

const durationMap: Record<DurationLevel, number> = {
  'Not Set': 0,
  'Trivial': 0,
  'Short': 0.5,
  'Medium': 1,
  'Long': 2,
  'Odysseyan': 3,
};

export default function ScoreBreakdownDialog({ open, onClose, task }: ScoreBreakdownDialogProps) {
  const user = useAppStore((state) => state.user);
  const scoringWeights = user.preferences.scoringWeights;

  const importanceRaw = importanceMap[task.importance] || 0;
  const importanceWeight = task.importance === 'Not Set' ? 0 : (scoringWeights.importance[task.importance] || 1);
  const importanceScore = importanceRaw * importanceWeight;

  const difficultyRaw = difficultyMap[task.difficulty] || 0;
  const difficultyWeight = task.difficulty === 'Not Set' ? 0 : (scoringWeights.difficulty[task.difficulty] || 1);
  const difficultyScore = difficultyRaw * difficultyWeight;

  const durationRaw = durationMap[task.duration] || 0;
  const durationWeight = task.duration === 'Not Set' ? 0 : (scoringWeights.duration[task.duration] || 1);
  const durationScore = durationRaw * durationWeight;

  const breakdown = [
    { label: 'Importance', raw: importanceRaw, weight: importanceWeight, score: importanceScore },
    { label: 'Difficulty', raw: difficultyRaw, weight: difficultyWeight, score: difficultyScore },
    { label: 'Duration', raw: durationRaw, weight: durationWeight, score: durationScore },
  ];

  const total = breakdown.reduce((acc, item) => acc + item.score, 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Score Breakdown</DialogTitle>
      <DialogContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Factor</TableCell>
              <TableCell align="right">Raw</TableCell>
              <TableCell align="right">Weight</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.map((item) => (
              <TableRow key={item.label}>
                <TableCell>{item.label}</TableCell>
                <TableCell align="right">{item.raw}</TableCell>
                <TableCell align="right">{item.weight}</TableCell>
                <TableCell align="right">{item.score}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3}><strong>Total</strong></TableCell>
              <TableCell align="right"><strong>{total}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 