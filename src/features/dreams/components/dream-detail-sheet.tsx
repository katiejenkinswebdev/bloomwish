import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { VividnessSeed } from '@/components/vividness-seed';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { AddSignForm } from '@/features/dreams/components/add-sign-form';
import { fetchSessions, fetchSigns } from '@/features/dreams/signs';
import type { DreamHealth, DreamRow } from '@/lib/supabase/database.types';

export interface DreamDetailSheetProps {
  dream: DreamRow | null;
  effectiveHealth: DreamHealth | null;
  onClose: () => void;
}

export function DreamDetailSheet({ dream, effectiveHealth, onClose }: DreamDetailSheetProps) {
  const [isAddingSign, setIsAddingSign] = useState(false);

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

  const handleClose = () => {
    setIsAddingSign(false);
    onClose();
  };

  const isDormant = effectiveHealth === 'dormant';

  return (
    <Sheet visible={!!dream} onClose={handleClose}>
      {dream ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
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
              <AddSignForm
                dreamId={dream.id}
                onSaved={() => setIsAddingSign(false)}
                onCancel={() => setIsAddingSign(false)}
              />
            </>
          ) : (
            <>
              <View style={styles.seedRow}>
                <VividnessSeed
                  score={dream.vividness_score ?? 0}
                  size={72}
                  plant={{ state: dream.state, health: effectiveHealth ?? dream.health }}
                />
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
  scroll: {
    flexShrink: 1,
  },
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
