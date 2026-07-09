import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { goBackOrHome } from '@/lib/navigation';
import * as Haptics from 'expo-haptics';
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
import type { TrophyRow } from '@/lib/supabase/database.types';

export default function HarvestScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();
  const [trophy, setTrophy] = useState<TrophyRow | null>(null);
  const [capsuleText, setCapsuleText] = useState<string | null>(null);

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const harvestMutation = useMutation({
    mutationFn: () => {
      // Capture the sealed note before the dream leaves the active list.
      setCapsuleText(dream?.capsule_text ?? null);
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

  if (trophy) {
    const date = new Date(trophy.harvested_at).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <Screen style={styles.container}>
        <View style={styles.celebration}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.butterflies}>
            <Butterfly size={30} color={BrandPalette.gold} index={0} />
            <Butterfly size={22} index={1} />
            <Butterfly size={26} index={2} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(700)}>
            <ThemedText type="title" style={styles.centered}>
              Harvested!
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
                <ThemedText type="smallBold">From the day you planted this:</ThemedText>
              </View>
              <ThemedText type="small" style={styles.capsuleText}>
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
              A plaque now rests on your garden path, and a butterfly will fly here forever.
            </ThemedText>
          </Animated.View>
        </View>

        <Button
          label="Visit the greenhouse"
          onPress={() => {
            goBackOrHome();
            router.navigate('/(app)/greenhouse');
          }}
        />
        <Button label="Back to the garden" variant="ghost" onPress={() => goBackOrHome()} />
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
    backgroundColor: '#8B8680',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.five,
    borderWidth: 2,
    borderColor: '#6F6A64',
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
});
