import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { goBackOrHome } from '@/lib/navigation';
import { DictationButton } from '@/components/dictation-button';
import { PlantGlyph } from '@/components/plant-glyph';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { fetchDreams, releaseDream } from '@/features/dreams/api';
import type { DreamRow } from '@/lib/supabase/database.types';

/**
 * The release ritual: thank the wish, say goodbye, let it return to the
 * soil. A third honest ending beside harvest and dormancy — completion of a
 * different kind, never framed as failure. The app never suggests this;
 * the user always arrives here on their own.
 */

type Phase = 'thank' | 'goodbye' | 'done';

/** The plant sinking gently back into the soil. */
function ReleaseMoment({ dream, onDone }: { dream: DreamRow; onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const sink = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    sink.value = withDelay(
      600,
      withTiming(1, { duration: 2400, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plantStyle = useAnimatedStyle(() => ({
    opacity: 1 - sink.value * 0.95,
    transform: [{ translateY: sink.value * 110 }, { scale: 1 - sink.value * 0.45 }],
  }));

  return (
    <View style={styles.momentArea}>
      <Animated.View style={plantStyle}>
        <PlantGlyph state={dream.state} health="healthy" size={110} />
      </Animated.View>
      <View style={styles.soil} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
        returning to the soil, with thanks…
      </ThemedText>
    </View>
  );
}

export default function ReleaseScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('thank');
  const [gratitude, setGratitude] = useState('');
  // Snapshot for the goodbye animation — the cache invalidation removes the
  // dream mid-sink, and the ritual must finish from what it was.
  const [releasedDream, setReleasedDream] = useState<DreamRow | null>(null);

  const dictation = useDictation((finalText) => {
    setGratitude((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const dreamsQuery = useQuery({ queryKey: ['dreams'], queryFn: fetchDreams });
  const dream = dreamsQuery.data?.find((d) => d.id === dreamId);

  const releaseMutation = useMutation({
    mutationFn: () => releaseDream({ dreamId: dreamId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      queryClient.invalidateQueries({ queryKey: ['sign-counts'] });
    },
  });

  if (!dream && phase === 'thank') {
    return (
      <Screen style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          {dreamsQuery.isLoading ? 'One moment…' : 'This dream has already moved on.'}
        </ThemedText>
        <Button label="Back" variant="ghost" onPress={() => goBackOrHome()} />
      </Screen>
    );
  }

  // ── Goodbye: the plant sinks while the release lands ──
  if (phase === 'goodbye' && releasedDream) {
    return (
      <Screen style={styles.centered}>
        <ReleaseMoment dream={releasedDream} onDone={() => setPhase('done')} />
      </Screen>
    );
  }

  // ── Done ──
  if (phase === 'done') {
    return (
      <Screen style={styles.centered}>
        {releaseMutation.isError ? (
          <>
            <ThemedText themeColor="danger" style={styles.centeredText}>
              The release didn’t save. Please try again.
            </ThemedText>
            <Button
              label="Try again"
              loading={releaseMutation.isPending}
              onPress={() => releaseMutation.mutate()}
            />
            <Button label="Back" variant="ghost" onPress={() => goBackOrHome()} />
          </>
        ) : (
          <>
            <Spark size={24} style={styles.centerSelf} />
            <ThemedText type="title" style={styles.centeredText}>
              Returned to the soil, with thanks.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
              {(releaseMutation.data?.survivors ?? 0) > 0
                ? 'Nothing planted is ever wasted — its energy feeds the rest of your garden.'
                : 'Nothing planted is ever wasted.'}
            </ThemedText>
            <Button
              label="Back to the garden"
              disabled={releaseMutation.isPending}
              onPress={() => goBackOrHome()}
            />
          </>
        )}
      </Screen>
    );
  }

  // ── Thank it ──
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Release this dream</ThemedText>
        <ThemedText themeColor="textSecondary">
          Some wishes finish by coming true. Others finish by teaching us what we really want.
        </ThemedText>

        <View style={styles.plantRow}>
          <PlantGlyph state={dream!.state} health="healthy" size={72} />
          <ThemedText type="smallBold" style={styles.plantTitle} numberOfLines={2}>
            {dream!.title}
          </ThemedText>
        </View>

        <TextField
          placeholder="What did this wish give you? (optional)"
          value={dictation.isListening && dictation.transcript ? dictation.transcript : gratitude}
          onChangeText={setGratitude}
          multiline
          editable={!dictation.isListening}
          errorText={dictation.error ?? undefined}
        />
        <DictationButton
          isListening={dictation.isListening}
          onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Releasing can’t be undone — the dream, its signs, and its history return to the soil.
        </ThemedText>

        <Button
          label="Release with thanks"
          disabled={dictation.isListening}
          onPress={() => {
            if (dictation.isListening) dictation.stop();
            setReleasedDream(dream!);
            releaseMutation.mutate();
            setPhase('goodbye');
          }}
        />
        <Button label="Keep tending instead" variant="ghost" onPress={() => goBackOrHome()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  centered: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  centerSelf: {
    alignSelf: 'center',
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  plantTitle: {
    flex: 1,
  },
  momentArea: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  soil: {
    width: 190,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandPalette.warmBrown,
    marginTop: -Spacing.four,
  },
});
