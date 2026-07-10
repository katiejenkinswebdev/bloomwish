import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ActionIconButton } from '@/components/action-icon-button';
import { DropletIcon } from '@/components/droplet-icon';
import { LeafIcon } from '@/components/icons';
import { Spark } from '@/components/spark';
import { ThemedText } from '@/components/themed-text';
import { VividnessSeed } from '@/components/vividness-seed';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { BrandPalette } from '@/constants/brand-palette';
import { Spacing } from '@/constants/theme';
import { bloomColorFor } from '@/features/dreams/bloom-color';
import { fetchSessions, fetchSigns } from '@/features/dreams/signs';
import { useTheme } from '@/hooks/use-theme';
import { useDreamDraftStore } from '@/store/dream-draft-store';
import type { DreamHealth, DreamRow } from '@/lib/supabase/database.types';

/** Warm, human status per health level — never raw enum text. */
function healthStatus(health: DreamHealth): { label: string; bg: string; fg: string } {
  switch (health) {
    case 'thriving':
      return { label: 'Thriving', bg: BrandPalette.gold, fg: BrandPalette.plum };
    case 'healthy':
      return { label: 'Growing steadily', bg: BrandPalette.sage, fg: BrandPalette.plum };
    case 'wilting':
      return {
        label: 'Missing you — a little water would help',
        bg: '#E8C98F',
        fg: BrandPalette.plum,
      };
    case 'dormant':
      return {
        label: 'Resting — ready to revive when you are',
        bg: '#B8B0A3',
        fg: '#3E3A33',
      };
  }
}

const STATE_LABEL: Record<string, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  growing: 'Growing',
  budding: 'Budding',
  blooming: 'Blooming',
};

export interface DreamDetailSheetProps {
  dream: DreamRow | null;
  effectiveHealth: DreamHealth | null;
  onClose: () => void;
}

