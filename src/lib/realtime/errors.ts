export const queueErrorCodes = [
  'QUEUE_NOT_FOUND',
  'QUEUE_PAUSED',
  'QUEUE_CLOSED',
  'ALREADY_JOINED',
  'EMPTY_QUEUE',
  'ACTIVE_ENTRY_EXISTS',
  'NOT_STAFF',
  'INVALID_ACCESS_CODE',
  'RATE_LIMITED',
  'CONFLICT',
  'OFFLINE',
  'AUTH_INITIALIZATION_FAILED',
  'SUBSCRIPTION_FAILED',
  'INVALID_QUEUE_NAME',
  'INVALID_QUEUE_PREFIX',
  'INVALID_DISPLAY_NAME',
  'QUEUE_LIMIT_REACHED',
  'UNKNOWN',
] as const;

export type QueueErrorCode = (typeof queueErrorCodes)[number];

export class QueueAdapterError extends Error {
  constructor(
    readonly code: QueueErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QueueAdapterError';
  }
}
