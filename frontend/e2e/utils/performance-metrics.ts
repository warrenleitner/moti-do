/**
 * Performance metrics collection utility.
 * Collects timing and performance data during E2E test runs.
 *
 * Usage: Import and call collectMetrics() at key points in tests.
 * Metrics are logged to console and can be parsed by CI for reporting.
 */
import { type Page } from '@playwright/test';

export interface PerformanceMetrics {
  url: string;
  wallClockTime: number;
  domContentLoaded?: number;
  loadComplete?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  resourceCount?: number;
  transferSize?: number;
}

export interface NavigationTiming {
  route: string;
  duration: number;
}

/**
 * Collect performance metrics for the current page.
 */
export async function collectPageMetrics(page: Page): Promise<PerformanceMetrics> {
  const url = page.url();

  const metrics = await page.evaluate(() => {
    const timing = performance.timing;
    const entries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paintEntries = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Get FCP
    const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');

    // Get LCP (if available)
    let lcp: number | undefined;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }
    } catch {
      // LCP not available
    }

    // Calculate CLS
    let cls = 0;
    try {
      const layoutShiftEntries = performance.getEntriesByType('layout-shift') as (PerformanceEntry & { value: number; hadRecentInput: boolean })[];
      cls = layoutShiftEntries
        .filter(e => !e.hadRecentInput)
        .reduce((sum, e) => sum + e.value, 0);
    } catch {
      // Layout shift not available
    }

    // Calculate transfer size
    const transferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    return {
      domContentLoaded: entries?.domContentLoadedEventEnd || (timing.domContentLoadedEventEnd - timing.navigationStart),
      loadComplete: entries?.loadEventEnd || (timing.loadEventEnd - timing.navigationStart),
      fcp: fcpEntry?.startTime,
      lcp,
      cls,
      resourceCount: resources.length,
      transferSize,
    };
  });

  return {
    url,
    wallClockTime: 0, // Set by caller
    ...metrics,
  };
}

/**
 * Measure navigation time to a route.
 */
export async function measureNavigation(
  page: Page,
  route: string,
  navigateFn: () => Promise<void>
): Promise<NavigationTiming> {
  const startTime = Date.now();
  await navigateFn();
  await page.waitForLoadState('networkidle');
  const duration = Date.now() - startTime;

  return { route, duration };
}

/**
 * Collect and log metrics for a test run.
 * Call this at the end of cross-cutting tests.
 */
export async function logPerformanceSummary(
  testName: string,
  navigationTimings: NavigationTiming[],
  page: Page
): Promise<void> {
  const metrics = await collectPageMetrics(page);

  // Format for easy CI parsing
  console.log('\n=== PERFORMANCE METRICS ===');
  console.log(`Test: ${testName}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'JSON'}`);
  console.log('\nNavigation Timings:');

  let totalNavTime = 0;
  for (const timing of navigationTimings) {
    console.log(`  ${timing.route}: ${timing.duration}ms`);
    totalNavTime += timing.duration;
  }

  console.log(`\nTotal Navigation Time: ${totalNavTime}ms`);
  console.log(`Average Navigation: ${Math.round(totalNavTime / navigationTimings.length)}ms`);

  if (metrics.transferSize) {
    console.log(`Bundle Size: ${(metrics.transferSize / (1024 * 1024)).toFixed(2)} MB`);
  }

  console.log('=== END METRICS ===\n');
}

/**
 * Performance budget thresholds.
 * These are generous to avoid flaky tests while catching major regressions.
 */
export const PERFORMANCE_BUDGETS = {
  pageLoad: 5000,        // 5s max for any page load
  navigation: 3000,      // 3s max for client-side navigation
  apiResponse: 2000,     // 2s max for API calls
  dialogOpen: 2000,      // 2s max for dialog/modal open
  totalTestTime: 120000, // 2min max for any single test
};
