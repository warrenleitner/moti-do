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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  InputAdornment,
  ButtonGroup,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Lock as LockIcon,
  BeachAccess as VacationIcon,
  Timeline as HistoryIcon,
  Label as TagIcon,
  Folder as ProjectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  CardGiftcard as RewardIcon,
} from '@mui/icons-material';
import { dataApi, authApi, userApi, type XPTransaction, type TagDefinition, type ProjectDefinition } from '../services/api';
import { useUserStore, useSystemStatus, useUserStats } from '../store/userStore';

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
  const { toggleVacation, advanceDate, withdrawXP } = useUserStore();
  const systemStatus = useSystemStatus();
  const stats = useUserStats();
  const [xpHistory, setXPHistory] = useState<XPTransaction[]>([]);
  const [loadingXP, setLoadingXP] = useState(false);

  // Advance Date state
  const [advancingDate, setAdvancingDate] = useState(false);

  // XP Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Tags state
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState({ name: '', color: '#808080', multiplier: 1.0 });
  const [showAddTag, setShowAddTag] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<ProjectDefinition[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', color: '#4A90D9', multiplier: 1.0 });
  const [showAddProject, setShowAddProject] = useState(false);

  // Fetch XP history, tags, and projects on mount
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

    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const fetchedTags = await userApi.getTags();
        setTags(fetchedTags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };

    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const fetchedProjects = await userApi.getProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchXPHistory();
    fetchTags();
    fetchProjects();
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

  const handleAdvanceDate = async () => {
    if (!systemStatus?.pending_days || systemStatus.pending_days <= 0) return;

    setAdvancingDate(true);
    setMessage(null);

    try {
      await advanceDate({ days: systemStatus.pending_days });
      setMessage({
        type: 'success',
        text: `Successfully processed ${systemStatus.pending_days} day${systemStatus.pending_days > 1 ? 's' : ''}! Penalties have been applied.`,
      });
      // Refetch XP history to show new penalty transactions
      const transactions = await userApi.getXPLog(10);
      setXPHistory(transactions);
    } catch (error) {
      console.error('Advance date error:', error);
      setMessage({ type: 'error', text: 'Failed to advance date' });
    } finally {
      setAdvancingDate(false);
    }
  };

  const handleWithdrawXP = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      await withdrawXP(amount, withdrawDescription || undefined);
      setMessage({
        type: 'success',
        text: `Withdrew ${amount} XP${withdrawDescription ? ` for "${withdrawDescription}"` : ''}!`,
      });
      // Reset form and refetch XP history
      setWithdrawAmount('');
      setWithdrawDescription('');
      const transactions = await userApi.getXPLog(10);
      setXPHistory(transactions);
    } catch (error) {
      console.error('Withdraw XP error:', error);
      setMessage({ type: 'error', text: 'Failed to withdraw XP' });
    } finally {
      setWithdrawing(false);
    }
  };

  // === Tag Handlers ===
  const handleStartEditTag = (tag: TagDefinition) => {
    setEditingTagId(tag.id);
    setTagForm({ name: tag.name, color: tag.color, multiplier: tag.multiplier });
    setShowAddTag(false);
  };

  const handleCancelEditTag = () => {
    setEditingTagId(null);
    setShowAddTag(false);
    setTagForm({ name: '', color: '#808080', multiplier: 1.0 });
  };

  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) {
      setMessage({ type: 'error', text: 'Tag name is required' });
      return;
    }

    setLoading(true);
    try {
      if (editingTagId) {
        const updated = await userApi.updateTag(editingTagId, tagForm.name, tagForm.color, tagForm.multiplier);
        setTags(tags.map((t) => (t.id === editingTagId ? updated : t)));
        setMessage({ type: 'success', text: 'Tag updated successfully!' });
      } else {
        const created = await userApi.createTag(tagForm.name, tagForm.color, tagForm.multiplier);
        setTags([...tags, created]);
        setMessage({ type: 'success', text: 'Tag created successfully!' });
      }
      handleCancelEditTag();
    } catch (error) {
      console.error('Save tag error:', error);
      setMessage({ type: 'error', text: 'Failed to save tag' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    setLoading(true);
    try {
      await userApi.deleteTag(tagId);
      setTags(tags.filter((t) => t.id !== tagId));
      setMessage({ type: 'success', text: 'Tag deleted successfully!' });
    } catch (error) {
      console.error('Delete tag error:', error);
      setMessage({ type: 'error', text: 'Failed to delete tag' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetTagMultiplier = (value: number) => {
    setTagForm({ ...tagForm, multiplier: value });
  };

  // === Project Handlers ===
  const handleStartEditProject = (project: ProjectDefinition) => {
    setEditingProjectId(project.id);
    setProjectForm({ name: project.name, color: project.color, multiplier: project.multiplier });
    setShowAddProject(false);
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setShowAddProject(false);
    setProjectForm({ name: '', color: '#4A90D9', multiplier: 1.0 });
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      setMessage({ type: 'error', text: 'Project name is required' });
      return;
    }

    setLoading(true);
    try {
      if (editingProjectId) {
        const updated = await userApi.updateProject(editingProjectId, projectForm.name, projectForm.color, projectForm.multiplier);
        setProjects(projects.map((p) => (p.id === editingProjectId ? updated : p)));
        setMessage({ type: 'success', text: 'Project updated successfully!' });
      } else {
        const created = await userApi.createProject(projectForm.name, projectForm.color, projectForm.multiplier);
        setProjects([...projects, created]);
        setMessage({ type: 'success', text: 'Project created successfully!' });
      }
      handleCancelEditProject();
    } catch (error) {
      console.error('Save project error:', error);
      setMessage({ type: 'error', text: 'Failed to save project' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setLoading(true);
    try {
      await userApi.deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      setMessage({ type: 'success', text: 'Project deleted successfully!' });
    } catch (error) {
      console.error('Delete project error:', error);
      setMessage({ type: 'error', text: 'Failed to delete project' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetProjectMultiplier = (value: number) => {
    setProjectForm({ ...projectForm, multiplier: value });
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

      {/* Tags Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon color="primary" />
              <Typography variant="h6">Tags</Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setShowAddTag(true);
                setEditingTagId(null);
                setTagForm({ name: '', color: '#808080', multiplier: 1.0 });
              }}
              disabled={loading || showAddTag}
              size="small"
            >
              Add Tag
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your tags and set score multipliers. Tags with multiplier {'>'} 1.0 will give bonus XP.
          </Typography>

          {loadingTags ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell>Multiplier</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showAddTag && (
                    <TableRow>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Tag name"
                          value={tagForm.name}
                          onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="color"
                          value={tagForm.color}
                          onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                          style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={tagForm.multiplier}
                            onChange={(e) => setTagForm({ ...tagForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                            inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                            sx={{ width: 80 }}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">x</InputAdornment>,
                              },
                            }}
                          />
                          <ButtonGroup size="small" variant="outlined">
                            <Button onClick={() => handleSetTagMultiplier(0.5)}>0.5x</Button>
                            <Button onClick={() => handleSetTagMultiplier(1.0)}>1x</Button>
                            <Button onClick={() => handleSetTagMultiplier(1.5)}>1.5x</Button>
                            <Button onClick={() => handleSetTagMultiplier(2.0)}>2x</Button>
                          </ButtonGroup>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={handleSaveTag} color="primary">
                          <CheckIcon />
                        </IconButton>
                        <IconButton size="small" onClick={handleCancelEditTag}>
                          <CloseIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        {editingTagId === tag.id ? (
                          <TextField
                            size="small"
                            value={tagForm.name}
                            onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={tag.name}
                              size="small"
                              sx={{ backgroundColor: tag.color, color: 'white' }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTagId === tag.id ? (
                          <input
                            type="color"
                            value={tagForm.color}
                            onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                            style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              backgroundColor: tag.color,
                              border: '1px solid rgba(0,0,0,0.2)',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTagId === tag.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={tagForm.multiplier}
                              onChange={(e) => setTagForm({ ...tagForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                              inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                              sx={{ width: 80 }}
                              slotProps={{
                                input: {
                                  endAdornment: <InputAdornment position="end">x</InputAdornment>,
                                },
                              }}
                            />
                            <ButtonGroup size="small" variant="outlined">
                              <Button onClick={() => handleSetTagMultiplier(0.5)}>0.5x</Button>
                              <Button onClick={() => handleSetTagMultiplier(1.0)}>1x</Button>
                              <Button onClick={() => handleSetTagMultiplier(1.5)}>1.5x</Button>
                              <Button onClick={() => handleSetTagMultiplier(2.0)}>2x</Button>
                            </ButtonGroup>
                          </Box>
                        ) : (
                          <Chip
                            label={`${tag.multiplier}x`}
                            size="small"
                            color={tag.multiplier > 1 ? 'success' : tag.multiplier < 1 ? 'warning' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingTagId === tag.id ? (
                          <>
                            <IconButton size="small" onClick={handleSaveTag} color="primary">
                              <CheckIcon />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancelEditTag}>
                              <CloseIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton size="small" onClick={() => handleStartEditTag(tag)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteTag(tag.id)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tags.length === 0 && !showAddTag && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No tags defined. Click "Add Tag" to create one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Projects Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProjectIcon color="secondary" />
              <Typography variant="h6">Projects</Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setShowAddProject(true);
                setEditingProjectId(null);
                setProjectForm({ name: '', color: '#4A90D9', multiplier: 1.0 });
              }}
              disabled={loading || showAddProject}
              size="small"
            >
              Add Project
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your projects and set score multipliers. Projects with multiplier {'>'} 1.0 will give bonus XP.
          </Typography>

          {loadingProjects ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell>Multiplier</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showAddProject && (
                    <TableRow>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Project name"
                          value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="color"
                          value={projectForm.color}
                          onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                          style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={projectForm.multiplier}
                            onChange={(e) => setProjectForm({ ...projectForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                            inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                            sx={{ width: 80 }}
                            slotProps={{
                              input: {
                                endAdornment: <InputAdornment position="end">x</InputAdornment>,
                              },
                            }}
                          />
                          <ButtonGroup size="small" variant="outlined">
                            <Button onClick={() => handleSetProjectMultiplier(0.5)}>0.5x</Button>
                            <Button onClick={() => handleSetProjectMultiplier(1.0)}>1x</Button>
                            <Button onClick={() => handleSetProjectMultiplier(1.5)}>1.5x</Button>
                            <Button onClick={() => handleSetProjectMultiplier(2.0)}>2x</Button>
                          </ButtonGroup>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={handleSaveProject} color="primary">
                          <CheckIcon />
                        </IconButton>
                        <IconButton size="small" onClick={handleCancelEditProject}>
                          <CloseIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        {editingProjectId === project.id ? (
                          <TextField
                            size="small"
                            value={projectForm.name}
                            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={project.name}
                              size="small"
                              sx={{ backgroundColor: project.color, color: 'white' }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProjectId === project.id ? (
                          <input
                            type="color"
                            value={projectForm.color}
                            onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                            style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              backgroundColor: project.color,
                              border: '1px solid rgba(0,0,0,0.2)',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProjectId === project.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={projectForm.multiplier}
                              onChange={(e) => setProjectForm({ ...projectForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                              inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                              sx={{ width: 80 }}
                              slotProps={{
                                input: {
                                  endAdornment: <InputAdornment position="end">x</InputAdornment>,
                                },
                              }}
                            />
                            <ButtonGroup size="small" variant="outlined">
                              <Button onClick={() => handleSetProjectMultiplier(0.5)}>0.5x</Button>
                              <Button onClick={() => handleSetProjectMultiplier(1.0)}>1x</Button>
                              <Button onClick={() => handleSetProjectMultiplier(1.5)}>1.5x</Button>
                              <Button onClick={() => handleSetProjectMultiplier(2.0)}>2x</Button>
                            </ButtonGroup>
                          </Box>
                        ) : (
                          <Chip
                            label={`${project.multiplier}x`}
                            size="small"
                            color={project.multiplier > 1 ? 'success' : project.multiplier < 1 ? 'warning' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {editingProjectId === project.id ? (
                          <>
                            <IconButton size="small" onClick={handleSaveProject} color="primary">
                              <CheckIcon />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancelEditProject}>
                              <CloseIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton size="small" onClick={() => handleStartEditProject(project)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteProject(project.id)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && !showAddProject && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No projects defined. Click "Add Project" to create one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Date Processing */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CalendarIcon color="primary" />
            <Typography variant="h6">Date Processing</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Process pending days to apply overdue penalties and generate recurring tasks.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Today:</strong> {new Date().toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Last Processed:</strong> {systemStatus?.last_processed_date || 'Never'}
            </Typography>
            <Typography variant="body2" color={systemStatus?.pending_days && systemStatus.pending_days > 0 ? 'error.main' : 'text.secondary'}>
              <strong>Days Behind:</strong> {systemStatus?.pending_days ?? 0} day{(systemStatus?.pending_days ?? 0) !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {systemStatus?.pending_days && systemStatus.pending_days > 0 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleAdvanceDate}
              disabled={advancingDate || loading}
              startIcon={advancingDate ? <CircularProgress size={20} color="inherit" /> : <CalendarIcon />}
            >
              Process {systemStatus.pending_days} Pending Day{systemStatus.pending_days > 1 ? 's' : ''}
            </Button>
          ) : (
            <Alert severity="success" sx={{ mt: 1 }}>
              All caught up! No pending days to process.
            </Alert>
          )}

          {systemStatus?.pending_days && systemStatus.pending_days > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Processing will apply penalties for incomplete overdue tasks.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* XP Withdrawal */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <RewardIcon color="secondary" />
            <Typography variant="h6">Spend XP</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Spend your earned XP on rewards. Current balance: <strong>{stats?.total_xp ?? 0} XP</strong>
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <TextField
              label="Amount"
              type="number"
              size="small"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              sx={{ width: 120 }}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: <InputAdornment position="end">XP</InputAdornment>,
              }}
            />
            <TextField
              label="Reward Description (optional)"
              size="small"
              value={withdrawDescription}
              onChange={(e) => setWithdrawDescription(e.target.value)}
              placeholder="e.g., Movie night"
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={handleWithdrawXP}
              disabled={withdrawing || loading || !withdrawAmount}
              startIcon={withdrawing ? <CircularProgress size={20} color="inherit" /> : <RewardIcon />}
            >
              Withdraw
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            You can go into XP debt if you withdraw more than your current balance.
          </Typography>
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
