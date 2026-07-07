import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { create } from 'zustand';

import { FULL_BLOOM_ENTITLEMENT_ID } from '@/config/branding';

interface PurchasesState {
  /** False in Expo Go or when RevenueCat keys are placeholders. */
  isConfigured: boolean;
  isFullBloom: boolean;
}

export const usePurchasesStore = create<PurchasesState>(() => ({
  isConfigured: false,
  isFullBloom: false,
}));

function hasFullBloom(customerInfo: CustomerInfo): boolean {
  return FULL_BLOOM_ENTITLEMENT_ID in customerInfo.entitlements.active;
}

let configuredForUserId: string | null = null;

/**
 * Configure RevenueCat and identify the Supabase user (RevenueCat's
 * app_user_id == auth.users.id, which the webhook relies on). Safe to call
 * repeatedly; degrades gracefully when the native module or keys are absent.
 */
export async function initializePurchases(userId: string): Promise<void> {
  if (configuredForUserId === userId) return;
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  });
  if (!apiKey || apiKey.includes('placeholder')) return;

  try {
    if (!configuredForUserId) {
      Purchases.configure({ apiKey });
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        usePurchasesStore.setState({ isFullBloom: hasFullBloom(customerInfo) });
      });
    }
    const { customerInfo } = await Purchases.logIn(userId);
    configuredForUserId = userId;
    usePurchasesStore.setState({ isConfigured: true, isFullBloom: hasFullBloom(customerInfo) });
  } catch (err) {
    console.warn('RevenueCat unavailable', err);
  }
}

export async function endPurchasesSession(): Promise<void> {
  if (!configuredForUserId) return;
  configuredForUserId = null;
  usePurchasesStore.setState({ isFullBloom: false });
  try {
    await Purchases.logOut();
  } catch {
    // Already logged out or unavailable — nothing to clean up.
  }
}

export interface PaywallPlan {
  offeringId: 'monthly' | 'annual' | 'founding_lifetime';
  priceString: string;
  rcPackage: PurchasesPackage;
}

const PACKAGE_ALIASES: Record<PaywallPlan['offeringId'], string[]> = {
  monthly: ['$rc_monthly', 'monthly'],
  annual: ['$rc_annual', 'annual'],
  founding_lifetime: ['$rc_lifetime', 'founding_lifetime', 'lifetime'],
};

/** Live packages with localized store prices, keyed to our branding offerings. */
export async function fetchPaywallPlans(): Promise<PaywallPlan[]> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const plans: PaywallPlan[] = [];
  for (const [offeringId, aliases] of Object.entries(PACKAGE_ALIASES) as [
    PaywallPlan['offeringId'],
    string[],
  ][]) {
    const match = packages.find((pkg) => aliases.includes(pkg.identifier.toLowerCase()));
    if (match) {
      plans.push({ offeringId, priceString: match.product.priceString, rcPackage: match });
    }
  }
  return plans;
}

/** Returns true when the purchase completed (false when the user cancelled). */
export async function purchasePlan(plan: PaywallPlan): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.rcPackage);
    usePurchasesStore.setState({ isFullBloom: hasFullBloom(customerInfo) });
    return true;
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return false;
    throw err;
  }
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  const restored = hasFullBloom(customerInfo);
  usePurchasesStore.setState({ isFullBloom: restored });
  return restored;
}
