/**
 * Navigation utilities that wrap window.location for easier unit-testing.
 * Centralising these calls allows tests to mock this module instead of
 * trying to spy on the non-configurable window.location properties.
 */

export const navigateTo = (url: string): void => {
  /* v8 ignore next - wraps window.location.assign; tested indirectly via api.test */
  window.location.assign(url);
};

export const reloadPage = (): void => {
  /* v8 ignore next - wraps window.location.reload; tested indirectly via SettingsPage.test */
  window.location.reload();
};
