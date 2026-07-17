import { productConfig } from '@/config/product';
import type { QueueSnapshot } from './types';

const timestamp = '2026-07-17T14:00:00.000Z';

export const initialQueueSnapshot: QueueSnapshot = {
  queue: {
    id: 'queue-demo-001',
    slug: productConfig.demoQueueSlug,
    name: productConfig.demoQueueName,
    prefix: productConfig.defaultQueuePrefix,
    status: 'OPEN',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  entries: [
    {
      id: 'entry-024',
      queueId: 'queue-demo-001',
      number: 24,
      displayName: 'Mara',
      status: 'SERVING',
      joinedAt: '2026-07-17T13:42:00.000Z',
      calledAt: '2026-07-17T13:58:00.000Z',
      updatedAt: '2026-07-17T13:58:00.000Z',
    },
    ...['Noah', 'Iris', 'Leo', 'Sofia'].map((displayName, index) => ({
      id: `entry-${25 + index}`,
      queueId: 'queue-demo-001',
      number: 25 + index,
      displayName,
      status: 'WAITING' as const,
      joinedAt: `2026-07-17T13:${50 + index}:00.000Z`,
      updatedAt: `2026-07-17T13:${50 + index}:00.000Z`,
    })),
  ],
};

export function createInitialQueueSnapshot(): QueueSnapshot {
  return structuredClone(initialQueueSnapshot);
}
