import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/create',
  '/q/north-star-cafe',
  '/q/north-star-cafe/staff',
  '/q/north-star-cafe/display',
  '/about',
  '/privacy',
  '/queues',
];

test.describe('primary routes', () => {
  for (const route of routes) {
    test(`${route} has one clear h1 and no serious accessibility violations`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
      ).toEqual([]);
    });
  }
});

test('landing and creation routes communicate the persistent product', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A calmer way to wait.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: /create your queue/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(
    page.getByRole('heading', { name: /create your queue/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /queue details/i }),
  ).toBeVisible();
});

test('unauthorized staff sees only the claim form and a generic failure', async ({
  page,
}) => {
  await page.goto('/q/north-star-cafe/staff');
  await expect(page.getByRole('button', { name: 'Call next' })).toHaveCount(0);
  await page.getByLabel('Private access code').fill('not-valid');
  await page.getByRole('button', { name: 'Open staff board' }).click();
  await expect(page.locator('#staff-access-message')).toContainText(
    /could not be verified/i,
  );
  await expect(page).not.toHaveURL(/code=/);
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

test('reduced motion keeps live content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/q/north-star-cafe/display');
  await expect(page.getByText('Queue is moving')).toBeVisible();
});

for (const width of [320, 375]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const route of routes) {
      await page.goto(route);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
    }
  });
}
