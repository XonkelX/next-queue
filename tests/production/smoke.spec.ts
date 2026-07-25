import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const queueSlug = process.env.PRODUCTION_QUEUE_SLUG;
const applicationRoutes = [
  '/',
  '/demo',
  '/about',
  ...(queueSlug
    ? [`/q/${queueSlug}`, `/q/${queueSlug}/staff`, `/q/${queueSlug}/display`]
    : []),
];

test('public routes and metadata endpoints are healthy', async ({
  request,
}) => {
  for (const route of [...applicationRoutes, '/robots.txt', '/sitemap.xml']) {
    expect((await request.get(route)).status(), route).toBe(200);
  }
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'https://next-queue-omega.vercel.app/sitemap.xml',
  );
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    'https://next-queue-omega.vercel.app/',
  );
});

test('an unknown queue shows the intended unavailable state', async ({
  page,
}) => {
  await page.goto(`/q/unknown-${crypto.randomUUID()}`);
  await expect(
    page.getByRole('heading', { name: 'This queue could not be found.' }),
  ).toBeVisible();
});

for (const route of applicationRoutes) {
  test(`${route} has clean serious accessibility and console results`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((finding) =>
        ['serious', 'critical'].includes(finding.impact ?? ''),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`primary routes avoid horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of applicationRoutes) {
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

test('public display remains legible at 1920x1080 and reduced motion', async ({
  page,
}) => {
  test.skip(!queueSlug, 'A temporary production QA queue is required.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/q/${queueSlug}/display`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Queue is clear')).toBeVisible();
});
