import { expect, test } from '@playwright/test';
import { claimStaff, createTestQueue, joinCustomer } from './helpers';

test('customer, staff, and display converge without refresh and resync after offline', async ({
  browser,
}) => {
  const created = await createTestQueue(
    browser,
    `Realtime ${crypto.randomUUID().slice(0, 8)}`,
    'R',
  );
  await created.page.goto(`/q/${created.slug}/staff`);
  await expect(
    created.page.getByRole('heading', { name: 'Waiting' }),
  ).toBeVisible();

  const displayContext = await browser.newContext();
  const display = await displayContext.newPage();
  await display.goto(`/q/${created.slug}/display`);
  await expect(display.getByText('Queue is clear')).toBeVisible();

  const first = await joinCustomer(browser, created.slug, 'River');
  const second = await joinCustomer(browser, created.slug, 'Sky');
  await expect(created.page.getByText('River')).toBeVisible();
  await expect(created.page.getByText('Sky')).toBeVisible();
  await expect(display.getByText('R-001')).toBeVisible();
  await expect(second.page.getByText('2 of 2')).toBeVisible();

  await created.page.getByRole('button', { name: 'Call next' }).click();
  await expect(first.page.getByText('It’s your turn.')).toBeVisible();
  await expect(display.getByLabel('Queue number R-001')).toBeVisible();
  await expect(second.page.getByText('1 of 1')).toBeVisible();

  await created.page.getByRole('button', { name: 'Complete' }).click();
  await expect(
    display.getByText('No one is currently being served'),
  ).toBeAttached();
  await expect(
    created.page.getByRole('button', { name: 'Call next' }),
  ).toBeEnabled();

  await second.context.setOffline(true);
  await expect(second.page.getByText('Offline')).toBeVisible();
  await created.page.getByRole('button', { name: 'Call next' }).click();
  await second.context.setOffline(false);
  await expect(second.page.getByText('It’s your turn.')).toBeVisible();
  await expect(second.page.getByText('Connected')).toBeVisible();
  await expect(second.page.getByLabel('Queue number R-002')).toHaveCount(1);

  await Promise.all([
    created.context.close(),
    displayContext.close(),
    first.context.close(),
    second.context.close(),
  ]);
});

test('two authorized staff clients cannot create two serving entries', async ({
  browser,
}) => {
  const created = await createTestQueue(
    browser,
    `Concurrency ${crypto.randomUUID().slice(0, 8)}`,
    'C',
  );
  await created.page.goto(`/q/${created.slug}/staff`);
  const secondStaff = await claimStaff(browser, created.slug, created.code);
  const firstCustomer = await joinCustomer(browser, created.slug, 'One');
  const secondCustomer = await joinCustomer(browser, created.slug, 'Two');

  await expect(created.page.getByText('One', { exact: true })).toBeVisible();
  await expect(
    secondStaff.page.getByText('Two', { exact: true }),
  ).toBeVisible();
  await Promise.all([
    created.page.getByRole('button', { name: 'Call next' }).click(),
    secondStaff.page.getByRole('button', { name: 'Call next' }).click(),
  ]);
  await expect(created.page.getByLabel('Queue number C-001')).toBeVisible();
  await expect(secondStaff.page.getByLabel('Queue number C-001')).toBeVisible();
  await expect(created.page.getByText('1 person')).toBeVisible();
  await expect(secondStaff.page.getByText('1 person')).toBeVisible();

  await Promise.all([
    created.context.close(),
    secondStaff.context.close(),
    firstCustomer.context.close(),
    secondCustomer.context.close(),
  ]);
});
