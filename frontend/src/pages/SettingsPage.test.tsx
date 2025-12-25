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

    it('should close password change dialog when cancel is clicked', async () => {
      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Alert Message', () => {
    it('should close alert when close button is clicked', async () => {
      vi.mocked(dataApi.exportData).mockRejectedValue(new Error('Export failed'));

      render(<SettingsPage />);

      // Trigger an error to show alert
      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);

      // Wait for error message
      expect(await screen.findByText(/failed to export data/i)).toBeInTheDocument();

      // Close the alert
      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/failed to export data/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Import Confirmation Dialog', () => {
    it('should close import dialog when cancel is clicked', async () => {
      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(await screen.findByText(/confirm data import/i)).toBeInTheDocument();

      // Cancel the import
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/confirm data import/i)).not.toBeInTheDocument();
      });
    });

    it('should import data and reload page after confirmation', async () => {
      const mockImportResult = {
        summary: {
          tasks_count: 5,
          xp_transactions_count: 10,
        },
      };
      vi.mocked(dataApi.importData).mockResolvedValue(mockImportResult);

      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(await screen.findByText(/confirm data import/i)).toBeInTheDocument();

      // Confirm the import
      const importButton = screen.getByRole('button', { name: /import and replace/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(dataApi.importData).toHaveBeenCalledWith(file);
      });

      expect(await screen.findByText(/data imported successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/imported 5 tasks, 10 xp transactions/i)).toBeInTheDocument();

      // Wait for reload to be called
      await waitFor(
        () => {
          expect(window.location.reload).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('should show error message when import fails', async () => {
      const errorMessage = 'Invalid file format';
      vi.mocked(dataApi.importData).mockRejectedValue({
        response: { data: { detail: errorMessage } },
      });

      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await screen.findByText(/confirm data import/i);

      // Confirm the import
      const importButton = screen.getByRole('button', { name: /import and replace/i });
      fireEvent.click(importButton);

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });

    it('should show generic error message when import fails without detail', async () => {
      vi.mocked(dataApi.importData).mockRejectedValue(new Error('Unknown error'));

      render(<SettingsPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await screen.findByText(/confirm data import/i);

      // Confirm the import
      const importButton = screen.getByRole('button', { name: /import and replace/i });
      fireEvent.click(importButton);

      expect(await screen.findByText(/failed to import data. please check the file format/i)).toBeInTheDocument();
    });
  });

  describe('Password Change', () => {
    it('should show error when passwords do not match', async () => {
      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'different123' } });

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      const submitButton = buttons.find((btn) => btn.closest('[role="dialog"]') !== null);

      if (submitButton) {
        fireEvent.click(submitButton);
      }

      expect(await screen.findByText(/new passwords do not match/i)).toBeInTheDocument();
    });

    it('should show error when password is too short', async () => {
      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'short' } });

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      const submitButton = buttons.find((btn) => btn.closest('[role="dialog"]') !== null);

      if (submitButton) {
        fireEvent.click(submitButton);
      }

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should successfully change password', async () => {
      const { authApi } = await import('../services/api');
      vi.mocked(authApi.changePassword).mockResolvedValue(undefined);

      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newpass123' } });

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      const submitButton = buttons.find((btn) => btn.closest('[role="dialog"]') !== null);

      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(authApi.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
      });

      expect(await screen.findByText(/password changed successfully/i)).toBeInTheDocument();

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
      });
    });

    it('should show error when password change fails with detail', async () => {
      const { authApi } = await import('../services/api');
      const errorMessage = 'Current password is incorrect';
      vi.mocked(authApi.changePassword).mockRejectedValue({
        response: { data: { detail: errorMessage } },
      });

      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'wrongpass' } });
      fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newpass123' } });

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      const submitButton = buttons.find((btn) => btn.closest('[role="dialog"]') !== null);

      if (submitButton) {
        fireEvent.click(submitButton);
      }

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });

    it('should show generic error when password change fails without detail', async () => {
      const { authApi } = await import('../services/api');
      vi.mocked(authApi.changePassword).mockRejectedValue(new Error('Unknown error'));

      render(<SettingsPage />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(changePasswordButton);

      await screen.findByLabelText(/current password/i);

      fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newpass123' } });

      const buttons = screen.getAllByRole('button', { name: /change password/i });
      const submitButton = buttons.find((btn) => btn.closest('[role="dialog"]') !== null);

      if (submitButton) {
        fireEvent.click(submitButton);
      }

      expect(await screen.findByText(/failed to change password/i)).toBeInTheDocument();
    });
  });
});
