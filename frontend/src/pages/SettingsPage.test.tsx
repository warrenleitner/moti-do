/**
 * Tests for SettingsPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../test/utils';
import SettingsPage from './SettingsPage';
import { dataApi } from '../services/api';

// Mock the APIs
vi.mock('../services/api', () => ({
  dataApi: {
    exportData: vi.fn(),
    importData: vi.fn(),
  },
  authApi: {
    changePassword: vi.fn(),
  },
}));

// Mock window.location.reload
const originalLocation = window.location;
delete (window as { location?: Location }).location;
window.location = { ...originalLocation, reload: vi.fn() };

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render settings page with all sections', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Data Backup & Restore')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    });

    it('should render warning message about import', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/importing data will replace ALL your current data/i)).toBeInTheDocument();
    });
  });

  describe('Export Data', () => {
    it('should call export API when export button is clicked', async () => {
      const mockBlob = new Blob(['{"test": "data"}'], { type: 'application/json' });
      vi.mocked(dataApi.exportData).mockResolvedValue(mockBlob);

      render(<SettingsPage />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(dataApi.exportData).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText(/data exported successfully/i)).toBeInTheDocument();
    });

    it('should show error message when export fails', async () => {
      vi.mocked(dataApi.exportData).mockRejectedValue(new Error('Export failed'));

      render(<SettingsPage />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);

      expect(await screen.findByText(/failed to export data/i)).toBeInTheDocument();
    });
  });

  describe('Import Data', () => {
    it('should show file input element', () => {
      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.json');
    });

    it('should reject non-JSON files', async () => {
      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(await screen.findByText(/please select a JSON file/i)).toBeInTheDocument();
    });

    it('should show confirmation dialog for valid JSON file', async () => {
      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(await screen.findByText(/confirm data import/i)).toBeInTheDocument();
      expect(screen.getByText(/backup.json/)).toBeInTheDocument();
    });
  });

  describe('Change Password', () => {
    it('should show change password dialog when button is clicked', async () => {
      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      expect(await screen.findByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('should have password change submit button disabled when fields are empty', async () => {
      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      // Find the submit button in the dialog (not the one that opens it)
      const submitButton = buttons.find(
        (btn) => btn.closest('[role="dialog"]') !== null
      );

      expect(submitButton).toBeDisabled();
    });
  });
});
