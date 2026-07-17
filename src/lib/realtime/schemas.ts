import { z } from 'zod';

const entrySchema = z.object({
  id: z.uuid(),
  queueId: z.uuid(),
  number: z.number().int().positive(),
  numberLabel: z.string(),
  status: z.enum(['WAITING', 'SERVING', 'COMPLETED', 'SKIPPED']),
  displayName: z.string().optional(),
  joinedAt: z.string(),
  calledAt: z.string().optional(),
  completedAt: z.string().optional(),
  skippedAt: z.string().optional(),
  updatedAt: z.string(),
  revision: z.number().int().nonnegative(),
});

export const snapshotSchema = z.object({
  ok: z.literal(true),
  queue: z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    prefix: z.string(),
    status: z.enum(['OPEN', 'PAUSED', 'CLOSED']),
    revision: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  entries: z.array(entrySchema),
  role: z.enum(['public', 'customer', 'staff']),
  ownEntryId: z.uuid().nullable().optional(),
  waitingCount: z.number().int().nonnegative(),
  serverTime: z.string(),
  replayed: z.boolean().optional(),
  alreadyJoined: z.boolean().optional(),
  accessCode: z.string().nullable().optional(),
  accessCodeShownOnce: z.boolean().optional(),
});

export const errorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  message: z.string(),
});

export type SnapshotResult = z.infer<typeof snapshotSchema>;
