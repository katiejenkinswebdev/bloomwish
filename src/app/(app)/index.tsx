import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { AmbientLayer } from '@/components/ambient-layer';
import { AnimatedPlant } from '@/components/animated-plant';
import { Butterfly } from '@/components/butterfly';
import { DropletIcon } from '@/components/droplet-icon';
import { Fireflies } from '@/components/fireflies';
import { GardenerIcon, HeadphonesIcon, MoonIcon, PlusIcon } from '@/components/icons';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { FreeTierLimits } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { fetchDailyNudge, fetchDreams } from '@/features/dreams/api';
import { DreamDetailSheet } from '@/features/dreams/components/dream-detail-sheet';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { consumeGardenNourished } from '@/features/dreams/nourish-signal';
import {
  deriveHealth,
  fetchHealthDecayConfig,
  healthConfigQueryKey,
} from '@/features/dreams/health';
import { fetchSignCounts } from '@/features/dreams/signs';
import { fetchTrophies } from '@/features/harvest/api';
import { fetchNotificationPrefs, notificationPrefsQueryKey } from '@/features/notifications/prefs';
import { syncNotifications } from '@/features/notifications/scheduler';
import { fetchProfile, profileQueryKey } from '@/features/profile/api';
import { useIsFounder } from '@/features/profile/founder';
import { grantElevenEleven, maybeGrantReward, type GrantedReward } from '@/features/rewards/api';
import { DelightMoment } from '@/features/rewards/components/delight-moment';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import { fetchLocalWeather } from '@/features/weather/weather-mirror';
import { useDreamDraftStore } from '@/store/dream-draft-store';
import { RainOverlay } from '@/components/rain-overlay';
import { computeGardenWidgetState, syncWidgets } from '@/features/widget/widget-state';
import { useResolvedScheme, useTheme } from '@/hooks/use-theme';
import type { DreamRow } from '@/lib/supabase/database.types';

const HERO_CIRCLE = 120;
const SHELF_COLUMNS = 3;

/**
 * Wraps a plant so the whole garden can respond in a staggered wave when a
 * released dream's energy feeds the survivors.
 */
function NourishablePlant({
  index,
  signal,
  children,
}: {
  index: number;
  signal: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (!signal || reducedMotion) return;
    scale.value = withDelay(
      index * 150,
      withSequence(
        withSpring(1.14, { damping: 7, stiffness: 260 }),
        withSpring(1, { damping: 12, stiffness: 220 })
      )
    );
    sparkle.value = withDelay(
      index * 150,
      withSequence(withTiming(1, { duration: 420 }), withTiming(0, { duration: 700 }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);

  const plantStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ translateY: -6 - sparkle.value * 14 }],
  }));

  return (
    <Animated.View style={plantStyle}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.nourishSpark, sparkleStyle]}>
        <Spark size={14} />
      </Animated.View>
    </Animated.View>
  );
}

// One app-open delight roll per launch, not per navigation.
let hasRolledThisLaunch = false;

function daysGrowing(dream: DreamRow): number {
  return Math.max(1, Math.floor((Date.now() - new Date(dream.created_at).getTime()) / 86400000) + 1);
}

