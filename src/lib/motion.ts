export const motionTokens = {
  duration: { instant: 0.12, quick: 0.2, standard: 0.34, deliberate: 0.52 },
  easing: [0.22, 1, 0.36, 1] as const,
} as const;

export function getMotionDistance(reduced: boolean, distance: number): number {
  return reduced ? 0 : distance;
}

export function getMotionDuration(reduced: boolean, duration: number): number {
  return reduced ? 0.01 : duration;
}
