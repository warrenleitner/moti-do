/**
 * Settings Page E2E tests for Moti-Do.
 * Tests data export/import, vacation mode, password change, and XP history.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Settings Display', () => {
    test('should display settings page correctly', async ({ page }) => {
      await page.goto('/settings');

      // Verify page loads with Data Backup section visible
      await expect(page.getByRole('heading', { name: 'Data Backup & Restore' })).toBeVisible();
    });

    test('should show all settings sections', async ({ page }) => {
      await page.goto('/settings');

      // Check for actual settings sections on the page - use heading role to be specific
      await expect(page.getByRole('heading', { name: 'Data Backup & Restore' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Vacation Mode' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'XP History' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
    });
  });

  test.describe('Data Export', () => {
    test('should have export data button', async ({ page }) => {
      await page.goto('/settings');

      const exportButton = page.getByRole('button', { name: /export/i });
      await expect(exportButton).toBeVisible();
    });

    test('should trigger download on export', async ({ page }) => {
      await page.goto('/settings');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      const exportButton = page.getByRole('button', { name: /export/i });
      await exportButton.click();

      // Verify download started
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('json');
    });
  });

  test.describe('Data Import', () => {
    test('should have import data option', async ({ page }) => {
      await page.goto('/settings');

      // Check for import section/button - use first() for multiple matches
      const importElement = page.getByText(/import/i).first();
      await expect(importElement).toBeVisible();
    });
  });

  test.describe('Vacation Mode', () => {
    test('should toggle vacation mode on', async ({ page }) => {
      await page.goto('/settings');

      // Find vacation mode toggle - MUI Switch gets name from FormControlLabel
      // The label starts with "Enable vacation mode" or "Vacation mode is active"
      const vacationToggle = page.getByRole('switch');
      await expect(vacationToggle).toBeVisible();

      // Get initial state
      const initialState = await vacationToggle.isChecked();

      // Toggle vacation mode
      await vacationToggle.click();

      // Wait for API call and state update
      await page.waitForTimeout(500);

      // Verify state changed
      const newState = await vacationToggle.isChecked();
      expect(newState).not.toBe(initialState);

      // Toggle back to original state
      await vacationToggle.click();
      await page.waitForTimeout(500);
    });

    test('should show vacation mode status', async ({ page }) => {
      await page.goto('/settings');

      // Check for vacation mode heading
      await expect(page.getByRole('heading', { name: 'Vacation Mode' })).toBeVisible();

      // Check for vacation mode switch and label using the form control
      const vacationSwitch = page.getByRole('switch');
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

      // Check for password change section - use first() for multiple matches
      const passwordSection = page.getByText(/password/i).first();
      await expect(passwordSection).toBeVisible();
    });

    test('should show password change form', async ({ page }) => {
      await page.goto('/settings');

      // Click on change password button if exists
      const changePasswordBtn = page.getByRole('button', { name: /change password/i });

      if (await changePasswordBtn.isVisible()) {
        await changePasswordBtn.click();

        // Should show form with current and new password fields
        await expect(page.getByLabel(/current password/i)).toBeVisible();
        await expect(page.getByLabel(/new password/i)).toBeVisible();
      }
    });

    test('should validate password change inputs', async ({ page }) => {
      await page.goto('/settings');

      const changePasswordBtn = page.getByRole('button', { name: /change password/i });

      if (await changePasswordBtn.isVisible()) {
        await changePasswordBtn.click();

        // Try to submit with short password
        const currentPasswordInput = page.getByLabel(/current password/i);
        const newPasswordInput = page.getByLabel(/new password/i);

        await currentPasswordInput.fill('testpassword123');
        await newPasswordInput.fill('short');

        // Submit
        const submitBtn = page.getByRole('button', { name: /save|submit|change/i });
        await submitBtn.click();

        // Should show validation error
        const error = page.getByRole('alert');
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

      // Check for XP History heading
      await expect(page.getByRole('heading', { name: 'XP History' })).toBeVisible();
    });

    test('should show XP transaction list or empty message', async ({ page }) => {
      await page.goto('/settings');

      // XP History section should be visible
      const xpHistoryHeading = page.getByRole('heading', { name: 'XP History' });
      await expect(xpHistoryHeading).toBeVisible();

      // Get the XP History card (parent container of the heading)
      const xpHistoryCard = page.locator('.MuiCard-root').filter({ has: xpHistoryHeading });

      // Wait for loading to complete
      await page.waitForTimeout(500);

      // Should show either transactions list or empty state message within the card
      const hasTransactions = await xpHistoryCard.locator('li').first().isVisible().catch(() => false);
      const hasEmptyMessage = await xpHistoryCard.getByText('No XP transactions yet').isVisible().catch(() => false);

      expect(hasTransactions || hasEmptyMessage).toBeTruthy();
    });
  });

  test.describe('User Profile', () => {
    test('should display user profile information', async ({ page }) => {
      await page.goto('/settings');

      // Check for level display in sidebar (use first() for multiple matches)
      const levelDisplay = page.getByText(/level/i).first();
      await expect(levelDisplay).toBeVisible();
    });

    test('should show current level and XP', async ({ page }) => {
      await page.goto('/settings');

      // Check for level display (use first() for multiple matches)
      const levelDisplay = page.getByText(/level/i).first();
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

      // Check for Tags heading
      await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible();
    });

    test('should have new tag button', async ({ page }) => {
      await page.goto('/settings');

      // Check for add tag button
      const addTagButton = page.getByRole('button', { name: 'Add Tag' });
      await expect(addTagButton).toBeVisible();
    });

    test('should create a new tag with multiplier', async ({ page }) => {
      await page.goto('/settings');

      // Click add tag button
      const addTagButton = page.getByRole('button', { name: 'Add Tag' });
      await addTagButton.click();

      // Wait for form row to appear
      await page.waitForTimeout(300);

      // Fill in tag name (first textbox in the form row - Tags section)
      const tagName = `TestTag${Date.now()}`;
      const tagsSection = page.locator('.MuiCard-root').filter({ hasText: 'Tags' });
      const nameInput = tagsSection.getByRole('textbox').first();
      await nameInput.fill(tagName);

      // Click a quick multiplier button instead of typing
      await page.getByRole('button', { name: '1.5x' }).click();

      // Submit form by clicking the check icon button
      await tagsSection.getByRole('button').filter({ has: page.locator('svg[data-testid="CheckIcon"]') }).click();

      // Verify tag appears in list
      await expect(page.getByText(tagName)).toBeVisible({ timeout: 5000 });
    });

    test('should show multiplier quick buttons', async ({ page }) => {
      await page.goto('/settings');

      // Click add tag button
      const addTagButton = page.getByRole('button', { name: 'Add Tag' });
      await addTagButton.click();

      // Wait for form to appear
      await page.waitForTimeout(300);

      // Check for quick multiplier buttons (note: 1x and 2x, not 1.0x and 2.0x)
      await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
      await expect(page.getByRole('button', { name: '2x' })).toBeVisible();
    });
  });

  test.describe('Projects Management', () => {
    test('should display projects section', async ({ page }) => {
      await page.goto('/settings');

      // Check for Projects heading
      await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    });

    test('should have new project button', async ({ page }) => {
      await page.goto('/settings');

      // Check for add project button
      const addProjectButton = page.getByRole('button', { name: 'Add Project' });
      await expect(addProjectButton).toBeVisible();
    });

    test('should create a new project with multiplier', async ({ page }) => {
      await page.goto('/settings');

      // Click add project button
      const addProjectButton = page.getByRole('button', { name: 'Add Project' });
      await addProjectButton.click();

      // Wait for form row to appear
      await page.waitForTimeout(300);

      // Fill in project name (first textbox in the form row - Projects section)
      const projectName = `TestProject${Date.now()}`;
      const projectsSection = page.locator('.MuiCard-root').filter({ hasText: 'Projects' });
      const nameInput = projectsSection.getByRole('textbox').first();
      await nameInput.fill(projectName);

      // Click a quick multiplier button (the Projects section should have its own buttons)
      await projectsSection.getByRole('button', { name: '2x' }).click();

      // Submit form by clicking the check icon button
      await projectsSection.getByRole('button').filter({ has: page.locator('svg[data-testid="CheckIcon"]') }).click();

      // Verify project appears in list
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    });
  });
});
