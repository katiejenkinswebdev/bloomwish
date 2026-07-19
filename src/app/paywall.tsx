import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';


import { goBackOrHome } from '@/lib/navigation';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery } from '@tanstack/react-query';

import { track } from '@/features/analytics/analytics';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Branding, FreeTierLimits, Offerings, Tiers } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import {
  fetchPaywallPlans,
  purchasePlan,
  restorePurchases,
  usePurchasesStore,
  type PaywallPlan,
} from '@/features/purchases/purchases';
import { useTheme } from '@/hooks/use-theme';

const FULL_BLOOM_FEATURES = [
  'Unlimited dream slots in your greenhouse',
  `Meditations composed for each dream, in ${Branding.voiceName}’s voice`,
  'A coach who remembers your garden’s story',
  'Every session mode, day and night',
];

/**
 * The Full Bloom paywall. Hard rules: always dismissable, honest copy, free
 * tier summarized clearly, live localized prices shown before any purchase
 * sheet, no manipulative framing.
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const isFullBloom = useIsFullBloom();
  const isConfigured = usePurchasesStore((s) => s.isConfigured);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    track('paywall_viewed');
  }, []);

  const plansQuery = useQuery({
    queryKey: ['paywall-plans'],
    queryFn: fetchPaywallPlans,
    enabled: isConfigured,
    staleTime: 1000 * 60 * 10,
  });
  const planByOffering = new Map((plansQuery.data ?? []).map((p) => [p.offeringId, p]));

  const purchaseMutation = useMutation({
    mutationFn: (plan: PaywallPlan) => purchasePlan(plan),
    onSuccess: (completed) => {
      if (completed) {
        setNotice('Welcome to Full Bloom — your whole garden just opened up.');
      }
    },
    onError: () => setNotice('The purchase couldn’t be completed. You haven’t been charged.'),
  });

  const restoreMutation = useMutation({
    mutationFn: restorePurchases,
    onSuccess: (restored) =>
      setNotice(
        restored
          ? 'Your Full Bloom purchase is restored'
          : 'No previous purchase found for this account.'
      ),
    onError: () => setNotice('Couldn’t reach the store to restore. Please try again.'),
  });

  const fullBloom = Tiers.full_bloom;
  const seedling = Tiers.seedling;
  const purchasesReady = isConfigured && (plansQuery.data?.length ?? 0) > 0;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Spark size={36} />
          <ThemedText type="subtitle">{fullBloom.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            For gardens with more than one dream growing.
          </ThemedText>
        </View>

        {notice ? (
          <Card>
            <ThemedText type="small">{notice}</ThemedText>
          </Card>
        ) : null}

        {isFullBloom ? (
          <Card>
            <ThemedText type="smallBold">You’re in Full Bloom</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Everything is unlocked. Manage or cancel anytime in your device’s subscription
              settings — no hoops, ever.
            </ThemedText>
          </Card>
        ) : (
          <>
            <View style={styles.benefits}>
              {FULL_BLOOM_FEATURES.map((feature) => (
                <View key={feature} style={styles.benefitRow}>
                  <View style={[styles.benefitDot, { backgroundColor: theme.primary }]} />
                  <ThemedText style={styles.benefitText}>{feature}</ThemedText>
                </View>
              ))}
            </View>
            {/* TODO(voice sample): once the 15s founder-voice sample asset ships,
                add the "Hear a sample" play row here (see mock 3n). */}

            {Offerings.map((offering) => {
              const plan = planByOffering.get(offering.id);
              return (
                <Card
                  key={offering.id}
                  style={
                    offering.isDefaultHighlighted
                      ? [styles.planCard, { borderColor: theme.accent, borderWidth: 2 }]
                      : styles.planCard
                  }>
                  <View style={styles.planHeader}>
                    <ThemedText type="smallBold">{offering.label}</ThemedText>
                    {plan ? <ThemedText type="smallBold">{plan.priceString}</ThemedText> : null}
                  </View>
                  {offering.isDefaultHighlighted ? (
                    <ThemedText type="small" themeColor="accent">
                      Most popular
                    </ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {offering.billingNote}
                  </ThemedText>
                  {plan ? (
                    <Button
                      label={`${fullBloom.name} · ${plan.priceString}`}
                      variant={offering.isDefaultHighlighted ? 'primary' : 'secondary'}
                      loading={
                        purchaseMutation.isPending &&
                        purchaseMutation.variables?.offeringId === offering.id
                      }
                      disabled={purchaseMutation.isPending}
                      onPress={() => purchaseMutation.mutate(plan)}
                    />
                  ) : null}
                </Card>
              );
            })}

            {!purchasesReady ? (
              <Card>
                <ThemedText type="small" themeColor="textSecondary">
                  {isConfigured && plansQuery.isLoading
                    ? 'Fetching prices from the store…'
                    : 'Purchases aren’t available in this build yet. Everything you have today stays free.'}
                </ThemedText>
              </Card>
            ) : null}
          </>
        )}

        <Card>
          <ThemedText type="smallBold">Staying with {seedling.name}? That’s lovely too.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your free garden always includes {FreeTierLimits.activeDreamSlots} active dream, timers
            up to {FreeTierLimits.maxTimerMinutes} minutes, {FreeTierLimits.guidedTrackCount} guided
            tracks, Signs, the full garden experience, and one personalized voice meditation on your
            starter dream — our gift.
          </ThemedText>
        </Card>

        <Button
          label="Restore purchases"
          variant="ghost"
          loading={restoreMutation.isPending}
          disabled={!isConfigured || restoreMutation.isPending}
          onPress={() => restoreMutation.mutate()}
        />

        <View style={styles.links}>
          <ThemedText
            type="linkPrimary"
            onPress={() => WebBrowser.openBrowserAsync(Branding.termsUrl)}>
            Terms
          </ThemedText>
          <ThemedText
            type="linkPrimary"
            onPress={() => WebBrowser.openBrowserAsync(Branding.privacyPolicyUrl)}>
            Privacy
          </ThemedText>
        </View>

        {!isFullBloom ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Cancel anytime in two taps. No trial tricks.
          </ThemedText>
        ) : null}
        <ThemedText
          type="smallBold"
          themeColor="primary"
          style={styles.stayFree}
          onPress={() => goBackOrHome()}>
          {isFullBloom ? 'Back to the garden' : `Stay ${seedling.name} — it’s genuinely free`}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  planCard: {
    gap: Spacing.two,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  benefits: {
    gap: Spacing.three - 2,
    paddingHorizontal: Spacing.one,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  stayFree: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
});
