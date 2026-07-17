export const productConfig = {
  name: 'Next',
  statement: 'A calm, real-time queue for small service teams.',
  demoQueueSlug: 'north-star-cafe',
  demoQueueName: 'North Star Coffee',
  defaultQueuePrefix: 'A',
} as const;

export const demoRoutes = {
  customer: `/q/${productConfig.demoQueueSlug}`,
  staff: `/q/${productConfig.demoQueueSlug}/staff`,
  display: `/q/${productConfig.demoQueueSlug}/display`,
} as const;
