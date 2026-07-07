import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Branding, FreeTierLimits, Offerings, Tiers } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FULL_BLOOM_FEATURES = [
  'Unlimited dreams in your garden',
  'All visualization timer lengths',
  'Every guided meditation track',
  'The full feed activity library',
  'Unlimited personalized voice meditations',
  'All variable-reward rarities',
];

/**
 * The Full Bloom paywall. Shown once after the planting ceremony and at
 * feature gates. Hard rules: always dismissable, honest copy, free tier
 * summarized clearly, no manipulative framing, prices always shown before
 * any purchase sheet.
 *
 * TODO(phase 7): wire RevenueCat — load live localized prices into the plan
 * cards and enable purchase + restore. Until then the plan buttons are
 * informational only.
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const fullBloom = Tiers.full_bloom;
  const seedling = Tiers.seedling;

  const notYetWired = () =>
    Alert.alert(
      'Coming soon',
      'Purchases aren’t available in this build yet. Everything you have today stays free.'
    );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Spark size={32} />
          <ThemedText type="title">{fullBloom.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            Grow a whole garden of dreams.
          </ThemedText>
        </View>

        <Card>
          {FULL_BLOOM_FEATURES.map((feature) => (
            <ThemedText key={feature} type="small">
              ✦ {feature}
            </ThemedText>
          ))}
        </Card>

        {Offerings.map((offering) => (
          <Card
            key={offering.id}
            style={
              offering.isDefaultHighlighted
                ? [styles.planCard, { borderColor: theme.accent, borderWidth: 2 }]
                : styles.planCard
            }>
            <View style={styles.planHeader}>
              <ThemedText type="smallBold">{offering.label}</ThemedText>
              {offering.isDefaultHighlighted ? (
                <ThemedText type="small" themeColor="accent">
                  Most popular
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {offering.billingNote}
            </ThemedText>
            <Button
              label={`Choose ${offering.label}`}
              variant={offering.isDefaultHighlighted ? 'primary' : 'secondary'}
              onPress={notYetWired}
            />
          </Card>
        ))}

        <Card>
          <ThemedText type="smallBold">Staying with {seedling.name}? That’s lovely too.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your free garden always includes {FreeTierLimits.activeDreamSlots} active dream, timers
            up to {FreeTierLimits.maxTimerMinutes} minutes, {FreeTierLimits.guidedTrackCount} guided
            tracks, Signs, the full garden experience, and one personalized voice meditation on your
            starter dream — our gift.
          </ThemedText>
        </Card>

        <Button label="Restore purchases" variant="ghost" onPress={notYetWired} />

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

        <Button label="Maybe later" variant="ghost" onPress={() => router.back()} />
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
});
