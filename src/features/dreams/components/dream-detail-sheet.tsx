import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DictationButton } from '@/components/dictation-button';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { VividnessSeed } from '@/components/vividness-seed';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDictation } from '@/features/dictation/use-dictation';
import { addSign, fetchSessions, fetchSigns } from '@/features/dreams/signs';
import type { DreamHealth, DreamRow } from '@/lib/supabase/database.types';

export interface DreamDetailSheetProps {
  dream: DreamRow | null;
  effectiveHealth: DreamHealth | null;
  onClose: () => void;
}

export function DreamDetailSheet({ dream, effectiveHealth, onClose }: DreamDetailSheetProps) {
  const queryClient = useQueryClient();
  const [isAddingSign, setIsAddingSign] = useState(false);
  const [signText, setSignText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const dictation = useDictation((finalText) => {
    setSignText((current) => (current ? `${current} ${finalText}` : finalText));
  });

  const signsQuery = useQuery({
    queryKey: ['signs', dream?.id],
    queryFn: () => fetchSigns(dream!.id),
    enabled: !!dream,
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions', dream?.id],
    queryFn: () => fetchSessions(dream!.id),
    enabled: !!dream,
  });

  const addSignMutation = useMutation({
    mutationFn: () => addSign({ dreamId: dream!.id, text: signText.trim(), photoUri }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signs', dream?.id] });
      queryClient.invalidateQueries({ queryKey: ['dreams'] });
      setSignText('');
      setPhotoUri(undefined);
      setIsAddingSign(false);
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    setIsAddingSign(false);
    setSignText('');
    setPhotoUri(undefined);
    onClose();
  };

  const isDormant = effectiveHealth === 'dormant';

  return (
    <Sheet visible={!!dream} onClose={handleClose}>
      {dream ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">{dream.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Planted{' '}
            {dream.planted_at
              ? new Date(dream.planted_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'recently'}{' '}
            · {dream.state} · {effectiveHealth ?? dream.health}
          </ThemedText>

          {isAddingSign ? (
            <>
              <ThemedText type="smallBold">Signs it’s growing</ThemedText>
              <TextField
                label="What did you notice?"
                value={
                  dictation.isListening && dictation.transcript ? dictation.transcript : signText
                }
                onChangeText={setSignText}
                multiline
                placeholder="A synchronicity, a small win, a nudge from the world…"
                editable={!dictation.isListening}
                errorText={dictation.error ?? undefined}
              />
              <View style={styles.signActions}>
                <DictationButton
                  isListening={dictation.isListening}
                  onPress={() => (dictation.isListening ? dictation.stop() : dictation.start())}
                />
                <Button
                  label={photoUri ? 'Change photo' : 'Add photo'}
                  variant="secondary"
                  onPress={pickPhoto}
                />
              </View>
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
              {addSignMutation.error ? (
                <ThemedText themeColor="danger">
                  Couldn’t save your sign. Please try again.
                </ThemedText>
              ) : null}
              <Button
                label="Save this sign"
                loading={addSignMutation.isPending}
                disabled={signText.trim().length < 2 || dictation.isListening}
                onPress={() => addSignMutation.mutate()}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setIsAddingSign(false)} />
            </>
          ) : (
            <>
              <View style={styles.seedRow}>
                <VividnessSeed score={dream.vividness_score ?? 0} size={72} />
              </View>

              {dream.scene_text ? (
                <Card>
                  <ThemedText type="small" style={styles.scene}>
                    {dream.scene_text}
                  </ThemedText>
                </Card>
              ) : null}

              {isDormant ? (
                <Card>
                  <ThemedText type="smallBold">This dream is resting</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Dormant dreams never die. A two-minute re-commitment brings it back to life
                    whenever you’re ready.
                  </ThemedText>
                  <Button
                    label="Revive this dream"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/revive', params: { dreamId: dream.id } });
                    }}
                  />
                </Card>
              ) : (
                <View style={styles.actions}>
                  <Button
                    label="Water"
                    variant="secondary"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/water', params: { dreamId: dream.id } });
                    }}
                  />
                  <Button
                    label="Feed"
                    variant="secondary"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/feed', params: { dreamId: dream.id } });
                    }}
                  />
                  <Button label="Add a Sign" onPress={() => setIsAddingSign(true)} />
                  <Button
                    label="Personalized meditation ✦"
                    variant="secondary"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/meditation', params: { dreamId: dream.id } });
                    }}
                  />
                  <Button
                    label="It came true — harvest 🌾"
                    variant="ghost"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/harvest', params: { dreamId: dream.id } });
                    }}
                  />
                </View>
              )}

              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Signs it’s growing
              </ThemedText>
              {signsQuery.data?.length ? (
                signsQuery.data.map((sign) => (
                  <View key={sign.id} style={styles.signRow}>
                    <Spark size={12} style={styles.signSpark} />
                    <View style={styles.signBody}>
                      <ThemedText type="small">{sign.text}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(sign.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Noticed any signs lately? Log the small wins and synchronicities here.
                </ThemedText>
              )}

              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Session history
              </ThemedText>
              {sessionsQuery.data?.length ? (
                sessionsQuery.data.map((session) => (
                  <ThemedText key={session.id} type="small" themeColor="textSecondary">
                    {session.type === 'water' ? '💧' : '🌿'}{' '}
                    {session.activity_id === 'revive' ? 'Re-commitment' : session.type} ·{' '}
                    {new Date(session.completed_at).toLocaleDateString()}
                  </ThemedText>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Sessions you complete will appear here.
                </ThemedText>
              )}
            </>
          )}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  seedRow: {
    alignItems: 'center',
  },
  scene: {
    fontStyle: 'italic',
  },
  actions: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  signRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  signSpark: {
    marginTop: 4,
  },
  signBody: {
    flex: 1,
    gap: 2,
  },
  signActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: Spacing.two,
  },
});
