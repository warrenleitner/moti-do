import { test, expect } from '@playwright/test';

test.describe('Task Icon Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should create, edit, and inline-edit task icon', async ({ page }) => {
    // 1. Create a task with an icon
    await page.getByTestId('add-task-fab').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const taskTitle = `Icon Task ${Date.now()}`;
    const initialIcon = '🚀';
    
    // Fill title
    await page.getByLabel('Title').fill(taskTitle);
    
    // Fill Icon
    await page.getByLabel('Icon').fill(initialIcon);
    
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify task is in the list (Card View) with the icon
    // We look for the title text, then find the parent container or just check if icon is visible near it.
    // In Card view, the icon is a span sibling to the title.
    const taskCard = page.locator('.MuiCard-root').filter({ hasText: taskTitle });
    await expect(taskCard).toBeVisible();
    await expect(taskCard.getByText(initialIcon)).toBeVisible();

    // 2. Edit the task and change the icon via Form
    // Find the task card. The title text is unique enough.
    // The edit button is inside the card.
    // We can filter for the card that contains the text.
    // The Card component structure: Box > Card > CardContent ... CardActions > Edit Button
    // We can just find the edit button associated with this task.
    // Or simpler: verify icon is present, then click edit.
    
    await taskCard.getByRole('button', { name: 'Edit task' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    const updatedIcon = '🎸';
    await page.getByLabel('Icon').fill(updatedIcon);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Verify update in Card view
    await expect(taskCard.getByText(updatedIcon)).toBeVisible();
    await expect(taskCard.getByText(initialIcon)).not.toBeVisible();

    // 3. Inline edit the icon in the table
    // Switch to table view
    await page.getByLabel('table view').click();
    await expect(page.locator('table')).toBeVisible();

    // Find the row
    const taskRow = page.getByRole('row', { name: new RegExp(taskTitle) });
    await expect(taskRow).toBeVisible();
    
    // Click on the icon cell. 
    // The icon cell is editable.
    // It should display the updatedIcon.
    await taskRow.getByText(updatedIcon).click();
    
    // It should turn into an input
    const inlineInput = taskRow.getByPlaceholder('Emoji');
    await expect(inlineInput).toBeVisible();
    
    const inlineIcon = '🎈';
    await inlineInput.fill(inlineIcon);
    await inlineInput.press('Enter');
    
    // Verify inline update
    await expect(taskRow).toContainText(inlineIcon);
    await expect(taskRow).not.toContainText(updatedIcon);
    
    // Reload page to verify persistence
    await page.reload();
    // Persistence also implies view mode is persisted (Table view)
    await expect(page.locator('table')).toBeVisible();

    const persistedRow = page.getByRole('row', { name: new RegExp(taskTitle) });
    await expect(persistedRow).toBeVisible();
    await expect(persistedRow).toContainText(inlineIcon);
  });
});