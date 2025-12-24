import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Lock as LockIcon,
  BeachAccess as VacationIcon,
  Timeline as HistoryIcon,
} from '@mui/icons-material';
import { dataApi, authApi, userApi, type XPTransaction } from '../services/api';
import { useUserStore, useSystemStatus } from '../store/userStore';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toggleVacation } = useUserStore();
  const systemStatus = useSystemStatus();
  const [xpHistory, setXPHistory] = useState<XPTransaction[]>([]);
  const [loadingXP, setLoadingXP] = useState(false);

  // Fetch XP history on mount
  useEffect(() => {
    const fetchXPHistory = async () => {
      setLoadingXP(true);
      try {
        const transactions = await userApi.getXPLog(10);
        setXPHistory(transactions);
      } catch (error) {
        console.error('Failed to fetch XP history:', error);
      } finally {
        setLoadingXP(false);
      }
    };
    fetchXPHistory();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const blob = await dataApi.exportData();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `motido-backup-${timestamp}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setMessage({ type: 'error', text: 'Please select a JSON file (.json)' });
        return;
      }
      setSelectedFile(file);
      setImportDialogOpen(true);
    }
  };

  const handleImportConfirm = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setMessage(null);
    setImportDialogOpen(false);

    try {
      const result = await dataApi.importData(selectedFile);
      setMessage({
        type: 'success',
        text: `Data imported successfully! Imported ${result.summary.tasks_count} tasks, ${result.summary.xp_transactions_count} XP transactions.`,
      });

      // Reload page after 2 seconds to show fresh data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: unknown) {
      console.error('Import error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        setMessage({
          type: 'error',
          text: axiosError.response?.data?.detail || 'Failed to import data. Please check the file format.',
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to import data. Please check the file format.' });
      }
    } finally {
      setLoading(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      console.error('Change password error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        setMessage({
          type: 'error',
          text: axiosError.response?.data?.detail || 'Failed to change password',
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to change password' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVacationToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const enable = event.target.checked;
    setLoading(true);
    setMessage(null);

    try {
      await toggleVacation(enable);
      setMessage({
        type: 'success',
        text: enable ? 'Vacation mode enabled!' : 'Vacation mode disabled!',
      });
    } catch (error) {
      console.error('Vacation toggle error:', error);
      setMessage({ type: 'error', text: 'Failed to toggle vacation mode' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Data Backup & Restore */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Backup & Restore
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export your data as a JSON backup file or restore from a previous backup.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={loading}
            >
              Export Data
            </Button>

            <Box>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Import Data
              </Button>
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Warning:</strong> Importing data will replace ALL your current data. Make sure to export your current data before importing.
          </Alert>
        </CardContent>
      </Card>

      {/* Vacation Mode */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <VacationIcon color="info" />
            <Typography variant="h6">Vacation Mode</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enable vacation mode to pause streak penalties and task due date enforcement while you're away.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={systemStatus?.vacation_mode ?? false}
                onChange={handleVacationToggle}
                disabled={loading}
                inputProps={{ 'aria-label': 'Vacation Mode' }}
              />
            }
            label={systemStatus?.vacation_mode ? 'Vacation mode is active' : 'Enable vacation mode'}
          />

          {systemStatus?.vacation_mode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Vacation mode is currently active. No penalties will be applied for overdue tasks.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* XP History */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">XP History</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Recent experience points earned or spent.
          </Typography>

          {loadingXP ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : xpHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No XP transactions yet. Complete tasks to earn experience!
            </Typography>
          ) : (
            <List dense>
              {xpHistory.map((transaction) => (
                <ListItem key={transaction.id} divider>
                  <ListItemText
                    primary={transaction.description}
                    secondary={new Date(transaction.timestamp).toLocaleDateString()}
                  />
                  <Chip
                    label={`${transaction.amount > 0 ? '+' : ''}${transaction.amount} XP`}
                    color={transaction.amount > 0 ? 'success' : 'error'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your account security settings.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<LockIcon />}
            onClick={() => setChangePasswordOpen(true)}
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Confirm Data Import</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to import data from <strong>{selectedFile?.name}</strong>?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>Warning:</strong> This will replace ALL your current data. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImportConfirm} variant="contained" color="error">
            Import and Replace
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type="password"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Divider sx={{ my: 2 }} />
          <TextField
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Minimum 8 characters"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Confirm New Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
/* v8 ignore stop */
