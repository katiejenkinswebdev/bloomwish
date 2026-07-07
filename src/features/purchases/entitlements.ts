import { usePurchasesStore } from '@/features/purchases/purchases';

/**
 * Whether the signed-in user holds the Full Bloom entitlement, live from
 * RevenueCat (kept current by the customer-info listener). Server-side gates
 * check the entitlements table instead — never this.
 */
export function useIsFullBloom(): boolean {
  return usePurchasesStore((state) => state.isFullBloom);
}
