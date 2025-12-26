/**
 * Page Object for the Login page.
 */
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    // Logo image with alt text "Motodo"
    this.heading = page.getByRole('img', { name: 'Motodo' });
    this.subtitle = page.getByText('Task and Habit Tracker');
    // ToggleButton elements in the ToggleButtonGroup - use group to scope
    this.loginTab = page.getByRole('group').getByRole('button', { name: 'Login' });
    this.registerTab = page.getByRole('group').getByRole('button', { name: 'Register' });
    // Form fields - use getByRole textbox for MUI TextField components
    // Note: Password needs exact: true to avoid matching "Confirm Password"
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm Password' });
    // Submit button - the form submit button (type="submit")
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.getByRole('alert');
    this.loadingIndicator = page.getByRole('progressbar');
  }

  /**
   * Navigate to the login page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.heading.waitFor({ timeout: 10000 });
  }

  /**
   * Check if we're on the login page.
   */
  async isVisible(): Promise<boolean> {
    return await this.heading.isVisible();
  }

  /**
   * Log in with the provided credentials.
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Switch to register mode.
   */
  async switchToRegister(): Promise<void> {
    await this.registerTab.click();
    await this.confirmPasswordInput.waitFor({ timeout: 5000 });
  }

  /**
   * Switch to login mode.
   */
  async switchToLogin(): Promise<void> {
    await this.loginTab.click();
  }

  /**
   * Register a new user.
   */
  async register(username: string, password: string): Promise<void> {
    await this.switchToRegister();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
    // Wait for redirect away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
  }

  /**
   * Get the error message text.
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorAlert.waitFor({ timeout: 5000 });
      return await this.errorAlert.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Check if error alert is visible.
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible();
  }

  /**
   * Wait for successful login (redirect away from login page).
   */
  async waitForLoginSuccess(): Promise<void> {
    // Wait for navigation away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
  }

  /**
   * Check if currently in login mode (not register mode).
   */
  async isLoginMode(): Promise<boolean> {
    // In login mode, confirm password field is not visible
    return !(await this.confirmPasswordInput.isVisible());
  }
}