export default function GardenScreen() {
  const theme = useTheme();
  const scheme = useResolvedScheme();
  const isNight = scheme === 'night';

  // Track the selected dream by id so the sheet always shows fresh data —
  // including growth that happened while a Water/Feed/Sign flow was on top.
  const [selectedDreamId, setSelectedDreamId] = useState<string | null>(null);
  // The sheet is an RN Modal, which floats above every navigator screen —
  // so it must hide while a Water/Feed/Sign flow is pushed on top, then
  // reappear (with fresh data) when the garden regains focus.
  const [isFocused, setIsFocused] = useState(true);
  // The garden's thank-you wave after a release fed the surviving plants.
  const [nourishSignal, setNourishSignal] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      if (consumeGardenNourished()) setNourishSignal((n) => n + 1);
      return () => setIsFocused(false);
    }, [])
  );
  const [reward, setReward] = useState<GrantedReward | null>(null);
  const isFullBloom = useIsFullBloom();
  const isFounder = useIsFounder();

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const configQuery = useQuery({
    queryKey: healthConfigQueryKey,
    queryFn: fetchHealthDecayConfig,
    staleTime: 1000 * 60 * 60,
  });
  const signCountsQuery = useQuery({ queryKey: ['sign-counts'], queryFn: fetchSignCounts });
  const trophiesQuery = useQuery({ queryKey: ['trophies'], queryFn: fetchTrophies });
  const profileQuery = useQuery({ queryKey: profileQueryKey, queryFn: fetchProfile });
  const prefsQuery = useQuery({
    queryKey: notificationPrefsQueryKey,
    queryFn: fetchNotificationPrefs,
  });
  // Opt-in weather mirror; resolves to null unless enabled AND precipitating.
  const weatherQuery = useQuery({
    queryKey: ['local-weather'],
    queryFn: fetchLocalWeather,
    staleTime: 1000 * 60 * 30,
  });
  const weather = weatherQuery.data;

  useEffect(() => {
    if (hasRolledThisLaunch) return;
    hasRolledThisLaunch = true;

    // The 11:11 moment takes precedence over the random app-open roll —
    // synchronicity beats chance. Once per day.
    const now = new Date();
    const isElevenEleven = now.getHours() % 12 === 11 && now.getMinutes() === 11;
    const today = now.toDateString();
    (async () => {
      if (isElevenEleven) {
        const lastShown = await AsyncStorage.getItem('bloomwish:1111-shown');
        if (lastShown !== today) {
          await AsyncStorage.setItem('bloomwish:1111-shown', today);
          const moment = await grantElevenEleven();
          if (moment) {
            setReward(moment);
            return;
          }
        }
      }
      maybeGrantReward('app_open', { includeLegendary: isFullBloom }).then(setReward);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local notifications and home-screen widgets aligned with reality.
  useEffect(() => {
    if (!dreamsQuery.data || profileQuery.data === undefined) return;
    syncNotifications({
      profile: profileQuery.data,
      dreams: dreamsQuery.data,
      decayConfig: configQuery.data,
      prefs: prefsQuery.data,
    });
    syncWidgets(computeGardenWidgetState(dreamsQuery.data, configQuery.data));
  }, [dreamsQuery.data, profileQuery.data, configQuery.data, prefsQuery.data]);

  const dreams = dreamsQuery.data ?? [];
  const signCounts = signCountsQuery.data ?? {};
  const trophies = trophiesQuery.data ?? [];
  const healthFor = (dream: DreamRow) => deriveHealth(dream, configQuery.data);
  const selectedDream = dreams.find((d) => d.id === selectedDreamId) ?? null;

  // Re-entry pulse: something happened while you were away. Anchored to the
  // most recently tended dream; time captured once per mount.
  const [openedAt] = useState(() => Date.now());
  const pulseDream = [...dreams].sort(
    (a, b) => new Date(b.last_interacted_at).getTime() - new Date(a.last_interacted_at).getTime()
  )[0];
  const hoursAway = pulseDream
    ? (openedAt - new Date(pulseDream.last_interacted_at).getTime()) / 3600000
    : 0;
  const pulseLine = pulseDream
    ? hoursAway < 20
      ? `${pulseDream.title} is still glowing from your last visit.`
      : hoursAway < 48
        ? `${pulseDream.title} held its warmth overnight.`
        : `${pulseDream.title} has been waiting for you.`
    : null;
  // The daily ritual returns to the dream that's waited longest for you.
  const returnDream = [...dreams].sort(
    (a, b) => new Date(a.last_interacted_at).getTime() - new Date(b.last_interacted_at).getTime()
  )[0];

  // Today's whisper: one coach nudge per dream per session, cached hard —
  // this is a paid AI call.
  const nudgeQuery = useQuery({
    queryKey: ['daily-nudge', returnDream?.id],
    enabled: !!returnDream,
    staleTime: Infinity,
    queryFn: () =>
      fetchDailyNudge(
        returnDream!.wish_text ?? returnDream!.title,
        returnDream!.scene_text ?? undefined
      ),
  });

  const firstName = profileQuery.data?.display_name?.trim().split(/\s+/)[0] || 'gardener';
  const hour = new Date().getHours();
  const greeting = isNight ? 'Good evening' : hour < 12 ? 'Good morning' : 'Good afternoon';
  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const affirmation =
    pulseLine ?? (isNight ? 'The garden glows tonight.' : 'Your garden waited for you.');

  const plantWish = () => {
    // Free tier: one active dream slot; founders and Full Bloom are open.
    if (!isFullBloom && !isFounder && dreams.length >= FreeTierLimits.activeDreamSlots) {
      router.push('/paywall');
    } else {
      useDreamDraftStore.getState().reset();
      router.push('/create-dream');
    }
  };

  // Shelf rows of three, with the plant-a-wish slot on the last row.
  const shelfItems: (DreamRow | 'plant-slot')[] = [...dreams, 'plant-slot'];
  const shelfRows: (DreamRow | 'plant-slot')[][] = [];
  for (let i = 0; i < shelfItems.length; i += SHELF_COLUMNS) {
    shelfRows.push(shelfItems.slice(i, i + SHELF_COLUMNS));
  }

  return (
    <Screen padded={false}>
      <AmbientLayer />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <ThemedText type="micro" themeColor="textSecondary">
            {dateLine}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            hitSlop={8}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <GardenerIcon size={26} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ThemedText type="display">
          {greeting},{'\n'}
          {firstName}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.affirmation}>
          {affirmation}
        </ThemedText>

        {trophies.length > 0 ? (
          <View
            style={styles.trophyButterflies}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {trophies.slice(0, 6).map((trophy, index) => (
              <Butterfly key={trophy.id} size={18} index={index} />
            ))}
          </View>
        ) : null}

        {returnDream ? (
          <View style={[styles.heroCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.heroCircle, { backgroundColor: theme.backgroundSelected }]}>
              <AnimatedPlant
                state={returnDream.state}
                health={healthFor(returnDream)}
                bloomColor={bloomColorFor(returnDream.id)}
                size={96}
              />
              <Fireflies count={signCounts[returnDream.id] ?? 0} areaSize={HERO_CIRCLE} />
            </View>
            <ThemedText type="cardTitle" numberOfLines={2} style={styles.heroTitle}>
              {returnDream.title}
            </ThemedText>
            <ThemedText type="chip" themeColor="accent">
              Day {daysGrowing(returnDream)} · {returnDream.state}
            </ThemedText>
            <Button
              label={isNight ? "Begin tonight's ritual" : "Begin today's ritual"}
              style={styles.heroButton}
              onPress={() =>
                router.push({ pathname: '/immerse', params: { dreamId: returnDream.id } })
              }
            />
          </View>
        ) : (
          <View style={[styles.heroCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {dreamsQuery.isLoading
                ? 'Tending the soil…'
                : 'Plant your first wish and watch it grow.'}
            </ThemedText>
            {!dreamsQuery.isLoading ? (
              <Button label="Plant a wish" style={styles.heroButton} onPress={plantWish} />
            ) : null}
          </View>
        )}

        <View style={styles.tilesRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Water a dream"
            onPress={() => router.push('/water')}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
            ]}>
            <DropletIcon size={16} color={theme.primary} />
            <ThemedText type="smallBold">Water</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a sign"
            onPress={() => router.push('/add-sign')}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Spark size={15} />
            <ThemedText type="smallBold">Log a sign</ThemedText>
          </Pressable>
          {isNight ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Drift to sleep inside your dream"
              onPress={() => router.push('/water')}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
              ]}>
              <MoonIcon size={16} color={theme.textSecondary} />
              <ThemedText type="smallBold">Drift</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Listen to a meditation"
              onPress={() =>
                returnDream
                  ? router.push({ pathname: '/meditation', params: { dreamId: returnDream.id } })
                  : router.push('/water')
              }
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
              ]}>
              <HeadphonesIcon size={16} color={theme.text} />
              <ThemedText type="smallBold">Listen</ThemedText>
            </Pressable>
          )}
        </View>

        <ThemedText type="micro" themeColor="textSecondary" style={styles.sectionLabel}>
          The greenhouse
        </ThemedText>
        {shelfRows.map((row, rowIndex) => (
          <View key={rowIndex}>
            <View style={styles.shelfRow}>
              {row.map((item, colIndex) =>
                item === 'plant-slot' ? (
                  <Pressable
                    key="plant-slot"
                    accessibilityRole="button"
                    accessibilityLabel="Plant a wish"
                    onPress={plantWish}
                    style={({ pressed }) => [styles.shelfSpot, { opacity: pressed ? 0.8 : 1 }]}>
                    <View
                      style={[
                        styles.plantSlot,
                        { backgroundColor: theme.backgroundElement, borderColor: BrandPalette.warmBrown },
                      ]}>
                      <PlusIcon size={22} color={BrandPalette.warmBrown} />
                    </View>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.potLabel}>
                      Plant a wish
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}, ${item.state}, ${healthFor(item)}${(signCounts[item.id] ?? 0) > 0 ? `, ${signCounts[item.id]} sign${signCounts[item.id] === 1 ? '' : 's'} noticed` : ''}`}
                    onPress={() => setSelectedDreamId(item.id)}
                    style={({ pressed }) => [styles.shelfSpot, { opacity: pressed ? 0.8 : 1 }]}>
                    <NourishablePlant index={rowIndex * SHELF_COLUMNS + colIndex} signal={nourishSignal}>
                      <AnimatedPlant
                        state={item.state}
                        health={healthFor(item)}
                        bloomColor={bloomColorFor(item.id)}
                        size={64}
                      />
                    </NourishablePlant>
                    <View style={styles.pot} />
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.potLabel}>
                      {item.title}
                    </ThemedText>
                  </Pressable>
                )
              )}
            </View>
            <View style={[styles.shelfBar, { opacity: isNight ? 0.6 : 0.85 }]} />
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visit the wishing grove"
          onPress={() => router.push('/greenhouse')}
          style={({ pressed }) => [
            styles.groveCard,
            { backgroundColor: isNight ? theme.backgroundElement : BrandPalette.plum },
            { opacity: pressed ? 0.9 : 1 },
          ]}>
          <Spark size={15} />
          <View style={styles.cardBody}>
            <ThemedText type="emphasis" style={{ color: BrandPalette.cream }}>
              The wishing grove
            </ThemedText>
            <ThemedText type="small" style={{ color: '#C7B9CC' }}>
              {isNight
                ? 'Something small is waiting for you tonight.'
                : 'Charms catch the light. New ones appear at night.'}
            </ThemedText>
          </View>
        </Pressable>

        {nudgeQuery.data?.nudge ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${isNight ? "Tonight's" : "Today's"} whisper: ${nudgeQuery.data.nudge}`}
            onPress={() => router.push('/feed')}
            style={({ pressed }) => [
              styles.whisperCard,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.9 : 1 },
            ]}>
            <Spark size={15} />
            <View style={styles.cardBody}>
              <ThemedText type="micro" themeColor="accent">
                {isNight ? "Tonight's whisper" : "Today's whisper"}
              </ThemedText>
              <ThemedText type="small">{nudgeQuery.data.nudge}</ThemedText>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      {weather?.isRaining || weather?.isSnowing ? (
        <RainOverlay snow={!!weather.isSnowing} />
      ) : null}

      <DreamDetailSheet
        dream={isFocused ? selectedDream : null}
        effectiveHealth={selectedDream ? healthFor(selectedDream) : null}
        onClose={() => setSelectedDreamId(null)}
      />

      <DelightMoment reward={reward} onClose={() => setReward(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  affirmation: {
    fontStyle: 'italic',
    marginTop: -Spacing.two,
  },
  trophyButterflies: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroCircle: {
    width: HERO_CIRCLE,
    height: HERO_CIRCLE,
    borderRadius: HERO_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  heroButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  tile: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  shelfRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: Spacing.two,
  },
  shelfSpot: {
    width: 96,
    alignItems: 'center',
    gap: Spacing.one,
  },
  pot: {
    width: 40,
    height: 24,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -6,
  },
  plantSlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potLabel: {
    maxWidth: 96,
    fontSize: 12,
  },
  shelfBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandPalette.warmBrown,
    marginBottom: Spacing.two,
  },
  groveCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  whisperCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  nourishSpark: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
  },
});
