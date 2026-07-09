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

/** Deterministic star spots in the grove's dusk sky (percent-based). */
const STAR_SPOTS = [
  { top: '12%', left: '46%', size: 10 },
  { top: '30%', left: '72%', size: 8 },
  { top: '8%', left: '84%', size: 12 },
  { top: '38%', left: '55%', size: 7 },
  { top: '18%', left: '63%', size: 9 },
  { top: '10%', left: '30%', size: 8 },
  { top: '34%', left: '88%', size: 9 },
  { top: '24%', left: '38%', size: 7 },
  { top: '6%', left: '55%', size: 8 },
  { top: '28%', left: '25%', size: 7 },
] as const;

/** Charms hang at varied string lengths so the garland feels hand-tied. */
const CHARM_DROPS = [10, 22, 14, 26, 18];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
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
  const [charmTrophyId, setCharmTrophyId] = useState<string | null>(null);
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

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Your garden</ThemedText>
        <Spark size={20} />
      </View>

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

          {trophies.length > 0 ? (
            <Pressable
              accessibilityLabel={`The wishing grove: ${trophies.length} dream${trophies.length === 1 ? '' : 's'} came true`}
              onPress={() => setCharmTrophyId(null)}
              style={styles.grove}>
              {/* Stars — one appears for every harvested dream. */}
              {STAR_SPOTS.slice(0, trophies.length).map((spot, i) => (
                <Spark
                  key={i}
                  size={spot.size}
                  style={[styles.groveStar, { top: spot.top, left: spot.left }]}
                />
              ))}

              {/* The wishing tree, anchoring the garlands. */}
              <View style={styles.tree} pointerEvents="none">
                <View style={[styles.canopy, styles.canopyA]} />
                <View style={[styles.canopy, styles.canopyB]} />
                <View style={[styles.canopy, styles.canopyC]} />
                <View style={styles.trunk} />
              </View>

              {/* Garland strings of charms — one gold charm per harvest. */}
              <View style={styles.garlands} pointerEvents="box-none">
                {chunk(trophies, 5).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.garland} pointerEvents="box-none">
                    {row.map((trophy, i) => (
                      <Pressable
                        key={trophy.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${trophy.dream_title}, came true ${new Date(trophy.harvested_at).toLocaleDateString()}`}
                        onPress={() =>
                          setCharmTrophyId(charmTrophyId === trophy.id ? null : trophy.id)
                        }
                        style={styles.charm}>
                        <View style={[styles.charmString, { height: CHARM_DROPS[i % CHARM_DROPS.length] }]} />
                        <View
                          style={[
                            styles.charmTag,
                            charmTrophyId === trophy.id && styles.charmTagActive,
                            { transform: [{ rotate: i % 2 === 0 ? '-7deg' : '6deg' }] },
                          ]}
                        />
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>

              {/* Fireflies drifting through the grove. */}
              <View style={styles.groveFireflies} pointerEvents="none">
                <Fireflies count={Math.min(trophies.length + 2, 7)} areaSize={110} />
              </View>

              {(() => {
                const charm = trophies.find((t) => t.id === charmTrophyId);
                return charm ? (
                  <View style={styles.charmCard}>
                    <ThemedText type="smallBold" numberOfLines={2} style={styles.charmCardInk}>
                      {charm.dream_title}
                    </ThemedText>
                    <ThemedText type="small" style={styles.charmCardInk}>
                      Came true {new Date(charm.harvested_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ) : null;
              })()}
            </Pressable>
          ) : null}
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
  grove: {
    width: '100%',
    minHeight: 190,
    marginTop: Spacing.five,
    borderRadius: Spacing.three,
    backgroundColor: '#2E2438',
    overflow: 'hidden',
    paddingBottom: Spacing.three,
  },
  groveStar: {
    position: 'absolute',
    opacity: 0.85,
  },
  tree: {
    position: 'absolute',
    left: 10,
    bottom: 0,
    width: 96,
    height: 130,
  },
  canopy: {
    position: 'absolute',
    backgroundColor: BrandPalette.deepGreen,
    borderRadius: 999,
  },
  canopyA: {
    width: 74,
    height: 58,
    top: 8,
    left: 8,
  },
  canopyB: {
    width: 54,
    height: 44,
    top: 0,
    left: 34,
    backgroundColor: '#4E8A66',
  },
  canopyC: {
    width: 46,
    height: 38,
    top: 30,
    left: 0,
    backgroundColor: '#356B4D',
  },
  trunk: {
    position: 'absolute',
    bottom: 0,
    left: 42,
    width: 10,
    height: 56,
    borderRadius: 4,
    backgroundColor: BrandPalette.warmBrown,
  },
  garlands: {
    paddingTop: Spacing.four,
    paddingLeft: 104,
    paddingRight: Spacing.three,
    gap: Spacing.four,
  },
  garland: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(233, 180, 76, 0.45)',
    paddingHorizontal: Spacing.two,
  },
  charm: {
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  charmString: {
    width: 1.5,
    backgroundColor: 'rgba(233, 180, 76, 0.45)',
  },
  charmTag: {
    width: 16,
    height: 20,
    borderRadius: 4,
    backgroundColor: BrandPalette.gold,
  },
  charmTagActive: {
    borderWidth: 2,
    borderColor: '#FFF3D6',
  },
  groveFireflies: {
    position: 'absolute',
    right: 6,
    bottom: -6,
    width: 110,
    height: 110,
  },
  charmCard: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.three,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#F6EFE3',
  },
  charmCardInk: {
    color: '#4A4036',
    textAlign: 'center',
  },
});
