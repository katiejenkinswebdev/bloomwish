import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { AmbientLayer } from '@/components/ambient-layer';
import { PlusIcon } from '@/components/icons';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { BrandPalette } from '@/constants/brand-palette';
import { ScreenPadding, Spacing, glowGold } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { fetchSigns } from '@/features/dreams/signs';
import { useTheme } from '@/hooks/use-theme';
import type { SignRow } from '@/lib/supabase/database.types';

type SignWithDream = SignRow & { dreamTitle: string };

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/**
 * The Signs tab (mock 3j): every noticed sign across the garden on one gold
 * timeline, with the sun moment banner after a bright week (≥3 signs in 7
 * days). Logging itself stays in the add-sign modal.
 */
export default function SignsScreen() {
  const theme = useTheme();
  // Captured once per mount; "this week" doesn't need to tick live.
  const [now] = useState(() => Date.now());

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dreams = dreamsQuery.data ?? [];

  const signsQuery = useQuery({
    queryKey: ['all-signs', dreams.map((d) => d.id).join(',')],
    enabled: dreams.length > 0,
    queryFn: async (): Promise<SignWithDream[]> => {
      const perDream = await Promise.all(
        dreams.map(async (dream) => {
          const signs = await fetchSigns(dream.id);
          return signs.map((sign) => ({ ...sign, dreamTitle: dream.title }));
        })
      );
      return perDream
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const signs = signsQuery.data ?? [];
  const weekCount = signs.filter(
    (s) => now - new Date(s.created_at).getTime() < 7 * 86400000
  ).length;
  const showSunMoment = weekCount >= 3;

  return (
    <Screen padded={false}>
      <AmbientLayer />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedText type="micro" themeColor="textSecondary" style={styles.kicker}>
          Signs
        </ThemedText>
        <ThemedText type="display">It&apos;s already{'\n'}happening</ThemedText>

        {showSunMoment ? (
          <View style={[styles.sunMoment, glowGold(20, 0.4)]}>
            <Spark size={20} color={BrandPalette.cream} />
            <View style={styles.sunBody}>
              <ThemedText type="micro" style={styles.sunText}>
                Sun moment
              </ThemedText>
              <ThemedText type="smallBold" style={styles.sunText}>
                {weekCount} signs this week — your garden felt it.
              </ThemedText>
            </View>
          </View>
        ) : null}

        {signs.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {dreamsQuery.isLoading || signsQuery.isLoading
              ? 'Looking for fireflies…'
              : 'When life winks at your wish, log it here. Every sign becomes a firefly in your garden.'}
          </ThemedText>
        ) : (
          <View>
            {signs.map((sign, index) => (
              <View key={sign.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < signs.length - 1 ? (
                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                  ) : null}
                </View>
                <View style={styles.timelineBody}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {dayLabel(sign.created_at)} · {sign.dreamTitle}
                  </ThemedText>
                  {sign.text ? <ThemedText>{sign.text}</ThemedText> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a sign"
        onPress={() => router.push('/add-sign')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}>
        <PlusIcon size={26} color={theme.background} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.six + Spacing.five,
    gap: Spacing.three,
  },
  kicker: {
    paddingTop: Spacing.three,
  },
  sunMoment: {
    backgroundColor: BrandPalette.gold,
    borderRadius: Spacing.three,
    padding: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sunBody: {
    flex: 1,
    gap: 2,
  },
  // Raw gold surface: plum ≥14px/600 text only (AA-checked in the handoff).
  sunText: {
    color: BrandPalette.plum,
  },
  empty: {
    paddingTop: Spacing.four,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  timelineRail: {
    alignItems: 'center',
    width: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandPalette.gold,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  fab: {
    position: 'absolute',
    right: ScreenPadding,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
