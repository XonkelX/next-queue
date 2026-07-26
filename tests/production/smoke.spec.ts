import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const queueSlug = process.env.PRODUCTION_QUEUE_SLUG;
const applicationRoutes = ['/', '/demo', '/about'];
const queueRoutes = queueSlug
  ? [`/q/${queueSlug}`, `/q/${queueSlug}/staff`, `/q/${queueSlug}/display`]
  : [];

test('public routes and metadata endpoints are healthy', async ({
  request,
}) => {
  for (const route of [
    ...applicationRoutes,
    ...queueRoutes,
    `/q/unknown-${crypto.randomUUID()}`,
    '/robots.txt',
    '/sitemap.xml',
  ]) {
    expect((await request.get(route)).status(), route).toBe(200);
  }
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'https://next-queue-omega.vercel.app/sitemap.xml',
  );
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    'https://next-queue-omega.vercel.app/',
  );
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
