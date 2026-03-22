import { test, Page } from '@playwright/test';

const BASE = 'http://localhost:5178';

async function login(page: Page) {
  await page.goto(BASE + '/login');
  await page.waitForLoadState('networkidle');

  // Clear and fill credentials
  const emailInput = page.locator('input[type="email"], #email');
  const passwordInput = page.locator('input[type="password"], #password');
  await emailInput.fill('ananya@technova.in');
  await passwordInput.fill('Welcome@123');

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for the API response and navigation
  await page.waitForSelector('button[type="submit"]', { state: 'hidden', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // If still on login, inject auth via API call
  const url = page.url();
  if (url.includes('/login')) {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ananya@technova.in', password: 'Welcome@123' })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('access_token', data.data.tokens.accessToken);
        localStorage.setItem('refresh_token', data.data.tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      return data.success;
    });
    if (response) {
      await page.goto(BASE + '/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
  }
}

test.describe('EMP Exit Feature Screenshots', () => {
  test('01 - Dashboard', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-01-dashboard.png', fullPage: true });
  });

  test('02 - Exit List', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/exits');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-02-exits.png', fullPage: true });
  });

  test('03 - Checklist Templates', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/checklists');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-03-checklists.png', fullPage: true });
  });

  test('04 - Clearance Config', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/clearance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-04-clearance.png', fullPage: true });
  });

  test('05 - Analytics', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-05-analytics.png', fullPage: true });
  });

  test('06 - Settings', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/exit-06-settings.png', fullPage: true });
  });
});
