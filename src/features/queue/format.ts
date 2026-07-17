export function formatQueueNumber(number: number, prefix = 'A'): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError('Queue numbers must be positive integers.');
  }

  const safePrefix = prefix.trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(safePrefix)) {
    throw new Error('Queue prefixes must contain one to three letters.');
  }

  return `${safePrefix}-${String(number).padStart(3, '0')}`;
}
