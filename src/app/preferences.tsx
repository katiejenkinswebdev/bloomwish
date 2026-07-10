import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionButton } from '@/components/ui/option-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  fetchNotificationPrefs,
  notificationPrefsQueryKey,
  upsertNotificationPrefs,
} from '@/features/notifications/prefs';
import { fetchProfile, profileQueryKey, upsertProfile } from '@/features/profile/api';
import {
  isWeatherMirrorEnabled,
  requestWeatherPermission,
  setWeatherMirrorEnabled,
} from '@/features/weather/weather-mirror';
import { goBackOrHome } from '@/lib/navigation';
import type { ExperienceLevel, TonePreference } from '@/lib/supabase/database.types';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORIES,
  EXPERIENCE_OPTIONS,
  LENGTH_OPTIONS,
  REMINDER_OPTIONS,
  TONE_OPTIONS,
} from '@/app/onboarding/quiz';

/**
 * Everything from the onboarding quiz, editable any time — plus notification
 * toggles. Saving refreshes the profile cache, so the coach's prompts, the
 * reminder time, and every personalized surface use the new answers
 * immediately.
 */
export default function PreferencesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({ queryKey: profileQueryKey, queryFn: fetchProfile });
  const prefsQuery = useQuery({
    queryKey: notificationPrefsQueryKey,
    queryFn: fetchNotificationPrefs,
  });

  // Local edits, seeded from the loaded profile.
  const [edits, setEdits] = useState<{
    displayName?: string;
    category?: string | null;
    experience?: ExperienceLevel | null;
    sessionLength?: number | null;
    tone?: TonePreference | null;
    reminderTime?: string | null;
    dailyOn?: boolean;
    wiltingOn?: boolean;
    delightOn?: boolean;
  }>({});

  const profile = profileQuery.data;
  const prefs = prefsQuery.data;

  // Weather mirror is a device-local touch, not a server preference.
  const [weatherMirror, setWeatherMirror] = useState(false);
  const [weatherDenied, setWeatherDenied] = useState(false);
  useEffect(() => {
    isWeatherMirrorEnabled().then(setWeatherMirror).catch(() => {});
  }, []);
  const toggleWeatherMirror = async (next: boolean) => {
    setWeatherDenied(false);
    if (next) {
      const granted = await requestWeatherPermission();
      if (!granted) {
        setWeatherDenied(true);
        return;
      }
    }
    setWeatherMirror(next);
    await setWeatherMirrorEnabled(next);
    queryClient.invalidateQueries({ queryKey: ['local-weather'] });
  };

  const value = {
    displayName: edits.displayName ?? profile?.display_name ?? '',
    category: edits.category !== undefined ? edits.category : (profile?.first_manifestation_category ?? null),
    experience: edits.experience !== undefined ? edits.experience : (profile?.experience_level ?? null),
    sessionLength:
      edits.sessionLength !== undefined
        ? edits.sessionLength
        : (profile?.preferred_session_length_minutes ?? null),
    tone: edits.tone !== undefined ? edits.tone : (profile?.tone_preference ?? null),
    reminderTime:
      edits.reminderTime !== undefined ? edits.reminderTime : (profile?.reminder_time?.slice(0, 5) ?? null),
    dailyOn: edits.dailyOn ?? prefs?.daily_reminder_enabled ?? true,
    wiltingOn: edits.wiltingOn ?? prefs?.wilting_alerts_enabled ?? true,
    delightOn: edits.delightOn ?? prefs?.delight_notifications_enabled ?? true,
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [updatedProfile, updatedPrefs] = await Promise.all([
        upsertProfile({
          display_name: value.displayName.trim() || null,
          first_manifestation_category: value.category,
          experience_level: value.experience,
          preferred_session_length_minutes: value.sessionLength,
          tone_preference: value.tone,
          reminder_time: value.reminderTime,
          reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        upsertNotificationPrefs({
          daily_reminder_enabled: value.dailyOn,
          wilting_alerts_enabled: value.wiltingOn,
          delight_notifications_enabled: value.delightOn,
          daily_reminder_time: value.reminderTime,
        }),
      ]);
      return { updatedProfile, updatedPrefs };
    },
    onSuccess: ({ updatedProfile, updatedPrefs }) => {
      // Everything downstream — coach prompts, notification scheduling,
      // greetings — reads these caches, so the new answers apply immediately.
      queryClient.setQueryData(profileQueryKey, updatedProfile);
      queryClient.setQueryData(notificationPrefsQueryKey, updatedPrefs);
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationPrefsQueryKey });
      goBackOrHome();
    },
  });

  if (profileQuery.isLoading) {
    return (
      <Screen style={styles.loading}>
        <ThemedText themeColor="textSecondary">Fetching your preferences…</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Your preferences</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The coach, your reminders, and your meditations all listen to these.
        </ThemedText>

        <TextField
          label="Your name (optional)"
          value={value.displayName}
          onChangeText={(displayName) => setEdits((e) => ({ ...e, displayName }))}
          autoComplete="name"
        />

        <ThemedText type="smallBold">What are you growing right now?</ThemedText>
        <View style={styles.options}>
          {CATEGORIES.map((category) => (
            <OptionButton
              key={category}
              label={category}
              selected={value.category === category}
              onPress={() => setEdits((e) => ({ ...e, category }))}
            />
          ))}
        </View>

        <ThemedText type="smallBold">Your visualization experience</ThemedText>
        <View style={styles.options}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={value.experience === option.value}
              onPress={() => setEdits((e) => ({ ...e, experience: option.value }))}
            />
          ))}
        </View>

        <ThemedText type="smallBold">Session length that feels right</ThemedText>
        <View style={styles.options}>
          {LENGTH_OPTIONS.map((minutes) => (
            <OptionButton
              key={minutes}
              label={`${minutes} minute${minutes > 1 ? 's' : ''}`}
              selected={value.sessionLength === minutes}
              onPress={() => setEdits((e) => ({ ...e, sessionLength: minutes }))}
            />
          ))}
        </View>

        <ThemedText type="smallBold">Tone</ThemedText>
        <View style={styles.options}>
          {TONE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={value.tone === option.value}
              onPress={() => setEdits((e) => ({ ...e, tone: option.value }))}
            />
          ))}
        </View>

        <ThemedText type="smallBold">Reminder time</ThemedText>
        <View style={styles.options}>
          {REMINDER_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={value.reminderTime === option.value}
              onPress={() => setEdits((e) => ({ ...e, reminderTime: option.value }))}
            />
          ))}
        </View>

        <ThemedText type="smallBold">Your wish garden</ThemedText>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <ThemedText type="small">Mirror today’s weather</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              When it rains where you are, it rains gently in your garden too.
            </ThemedText>
          </View>
          <Switch
            value={weatherMirror}
            onValueChange={toggleWeatherMirror}
            accessibilityLabel="Mirror today's weather"
            trackColor={{ true: theme.primary }}
          />
        </View>
        {weatherDenied ? (
          <ThemedText type="small" themeColor="danger">
            Location permission is needed to know your weather. You can allow it in your device
            settings, then try again.
          </ThemedText>
        ) : null}

        <ThemedText type="smallBold">Notifications</ThemedText>
        {(
          [
            ['Daily reminder', 'dailyOn', value.dailyOn],
            ['Wilting alerts', 'wiltingOn', value.wiltingOn],
            ['Delight moments', 'delightOn', value.delightOn],
          ] as const
        ).map(([label, key, isOn]) => (
          <View key={key} style={styles.switchRow}>
            <ThemedText type="small">{label}</ThemedText>
            <Switch
              value={isOn}
              onValueChange={(next) => setEdits((e) => ({ ...e, [key]: next }))}
              accessibilityLabel={label}
              trackColor={{ true: theme.primary }}
            />
          </View>
        ))}

        {saveMutation.error ? (
          <ThemedText themeColor="danger">Couldn’t save. Please try again.</ThemedText>
        ) : null}

        <Button
          label="Save"
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          style={styles.saveButton}
        />
        <Button label="Cancel" variant="ghost" onPress={() => goBackOrHome()} />
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
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  options: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
  saveButton: {
    marginTop: Spacing.two,
  },
});
