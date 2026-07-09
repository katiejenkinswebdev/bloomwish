import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
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
import { syncNotifications } from '@/features/notifications/scheduler';
import { fetchProfile, profileQueryKey } from '@/features/profile/api';
import { maybeGrantReward, type GrantedReward } from '@/features/rewards/api';
import { DelightMoment } from '@/features/rewards/components/delight-moment';
import { seasonalTouch } from '@/features/rewards/season';
import { useIsFullBloom } from '@/features/purchases/entitlements';
import { computeGardenWidgetState, syncWidgets } from '@/features/widget/widget-state';
import type { DreamRow } from '@/lib/supabase/database.types';

const PLANT_AREA = 132;

// One app-open delight roll per launch, not per navigation.
let hasRolledThisLaunch = false;

export default function GardenScreen() {
  const [selectedDream, setSelectedDream] = useState<DreamRow | null>(null);
  const [reward, setReward] = useState<GrantedReward | null>(null);
  const isFullBloom = useIsFullBloom();
  const [season] = useState(() => seasonalTouch());

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const configQuery = useQuery({
    queryKey: healthConfigQueryKey,
    queryFn: fetchHealthDecayConfig,
    staleTime: 1000 * 60 * 60,
  });
  const signCountsQuery = useQuery({ queryKey: ['sign-counts'], queryFn: fetchSignCounts });
  const trophiesQuery = useQuery({ queryKey: ['trophies'], queryFn: fetchTrophies });
  const profileQuery = useQuery({ queryKey: profileQueryKey, queryFn: fetchProfile });

  useEffect(() => {
    if (hasRolledThisLaunch) return;
    hasRolledThisLaunch = true;
    maybeGrantReward('app_open', { includeLegendary: isFullBloom })
      .then(setReward)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local notifications and home-screen widgets aligned with reality.
  useEffect(() => {
    if (!dreamsQuery.data || profileQuery.data === undefined) return;
    syncNotifications({
      profile: profileQuery.data,
      dreams: dreamsQuery.data,
      decayConfig: configQuery.data,
    });
    syncWidgets(computeGardenWidgetState(dreamsQuery.data, configQuery.data));
  }, [dreamsQuery.data, profileQuery.data, configQuery.data]);

  const dreams = dreamsQuery.data ?? [];
  const signCounts = signCountsQuery.data ?? {};
  const trophies = trophiesQuery.data ?? [];
  const healthFor = (dream: DreamRow) => deriveHealth(dream, configQuery.data);

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">Your garden</ThemedText>
        <Spark size={20} />
        <ThemedText accessibilityLabel={season.greeting}>{season.glyph}</ThemedText>
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
              onPress={() => setSelectedDream(dream)}
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
            <View style={styles.gardenPath}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.pathLabel}>
                The garden path
              </ThemedText>
              <View style={styles.plaqueRow}>
                {trophies.map((trophy) => (
                  <View key={trophy.id} style={styles.pathPlaque}>
                    <ThemedText type="small" numberOfLines={1} style={styles.pathPlaqueText}>
                      {trophy.dream_title}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pathPlaqueText}>
                      {new Date(trophy.harvested_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {dreams.length > 0 ? (
        <Button
          label="✨ Log a sign"
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

      <DreamDetailSheet
        dream={selectedDream}
        effectiveHealth={selectedDream ? healthFor(selectedDream) : null}
        onClose={() => setSelectedDream(null)}
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
  gardenPath: {
    width: '100%',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  pathLabel: {
    textAlign: 'center',
  },
  plaqueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  pathPlaque: {
    backgroundColor: '#8B8680',
    borderColor: '#6F6A64',
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    maxWidth: 150,
    alignItems: 'center',
  },
  pathPlaqueText: {
    color: '#F5F2EC',
  },
});
