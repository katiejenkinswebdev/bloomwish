import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Butterfly } from '@/components/butterfly';
import { Fireflies } from '@/components/fireflies';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { FreeTierLimits } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { DreamDetailSheet } from '@/features/dreams/components/dream-detail-sheet';
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
import { grantElevenEleven, maybeGrantReward, type GrantedReward } from '@/features/rewards/api';
import { DelightMoment } from '@/features/rewards/components/delight-moment';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import { BrandPalette } from '@/constants/brand-palette';
import { fetchLocalWeather } from '@/features/weather/weather-mirror';
import { RainOverlay } from '@/components/rain-overlay';
import { computeGardenWidgetState, syncWidgets } from '@/features/widget/widget-state';
import type { DreamRow } from '@/lib/supabase/database.types';

const PLANT_AREA = 132;

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
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );
  const [reward, setReward] = useState<GrantedReward | null>(null);
  const isFullBloom = useIsFullBloom();

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
  // The daily ritual returns to the dream that's waited longest for you.
  const returnDream = [...dreams].sort(
    (a, b) => new Date(a.last_interacted_at).getTime() - new Date(b.last_interacted_at).getTime()
  )[0];

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Your wish garden</ThemedText>
        <Spark size={20} />
      </View>

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
              Step inside for 90 seconds - feel it as already real.
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
              : 'Your dreams will take root here once you plant your first one.'}
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
                <PlantGlyph state={dream.state} health={healthFor(dream)} size={96} />
                <Fireflies count={signCounts[dream.id] ?? 0} areaSize={PLANT_AREA} />
              </View>
              <ThemedText type="small" numberOfLines={1} style={styles.plantTitle}>
                {dream.title}
              </ThemedText>
            </Pressable>
          ))}

        </ScrollView>
      )}

      {dreams.length > 0 ? (
        <Button
          label="Log a sign"
          variant="secondary"
          onPress={() =>
            dreams.length === 1
              ? router.push({ pathname: '/add-sign', params: { dreamId: dreams[0].id } })
              : router.push('/add-sign')
          }
          style={styles.signButton}
        />
      ) : null}
      <Button
        label="Plant a dream"
        onPress={() => {
          // Free tier: one active dream slot; more slots live in Full Bloom.
          if (!isFullBloom && dreams.length >= FreeTierLimits.activeDreamSlots) {
            router.push('/paywall');
          } else {
            router.push('/create-dream');
          }
        }}
        style={styles.plantButton}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  plantWrapper: {
    width: PLANT_AREA,
    height: PLANT_AREA,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  plantTitle: {
    maxWidth: PLANT_AREA,
  },
  signButton: {
    marginBottom: Spacing.two,
  },
  plantButton: {
    marginBottom: Spacing.five,
  },
  trophyButterflies: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
