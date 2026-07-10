import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as StoreReview from 'expo-store-review';
import { captureRef } from 'react-native-view-shot';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Butterfly } from '@/components/butterfly';
import { Spark } from '@/components/spark';
import { EnvelopeIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Branding } from '@/config/branding';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { fetchDreams } from '@/features/dreams/api';
import { harvestDream } from '@/features/harvest/api';
import { HarvestShareCard } from '@/features/harvest/components/harvest-share-card';
import type { TrophyRow } from '@/lib/supabase/database.types';

export default function HarvestScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();
  const [trophy, setTrophy] = useState<TrophyRow | null>(null);
  const [capsuleText, setCapsuleText] = useState<string | null>(null);
  const [plantedAt, setPlantedAt] = useState<string | null>(null);
  const shareCardRef = useRef<View>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const harvestMutation = useMutation({
    mutationFn: () => {
      // Capture keepsake facts before the dream leaves the active list.
      setCapsuleText(dream?.capsule_text ?? null);
      setPlantedAt(dream?.planted_at ?? null);
      return harvestDream(dreamId!);
    },
    onSuccess: (awarded) => {
      setTrophy(awarded);
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['trophies'] });
      queryClient.invalidateQueries({ queryKey: ['harvested-dreams'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  // The one moment we ever ask for a rating: mid-celebration, once per
  // lifetime, never after an error. No-ops where unsupported (web).
  useEffect(() => {
    if (!trophy) return;
    const t = setTimeout(async () => {
      try {
        const asked = await AsyncStorage.getItem('bloomwish:rating-asked');
        if (asked) return;
        if (!(await StoreReview.isAvailableAsync())) return;
        await AsyncStorage.setItem('bloomwish:rating-asked', 'yes');
        await StoreReview.requestReview();
      } catch {
        // Never let a review prompt disturb the celebration.
      }
    }, 3500);
    return () => clearTimeout(t);
  }, [trophy]);

  const shareBloom = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: capture to a data URI, then the native share sheet where the
        // browser supports files (mobile Safari/Chrome), else download the
        // image so it can be posted anywhere.
        const dataUri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
          result: 'data-uri',
        });
        const blob = await (await fetch(dataUri)).blob();
        const file = new File([blob], 'bloomwish-it-came-true.png', { type: 'image/png' });
        const nav = navigator as Navigator & {
          canShare?: (data: { files: File[] }) => boolean;
          share?: (data: { files: File[] }) => Promise<void>;
        };
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({ files: [file] });
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'bloomwish-it-came-true.png';
          link.click();
          URL.revokeObjectURL(link.href);
        }
        return;
      }
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri.startsWith('file') ? uri : `file://${uri}`, {
        mimeType: 'image/png',
        dialogTitle: 'Share this bloom',
      });
    } catch {
      // User dismissed the sheet, or capture failed — stay quiet either way.
    }
  };

  if (trophy) {
    const date = new Date(trophy.harvested_at).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.celebrationScroll}>
        <View style={styles.celebration}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.butterflies}>
            <Butterfly size={30} color={BrandPalette.gold} index={0} />
            <Butterfly size={22} index={1} />
            <Butterfly size={26} index={2} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(700)}>
            <ThemedText type="title" style={styles.centered}>
              A {Branding.appName} come true
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(1100).duration(700)} style={styles.plaque}>
            <Spark size={16} />
            <ThemedText type="smallBold" style={[styles.centered, styles.plaqueText]}>
              {trophy.dream_title}
            </ThemedText>
            <ThemedText type="small" style={[styles.centered, styles.plaqueText]}>
              Came true {date}
            </ThemedText>
            <ThemedText type="small" style={[styles.centered, styles.plaqueText]}>
              Tended {trophy.total_sessions} time{trophy.total_sessions === 1 ? '' : 's'}
            </ThemedText>
          </Animated.View>

          {capsuleText ? (
            <Animated.View entering={FadeInUp.delay(1700).duration(700)} style={styles.capsule}>
              <View style={styles.capsuleHeader}>
                <EnvelopeIcon size={18} holeColor="#F3E9DA" />
                <ThemedText type="smallBold" style={styles.capsuleInk}>
                  From the day you planted this:
                </ThemedText>
              </View>
              <ThemedText type="small" style={[styles.capsuleText, styles.capsuleInk]}>
                “{capsuleText}”
              </ThemedText>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInUp.delay(capsuleText ? 2400 : 1700).duration(700)}
            style={styles.affirmation}>
            <ThemedText type="subtitle" style={styles.centered}>
              {Branding.affirmation}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              A charm in your grove. A butterfly, forever.
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(capsuleText ? 3000 : 2300).duration(700)}
          style={styles.shareSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share this bloom"
            onPress={shareBloom}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
            <HarvestShareCard ref={shareCardRef} trophy={trophy} plantedAt={plantedAt} />
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Tap the card to share it.
          </ThemedText>
        </Animated.View>

        <Button
          label="Visit the greenhouse"
          onPress={() => {
            goBackOrHome();
            router.navigate('/(app)/greenhouse');
          }}
        />
        <Button label="Back to the garden" variant="ghost" onPress={() => goBackOrHome()} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="title" style={styles.centered}>
        Did this dream come true?
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centered}>
        {dream?.title ?? 'This dream'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        Harvesting celebrates a dream that has bloomed in your real life. It moves to your
        greenhouse as a keepsake, engraved with today’s date.
      </ThemedText>

      {harvestMutation.error ? (
        <ThemedText themeColor="danger" style={styles.centered}>
          Couldn’t harvest just now. Please try again.
        </ThemedText>
      ) : null}

      <Button
        label="Yes — harvest it"
        loading={harvestMutation.isPending}
        onPress={() => harvestMutation.mutate()}
      />
      <Button label="Not yet" variant="ghost" onPress={() => goBackOrHome()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.three,
  },
  celebrationScroll: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  shareSection: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  celebration: {
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  butterflies: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  plaque: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#6F6A64',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.five,
    borderWidth: 2,
    borderColor: '#57534E',
  },
  plaqueText: {
    color: '#F5F2EC',
  },
  affirmation: {
    gap: Spacing.two,
  },
  capsuleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  capsule: {
    backgroundColor: '#F3E9DA',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  capsuleText: {
    fontStyle: 'italic',
  },
  // The card's paper is always cream, so the ink must always be dark —
  // theme text color goes light in dark mode and vanishes here.
  capsuleInk: {
    color: '#4A4036',
  },
});
