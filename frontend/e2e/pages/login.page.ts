/**
 * Page Object for the Login page.
 */
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
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
    this.heading = page.getByRole('heading', { name: 'Moti-Do' });
    this.loginTab = page.getByRole('button', { name: 'Login' }).first();
    this.registerTab = page.getByRole('button', { name: 'Register' }).first();
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', { name: /Login|Register/ }).last();
    this.errorAlert = page.getByRole('alert');
    this.loadingIndicator = page.getByRole('progressbar');
  }

  /**
   * Navigate to the login page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.heading.waitFor();
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
    await this.confirmPasswordInput.waitFor();
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
   * Wait for successful login (redirect to dashboard).
   */
  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL('/');
  }
}
