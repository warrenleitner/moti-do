import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Title,
  Text,
  Card,
  Button,
  Alert,
  Modal,
  TextInput,
  PasswordInput,
  NumberInput,
  ColorInput,
  Loader,
  Divider,
  Switch,
  Badge,
  Table,
  ActionIcon,
  Paper,
  Group,
  Stack,
  Select,
} from '../ui';
import {
  IconDownload,
  IconUpload,
  IconLock,
  IconBeach,
  IconHistory,
  IconTag,
  IconFolder,
  IconPencil,
  IconTrash,
  IconPlus,
  IconCheck,
  IconX,
  IconCalendar,
  IconTrophy,
  IconRefresh,
  IconInfoCircle,
} from '../ui/icons';
import {
  dataApi,
  authApi,
  userApi,
  systemApi,
  type XPTransaction,
  type TagDefinition,
  type ProjectDefinition,
  type ScoringConfig,
} from '../services/api';
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

  // Scoring configuration state
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
  const [loadingScoringConfig, setLoadingScoringConfig] = useState(false);
  const [savingScoringConfig, setSavingScoringConfig] = useState(false);
  const [resettingScoringConfig, setResettingScoringConfig] = useState(false);
  const [scoringConfigExpanded, setScoringConfigExpanded] = useState(false);

  // Backend version state
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

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

    const fetchScoringConfig = async () => {
      setLoadingScoringConfig(true);
      try {
        const config = await userApi.getScoringConfig();
        setScoringConfig(config);
      } catch (error) {
        console.error('Failed to fetch scoring config:', error);
      } finally {
        setLoadingScoringConfig(false);
      }
    };

    const fetchBackendVersion = async () => {
      try {
        const health = await systemApi.healthCheck();
        setBackendVersion(health.version);
      } catch (error) {
        console.error('Failed to fetch backend version:', error);
      }
    };

    fetchXPHistory();
    fetchTags();
    fetchProjects();
    fetchScoringConfig();
    fetchBackendVersion();
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

  const handleVacationToggle = async (checked: boolean) => {
    setLoading(true);
    setMessage(null);

    try {
      await toggleVacation(checked);
      setMessage({
        type: 'success',
        text: checked ? 'Vacation mode enabled!' : 'Vacation mode disabled!',
      });
    } catch (error) {
      console.error('Vacation toggle error:', error);
      setMessage({ type: 'error', text: 'Failed to toggle vacation mode' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceDate = async (days?: number) => {
    const daysToProcess = days ?? systemStatus?.pending_days ?? 0;
    if (daysToProcess <= 0) return;

    setAdvancingDate(true);
    setMessage(null);

    try {
      await advanceDate({ days: daysToProcess });
      setMessage({
        type: 'success',
        text: `Successfully processed ${daysToProcess} day${daysToProcess > 1 ? 's' : ''}! Penalties have been applied.`,
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

  const handleSaveScoringConfig = async () => {
    if (!scoringConfig) return;
    setSavingScoringConfig(true);
    try {
      const updated = await userApi.updateScoringConfig(scoringConfig);
      setScoringConfig(updated);
      setMessage({ type: 'success', text: 'Scoring configuration saved successfully!' });
    } catch (error) {
      console.error('Save scoring config error:', error);
      setMessage({ type: 'error', text: 'Failed to save scoring configuration' });
    } finally {
      setSavingScoringConfig(false);
    }
  };

  const handleResetScoringConfig = async () => {
    setResettingScoringConfig(true);
    try {
      const defaults = await userApi.resetScoringConfig();
      setScoringConfig(defaults);
      setMessage({ type: 'success', text: 'Scoring configuration reset to defaults!' });
    } catch (error) {
      console.error('Reset scoring config error:', error);
      setMessage({ type: 'error', text: 'Failed to reset scoring configuration' });
    } finally {
      setResettingScoringConfig(false);
    }
  };

  const updateScoringField = <K extends keyof ScoringConfig>(
    field: K,
    value: ScoringConfig[K]
  ) => {
    if (!scoringConfig) return;
    setScoringConfig({ ...scoringConfig, [field]: value });
  };

  return (
    <Box>
      {message && (
        <Alert
          color={message.type === 'success' ? 'green' : 'red'}
          mb="lg"
          withCloseButton
          closeButtonLabel="Close alert"
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Data Backup & Restore */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Title order={4} mb="xs">
          Data Backup & Restore
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Export your data as a JSON backup file or restore from a previous backup.
        </Text>

        <Group gap="md" wrap="wrap">
          <Button
            leftSection={loading ? <Loader size={16} color="white" /> : <IconDownload size={16} />}
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
              variant="outline"
              leftSection={<IconUpload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Import Data
            </Button>
          </Box>
        </Group>

        <Alert color="yellow" mt="md">
          <strong>Warning:</strong> Importing data will replace ALL your current data. Make sure to export your current data before importing.
        </Alert>
      </Card>

      {/* Tags Management */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconTag size={20} color="var(--mantine-color-blue-6)" />
            <Title order={4}>Tags</Title>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setShowAddTag(true);
              setEditingTagId(null);
              setTagForm({ name: '', color: '#808080', multiplier: 1.0 });
            }}
            disabled={loading || showAddTag}
            size="sm"
          >
            Add Tag
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Manage your tags and set score multipliers. Tags with multiplier {'>'} 1.0 will give bonus XP.
        </Text>

        {loadingTags ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : (
          <Paper withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th>Multiplier</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {showAddTag && (
                  <Table.Tr>
                    <Table.Td>
                      <TextInput
                        size="sm"
                        placeholder="Tag name"
                        value={tagForm.name}
                        onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        autoFocus
                      />
                    </Table.Td>
                    <Table.Td>
                      <ColorInput
                        size="sm"
                        value={tagForm.color}
                        onChange={(color) => setTagForm({ ...tagForm, color })}
                        w={100}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <NumberInput
                          size="sm"
                          value={tagForm.multiplier}
                          onChange={(val) => setTagForm({ ...tagForm, multiplier: Number(val) || 1.0 })}
                          min={0.1}
                          max={10}
                          step={0.1}
                          w={80}
                          suffix="x"
                        />
                        <Button.Group>
                          <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(0.5)}>0.5x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(1.0)}>1x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(1.5)}>1.5x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(2.0)}>2x</Button>
                        </Button.Group>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <ActionIcon size="sm" color="blue" onClick={handleSaveTag} mr={4}>
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon size="sm" onClick={handleCancelEditTag}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                )}
                {tags.map((tag) => (
                  <Table.Tr key={tag.id}>
                    <Table.Td>
                      {editingTagId === tag.id ? (
                        <TextInput
                          size="sm"
                          value={tagForm.name}
                          onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        />
                      ) : (
                        <Badge style={{ backgroundColor: tag.color, color: 'white' }}>
                          {tag.name}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingTagId === tag.id ? (
                        <ColorInput
                          size="sm"
                          value={tagForm.color}
                          onChange={(color) => setTagForm({ ...tagForm, color })}
                          w={100}
                        />
                      ) : (
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: tag.color,
                            border: '1px solid rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingTagId === tag.id ? (
                        <Group gap="xs">
                          <NumberInput
                            size="sm"
                            value={tagForm.multiplier}
                            onChange={(val) => setTagForm({ ...tagForm, multiplier: Number(val) || 1.0 })}
                            min={0.1}
                            max={10}
                            step={0.1}
                            w={80}
                            suffix="x"
                          />
                          <Button.Group>
                            <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(0.5)}>0.5x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(1.0)}>1x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(1.5)}>1.5x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetTagMultiplier(2.0)}>2x</Button>
                          </Button.Group>
                        </Group>
                      ) : (
                        <Badge
                          color={tag.multiplier > 1 ? 'green' : tag.multiplier < 1 ? 'yellow' : 'gray'}
                          variant="light"
                        >
                          {tag.multiplier}x
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {editingTagId === tag.id ? (
                        <>
                          <ActionIcon size="sm" color="blue" onClick={handleSaveTag} mr={4}>
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon size="sm" onClick={handleCancelEditTag}>
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      ) : (
                        <>
                          <ActionIcon size="sm" onClick={() => handleStartEditTag(tag)} mr={4}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon size="sm" color="red" onClick={() => handleDeleteTag(tag.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {tags.length === 0 && !showAddTag && (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                      <Text size="sm" c="dimmed">
                        No tags defined. Click &quot;Add Tag&quot; to create one.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Card>

      {/* Projects Management */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconFolder size={20} color="var(--mantine-color-violet-6)" />
            <Title order={4}>Projects</Title>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setShowAddProject(true);
              setEditingProjectId(null);
              setProjectForm({ name: '', color: '#4A90D9', multiplier: 1.0 });
            }}
            disabled={loading || showAddProject}
            size="sm"
          >
            Add Project
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Manage your projects and set score multipliers. Projects with multiplier {'>'} 1.0 will give bonus XP.
        </Text>

        {loadingProjects ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : (
          <Paper withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th>Multiplier</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {showAddProject && (
                  <Table.Tr>
                    <Table.Td>
                      <TextInput
                        size="sm"
                        placeholder="Project name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        autoFocus
                      />
                    </Table.Td>
                    <Table.Td>
                      <ColorInput
                        size="sm"
                        value={projectForm.color}
                        onChange={(color) => setProjectForm({ ...projectForm, color })}
                        w={100}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <NumberInput
                          size="sm"
                          value={projectForm.multiplier}
                          onChange={(val) => setProjectForm({ ...projectForm, multiplier: Number(val) || 1.0 })}
                          min={0.1}
                          max={10}
                          step={0.1}
                          w={80}
                          suffix="x"
                        />
                        <Button.Group>
                          <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(0.5)}>0.5x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(1.0)}>1x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(1.5)}>1.5x</Button>
                          <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(2.0)}>2x</Button>
                        </Button.Group>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <ActionIcon size="sm" color="blue" onClick={handleSaveProject} mr={4}>
                        <IconCheck size={16} />
                      </ActionIcon>
                      <ActionIcon size="sm" onClick={handleCancelEditProject}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                )}
                {projects.map((project) => (
                  <Table.Tr key={project.id}>
                    <Table.Td>
                      {editingProjectId === project.id ? (
                        <TextInput
                          size="sm"
                          value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        />
                      ) : (
                        <Badge style={{ backgroundColor: project.color, color: 'white' }}>
                          {project.name}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingProjectId === project.id ? (
                        <ColorInput
                          size="sm"
                          value={projectForm.color}
                          onChange={(color) => setProjectForm({ ...projectForm, color })}
                          w={100}
                        />
                      ) : (
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: project.color,
                            border: '1px solid rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingProjectId === project.id ? (
                        <Group gap="xs">
                          <NumberInput
                            size="sm"
                            value={projectForm.multiplier}
                            onChange={(val) => setProjectForm({ ...projectForm, multiplier: Number(val) || 1.0 })}
                            min={0.1}
                            max={10}
                            step={0.1}
                            w={80}
                            suffix="x"
                          />
                          <Button.Group>
                            <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(0.5)}>0.5x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(1.0)}>1x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(1.5)}>1.5x</Button>
                            <Button size="xs" variant="outline" onClick={() => handleSetProjectMultiplier(2.0)}>2x</Button>
                          </Button.Group>
                        </Group>
                      ) : (
                        <Badge
                          color={project.multiplier > 1 ? 'green' : project.multiplier < 1 ? 'yellow' : 'gray'}
                          variant="light"
                        >
                          {project.multiplier}x
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {editingProjectId === project.id ? (
                        <>
                          <ActionIcon size="sm" color="blue" onClick={handleSaveProject} mr={4}>
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon size="sm" onClick={handleCancelEditProject}>
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      ) : (
                        <>
                          <ActionIcon size="sm" onClick={() => handleStartEditProject(project)} mr={4}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon size="sm" color="red" onClick={() => handleDeleteProject(project.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {projects.length === 0 && !showAddProject && (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: 'center' }}>
                      <Text size="sm" c="dimmed">
                        No projects defined. Click &quot;Add Project&quot; to create one.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Card>

      {/* Scoring Configuration */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconHistory size={20} color="var(--mantine-color-blue-6)" />
            <Title order={4}>Scoring Configuration</Title>
          </Group>
          <Button
            variant="subtle"
            onClick={() => setScoringConfigExpanded(!scoringConfigExpanded)}
          >
            {scoringConfigExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Configure how task scores are calculated. Higher scores mean higher priority in the task list.
        </Text>

        {loadingScoringConfig ? (
          <Group justify="center" p="lg">
            <Loader size="sm" />
          </Group>
        ) : scoringConfig && scoringConfigExpanded ? (
          <Stack gap="lg">
            {/* Base Score */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Base Score</Text>
              <NumberInput
                size="sm"
                value={scoringConfig.base_score}
                onChange={(val) => updateScoringField('base_score', Number(val) || 0)}
                description="Starting score for all tasks (default: 10, recommended: 5-20)"
                w={200}
              />
            </Box>

            <Divider />

            {/* Priority Multipliers */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Priority Multipliers</Text>
              <Text size="xs" c="dimmed" mb="sm">
                Recommended: 1.0-2.5 (defaults: NOT_SET=1.0, TRIVIAL=1.05, LOW=1.2, MEDIUM=1.45, HIGH=1.8, DEFCON_ONE=2.1)
              </Text>
              <Group gap="md" wrap="wrap">
                {Object.entries(scoringConfig.priority_multiplier).map(([key, value]) => (
                  <NumberInput
                    key={key}
                    size="sm"
                    label={key.replace(/_/g, ' ')}
                    value={value}
                    onChange={(val) => updateScoringField('priority_multiplier', {
                      ...scoringConfig.priority_multiplier,
                      [key]: Number(val) || 1,
                    })}
                    step={0.1}
                    min={1}
                    w={120}
                  />
                ))}
              </Group>
            </Box>

            <Divider />

            {/* Difficulty Multipliers */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Difficulty Multipliers</Text>
              <Text size="xs" c="dimmed" mb="sm">
                Recommended: 1.0-2.5 (defaults: NOT_SET=1.0, TRIVIAL=1.05, LOW=1.2, MEDIUM=1.45, HIGH=1.8, HERCULEAN=2.1)
              </Text>
              <Group gap="md" wrap="wrap">
                {Object.entries(scoringConfig.difficulty_multiplier).map(([key, value]) => (
                  <NumberInput
                    key={key}
                    size="sm"
                    label={key.replace(/_/g, ' ')}
                    value={value}
                    onChange={(val) => updateScoringField('difficulty_multiplier', {
                      ...scoringConfig.difficulty_multiplier,
                      [key]: Number(val) || 1,
                    })}
                    step={0.1}
                    min={1}
                    w={120}
                  />
                ))}
              </Group>
            </Box>

            <Divider />

            {/* Duration Multipliers */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Duration Multipliers</Text>
              <Text size="xs" c="dimmed" mb="sm">
                Recommended: 1.0-2.5 (defaults: NOT_SET=1.0, MINUSCULE=1.05, SHORT=1.2, MEDIUM=1.45, LONG=1.8, ODYSSEYAN=2.1)
              </Text>
              <Group gap="md" wrap="wrap">
                {Object.entries(scoringConfig.duration_multiplier).map(([key, value]) => (
                  <NumberInput
                    key={key}
                    size="sm"
                    label={key.replace(/_/g, ' ')}
                    value={value}
                    onChange={(val) => updateScoringField('duration_multiplier', {
                      ...scoringConfig.duration_multiplier,
                      [key]: Number(val) || 1,
                    })}
                    step={0.1}
                    min={1}
                    w={120}
                  />
                ))}
              </Group>
            </Box>

            <Divider />

            {/* Age Factor */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Age Factor</Text>
              <Switch
                checked={scoringConfig.age_factor.enabled}
                onChange={(e) => updateScoringField('age_factor', {
                  ...scoringConfig.age_factor,
                  enabled: e.currentTarget.checked,
                })}
                label="Enable age-based bonus"
                mb="sm"
              />
              {scoringConfig.age_factor.enabled && (
                <Stack gap="sm" mt="xs">
                  <Text size="xs" c="dimmed">
                    Defaults: 0.025 per unit (days), max multiplier 1.5
                  </Text>
                  <Group gap="md" wrap="wrap">
                    <NumberInput
                      size="sm"
                      label="Multiplier per unit"
                      value={scoringConfig.age_factor.multiplier_per_unit}
                      onChange={(val) => updateScoringField('age_factor', {
                        ...scoringConfig.age_factor,
                        multiplier_per_unit: Number(val) || 0,
                      })}
                      step={0.01}
                      min={0}
                      w={150}
                    />
                    <NumberInput
                      size="sm"
                      label="Max multiplier"
                      value={scoringConfig.age_factor.max_multiplier}
                      onChange={(val) => updateScoringField('age_factor', {
                        ...scoringConfig.age_factor,
                        max_multiplier: Number(val) || 1,
                      })}
                      description="1.0-3.0"
                      step={0.1}
                      min={1}
                      w={150}
                    />
                    <Select
                      size="sm"
                      label="Unit"
                      value={scoringConfig.age_factor.unit}
                      onChange={(val) => updateScoringField('age_factor', {
                        ...scoringConfig.age_factor,
                        unit: (val as 'days' | 'weeks') || 'days',
                      })}
                      data={[
                        { value: 'days', label: 'Days' },
                        { value: 'weeks', label: 'Weeks' },
                      ]}
                      w={120}
                    />
                  </Group>
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Due Date Proximity */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Due Date Proximity</Text>
              <Switch
                checked={scoringConfig.due_date_proximity.enabled}
                onChange={(e) => updateScoringField('due_date_proximity', {
                  ...scoringConfig.due_date_proximity,
                  enabled: e.currentTarget.checked,
                })}
                label="Enable due date proximity scoring"
                mb="sm"
              />
              {scoringConfig.due_date_proximity.enabled && (
                <Stack gap="sm" mt="xs">
                  <Text size="xs" c="dimmed">
                    Defaults: 0.02 per unit (days), max multiplier 1.5
                  </Text>
                  <Group gap="md" wrap="wrap">
                    <NumberInput
                      size="sm"
                      label="Multiplier per unit"
                      value={scoringConfig.due_date_proximity.multiplier_per_unit}
                      onChange={(val) => updateScoringField('due_date_proximity', {
                        ...scoringConfig.due_date_proximity,
                        multiplier_per_unit: Number(val) || 0,
                      })}
                      description="0.01-0.1"
                      step={0.01}
                      min={0}
                      w={190}
                    />
                    <NumberInput
                      size="sm"
                      label="Max multiplier"
                      value={scoringConfig.due_date_proximity.max_multiplier}
                      onChange={(val) => updateScoringField('due_date_proximity', {
                        ...scoringConfig.due_date_proximity,
                        max_multiplier: Number(val) || 1,
                      })}
                      description="1.0-3.0"
                      step={0.1}
                      min={1}
                      w={150}
                    />
                    <Select
                      size="sm"
                      label="Unit"
                      value={scoringConfig.due_date_proximity.unit}
                      onChange={(val) => updateScoringField('due_date_proximity', {
                        ...scoringConfig.due_date_proximity,
                        unit: (val as 'days' | 'weeks') || 'days',
                      })}
                      data={[
                        { value: 'days', label: 'Days' },
                        { value: 'weeks', label: 'Weeks' },
                      ]}
                      w={120}
                    />
                  </Group>
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Penalty Weight Inversion */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Penalty Weighting</Text>
              <Text size="xs" c="dimmed" mb="sm">
                Choose which components use inverted weights when calculating penalties.
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--mantine-spacing-xs)',
                }}
              >
                {Object.entries(scoringConfig.penalty_invert_weights).map(([key, value]) => {
                  const label = key.replace(/_/g, ' ');
                  return (
                    <Switch
                      key={key}
                      checked={value}
                      onChange={(e) => updateScoringField('penalty_invert_weights', {
                        ...scoringConfig.penalty_invert_weights,
                        [key]: e.currentTarget.checked,
                      })}
                      label={`Invert ${label} weight`}
                    />
                  );
                })}
              </div>
            </Box>

            <Divider />

            {/* Habit Streak Bonus */}
            <Box>
              <Text fw={600} size="sm" mb="xs">Habit Streak Bonus</Text>
              <Switch
                checked={scoringConfig.habit_streak_bonus.enabled}
                onChange={(e) => updateScoringField('habit_streak_bonus', {
                  ...scoringConfig.habit_streak_bonus,
                  enabled: e.currentTarget.checked,
                })}
                label="Enable habit streak bonuses"
                mb="sm"
              />
              {scoringConfig.habit_streak_bonus.enabled && (
                <Stack gap="sm" mt="xs">
                  <Text size="xs" c="dimmed">
                    Defaults: 1.2/streak day, max 25 bonus
                  </Text>
                  <Group gap="md" wrap="wrap">
                    <NumberInput
                      size="sm"
                      label="Bonus per streak day"
                      value={scoringConfig.habit_streak_bonus.bonus_per_streak_day}
                      onChange={(val) => updateScoringField('habit_streak_bonus', {
                        ...scoringConfig.habit_streak_bonus,
                        bonus_per_streak_day: Number(val) || 0,
                      })}
                      description="0.5-5.0"
                      step={0.1}
                      min={0}
                      w={150}
                    />
                    <NumberInput
                      size="sm"
                      label="Max bonus"
                      value={scoringConfig.habit_streak_bonus.max_bonus}
                      onChange={(val) => updateScoringField('habit_streak_bonus', {
                        ...scoringConfig.habit_streak_bonus,
                        max_bonus: Number(val) || 0,
                      })}
                      description="10-100"
                      step={1}
                      min={0}
                      w={120}
                    />
                  </Group>
                </Stack>
              )}
            </Box>

            <Divider />

            <Group gap="md" mt="md">
              <Button
                onClick={handleSaveScoringConfig}
                disabled={savingScoringConfig || resettingScoringConfig}
                leftSection={savingScoringConfig ? <Loader size={16} color="white" /> : <IconCheck size={16} />}
              >
                {savingScoringConfig ? 'Saving...' : 'Save Scoring Configuration'}
              </Button>
              <Button
                variant="outline"
                color="yellow"
                onClick={handleResetScoringConfig}
                disabled={savingScoringConfig || resettingScoringConfig}
                leftSection={resettingScoringConfig ? <Loader size={16} /> : <IconRefresh size={16} />}
              >
                {resettingScoringConfig ? 'Resetting...' : 'Reset to Defaults'}
              </Button>
            </Group>
          </Stack>
        ) : scoringConfig ? (
          <Text size="sm" c="dimmed">
            Click &quot;Expand&quot; to view and edit scoring configuration.
          </Text>
        ) : null}
      </Card>

      {/* Date Processing */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group gap="xs" mb="xs">
          <IconCalendar size={20} color="var(--mantine-color-blue-6)" />
          <Title order={4}>Date Processing</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Process pending days to apply overdue penalties and generate recurring tasks.
        </Text>

        <Box mb="md">
          <Text size="sm" fw={700} c="blue">
            <strong>Current Processing Date:</strong>{' '}
            {systemStatus?.last_processed_date
              ? (() => {
                  // Parse as local date to avoid timezone issues
                  const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
                  const nextDay = new Date(year, month - 1, day + 1);
                  return nextDay.toLocaleDateString();
                })()
              : 'Not started'}
          </Text>
          <Text size="sm" c="dimmed">
            <strong>Real Date:</strong> {new Date().toLocaleDateString()}
          </Text>
          <Text size="sm" c="dimmed">
            <strong>Last Completed:</strong> {systemStatus?.last_processed_date || 'Never'}
          </Text>
          <Text size="sm" c={systemStatus?.pending_days && systemStatus.pending_days > 0 ? 'red' : 'dimmed'}>
            <strong>Days Behind:</strong> {systemStatus?.pending_days ?? 0} day{(systemStatus?.pending_days ?? 0) !== 1 ? 's' : ''}
          </Text>
        </Box>

        {systemStatus?.pending_days && systemStatus.pending_days > 0 ? (
          <Group gap="md" wrap="wrap">
            <Button
              onClick={() => handleAdvanceDate(1)}
              disabled={advancingDate || loading}
              leftSection={advancingDate ? <Loader size={16} color="white" /> : <IconCalendar size={16} />}
            >
              Process {systemStatus?.last_processed_date
                ? (() => {
                    const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
                    const nextDay = new Date(year, month - 1, day + 1);
                    return nextDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  })()
                : 'Next Day'}
            </Button>
            {systemStatus.pending_days > 1 && (
              <Button
                variant="outline"
                onClick={() => handleAdvanceDate()}
                disabled={advancingDate || loading}
                leftSection={advancingDate ? <Loader size={16} /> : <IconCalendar size={16} />}
              >
                Process All {systemStatus.pending_days} Days
              </Button>
            )}
          </Group>
        ) : (
          <Alert color="green" mt="xs">
            All caught up! No pending days to process.
          </Alert>
        )}

        {systemStatus && systemStatus.pending_days > 0 && (
          <Alert color="yellow" mt="md">
            Processing will apply penalties for incomplete overdue tasks.
          </Alert>
        )}
      </Card>

      {/* XP Withdrawal */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group gap="xs" mb="xs">
          <IconTrophy size={20} color="var(--mantine-color-violet-6)" />
          <Title order={4}>Spend XP</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Spend your earned XP on rewards. Current balance: <strong>{stats?.total_xp ?? 0} XP</strong>
        </Text>

        <Group gap="md" wrap="wrap" align="flex-start">
          <NumberInput
            label="Amount"
            size="sm"
            value={withdrawAmount === '' ? '' : Number(withdrawAmount)}
            onChange={(val) => setWithdrawAmount(String(val))}
            min={1}
            suffix=" XP"
            w={120}
          />
          <TextInput
            label="Reward Description (optional)"
            size="sm"
            value={withdrawDescription}
            onChange={(e) => setWithdrawDescription(e.target.value)}
            placeholder="e.g., Movie night"
            style={{ flex: 1, minWidth: 200 }}
          />
          <Button
            color="violet"
            onClick={handleWithdrawXP}
            disabled={withdrawing || loading || !withdrawAmount}
            leftSection={withdrawing ? <Loader size={16} color="white" /> : <IconTrophy size={16} />}
            mt={24}
          >
            Withdraw
          </Button>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          You can go into XP debt if you withdraw more than your current balance.
        </Text>
      </Card>

      {/* Vacation Mode */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group gap="xs" mb="xs">
          <IconBeach size={20} color="var(--mantine-color-cyan-6)" />
          <Title order={4}>Vacation Mode</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Enable vacation mode to pause streak penalties and task due date enforcement while you're away.
        </Text>

        <Switch
          checked={systemStatus?.vacation_mode ?? false}
          onChange={(e) => handleVacationToggle(e.currentTarget.checked)}
          disabled={loading}
          label={systemStatus?.vacation_mode ? 'Vacation mode is active' : 'Enable vacation mode'}
          aria-label="Vacation Mode"
        />

        {systemStatus?.vacation_mode && (
          <Alert color="blue" mt="md">
            Vacation mode is currently active. No penalties will be applied for overdue tasks.
          </Alert>
        )}
      </Card>

      {/* XP History */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Group gap="xs" mb="xs">
          <IconHistory size={20} color="var(--mantine-color-blue-6)" />
          <Title order={4}>XP History</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Recent experience points earned or spent.
        </Text>

        {loadingXP ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : xpHistory.length === 0 ? (
          <Text size="sm" c="dimmed">
            No XP transactions yet. Complete tasks to earn experience!
          </Text>
        ) : (
          <Stack gap="xs">
            {xpHistory.map((transaction) => (
              <Paper key={transaction.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Box>
                    <Text size="sm">{transaction.description}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </Text>
                  </Box>
                  <Badge
                    color={transaction.amount > 0 ? 'green' : 'red'}
                    variant="light"
                  >
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} XP
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Card>

      {/* Security */}
      <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
        <Title order={4} mb="xs">
          Security
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Manage your account security settings.
        </Text>

        <Button
          variant="outline"
          leftSection={<IconLock size={16} />}
          onClick={() => setChangePasswordOpen(true)}
        >
          Change Password
        </Button>
      </Card>

      {/* About */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group gap="xs" mb="xs">
          <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
          <Title order={4}>About</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Application version and build information.
        </Text>

        <Paper withBorder>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td style={{ fontWeight: 'bold', width: 180 }}>
                  Frontend Version
                </Table.Td>
                <Table.Td>{__APP_VERSION__}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td style={{ fontWeight: 'bold' }}>
                  Backend Version
                </Table.Td>
                <Table.Td>{backendVersion ?? 'Loading...'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td style={{ fontWeight: 'bold' }}>
                  Build Date
                </Table.Td>
                <Table.Td>{new Date(__BUILD_TIMESTAMP__).toLocaleString()}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td style={{ fontWeight: 'bold' }}>
                  Environment
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={import.meta.env.MODE === 'production' ? 'green' : 'yellow'}
                    variant="light"
                  >
                    {import.meta.env.MODE}
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td style={{ fontWeight: 'bold' }}>
                  API URL
                </Table.Td>
                <Table.Td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {import.meta.env.VITE_API_URL || window.location.origin}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      </Card>

      {/* Import Confirmation Modal */}
      <Modal
        opened={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Confirm Data Import"
      >
        <Text mb="md">
          Are you sure you want to import data from <strong>{selectedFile?.name}</strong>?
        </Text>
        <Alert color="red" mb="lg">
          <strong>Warning:</strong> This will replace ALL your current data. This action cannot be undone.
        </Alert>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button color="red" onClick={handleImportConfirm}>
            Import and Replace
          </Button>
        </Group>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        opened={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        title="Change Password"
      >
        <Stack gap="md">
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
          />
          <Divider />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            description="Minimum 8 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button
              onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            >
              {loading ? <Loader size={16} color="white" /> : 'Change Password'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
/* v8 ignore stop */
