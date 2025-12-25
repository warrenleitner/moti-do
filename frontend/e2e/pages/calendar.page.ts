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
    this.projectFilter = page.getByLabel('Project');
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
    return this.page.locator('.fc-event');
  }

  /**
   * Get an event by its title.
   */
  getEventByTitle(title: string): Locator {
    return this.page.locator('.fc-event').filter({ hasText: title });
  }

  /**
   * Expand the "+more" popover if events are collapsed.
   * FullCalendar collapses events when there are too many on a day.
   */
  async expandMoreEventsIfNeeded(): Promise<void> {
    // Look for "+N more" links on today or any day
    const moreLinks = this.page.locator('.fc-more-link, .fc-daygrid-more-link');
    const count = await moreLinks.count();

    if (count > 0) {
      // Click the first "+more" link to expand
      await moreLinks.first().click();
      // Wait for the popover to appear
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Find an event, expanding "+more" popovers if necessary.
   * Uses .first() to handle cases where the same event appears in multiple places.
   */
  async findEventByTitle(title: string): Promise<Locator> {
    // First check if event is directly visible (use first() to avoid strict mode violations)
    const event = this.getEventByTitle(title).first();
    if (await event.count() > 0 && await event.isVisible()) {
      return event;
    }

    // Try expanding "+more" links
    await this.expandMoreEventsIfNeeded();

    // Check again in the popover or main view
    if (await event.count() > 0 && await event.isVisible()) {
      return event;
    }

    // Also check in the popover specifically
    const popoverEvent = this.page.locator('.fc-popover .fc-event, .fc-more-popover .fc-event').filter({ hasText: title }).first();
    if (await popoverEvent.count() > 0 && await popoverEvent.isVisible()) {
      return popoverEvent;
    }

    // Return the first event (may not be visible, but let test handle assertion)
    return event;
  }

  /**
   * Click on an event to view details.
   */
  async clickEvent(title: string): Promise<void> {
    const event = await this.findEventByTitle(title);
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
   * Filter by project.
   */
  async filterByProject(project: string): Promise<void> {
    await this.projectFilter.click();
    await this.page.getByRole('option', { name: project }).click();
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
