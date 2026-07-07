/**
 * Entitlement checks for Full Bloom gating.
 *
 * TODO(phase 7): replace with RevenueCat — check the `full_bloom` entitlement
 * on the CustomerInfo object and subscribe to updates. Until then everyone is
 * on the free Seedling tier, and gates route to the paywall.
 */
export function useIsFullBloom(): boolean {
  return false;
}
