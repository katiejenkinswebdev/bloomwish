import PostHog from 'posthog-react-native';

/**
 * Product analytics (PostHog). Every call no-ops when the key is absent or a
 * placeholder — local preview, CI, and forks send nothing. Only behavioral
 * events are captured; no ad identifiers, no cross-app tracking, so ATT is
 * never required (declared as usage data in the store privacy answers).
 */
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthog: PostHog | null =
  apiKey && !apiKey.includes('placeholder') ? new PostHog(apiKey, { host }) : null;

/** The core-loop vocabulary — add sparingly; funnels beat firehoses. */
export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'dream_planted'
  | 'session_completed'
  | 'sign_logged'
  | 'meditation_generated'
  | 'paywall_viewed'
  | 'purchase_completed'
  | 'harvest';

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
): void {
  posthog?.capture(event, properties);
}

export function identifyUser(userId: string): void {
  posthog?.identify(userId);
}

export function resetAnalytics(): void {
  posthog?.reset();
}
