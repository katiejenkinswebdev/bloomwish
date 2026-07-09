import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting. No-ops without a real DSN (local preview, CI, forks).
 * Wiring steps: README → "Sentry (crash reporting)".
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const isEnabled = !!dsn && !dsn.includes('placeholder');

export function initSentry(): void {
  if (!isEnabled) return;
  Sentry.init({
    dsn,
    // Errors only for now; enable tracing later if performance work needs it.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

export function identifyCrashUser(userId: string | null): void {
  if (!isEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export const wrapRoot = isEnabled
  ? Sentry.wrap
  : <T,>(component: T): T => component;
