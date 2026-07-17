import type { Browser } from '@playwright/test';
import { expect } from '@playwright/test';

export async function createTestQueue(
  browser: Browser,
  name: string,
  prefix: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo');
  await page.getByLabel('Queue name').fill(name);
  await page.getByLabel('Number prefix').fill(prefix);
  await page.getByRole('button', { name: 'Create persistent queue' }).click();
  const codeField = page.getByLabel('One-time staff access code');
  await expect(codeField).toBeVisible();
  const code = await codeField.inputValue();
  const slug = (await page.locator('.field-hint code').textContent())?.trim();
  if (!slug) throw new Error('Created queue slug was not shown.');
  return { context, page, code, slug };
}

export async function claimStaff(browser: Browser, slug: string, code: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/q/${slug}/staff`);
  await page.getByLabel('Private access code').fill(code);
  await page.getByRole('button', { name: 'Open staff board' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting' })).toBeVisible();
  return { context, page };
}

export async function joinCustomer(
  browser: Browser,
  slug: string,
  name: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/q/${slug}`);
  await page.getByLabel(/first name/i).fill(name);
  await page.getByRole('button', { name: 'Join the queue' }).click();
  await expect(page.getByText('Your place is saved')).toBeVisible();
  return { context, page };
}
