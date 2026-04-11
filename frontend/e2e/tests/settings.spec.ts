/**
 * Settings Page E2E tests for Moti-Do.
 * Tests data export/import, vacation mode, password change, and XP history.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect, type Page } from '@playwright/test';

async function ensureSectionExpanded(
  page: Page,
  sectionName: string
): Promise<void> {
  const sectionToggle = page.getByRole('button', { name: sectionName, exact: true });
  await expect(sectionToggle).toBeVisible();

  const isCollapsed = (await sectionToggle.locator('svg.tabler-icon-chevron-right').count()) > 0;
  if (isCollapsed) {
    await sectionToggle.click();
  }

  await expect(sectionToggle.locator('svg.tabler-icon-chevron-down')).toBeVisible();
}

test.describe('Settings Page', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Settings Display', () => {
    test('should display settings page correctly', async ({ page }) => {
      await page.goto('/settings');

      // Verify page loads with Data Backup section visible
      // Section headers are now uppercase with underscores, rendered as role="button" (not heading)
      await expect(page.getByText('DATA_BACKUP_RESTORE')).toBeVisible();
    });

    test('should show all settings sections', async ({ page }) => {
      await page.goto('/settings');

      // Section headers use Kinetic Console style: uppercase with underscores
      await expect(page.getByText('DATA_BACKUP_RESTORE')).toBeVisible();
      await expect(page.getByText('VACATION_MODE')).toBeVisible();
      await expect(page.getByText('XP_TRANSACTION_LEDGER')).toBeVisible();
      await expect(page.getByText('SECURITY_CONFIG')).toBeVisible();
    });
  });

  test.describe('Data Export', () => {
    test('should have export data button', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'DATA_BACKUP_RESTORE');
      const exportButton = page.locator('button:has-text("EXPORT DATA")').first();
      await expect(exportButton).toBeVisible();
    });

    test('should trigger download on export', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'DATA_BACKUP_RESTORE');
      const exportButton = page.locator('button:has-text("EXPORT DATA")').first();
      await expect(exportButton).toBeVisible();

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await exportButton.click();

      // Verify download started
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('json');
    });
  });

  test.describe('Data Import', () => {
    test('should have import data option', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'DATA_BACKUP_RESTORE');
      const importButton = page.locator('button:has-text("IMPORT DATA")').first();
      await expect(importButton).toBeVisible();
    });
  });

  test.describe('Vacation Mode', () => {
    test('should toggle vacation mode on', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'VACATION_MODE');

      // Find vacation mode toggle - Mantine Switch component
      // The label is "ENABLE VACATION MODE" or "VACATION MODE ACTIVE"
      const vacationToggle = page.getByLabel('Vacation Mode').first();
      await expect(vacationToggle).toBeVisible();

      // Wait for the switch to be enabled (loading to complete)
      await expect(vacationToggle).toBeEnabled({ timeout: 5000 });

      // Get initial state
      const initialState = await vacationToggle.isChecked();

      // Toggle vacation mode
      await vacationToggle.click();

      // Wait for the switch to be enabled again after API call
      await expect(vacationToggle).toBeEnabled({ timeout: 5000 });

      // Verify state changed
      const newState = await vacationToggle.isChecked();
      expect(newState).not.toBe(initialState);

      // Toggle back to original state
      await vacationToggle.click();
      await expect(vacationToggle).toBeEnabled({ timeout: 5000 });
    });

    test('should show vacation mode status', async ({ page }) => {
      await page.goto('/settings');

      // Check for vacation mode section header (now uppercase with underscores)
      await expect(page.getByText('VACATION_MODE')).toBeVisible();

      await ensureSectionExpanded(page, 'VACATION_MODE');

      // Check for vacation mode switch and label using the form control
      const vacationSwitch = page.getByLabel('Vacation Mode').first();
      await expect(vacationSwitch).toBeVisible();

      // Verify the vacation mode toggle or label is present
      // The label may show "Enable vacation mode" or "Disable vacation mode" depending on state
      const vacationLabel = page.getByText(/vacation mode/i).first();
      await expect(vacationLabel).toBeVisible();
    });
  });

  test.describe('Password Change', () => {
    test('should have password change option', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'SECURITY_CONFIG');
      const changePasswordBtn = page.locator('button:has-text("CHANGE PASSWORD")').first();
      await expect(changePasswordBtn).toBeVisible();
    });

    test('should show password change form', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'SECURITY_CONFIG');

      // Click on change password button if exists
      const changePasswordBtn = page.locator('button:has-text("CHANGE PASSWORD")').first();

      if (await changePasswordBtn.isVisible()) {
        await changePasswordBtn.click();

        // Should show form with current and new password fields
        await expect(page.getByLabel(/current password/i)).toBeVisible();
        await expect(page.getByLabel(/^New Password$/i)).toBeVisible();
      }
    });

    test('should validate password change inputs', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'SECURITY_CONFIG');

      const changePasswordBtn = page.locator('button:has-text("CHANGE PASSWORD")').first();

      if (await changePasswordBtn.isVisible()) {
        await changePasswordBtn.click();

        // Try to submit with short password
        const currentPasswordInput = page.getByLabel(/current password/i);
        const newPasswordInput = page.getByLabel(/^New Password$/i);
        const confirmPasswordInput = page.getByLabel(/^Confirm New Password$/i);

        await currentPasswordInput.fill('testpassword123');
        await newPasswordInput.fill('short');
        await confirmPasswordInput.fill('short');

        // Submit
        const passwordDialog = page.getByRole('dialog');
        const submitBtn = passwordDialog.getByRole('button', { name: /change password/i });
        await submitBtn.click();

        // Should show validation error
        const error = page.getByRole('alert').first();
        if (await error.isVisible()) {
          const errorText = await error.textContent();
          expect(errorText?.toLowerCase()).toContain('8 characters');
        }
      }
    });
  });

  test.describe('XP History', () => {
    test('should display XP history section', async ({ page }) => {
      await page.goto('/settings');

      // Check for XP History section header (now "XP_TRANSACTION_LEDGER")
      await expect(page.getByText('XP_TRANSACTION_LEDGER')).toBeVisible();
    });

    test('should show XP transaction list or empty message', async ({ page }) => {
      await page.goto('/settings');

      // XP History section should be visible
      const xpHistoryHeading = page.getByText('XP_TRANSACTION_LEDGER');
      await expect(xpHistoryHeading).toBeVisible();

      // Wait for loading to complete - check for either transactions or empty message
      // XP transactions are rendered as Paper elements (divs with border), not list items
      const transactionItem = page.getByText(/[+-]?\d+ XP/).first();
      const emptyMessage = page.getByText('No XP transactions yet');

      // Wait for one of the states to appear
      await expect(transactionItem.or(emptyMessage)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('User Profile', () => {
    test('should display user profile information', async ({ page }) => {
      await page.goto('/settings');

      // Check for level display in sidebar — now shows "LVL X OPERATOR" format
      const levelDisplay = page.getByText(/LVL/i).first();
      await expect(levelDisplay).toBeVisible();
    });

    test('should show current level and XP', async ({ page }) => {
      await page.goto('/settings');

      // Check for level display — now shows "LVL X OPERATOR" format
      const levelDisplay = page.getByText(/LVL/i).first();
      await expect(levelDisplay).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should have logout option', async ({ page }) => {
      await page.goto('/settings');

      // Check for logout button
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      await expect(logoutButton).toBeVisible();
    });

    test('should redirect to login after logout', async ({ page }) => {
      await page.goto('/settings');

      // Click logout
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Tags Management', () => {
    test('should display tags section', async ({ page }) => {
      await page.goto('/settings');

      // Check for Tags section header (now "TAG_DEFINITIONS")
      await expect(page.getByText('TAG_DEFINITIONS')).toBeVisible();
    });

    test('should have new tag button', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'TAG_DEFINITIONS');
      const addTagButton = page.locator('button:has-text("ADD TAG")').first();
      await expect(addTagButton).toBeVisible();
    });

    test('should create a new tag with multiplier', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'TAG_DEFINITIONS');
      const tagsSection = page.getByTestId('tags-section');
      const addTagButton = page.locator('button:has-text("ADD TAG")').first();
      await expect(addTagButton).toBeVisible();

      // Click add tag button
      await addTagButton.click();

      // Wait for form row to appear
      await page.waitForTimeout(300);

      // Fill in tag name (first textbox in the form row - Tags section)
      const tagName = `TestTag${Date.now()}`;
      const nameInput = tagsSection.getByRole('textbox').first();
      await nameInput.fill(tagName);

      // Click a quick multiplier button instead of typing
      await tagsSection.getByRole('button', { name: '1.5x' }).click();

      // Submit form by clicking the save button (now an icon-only button with a check icon)
      await tagsSection.locator('button:has(.tabler-icon-check)').first().click();

      // Verify tag appears in list
      await expect(page.getByText(tagName)).toBeVisible({ timeout: 5000 });
    });

    test('should show multiplier quick buttons', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'TAG_DEFINITIONS');
      const tagsSection = page.getByTestId('tags-section');
      const addTagButton = page.locator('button:has-text("ADD TAG")').first();
      await expect(addTagButton).toBeVisible();

      // Click add tag button
      await addTagButton.click();

      // Wait for form to appear
      await page.waitForTimeout(300);

      // Check for quick multiplier buttons (note: 1x and 2x, not 1.0x and 2.0x)
      await expect(tagsSection.getByRole('button', { name: '0.5x' })).toBeVisible();
      await expect(tagsSection.getByRole('button', { name: '1x' })).toBeVisible();
      await expect(tagsSection.getByRole('button', { name: '1.5x' })).toBeVisible();
      await expect(tagsSection.getByRole('button', { name: '2x' })).toBeVisible();
    });
  });

  test.describe('Projects Management', () => {
    test('should display projects section', async ({ page }) => {
      await page.goto('/settings');

      // Check for Projects section header (now "PROJECT_DEFINITIONS")
      await expect(page.getByText('PROJECT_DEFINITIONS')).toBeVisible();
    });

    test('should have new project button', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'PROJECT_DEFINITIONS');
      const addProjectButton = page.locator('button:has-text("ADD PROJECT")').first();
      await expect(addProjectButton).toBeVisible();
    });

    test('should create a new project with multiplier', async ({ page }) => {
      await page.goto('/settings');

      await ensureSectionExpanded(page, 'PROJECT_DEFINITIONS');
      const projectsSection = page.getByTestId('projects-section');
      const addProjectButton = page.locator('button:has-text("ADD PROJECT")').first();
      await expect(addProjectButton).toBeVisible();

      // Click add project button
      await addProjectButton.click();

      // Wait for form row to appear
      await page.waitForTimeout(300);

      // Fill in project name (first textbox in the form row - Projects section)
      const projectName = `TestProject${Date.now()}`;
      const nameInput = projectsSection.getByRole('textbox').first();
      await nameInput.fill(projectName);

      // Click a quick multiplier button (the Projects section should have its own buttons)
      await projectsSection.getByRole('button', { name: '2x' }).click();

      // Submit form by clicking the save button (now an icon-only button with a check icon)
      await projectsSection.locator('button:has(.tabler-icon-check)').first().click();

      // Verify project appears in list
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    });
  });
});
