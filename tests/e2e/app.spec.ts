import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/demo',
  '/q/north-star-cafe',
  '/q/north-star-cafe/staff',
  '/q/north-star-cafe/display',
  '/about',
];

test.describe('primary routes', () => {
  for (const route of routes) {
    test(`${route} has one clear h1 and no serious accessibility violations`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const results = await new AxeBuilder({ page }).analyze();
      const severe = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(severe).toEqual([]);
    });
  }
});

test('landing and demo routes communicate the product', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A calmer way to wait.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /open the demo/i }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole('heading', { name: /every side/i }),
  ).toBeVisible();
});

test('customer prototype joins the queue', async ({ page }) => {
  await page.goto('/q/north-star-cafe');
  await page.getByLabel(/first name/i).fill('Ari');
  await page.getByRole('button', { name: 'Join the queue' }).click();
  await expect(page.getByLabel('Queue number A-029')).toBeVisible();
});

test('staff prototype changes local queue state', async ({ page }) => {
  await page.goto('/q/north-star-cafe/staff');
  await page.getByRole('button', { name: 'Complete' }).click();
  await page.getByRole('button', { name: 'Call next' }).click();
  await expect(page.getByLabel('Queue number A-025')).toBeVisible();
});

test('public display shows active and upcoming numbers', async ({ page }) => {
  await page.goto('/q/north-star-cafe/display');
  await expect(page.getByLabel('Queue number A-024')).toBeVisible();
  await expect(page.getByText('A-025')).toBeVisible();
});

test('mobile navigation is keyboard operable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.locator('summary[aria-label="Open navigation menu"]').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('navigation', { name: 'Mobile navigation' }),
  ).toBeVisible();
});

test('theme switching applies the dark theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('reduced motion keeps content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/q/north-star-cafe/display');
  await expect(page.getByLabel('Queue number A-024')).toBeVisible();
});

for (const width of [320, 375]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `${route} overflowed at ${width}px`).toBe(false);
    }
  });
}
