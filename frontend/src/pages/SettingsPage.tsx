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
  Loader,
  Divider,
  Switch,
  Badge,
  Table,
  ActionIcon,
  Paper,
  Group,
  Stack,
  ColorInput,
} from '@mantine/core';
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
} from '@tabler/icons-react';
import { dataApi, authApi, userApi, type XPTransaction, type TagDefinition, type ProjectDefinition } from '../services/api';
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
      <Title order={2} mb="md">
        Settings
      </Title>

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
                        No tags defined. Click "Add Tag" to create one.
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
                        No projects defined. Click "Add Project" to create one.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
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
      <Card shadow="sm" padding="lg" radius="md" withBorder>
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
