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

import { Butterfly } from '@/components/butterfly';
import { Fireflies } from '@/components/fireflies';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { FreeTierLimits } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { DreamDetailSheet } from '@/features/dreams/components/dream-detail-sheet';
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
import { PlusIcon } from '@/components/icons';
import { BrandPalette } from '@/constants/brand-palette';
import { fetchLocalWeather } from '@/features/weather/weather-mirror';
import { useDreamDraftStore } from '@/store/dream-draft-store';
import { RainOverlay } from '@/components/rain-overlay';
import { computeGardenWidgetState, syncWidgets } from '@/features/widget/widget-state';
import type { DreamRow } from '@/lib/supabase/database.types';

const PLANT_AREA = 132;

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

export default function GardenScreen() {
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

  return (
    <Screen>
      <ThemedText type="title" style={styles.header}>
        Your wish garden
      </ThemedText>
      {pulseLine ? (
        <ThemedText type="small" themeColor="textSecondary">
          {pulseLine}
        </ThemedText>
      ) : null}

      {returnDream ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Step inside ${returnDream.title} - a ninety-second immersion`}
          onPress={() =>
            router.push({ pathname: '/immerse', params: { dreamId: returnDream.id } })
          }
          style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.9 : 1 }]}>
          <View style={styles.heroGlowA} pointerEvents="none" />
          <View style={styles.heroGlowB} pointerEvents="none" />
          <View style={styles.heroBody}>
            <ThemedText type="small" style={styles.heroKicker}>
              Return to the feeling
            </ThemedText>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.heroTitle}>
              {returnDream.title}
            </ThemedText>
            <ThemedText type="small" style={styles.heroHint}>
              90 seconds inside the feeling.
            </ThemedText>
          </View>
          <Spark size={26} />
        </Pressable>
      ) : null}

      {trophies.length > 0 ? (
        <View style={styles.trophyButterflies} pointerEvents="none">
          {trophies.slice(0, 6).map((trophy, index) => (
            <Butterfly key={trophy.id} size={18} index={index} />
          ))}
        </View>
      ) : null}

      {dreams.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {dreamsQuery.isLoading
              ? 'Tending the soil…'
              : 'Tap + to plant your first dream.'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.garden}>
          {dreams.map((dream, index) => (
            <Pressable
              key={dream.id}
              accessibilityRole="button"
              accessibilityLabel={`${dream.title}, ${dream.state}, ${healthFor(dream)}`}
              onPress={() => setSelectedDreamId(dream.id)}
              style={({ pressed }) => [
                styles.plot,
                index % 2 === 1 && styles.plotOffset,
                { opacity: pressed ? 0.8 : 1 },
              ]}>
              <View style={styles.plantWrapper}>
                <NourishablePlant index={index} signal={nourishSignal}>
                  <PlantGlyph state={dream.state} health={healthFor(dream)} size={96} />
                </NourishablePlant>
                <Fireflies count={signCounts[dream.id] ?? 0} areaSize={PLANT_AREA} />
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.plantTitle}>
                {dream.title}
              </ThemedText>
            </Pressable>
          ))}

        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Plant a dream"
        onPress={() => {
          // Free tier: one active dream slot; founders and Full Bloom are open.
          if (!isFullBloom && !isFounder && dreams.length >= FreeTierLimits.activeDreamSlots) {
            router.push('/paywall');
          } else {
            useDreamDraftStore.getState().reset();
            router.push('/create-dream');
          }
        }}
        style={({ pressed }) => [
          styles.fab,
          { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pressed ? 0.9 : 1 },
        ]}>
        <PlusIcon size={26} />
      </Pressable>

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
  header: {
    paddingTop: Spacing.three,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#241C36',
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: BrandPalette.deepGreen,
    opacity: 0.3,
    top: -70,
    left: -50,
  },
  heroGlowB: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: BrandPalette.dustyPink,
    opacity: 0.16,
    bottom: -60,
    right: -30,
  },
  heroBody: {
    flex: 1,
    gap: 2,
  },
  heroKicker: {
    color: '#B9A8C6',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  heroTitle: {
    color: '#F2ECF7',
  },
  heroHint: {
    color: '#9E8FAB',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  garden: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: Spacing.four,
    rowGap: Spacing.five,
  },
  plot: {
    width: PLANT_AREA,
    alignItems: 'center',
    gap: Spacing.one,
  },
  plotOffset: {
    marginTop: Spacing.four,
  },
  nourishSpark: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
  },
  plantWrapper: {
    width: PLANT_AREA,
    height: PLANT_AREA,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  plantTitle: {
    maxWidth: PLANT_AREA,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandPalette.deepGreen,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  trophyButterflies: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
