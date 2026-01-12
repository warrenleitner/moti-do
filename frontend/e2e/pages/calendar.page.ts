/**
 * Page Object for the Calendar page.
 * Uses FullCalendar library for calendar rendering.
 */
import { type Page, type Locator } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly description: Locator;
  readonly calendar: Locator;
  readonly projectFilter: Locator;
  readonly taskDetailsDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.description = page.getByText('View and manage tasks by their due dates');
    // FullCalendar container
    this.calendar = page.locator('.fc');
    // Project filter select
    this.projectFilter = page.getByRole('combobox', { name: 'Project' });
    // Task details dialog
    this.taskDetailsDialog = page.getByRole('dialog');
  }

  /**
   * Navigate to the calendar page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/calendar');
    await this.calendar.waitFor({ timeout: 10000 });
  }

  /**
   * Wait for the calendar to fully load.
   */
  async waitForCalendar(): Promise<void> {
    await this.calendar.waitFor({ timeout: 10000 });
  }

  /**
   * Get the current month/year displayed in the calendar title.
   */
  async getCalendarTitle(): Promise<string | null> {
    // FullCalendar toolbar title
    const title = this.page.locator('.fc-toolbar-title');
    return await title.textContent();
  }

  /**
   * Get all events visible on the calendar.
   */
  getEvents(): Locator {
    return this.page.locator('.fc-view-harness-active .fc-event');
  }

  /**
   * Get an event by its title.
   */
  getEventByTitle(title: string): Locator {
    return this.getEvents().filter({ hasText: title });
  }

  /**
   * Filter to the specified project if the select and option are available.
   */
  async filterByProject(project: string): Promise<boolean> {
    if (!(await this.projectFilter.isVisible())) {
      return false;
    }

    // Get initial event count
    const initialCount = await this.getEventCount();

    await this.projectFilter.click();
    const option = this.page.getByRole('option', { name: new RegExp(`^${project}$`, 'i') });
    const optionVisible = await option
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!optionVisible) {
      await this.page.keyboard.press('Escape');
      return false;
    }

    await option.first().click();
    // Wait for MUI Select to close and calendar to update
    await this.page.waitForTimeout(500);

    const selectedText = (await this.projectFilter.textContent()) || '';
    const isSelected = selectedText.toLowerCase().includes(project.toLowerCase());
    
    if (!isSelected) {
      return false;
    }

    // Wait for calendar to re-render with filtered events
    // The event count should change when filtering is applied
    for (let i = 0; i < 10; i++) {
      const newCount = await this.getEventCount();
      if (newCount !== initialCount) {
        return true;
      }
      await this.page.waitForTimeout(200);
    }

    // Even if count didn't change, filtering may have worked (could be same count)
    return true;
  }

  /**
   * Apply the dedicated calendar project filter used by seeded tasks.
   */
  async filterCalendarProject(project = 'calendar-e2e'): Promise<boolean> {
    return await this.filterByProject(project);
  }

  /**
   * Find an event, expanding "+more" popovers if necessary.
   * Uses .first() to handle cases where the same event appears in multiple places.
   */
  async findEventByTitle(title: string, project?: string): Promise<Locator> {
    // Only attempt filtering if project is provided
    if (project) {
      let filtered = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        filtered = await this.filterCalendarProject(project).catch(() => false);
        if (filtered) break;
        await this.page.waitForTimeout(500);
      }

      // Wait for FullCalendar to finish rendering after filter change
      await this.page.waitForTimeout(1000);
    } else {
      // No filtering, just wait for events to load
      await this.getEvents().first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => undefined);
    }

    // First check if event is directly visible (use first() to avoid strict mode violations)
    const event = this.getEventByTitle(title).first();
    await this.page
      .waitForFunction(
        (text) => {
          const events = document.querySelectorAll('.fc-view-harness-active .fc-event');
          return Array.from(events).some((el) => el.textContent?.includes(text));
        },
        title,
        { timeout: 10000 }
      )
      .catch(() => undefined);
    if (await event.isVisible()) {
      return event;
    }

    // Try expanding each "+more" link until the event is found
    const moreLinks = this.page.locator('.fc-view-harness-active .fc-more-link, .fc-view-harness-active .fc-daygrid-more-link');
    const linkCount = await moreLinks.count();
    for (let i = 0; i < linkCount; i += 1) {
      const link = moreLinks.nth(i);
      await link.click();
      await this.page
        .waitForSelector('.fc-popover, .fc-more-popover', { timeout: 1000 })
        .catch(() => undefined);
      const popoverEvent = this.page
        .locator('.fc-popover .fc-event, .fc-more-popover .fc-event')
        .filter({ hasText: title })
        .first();
      const popoverVisible = await popoverEvent
        .waitFor({ state: 'visible', timeout: 500 })
        .then(() => true)
        .catch(() => false);
      if (popoverVisible || await popoverEvent.isVisible()) {
        return popoverEvent;
      }
      // Close the popover before trying the next link
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(50);
    }

    // Check again in the main view in case events render after interactions
    if (await event.isVisible()) {
      return event;
    }

    // Ensure the locator is attached before returning for assertion
    await event.first().waitFor({ state: 'attached', timeout: 2000 }).catch(() => undefined);
    return event;
  }

  /**
   * Click on an event to view details.
   */
  async clickEvent(title: string, project?: string): Promise<void> {
    const event = await this.findEventByTitle(title, project);
    await event.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    await event.scrollIntoViewIfNeeded().catch(() => undefined);
    await event.click();
    await this.taskDetailsDialog.waitFor({ timeout: 5000 });
  }

  /**
   * Close the task details dialog.
   */
  async closeDetailsDialog(): Promise<void> {
    // Click outside or press Escape
    await this.page.keyboard.press('Escape');
  }

  /**
   * Click on a specific date cell to create a new task.
   */
  async clickDate(dateString: string): Promise<void> {
    // FullCalendar uses data-date attribute on day cells
    await this.page.locator(`[data-date="${dateString}"]`).click();
  }

  /**
   * Navigate to today using the toolbar button.
   * Only clicks if button is enabled (not already on today's month).
   */
  async goToToday(): Promise<void> {
    const todayButton = this.page.locator('.fc-today-button');
    if (await todayButton.isEnabled()) {
      await todayButton.click();
    }
  }

  /**
   * Navigate to previous month/week.
   */
  async goToPrev(): Promise<void> {
    await this.page.locator('.fc-prev-button').click();
  }

  /**
   * Navigate to next month/week.
   */
  async goToNext(): Promise<void> {
    await this.page.locator('.fc-next-button').click();
  }

  /**
   * Switch to month view.
   */
  async switchToMonthView(): Promise<void> {
    await this.page.locator('.fc-dayGridMonth-button').click();
  }

  /**
   * Switch to week view.
   */
  async switchToWeekView(): Promise<void> {
    await this.page.locator('.fc-timeGridWeek-button').click();
  }

  /**
   * Get count of visible events.
   */
  async getEventCount(): Promise<number> {
    return await this.getEvents().count();
  }

  /**
   * Check if an event is visible on the calendar.
   */
  async eventExists(title: string): Promise<boolean> {
    return await this.getEventByTitle(title).isVisible();
  }

  /**
   * Drag an event to a new date.
   */
  async dragEventToDate(eventTitle: string, targetDate: string): Promise<void> {
    const event = this.getEventByTitle(eventTitle);
    const targetCell = this.page.locator(`[data-date="${targetDate}"]`);
    await event.dragTo(targetCell);
  }
}
