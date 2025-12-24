/**
 * Page Object for the Calendar page.
 */
import { type Page, type Locator } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly calendar: Locator;
  readonly todayButton: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly monthView: Locator;
  readonly weekView: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Calendar' });
    this.calendar = page.locator('.fc');
    this.todayButton = page.getByRole('button', { name: 'today' });
    this.prevButton = page.getByRole('button', { name: 'prev' });
    this.nextButton = page.getByRole('button', { name: 'next' });
    this.monthView = page.getByRole('button', { name: 'month' });
    this.weekView = page.getByRole('button', { name: 'week' });
  }

  /**
   * Navigate to the calendar page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/calendar');
    await this.heading.waitFor();
  }

  /**
   * Wait for the calendar to fully load.
   */
  async waitForCalendar(): Promise<void> {
    await this.calendar.waitFor();
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
    return this.page.locator('.fc-event', { hasText: title });
  }

  /**
   * Click on an event to view details.
   */
  async clickEvent(title: string): Promise<void> {
    await this.getEventByTitle(title).click();
  }

  /**
   * Click on a specific date cell.
   */
  async clickDate(dateString: string): Promise<void> {
    await this.page.locator(`[data-date="${dateString}"]`).click();
  }

  /**
   * Navigate to today.
   */
  async goToToday(): Promise<void> {
    await this.todayButton.click();
  }

  /**
   * Navigate to previous month/week.
   */
  async goToPrev(): Promise<void> {
    await this.prevButton.click();
  }

  /**
   * Navigate to next month/week.
   */
  async goToNext(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Switch to month view.
   */
  async switchToMonthView(): Promise<void> {
    await this.monthView.click();
  }

  /**
   * Switch to week view.
   */
  async switchToWeekView(): Promise<void> {
    await this.weekView.click();
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
