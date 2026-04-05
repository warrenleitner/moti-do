import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Title,
  Text,
  Alert,
  Modal,
  TextInput,
  PasswordInput,
  NumberInput,
  ColorInput,
  Loader,
  Divider,
  Switch,
  ActionIcon,
  Group,
  Stack,
  Select,
  Collapse,
} from '../ui';
import {
  IconDownload,
  IconUpload,
  IconLock,
  IconBeach,
  IconBell,
  IconHistory,
  IconListDetails,
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
  IconChevronDown,
  IconChevronRight,
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
import { useLayoutStore } from '../store';
import { useUserStore, useSystemStatus, useUserStats } from '../store/userStore';
import { GlowCard, ArcadeButton, DataBadge } from '../components/ui';
import {
  getNotificationEnabled,
  setNotificationEnabled,
  getNotificationTime,
  setNotificationTime,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  startNotificationScheduler,
  stopNotificationScheduler,
} from '../services/notifications';

// Pre-compute the list of IANA timezone identifiers
const TIMEZONE_OPTIONS = Intl.supportedValuesOf('timeZone');

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
  const { toggleVacation, advanceDate, withdrawXP, updateTimezone, fetchSystemStatus } = useUserStore();
  const systemStatus = useSystemStatus();
  const stats = useUserStats();
  const [xpHistory, setXPHistory] = useState<XPTransaction[]>([]);
  const [loadingXP, setLoadingXP] = useState(false);

  // Timezone state
  const [savingTimezone, setSavingTimezone] = useState(false);

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
  // Backend version state
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(getNotificationEnabled());
  const [notificationTime, setNotifTime] = useState(getNotificationTime());
  const [notificationPermission, setNotificationPermission] = useState<string>(getNotificationPermission());

  // Collapsible section states (mobile accordion)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    xpLedger: true,
    scoring: false,
    tags: true,
    projects: true,
    dateProcessing: true,
    xpWithdraw: true,
    layout: true,
    notifications: true,
    vacation: true,
    backup: true,
    security: true,
    about: false,
  });
  const {
    desktopNavCollapsed,
    setDesktopNavCollapsed,
    tasksViewUseFullWidth,
    setTasksViewUseFullWidth,
  } = useLayoutStore();

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  /* ── Inline styles ──────────────────────────────── */
  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#a8aab7',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    userSelect: 'none',
  };

  const terminalNumberStyle: React.CSSProperties = {
    backgroundColor: '#0B0E17',
    border: '1px solid rgba(69, 71, 82, 0.15)',
    color: '#e6e7f5',
    fontFamily: '"JetBrains Mono", monospace',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minWidth: 80,
  };

  return (
    <Box style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* ── Page Header ─────────────────────────────── */}
      <Box mb="xl">
        <Title
          order={1}
          className="gradient-text"
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            letterSpacing: '0.05em',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          }}
        >
          SYSTEM_CONFIG
        </Title>
        <Text
          className="font-data"
          size="sm"
          style={{ color: '#a8aab7', letterSpacing: '0.1em', marginTop: 4 }}
        >
          CONFIGURATION &amp; DATA MANAGEMENT
        </Text>
      </Box>

      {/* ── Status Alert ────────────────────────────── */}
      {message && (
        <Alert
          color={message.type === 'success' ? 'green' : 'red'}
          mb="lg"
          withCloseButton
          closeButtonLabel="Close alert"
          onClose={() => setMessage(null)}
          style={{ border: message.type === 'success' ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,0,127,0.3)' }}
        >
          <Text className="font-data" size="sm">{message.text}</Text>
        </Alert>
      )}

      {/* ═══════════════════════════════════════════════
          6.1 — XP Transaction Ledger
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="cyan" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('xpLedger')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('xpLedger')}
        >
          {expandedSections.xpLedger ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconHistory size={14} style={{ color: '#81ecff' }} />
          XP_TRANSACTION_LEDGER
        </div>

        <Collapse in={expandedSections.xpLedger}>
          {loadingXP ? (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          ) : xpHistory.length === 0 ? (
            <Box
              style={{
                backgroundColor: '#0B0E17',
                border: '1px solid rgba(69, 71, 82, 0.15)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <Text className="font-data" size="sm" style={{ color: '#525560', letterSpacing: '0.1em' }}>
                NO TRANSACTIONS RECORDED
              </Text>
            </Box>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.8125rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#181B25',
                      borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
                    }}
                  >
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#a8aab7', letterSpacing: '0.15em', fontSize: '0.6875rem', fontWeight: 500 }}>DATE</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#a8aab7', letterSpacing: '0.15em', fontSize: '0.6875rem', fontWeight: 500 }}>ACTION</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#a8aab7', letterSpacing: '0.15em', fontSize: '0.6875rem', fontWeight: 500 }}>XP_GAINED</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#a8aab7', letterSpacing: '0.15em', fontSize: '0.6875rem', fontWeight: 500 }}>SOURCE</th>
                  </tr>
                </thead>
                <tbody>
                  {xpHistory.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{
                        backgroundColor: '#10131C',
                        borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.5rem 0.75rem', color: '#a8aab7', whiteSpace: 'nowrap' }}>
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#e6e7f5' }}>
                        {tx.description}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                        <DataBadge
                          value={`${tx.amount > 0 ? '+' : ''}${tx.amount} XP`}
                          color={tx.amount >= 0 ? 'cyan' : 'magenta'}
                          size="sm"
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#a8aab7' }}>
                        {tx.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          6.2 — Scoring Configuration Panel
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="amber" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('scoring')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('scoring')}
        >
          {expandedSections.scoring ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconHistory size={14} style={{ color: '#FFC775' }} />
          SCORING_PARAMETERS
        </div>
        <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '0.75rem' }}>
          Configure how task scores are calculated. Higher scores mean higher priority.
        </Text>

        <Collapse in={expandedSections.scoring}>
          {loadingScoringConfig ? (
            <Group justify="center" p="lg">
              <Loader size="sm" />
            </Group>
          ) : scoringConfig ? (
            <Stack gap="lg">
              {/* Base Score */}
              <Box>
                <Text className="micro-meta" mb="xs">BASE_SCORE</Text>
                <NumberInput
                  size="sm"
                  value={scoringConfig.base_score}
                  onChange={(val) => updateScoringField('base_score', Number(val) || 0)}
                  description="Starting score for all tasks (default: 10)"
                  w={200}
                  styles={{ input: terminalNumberStyle }}
                />
              </Box>

              <Divider />

              {/* Priority Multipliers */}
              <Box>
                <Text className="micro-meta" mb="xs">PRIORITY_MULTIPLIERS</Text>
                <Text size="xs" style={{ color: '#525560' }} mb="sm">
                  Recommended: 1.0–2.5
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
                <Text className="micro-meta" mb="xs">DIFFICULTY_MULTIPLIERS</Text>
                <Text size="xs" style={{ color: '#525560' }} mb="sm">
                  Recommended: 1.0–2.5
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
                <Text className="micro-meta" mb="xs">DURATION_MULTIPLIERS</Text>
                <Text size="xs" style={{ color: '#525560' }} mb="sm">
                  Recommended: 1.0–2.5
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
                <Text className="micro-meta" mb="xs">AGE_FACTOR</Text>
                <Switch
                  checked={scoringConfig.age_factor.enabled}
                  onChange={(e) => updateScoringField('age_factor', {
                    ...scoringConfig.age_factor,
                    enabled: e.currentTarget.checked,
                  })}
                  label="Enable age-based bonus"
                  mb="sm"
                  color="cyan"
                  styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' } }}
                />
                {scoringConfig.age_factor.enabled && (
                  <Stack gap="sm" mt="xs">
                    <Text size="xs" style={{ color: '#525560' }}>
                      Defaults: 0.025 per unit (days), max multiplier 1.5
                    </Text>
                    <Group gap="md" wrap="wrap">
                      <NumberInput size="sm" label="Multiplier per unit" value={scoringConfig.age_factor.multiplier_per_unit}
                        onChange={(val) => updateScoringField('age_factor', { ...scoringConfig.age_factor, multiplier_per_unit: Number(val) || 0 })}
                        step={0.01} min={0} w={150} />
                      <NumberInput size="sm" label="Max multiplier" value={scoringConfig.age_factor.max_multiplier}
                        onChange={(val) => updateScoringField('age_factor', { ...scoringConfig.age_factor, max_multiplier: Number(val) || 1 })}
                        description="1.0-3.0" step={0.1} min={1} w={150} />
                      <Select size="sm" label="Unit" value={scoringConfig.age_factor.unit}
                        onChange={(val) => updateScoringField('age_factor', { ...scoringConfig.age_factor, unit: (val as 'days' | 'weeks') || 'days' })}
                        data={[{ value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' }]} w={120} />
                    </Group>
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Due Date Proximity */}
              <Box>
                <Text className="micro-meta" mb="xs">DUE_DATE_PROXIMITY</Text>
                <Switch
                  checked={scoringConfig.due_date_proximity.enabled}
                  onChange={(e) => updateScoringField('due_date_proximity', {
                    ...scoringConfig.due_date_proximity,
                    enabled: e.currentTarget.checked,
                  })}
                  label="Enable due date proximity scoring"
                  mb="sm"
                  color="cyan"
                  styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' } }}
                />
                {scoringConfig.due_date_proximity.enabled && (
                  <Stack gap="sm" mt="xs">
                    <Text size="xs" style={{ color: '#525560' }}>
                      Defaults: 0.02 per unit (days), max multiplier 1.5
                    </Text>
                    <Group gap="md" wrap="wrap">
                      <NumberInput size="sm" label="Multiplier per unit" value={scoringConfig.due_date_proximity.multiplier_per_unit}
                        onChange={(val) => updateScoringField('due_date_proximity', { ...scoringConfig.due_date_proximity, multiplier_per_unit: Number(val) || 0 })}
                        description="0.01-0.1" step={0.01} min={0} w={190} />
                      <NumberInput size="sm" label="Max multiplier" value={scoringConfig.due_date_proximity.max_multiplier}
                        onChange={(val) => updateScoringField('due_date_proximity', { ...scoringConfig.due_date_proximity, max_multiplier: Number(val) || 1 })}
                        description="1.0-3.0" step={0.1} min={1} w={150} />
                      <Select size="sm" label="Unit" value={scoringConfig.due_date_proximity.unit}
                        onChange={(val) => updateScoringField('due_date_proximity', { ...scoringConfig.due_date_proximity, unit: (val as 'days' | 'weeks') || 'days' })}
                        data={[{ value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' }]} w={120} />
                    </Group>
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Penalty Weight Inversion */}
              <Box>
                <Text className="micro-meta" mb="xs">PENALTY_WEIGHTING</Text>
                <Text size="xs" style={{ color: '#525560' }} mb="sm">
                  Choose which components use inverted weights for penalties.
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {Object.entries(scoringConfig.penalty_invert_weights).map(([key, value]) => (
                    <Switch
                      key={key}
                      checked={value}
                      onChange={(e) => updateScoringField('penalty_invert_weights', {
                        ...scoringConfig.penalty_invert_weights,
                        [key]: e.currentTarget.checked,
                      })}
                      label={`Invert ${key.replace(/_/g, ' ')} weight`}
                      color="cyan"
                      styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' } }}
                    />
                  ))}
                </div>
              </Box>

              <Divider />

              {/* Habit Streak Bonus */}
              <Box>
                <Text className="micro-meta" mb="xs">HABIT_STREAK_BONUS</Text>
                <Switch
                  checked={scoringConfig.habit_streak_bonus.enabled}
                  onChange={(e) => updateScoringField('habit_streak_bonus', {
                    ...scoringConfig.habit_streak_bonus,
                    enabled: e.currentTarget.checked,
                  })}
                  label="Enable habit streak bonuses"
                  mb="sm"
                  color="cyan"
                  styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' } }}
                />
                {scoringConfig.habit_streak_bonus.enabled && (
                  <Stack gap="sm" mt="xs">
                    <Text size="xs" style={{ color: '#525560' }}>
                      Defaults: 1.2/streak day, max 25 bonus
                    </Text>
                    <Group gap="md" wrap="wrap">
                      <NumberInput size="sm" label="Bonus per streak day" value={scoringConfig.habit_streak_bonus.bonus_per_streak_day}
                        onChange={(val) => updateScoringField('habit_streak_bonus', { ...scoringConfig.habit_streak_bonus, bonus_per_streak_day: Number(val) || 0 })}
                        description="0.5-5.0" step={0.1} min={0} w={150} />
                      <NumberInput size="sm" label="Max bonus" value={scoringConfig.habit_streak_bonus.max_bonus}
                        onChange={(val) => updateScoringField('habit_streak_bonus', { ...scoringConfig.habit_streak_bonus, max_bonus: Number(val) || 0 })}
                        description="10-100" step={1} min={0} w={120} />
                    </Group>
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Action Buttons */}
              <Group gap="md" mt="md">
                <ArcadeButton
                  onClick={handleSaveScoringConfig}
                  disabled={savingScoringConfig || resettingScoringConfig}
                  loading={savingScoringConfig}
                  variant="primary"
                  style={{ minHeight: 44 }}
                >
                  {savingScoringConfig ? 'SAVING...' : 'SAVE CONFIG'}
                </ArcadeButton>
                <ArcadeButton
                  variant="ghost"
                  onClick={handleResetScoringConfig}
                  disabled={savingScoringConfig || resettingScoringConfig}
                  loading={resettingScoringConfig}
                  leftSection={<IconRefresh size={16} />}
                  style={{ minHeight: 44, color: '#FFC775', borderColor: 'rgba(255, 199, 117, 0.3)' }}
                >
                  {resettingScoringConfig ? 'RESETTING...' : 'RECALCULATE'}
                </ArcadeButton>
              </Group>
            </Stack>
          ) : null}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          6.3a — Tags CRUD Management
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="cyan" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }} data-testid="tags-section">
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('tags')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('tags')}
        >
          {expandedSections.tags ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconTag size={14} style={{ color: '#81ecff' }} />
          TAG_DEFINITIONS
        </div>

        <Collapse in={expandedSections.tags}>
          <Group justify="space-between" mb="md">
            <Text className="font-data" size="xs" style={{ color: '#525560' }}>
              Manage tags and set XP multipliers. Multiplier {'>'} 1.0 = bonus XP.
            </Text>
            <ArcadeButton
              variant="ghost"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setShowAddTag(true);
                setEditingTagId(null);
                setTagForm({ name: '', color: '#808080', multiplier: 1.0 });
              }}
              disabled={loading || showAddTag}
              style={{ minHeight: 44 }}
            >
              ADD TAG
            </ArcadeButton>
          </Group>

          {loadingTags ? (
            <Group justify="center" py="md"><Loader size="sm" /></Group>
          ) : (
            <Stack gap="xs">
              {/* Add tag form */}
              {showAddTag && (
                <Box
                  style={{
                    backgroundColor: '#0B0E17',
                    border: '1px dashed rgba(129, 236, 255, 0.3)',
                    padding: '0.75rem',
                  }}
                >
                  <Group gap="sm" wrap="wrap" align="flex-end">
                    <TextInput
                      size="sm"
                      label="Name"
                      placeholder="Tag name"
                      value={tagForm.name}
                      onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                      autoFocus
                      style={{ flex: 1, minWidth: 120 }}
                    />
                    <ColorInput
                      size="sm"
                      label="Color"
                      value={tagForm.color}
                      onChange={(color) => setTagForm({ ...tagForm, color })}
                      w={100}
                    />
                    <NumberInput
                      size="sm"
                      label="Multiplier"
                      value={tagForm.multiplier}
                      onChange={(val) => setTagForm({ ...tagForm, multiplier: Number(val) || 1.0 })}
                      min={0.1} max={10} step={0.1} w={90} suffix="x"
                    />
                    <Group gap={4}>
                      <ArcadeButton size="xs" variant="primary" onClick={handleSaveTag} style={{ minHeight: 44 }}>
                        <IconCheck size={16} />
                      </ArcadeButton>
                      <ArcadeButton size="xs" variant="ghost" onClick={handleCancelEditTag} style={{ minHeight: 44 }}>
                        <IconX size={16} />
                      </ArcadeButton>
                    </Group>
                  </Group>
                  <Group gap={4} mt="xs">
                    {[0.5, 1.0, 1.5, 2.0].map((m) => (
                      <ArcadeButton key={m} size="xs" variant="ghost" onClick={() => handleSetTagMultiplier(m)}
                        style={{ minHeight: 36, fontSize: '0.7rem' }}>
                        {m}x
                      </ArcadeButton>
                    ))}
                  </Group>
                </Box>
              )}

              {/* Tag items */}
              {tags.map((tag) => (
                <Box
                  key={tag.id}
                  className="ghost-border"
                  style={{
                    backgroundColor: '#10131C',
                    padding: '0.75rem',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {editingTagId === tag.id ? (
                    /* Edit mode */
                    <>
                      <Group gap="sm" wrap="wrap" align="flex-end">
                        <TextInput size="sm" label="Name" value={tagForm.name}
                          onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                          style={{ flex: 1, minWidth: 120 }} />
                        <ColorInput size="sm" label="Color" value={tagForm.color}
                          onChange={(color) => setTagForm({ ...tagForm, color })} w={100} />
                        <NumberInput size="sm" label="Multiplier" value={tagForm.multiplier}
                          onChange={(val) => setTagForm({ ...tagForm, multiplier: Number(val) || 1.0 })}
                          min={0.1} max={10} step={0.1} w={90} suffix="x" />
                        <Group gap={4}>
                          <ArcadeButton size="xs" variant="primary" onClick={handleSaveTag} style={{ minHeight: 44 }}>
                            <IconCheck size={16} />
                          </ArcadeButton>
                          <ArcadeButton size="xs" variant="ghost" onClick={handleCancelEditTag} style={{ minHeight: 44 }}>
                            <IconX size={16} />
                          </ArcadeButton>
                        </Group>
                      </Group>
                      <Group gap={4} mt="xs">
                        {[0.5, 1.0, 1.5, 2.0].map((m) => (
                          <ArcadeButton key={m} size="xs" variant="ghost" onClick={() => handleSetTagMultiplier(m)}
                            style={{ minHeight: 36, fontSize: '0.7rem' }}>
                            {m}x
                          </ArcadeButton>
                        ))}
                      </Group>
                    </>
                  ) : (
                    /* Display mode */
                    <Group justify="space-between" wrap="wrap">
                      <Group gap="sm">
                        <Box style={{ width: 16, height: 16, backgroundColor: tag.color, border: '1px solid rgba(59,73,76,0.3)' }} />
                        <Text className="font-data" size="sm" style={{ color: '#e6e7f5' }}>{tag.name}</Text>
                        <DataBadge
                          value={`${tag.multiplier}x`}
                          color={tag.multiplier > 1 ? 'cyan' : tag.multiplier < 1 ? 'amber' : 'muted'}
                          size="sm"
                        />
                      </Group>
                      <Group gap={4}>
                        <ActionIcon size="md" variant="subtle" onClick={() => handleStartEditTag(tag)} style={{ minWidth: 44, minHeight: 44 }}>
                          <IconPencil size={16} style={{ color: '#a8aab7' }} />
                        </ActionIcon>
                        <ActionIcon size="md" variant="subtle" onClick={() => handleDeleteTag(tag.id)} style={{ minWidth: 44, minHeight: 44 }}>
                          <IconTrash size={16} style={{ color: '#ff6b9b' }} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  )}
                </Box>
              ))}

              {tags.length === 0 && !showAddTag && (
                <Box style={{ backgroundColor: '#0B0E17', border: '1px dashed rgba(59,73,76,0.15)', padding: '1.5rem', textAlign: 'center' }}>
                  <Text className="font-data" size="sm" style={{ color: '#525560' }}>
                    NO TAGS DEFINED — CLICK &quot;ADD TAG&quot; TO CREATE ONE
                  </Text>
                </Box>
              )}
            </Stack>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          6.3b — Projects CRUD Management
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="magenta" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }} data-testid="projects-section">
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('projects')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('projects')}
        >
          {expandedSections.projects ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconFolder size={14} style={{ color: '#ff6b9b' }} />
          PROJECT_DEFINITIONS
        </div>

        <Collapse in={expandedSections.projects}>
          <Group justify="space-between" mb="md">
            <Text className="font-data" size="xs" style={{ color: '#525560' }}>
              Manage projects and XP multipliers.
            </Text>
            <ArcadeButton
              variant="ghost"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setShowAddProject(true);
                setEditingProjectId(null);
                setProjectForm({ name: '', color: '#4A90D9', multiplier: 1.0 });
              }}
              disabled={loading || showAddProject}
              style={{ minHeight: 44 }}
            >
              ADD PROJECT
            </ArcadeButton>
          </Group>

          {loadingProjects ? (
            <Group justify="center" py="md"><Loader size="sm" /></Group>
          ) : (
            <Stack gap="xs">
              {/* Add project form */}
              {showAddProject && (
                <Box
                  style={{
                    backgroundColor: '#0B0E17',
                    border: '1px dashed rgba(255, 107, 155, 0.3)',
                    padding: '0.75rem',
                  }}
                >
                  <Group gap="sm" wrap="wrap" align="flex-end">
                    <TextInput size="sm" label="Name" placeholder="Project name" value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      autoFocus style={{ flex: 1, minWidth: 120 }} />
                    <ColorInput size="sm" label="Color" value={projectForm.color}
                      onChange={(color) => setProjectForm({ ...projectForm, color })} w={100} />
                    <NumberInput size="sm" label="Multiplier" value={projectForm.multiplier}
                      onChange={(val) => setProjectForm({ ...projectForm, multiplier: Number(val) || 1.0 })}
                      min={0.1} max={10} step={0.1} w={90} suffix="x" />
                    <Group gap={4}>
                      <ArcadeButton size="xs" variant="primary" onClick={handleSaveProject} style={{ minHeight: 44 }}>
                        <IconCheck size={16} />
                      </ArcadeButton>
                      <ArcadeButton size="xs" variant="ghost" onClick={handleCancelEditProject} style={{ minHeight: 44 }}>
                        <IconX size={16} />
                      </ArcadeButton>
                    </Group>
                  </Group>
                  <Group gap={4} mt="xs">
                    {[0.5, 1.0, 1.5, 2.0].map((m) => (
                      <ArcadeButton key={m} size="xs" variant="ghost" onClick={() => handleSetProjectMultiplier(m)}
                        style={{ minHeight: 36, fontSize: '0.7rem' }}>
                        {m}x
                      </ArcadeButton>
                    ))}
                  </Group>
                </Box>
              )}

              {/* Project items */}
              {projects.map((project) => (
                <Box
                  key={project.id}
                  className="ghost-border"
                  style={{
                    backgroundColor: '#10131C',
                    padding: '0.75rem',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {editingProjectId === project.id ? (
                    <>
                      <Group gap="sm" wrap="wrap" align="flex-end">
                        <TextInput size="sm" label="Name" value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          style={{ flex: 1, minWidth: 120 }} />
                        <ColorInput size="sm" label="Color" value={projectForm.color}
                          onChange={(color) => setProjectForm({ ...projectForm, color })} w={100} />
                        <NumberInput size="sm" label="Multiplier" value={projectForm.multiplier}
                          onChange={(val) => setProjectForm({ ...projectForm, multiplier: Number(val) || 1.0 })}
                          min={0.1} max={10} step={0.1} w={90} suffix="x" />
                        <Group gap={4}>
                          <ArcadeButton size="xs" variant="primary" onClick={handleSaveProject} style={{ minHeight: 44 }}>
                            <IconCheck size={16} />
                          </ArcadeButton>
                          <ArcadeButton size="xs" variant="ghost" onClick={handleCancelEditProject} style={{ minHeight: 44 }}>
                            <IconX size={16} />
                          </ArcadeButton>
                        </Group>
                      </Group>
                      <Group gap={4} mt="xs">
                        {[0.5, 1.0, 1.5, 2.0].map((m) => (
                          <ArcadeButton key={m} size="xs" variant="ghost" onClick={() => handleSetProjectMultiplier(m)}
                            style={{ minHeight: 36, fontSize: '0.7rem' }}>
                            {m}x
                          </ArcadeButton>
                        ))}
                      </Group>
                    </>
                  ) : (
                    <Group justify="space-between" wrap="wrap">
                      <Group gap="sm">
                        <Box style={{ width: 16, height: 16, backgroundColor: project.color, border: '1px solid rgba(59,73,76,0.3)' }} />
                        <Text className="font-data" size="sm" style={{ color: '#e6e7f5' }}>{project.name}</Text>
                        <DataBadge
                          value={`${project.multiplier}x`}
                          color={project.multiplier > 1 ? 'cyan' : project.multiplier < 1 ? 'amber' : 'muted'}
                          size="sm"
                        />
                      </Group>
                      <Group gap={4}>
                        <ActionIcon size="md" variant="subtle" onClick={() => handleStartEditProject(project)} style={{ minWidth: 44, minHeight: 44 }}>
                          <IconPencil size={16} style={{ color: '#a8aab7' }} />
                        </ActionIcon>
                        <ActionIcon size="md" variant="subtle" onClick={() => handleDeleteProject(project.id)} style={{ minWidth: 44, minHeight: 44 }}>
                          <IconTrash size={16} style={{ color: '#ff6b9b' }} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  )}
                </Box>
              ))}

              {projects.length === 0 && !showAddProject && (
                <Box style={{ backgroundColor: '#0B0E17', border: '1px dashed rgba(59,73,76,0.15)', padding: '1.5rem', textAlign: 'center' }}>
                  <Text className="font-data" size="sm" style={{ color: '#525560' }}>
                    NO PROJECTS DEFINED — CLICK &quot;ADD PROJECT&quot; TO CREATE ONE
                  </Text>
                </Box>
              )}
            </Stack>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Date Processing
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="amber" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('dateProcessing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('dateProcessing')}
        >
          {expandedSections.dateProcessing ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconCalendar size={14} style={{ color: '#FFC775' }} />
          DATE_PROCESSING
        </div>

        <Collapse in={expandedSections.dateProcessing}>
          <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '1rem' }}>
            Process pending days to apply overdue penalties and generate recurring tasks.
          </Text>

          <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(69, 71, 82, 0.15)', padding: '0.75rem', marginBottom: '1rem' }}>
            <Stack gap={6}>
              <Group gap="xs">
                <Text className="font-data" size="xs" style={{ color: '#a8aab7', width: 180 }}>CURRENT_PROCESSING_DATE:</Text>
                <Text className="font-data" size="xs" style={{ color: '#81ecff' }}>
                  {systemStatus?.last_processed_date
                    ? (() => {
                        const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
                        const nextDay = new Date(year, month - 1, day + 1);
                        return nextDay.toLocaleDateString();
                      })()
                    : 'NOT_STARTED'}
                </Text>
              </Group>
              <Group gap="xs">
                <Text className="font-data" size="xs" style={{ color: '#a8aab7', width: 180 }}>REAL_DATE:</Text>
                <Text className="font-data" size="xs" style={{ color: '#e6e7f5' }}>
                  {systemStatus?.current_date
                    ? (() => {
                        const [year, month, day] = systemStatus.current_date.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString();
                      })()
                    : new Date().toLocaleDateString()}
                </Text>
              </Group>
              <Group gap="xs">
                <Text className="font-data" size="xs" style={{ color: '#a8aab7', width: 180 }}>LAST_COMPLETED:</Text>
                <Text className="font-data" size="xs" style={{ color: '#e6e7f5' }}>{systemStatus?.last_processed_date || 'NEVER'}</Text>
              </Group>
              <Group gap="xs">
                <Text className="font-data" size="xs" style={{ color: '#a8aab7', width: 180 }}>DAYS_BEHIND:</Text>
                <DataBadge
                  value={`${systemStatus?.pending_days ?? 0} day${(systemStatus?.pending_days ?? 0) !== 1 ? 's' : ''}`}
                  color={systemStatus?.pending_days && systemStatus.pending_days > 0 ? 'magenta' : 'cyan'}
                  size="sm"
                />
              </Group>
            </Stack>
          </Box>

          <Box style={{ marginBottom: '1rem' }}>
            <Select
              label="Timezone"
              description="Dates and processing use this timezone"
              placeholder="Select timezone"
              data={TIMEZONE_OPTIONS}
              value={systemStatus?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
              onChange={async (value) => {
                if (!value) return;
                setSavingTimezone(true);
                try {
                  await updateTimezone(value);
                  await fetchSystemStatus();
                  setMessage({ type: 'success', text: `Timezone updated to ${value}` });
                } catch {
                  setMessage({ type: 'error', text: 'Failed to update timezone' });
                } finally {
                  setSavingTimezone(false);
                }
              }}
              searchable
              limit={50}
              disabled={savingTimezone}
              size="sm"
              styles={{
                label: { color: '#8A8F98', fontSize: '0.75rem', fontFamily: 'var(--font-data)' },
                description: { color: '#5A5E66', fontSize: '0.7rem' },
              }}
            />
          </Box>

          {systemStatus?.pending_days && systemStatus.pending_days > 0 ? (
            <Group gap="md" wrap="wrap">
              <ArcadeButton
                variant="primary"
                onClick={() => handleAdvanceDate(1)}
                disabled={advancingDate || loading}
                loading={advancingDate}
                leftSection={<IconCalendar size={16} />}
                style={{ minHeight: 44 }}
              >
                PROCESS{' '}
                {systemStatus?.last_processed_date
                  ? (() => {
                      const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
                      const nextDay = new Date(year, month - 1, day + 1);
                      return nextDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    })()
                  : 'NEXT DAY'}
              </ArcadeButton>
              {systemStatus.pending_days > 1 && (
                <ArcadeButton
                  variant="ghost"
                  onClick={() => handleAdvanceDate()}
                  disabled={advancingDate || loading}
                  loading={advancingDate}
                  leftSection={<IconCalendar size={16} />}
                  style={{ minHeight: 44 }}
                >
                  PROCESS ALL {systemStatus.pending_days} DAYS
                </ArcadeButton>
              )}
            </Group>
          ) : (
            <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(129, 236, 255, 0.2)', padding: '0.75rem' }}>
              <Text className="font-data" size="xs" style={{ color: '#81ecff' }}>
                ✓ ALL CAUGHT UP — NO PENDING DAYS
              </Text>
            </Box>
          )}

          {systemStatus && systemStatus.pending_days > 0 && (
            <Box mt="md" style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 199, 117, 0.3)', padding: '0.75rem' }}>
              <Text className="font-data" size="xs" style={{ color: '#FFC775' }}>
                ⚠ PROCESSING WILL APPLY PENALTIES FOR INCOMPLETE OVERDUE TASKS
              </Text>
            </Box>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          XP Withdrawal / Spend
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="magenta" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('xpWithdraw')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('xpWithdraw')}
        >
          {expandedSections.xpWithdraw ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconTrophy size={14} style={{ color: '#ff6b9b' }} />
          XP_WITHDRAWAL
        </div>

        <Collapse in={expandedSections.xpWithdraw}>
          <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '0.75rem' }}>
            Spend earned XP on rewards. Current balance:{' '}
            <DataBadge value={`${stats?.total_xp ?? 0} XP`} color="cyan" size="sm" />
          </Text>

          <Group gap="md" wrap="wrap" align="flex-end">
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
            <ArcadeButton
              variant="secondary"
              onClick={handleWithdrawXP}
              disabled={withdrawing || loading || !withdrawAmount}
              loading={withdrawing}
              leftSection={<IconTrophy size={16} />}
              style={{ minHeight: 44 }}
            >
              WITHDRAW
            </ArcadeButton>
          </Group>

          <Text className="font-data" size="xs" style={{ color: '#525560', marginTop: '0.5rem' }}>
            You can go into XP debt if you withdraw more than your current balance.
          </Text>
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Layout
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="cyan" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('layout')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('layout')}
        >
          {expandedSections.layout ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconListDetails size={14} style={{ color: '#81ecff' }} />
          LAYOUT
        </div>

        <Collapse in={expandedSections.layout}>
          <Stack gap="md">
            <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '0.25rem' }}>
              Desktop-only layout preferences are saved locally in this browser.
            </Text>

            <Switch
              checked={desktopNavCollapsed}
              onChange={(e) => setDesktopNavCollapsed(e.currentTarget.checked)}
              label={desktopNavCollapsed ? 'COMPACT DESKTOP NAVIGATION ENABLED' : 'ENABLE COMPACT DESKTOP NAVIGATION'}
              aria-label="Compact Desktop Navigation"
              color="cyan"
              styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', letterSpacing: '0.05em' } }}
            />

            <Switch
              checked={tasksViewUseFullWidth}
              onChange={(e) => setTasksViewUseFullWidth(e.currentTarget.checked)}
              label={tasksViewUseFullWidth ? 'TASKS PAGE USES FULL WIDTH' : 'EXPAND TASKS PAGE TO FULL WIDTH'}
              aria-label="Use Full Width For Tasks Page"
              color="cyan"
              styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', letterSpacing: '0.05em' } }}
            />

            <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(129, 236, 255, 0.2)', padding: '0.75rem' }}>
              <Text className="font-data" size="xs" style={{ color: '#81ecff' }}>
                ✓ Collapse the left navigation to an icon rail, or let the desktop tasks page use more horizontal space.
              </Text>
            </Box>
          </Stack>
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Notifications
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="amber" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('notifications')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('notifications')}
        >
          {expandedSections.notifications ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconBell size={14} style={{ color: '#FFC775' }} />
          NOTIFICATIONS
        </div>

        <Collapse in={expandedSections.notifications}>
          <Text className="font-data" size="xs" style={{ color: '#5A5E66', marginBottom: '0.75rem' }}>
            Get a daily browser notification reminding you to complete your check-in.
          </Text>

          {!isNotificationSupported() ? (
            <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 199, 117, 0.3)', padding: '0.75rem' }}>
              <Text className="font-data" size="xs" style={{ color: '#FFC775' }}>
                ⚠ Your browser does not support notifications.
              </Text>
            </Box>
          ) : (
            <Stack gap="md">
              {notificationPermission === 'denied' && (
                <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 0, 127, 0.3)', padding: '0.75rem' }}>
                  <Text className="font-data" size="xs" style={{ color: '#FF007F' }}>
                    ⚠ Notification permission was denied. Please enable it in your browser settings.
                  </Text>
                </Box>
              )}

              <Switch
                checked={notificationsEnabled}
                onChange={async (e) => {
                  const enabled = e.currentTarget.checked;
                  if (enabled && notificationPermission !== 'granted') {
                    const result = await requestNotificationPermission();
                    setNotificationPermission(result);
                    if (result !== 'granted') {
                      return;
                    }
                  }
                  setNotificationEnabled(enabled);
                  setNotificationsEnabled(enabled);
                  if (enabled) {
                    startNotificationScheduler();
                  } else {
                    stopNotificationScheduler();
                  }
                }}
                label={notificationsEnabled ? 'DAILY REMINDER ACTIVE' : 'ENABLE DAILY REMINDER'}
                aria-label="Daily Notification Reminder"
                color="yellow"
                styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', letterSpacing: '0.05em' } }}
              />

              {notificationsEnabled && (
                <Group gap="sm" align="flex-end">
                  <TextInput
                    label="Reminder Time"
                    type="time"
                    value={notificationTime}
                    onChange={(e) => {
                      const time = e.target.value;
                      setNotifTime(time);
                      setNotificationTime(time);
                      // Restart scheduler with new time
                      startNotificationScheduler();
                    }}
                    styles={{
                      label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.05em', color: '#B0B3B8' },
                      input: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem' },
                    }}
                    style={{ maxWidth: '140px' }}
                  />
                  <Text className="font-data" size="xs" style={{ color: '#5A5E66', paddingBottom: '0.5rem' }}>
                    (local time)
                  </Text>
                </Group>
              )}

              {notificationsEnabled && (
                <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 199, 117, 0.2)', padding: '0.75rem' }}>
                  <Text className="font-data" size="xs" style={{ color: '#FFC775' }}>
                    ✓ You&apos;ll get a daily notification at <time aria-label={`Scheduled time: ${notificationTime}`}>{notificationTime}</time> with your task summary.
                  </Text>
                </Box>
              )}
            </Stack>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Vacation Mode
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="cyan" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('vacation')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('vacation')}
        >
          {expandedSections.vacation ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconBeach size={14} style={{ color: '#81ecff' }} />
          VACATION_MODE
        </div>

        <Collapse in={expandedSections.vacation}>
          <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '0.75rem' }}>
            Pause streak penalties and due date enforcement while away.
          </Text>

          <Switch
            checked={systemStatus?.vacation_mode ?? false}
            onChange={(e) => handleVacationToggle(e.currentTarget.checked)}
            disabled={loading}
            label={systemStatus?.vacation_mode ? 'VACATION MODE ACTIVE' : 'ENABLE VACATION MODE'}
            aria-label="Vacation Mode"
            color="cyan"
            styles={{ label: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', letterSpacing: '0.05em' } }}
          />

          {systemStatus?.vacation_mode && (
            <Box mt="md" style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(129, 236, 255, 0.2)', padding: '0.75rem' }}>
              <Text className="font-data" size="xs" style={{ color: '#81ecff' }}>
                ✓ VACATION MODE ACTIVE — NO PENALTIES APPLIED
              </Text>
            </Box>
          )}
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Data Backup & Restore
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="amber" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('backup')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('backup')}
        >
          {expandedSections.backup ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconDownload size={14} style={{ color: '#FFC775' }} />
          DATA_BACKUP_RESTORE
        </div>

        <Collapse in={expandedSections.backup}>
          <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '1rem' }}>
            Export data as JSON backup or restore from a previous backup.
          </Text>

          <Group gap="md" wrap="wrap">
            <ArcadeButton
              variant="primary"
              leftSection={loading ? <Loader size={16} color="white" /> : <IconDownload size={16} />}
              onClick={handleExport}
              disabled={loading}
              style={{ minHeight: 44 }}
            >
              EXPORT DATA
            </ArcadeButton>

            <Box>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <ArcadeButton
                variant="ghost"
                leftSection={<IconUpload size={16} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{ minHeight: 44 }}
              >
                IMPORT DATA
              </ArcadeButton>
            </Box>
          </Group>

          <Box mt="md" style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 199, 117, 0.3)', padding: '0.75rem' }}>
            <Text className="font-data" size="xs" style={{ color: '#FFC775' }}>
              ⚠ IMPORTING DATA WILL REPLACE ALL CURRENT DATA. EXPORT FIRST.
            </Text>
          </Box>
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Security
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="magenta" accentPosition="left" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('security')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('security')}
        >
          {expandedSections.security ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconLock size={14} style={{ color: '#ff6b9b' }} />
          SECURITY_CONFIG
        </div>

        <Collapse in={expandedSections.security}>
          <Text className="font-data" size="xs" style={{ color: '#525560', marginBottom: '0.75rem' }}>
            Manage account security settings.
          </Text>

          <ArcadeButton
            variant="ghost"
            leftSection={<IconLock size={16} />}
            onClick={() => setChangePasswordOpen(true)}
            style={{ minHeight: 44 }}
          >
            CHANGE PASSWORD
          </ArcadeButton>
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          About / System Info
          ═══════════════════════════════════════════════ */}
      <GlowCard accentColor="none" className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <div
          style={sectionHeaderStyle}
          onClick={() => toggleSection('about')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleSection('about')}
        >
          {expandedSections.about ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          <IconInfoCircle size={14} style={{ color: '#a8aab7' }} />
          SYSTEM_INFO
        </div>

        <Collapse in={expandedSections.about}>
          <Box style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(69, 71, 82, 0.15)', overflow: 'hidden' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.8125rem',
              }}
            >
              <tbody>
                {[
                  { key: 'FRONTEND_VERSION', val: __APP_VERSION__ },
                  { key: 'BACKEND_VERSION', val: backendVersion ?? 'Loading...' },
                  { key: 'BUILD_DATE', val: new Date(__BUILD_TIMESTAMP__).toLocaleString() },
                  { key: 'ENVIRONMENT', val: import.meta.env.MODE, badge: true },
                  { key: 'API_URL', val: import.meta.env.VITE_API_URL || window.location.origin },
                ].map((row) => (
                  <tr key={row.key} style={{ borderBottom: '1px solid rgba(69, 71, 82, 0.15)' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#a8aab7', whiteSpace: 'nowrap', width: 200, backgroundColor: '#181B25', letterSpacing: '0.1em', fontSize: '0.6875rem' }}>
                      {row.key}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#e6e7f5' }}>
                      {row.badge ? (
                        <DataBadge
                          value={row.val}
                          color={row.val === 'production' ? 'cyan' : 'amber'}
                          size="sm"
                        />
                      ) : (
                        row.val
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Collapse>
      </GlowCard>

      {/* ═══════════════════════════════════════════════
          Import Confirmation Modal — Glassmorphism
          ═══════════════════════════════════════════════ */}
      <Modal
        opened={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title={
          <Text className="font-data" style={{ color: '#ff6b9b', letterSpacing: '0.1em', fontSize: '0.8125rem' }}>
            CONFIRM_DATA_IMPORT
          </Text>
        }
        styles={{
          content: {
            backgroundColor: 'rgba(16, 19, 28, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 107, 155, 0.3)',
          },
          header: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Text className="font-data" size="sm" mb="md" style={{ color: '#e6e7f5' }}>
          Replace all data from <strong style={{ color: '#FFC775' }}>{selectedFile?.name}</strong>?
        </Text>
        <Box mb="lg" style={{ backgroundColor: '#0B0E17', border: '1px solid rgba(255, 107, 155, 0.3)', padding: '0.75rem' }}>
          <Text className="font-data" size="xs" style={{ color: '#ff6b9b' }}>
            ⚠ THIS WILL REPLACE ALL DATA. THIS ACTION CANNOT BE UNDONE.
          </Text>
        </Box>
        <Group justify="flex-end" gap="sm">
          <ArcadeButton variant="ghost" onClick={() => setImportDialogOpen(false)} style={{ minHeight: 44 }}>
            CANCEL
          </ArcadeButton>
          <ArcadeButton variant="secondary" onClick={handleImportConfirm} style={{ minHeight: 44 }}>
            IMPORT & REPLACE
          </ArcadeButton>
        </Group>
      </Modal>

      {/* ═══════════════════════════════════════════════
          Change Password Modal — Glassmorphism
          ═══════════════════════════════════════════════ */}
      <Modal
        opened={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        title={
          <Text className="font-data" style={{ color: '#81ecff', letterSpacing: '0.1em', fontSize: '0.8125rem' }}>
            CHANGE_PASSWORD
          </Text>
        }
        styles={{
          content: {
            backgroundColor: 'rgba(16, 19, 28, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(129, 236, 255, 0.3)',
          },
          header: {
            backgroundColor: 'transparent',
          },
        }}
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
          <Group justify="flex-end" mt="md" gap="sm">
            <ArcadeButton variant="ghost" onClick={() => setChangePasswordOpen(false)} style={{ minHeight: 44 }}>
              CANCEL
            </ArcadeButton>
            <ArcadeButton
              variant="primary"
              onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              loading={loading}
              style={{ minHeight: 44 }}
            >
              CHANGE PASSWORD
            </ArcadeButton>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
/* v8 ignore stop */