export function DreamDetailSheet({ dream, effectiveHealth, onClose }: DreamDetailSheetProps) {
  const theme = useTheme();
  // Collapsible sections, keyed to the open dream so a different plant
  // always starts tidy (no effect needed — stale ids read as collapsed).
  const [sections, setSections] = useState({
    id: null as string | null,
    signs: false,
    history: false,
  });
  // Defensive ?? — hot-reload sequences have been seen nulling preserved
  // state mid-session; a fresh mount can never hit this.
  const signsOpen = (sections?.id ?? null) === (dream?.id ?? undefined) && !!sections?.signs;
  const historyOpen = (sections?.id ?? null) === (dream?.id ?? undefined) && !!sections?.history;
  const toggleSigns = () =>
    setSections({ id: dream!.id, signs: !signsOpen, history: historyOpen });
  const toggleHistory = () =>
    setSections({ id: dream!.id, signs: signsOpen, history: !historyOpen });

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
          <View style={styles.hero}>
            <VividnessSeed
              score={dream.vividness_score ?? 0}
              size={88}
              plant={{
                state: dream.state,
                health: effectiveHealth ?? dream.health,
                bloomColor: bloomColorFor(dream.id),
              }}
            />
            <ThemedText type="subtitle" style={styles.heroTitle}>
              {dream.title}
            </ThemedText>
            {(() => {
              const status = healthStatus(effectiveHealth ?? dream.health);
              return (
                <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                  <ThemedText type="smallBold" style={{ color: status.fg }}>
                    {status.label}
                  </ThemedText>
                </View>
              );
            })()}
            <ThemedText type="small" themeColor="textSecondary">
              {STATE_LABEL[dream.state]} · planted{' '}
              {dream.planted_at
                ? new Date(dream.planted_at).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                  })
                : 'recently'}
            </ThemedText>
          </View>


              {dream.scene_text ? (
                <Card>
                  <ThemedText type="small" style={styles.scene}>
                    {dream.scene_text}
                  </ThemedText>
                </Card>
              ) : (
                <Card>
                  <ThemedText type="small" themeColor="textSecondary">
                    This wish was planted fast — it has no scene yet.
                  </ThemedText>
                  <Button
                    label="Make it vivid ✦"
                    onPress={() => {
                      const store = useDreamDraftStore.getState();
                      store.reset();
                      store.setDreamText(dream.wish_text ?? dream.title);
                      store.setDeepenDreamId(dream.id);
                      router.push('/create-dream');
                    }}
                  />
                </Card>
              )}

              {isDormant ? (
                <Card>
                  <ThemedText type="smallBold">This dream is resting</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Dormant dreams never die. A two-minute re-commitment brings it back to life
                    whenever you’re ready.
                  </ThemedText>
                  <Button
                    label="Revive this dream"
                    onPress={() =>
                      router.push({ pathname: '/revive', params: { dreamId: dream.id } })
                    }
                  />
                </Card>
              ) : (
                <>
                <View style={styles.iconRow}>
                  <ActionIconButton
                    label="Water"
                    accessibilityLabel="Water this dream"
                    backgroundColor="#41799E"
                    onPress={() =>
                      router.push({ pathname: '/water', params: { dreamId: dream.id } })
                    }>
                    <DropletIcon size={26} />
                  </ActionIconButton>
                  <ActionIconButton
                    label="Feed"
                    accessibilityLabel="Feed this dream"
                    backgroundColor={BrandPalette.deepGreen}
                    onPress={() =>
                      router.push({ pathname: '/feed', params: { dreamId: dream.id } })
                    }>
                    <LeafIcon size={28} color="#FFFFFF" />
                  </ActionIconButton>
                  <ActionIconButton
                    label="Sign"
                    accessibilityLabel="Log a sign your dream is growing"
                    backgroundColor={BrandPalette.plum}
                    onPress={() =>
                      router.push({ pathname: '/add-sign', params: { dreamId: dream.id } })
                    }>
                    <Spark size={22} />
                  </ActionIconButton>
                </View>
                <View style={styles.actions}>
                  <Button
                    label="Step inside the dream"
                    onPress={() =>
                      router.push({ pathname: '/immerse', params: { dreamId: dream.id } })
                    }
                  />
                  {dream.scene_text ? (
                    <Button
                      label="Personalized meditation ✦"
                      variant="secondary"
                      onPress={() =>
                        router.push({ pathname: '/meditation', params: { dreamId: dream.id } })
                      }
                    />
                  ) : null}
                  <Button
                    label="It came true — harvest"
                    variant="ghost"
                    onPress={() => {
                      handleClose();
                      router.push({ pathname: '/harvest', params: { dreamId: dream.id } });
                    }}
                  />
                </View>
                </>
              )}

              <Button
                label="Release this dream"
                variant="ghost"
                onPress={() =>
                  router.push({ pathname: '/release', params: { dreamId: dream.id } })
                }
              />

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: signsOpen }}
                accessibilityLabel={`Signs it's growing, ${signsQuery.data?.length ?? 0} logged`}
                hitSlop={{ top: 8, bottom: 8 }}
                onPress={toggleSigns}
                style={styles.sectionHeader}>
                <ThemedText type="smallBold">
                  Signs it’s growing{signsQuery.data?.length ? ` (${signsQuery.data.length})` : ''}
                </ThemedText>
                <View
                  style={[
                    styles.chevron,
                    { borderColor: theme.textSecondary },
                    signsOpen && styles.chevronOpen,
                  ]}
                />
              </Pressable>
              {signsOpen ? (
                signsQuery.data?.length ? (
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
                )
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: historyOpen }}
                accessibilityLabel={`Session history, ${sessionsQuery.data?.length ?? 0} sessions`}
                hitSlop={{ top: 8, bottom: 8 }}
                onPress={toggleHistory}
                style={styles.sectionHeader}>
                <ThemedText type="smallBold">
                  Session history
                  {sessionsQuery.data?.length ? ` (${sessionsQuery.data.length})` : ''}
                </ThemedText>
                <View
                  style={[
                    styles.chevron,
                    { borderColor: theme.textSecondary },
                    historyOpen && styles.chevronOpen,
                  ]}
                />
              </Pressable>
              {historyOpen ? (
                sessionsQuery.data?.length ? (
                  sessionsQuery.data.map((session) => (
                  <View key={session.id} style={styles.sessionRow}>
                    {session.type === 'water' ? (
                      <DropletIcon size={11} color="#5D9DC4" />
                    ) : (
                      <LeafIcon size={13} />
                    )}
                    <ThemedText type="small" themeColor="textSecondary">
                      {session.activity_id === 'revive' ? 'Re-commitment' : session.type} ·{' '}
                      {new Date(session.completed_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  ))
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Sessions you complete will appear here.
                  </ThemedText>
                )
              ) : null}

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
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroTitle: {
    textAlign: 'center',
  },
  statusChip: {
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  scene: {
    fontStyle: 'italic',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.six,
    paddingVertical: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginRight: Spacing.one,
  },
  chevronOpen: {
    transform: [{ rotate: '225deg' }],
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
    borderRadius: Spacing.three,
  },
});
