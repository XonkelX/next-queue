# Motion system

Motion in Next explains service-state change. It is brief, spatial, and interruptible; it never delays an action or hides required content.

## Tokens

| Token      | Duration | Use                                    |
| ---------- | -------: | -------------------------------------- |
| Instant    |    120ms | Press and focus feedback               |
| Quick      |    200ms | Small control and label change         |
| Standard   |    340ms | List insertion, removal, repositioning |
| Deliberate |    520ms | Primary queue-number transition        |

The shared easing curve is `cubic-bezier(0.22, 1, 0.36, 1)`: a fast response with a controlled arrival. Motion values live in `src/lib/motion.ts` rather than individual screens.

## Behaviors

### Reveal

Primary surfaces may fade with up to 18px of vertical travel. Content remains present in the document and readable if JavaScript motion does not run.

### Queue-number transition

The previous number moves upward and fades while the next enters from below in the same masked space. Tabular monospace numerals prevent width jitter. There is no bounce, spin, flash, or repeated attention loop.

### List insertion and removal

New waiting entries fade and move upward by 16px. Existing rows use layout animation so their new position remains understandable. Completed or skipped entries fade and collapse; the staff status message preserves context.

### Connection state

Connected, reconnecting, and offline are expressed through text, a stable dot, and color. Normal reconnecting is amber rather than alarming red. Restoration is announced once through the status region.

### Route transitions

Story 1 uses native App Router continuity without decorative full-page transitions. A route transition will only be added if testing shows it materially improves orientation.

## Reduced motion

`prefers-reduced-motion: reduce` is respected in JavaScript through Motion’s `useReducedMotion` and in CSS as a global safety net.

- Spatial translation becomes zero.
- Durations become effectively immediate.
- Layout animation and stagger are removed.
- The landing preview stops rotating queue numbers.
- No content or state feedback is removed.
- Focus, labels, and live announcements remain unchanged.
