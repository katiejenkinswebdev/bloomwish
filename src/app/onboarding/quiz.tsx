import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { OptionButton } from '@/components/ui/option-button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { upsertProfile, profileQueryKey } from '@/features/profile/api';
import type { ExperienceLevel, TonePreference } from '@/lib/supabase/database.types';

interface QuizAnswers {
  displayName: string;
  category: string | null;
  experience: ExperienceLevel | null;
  sessionLength: number | null;
  tone: TonePreference | null;
  reminderTime: string | null;
}

export const CATEGORIES = [
  'Love & relationships',
  'Career & purpose',
  'Abundance',
  'Health & vitality',
  'Home & family',
  'Creativity',
  'Adventure',
];

export const EXPERIENCE_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Brand new to it', value: 'new' },
  { label: 'I’ve dabbled', value: 'some_experience' },
  { label: 'It’s part of my life', value: 'experienced' },
];

export const LENGTH_OPTIONS = [1, 3, 5, 10];

export const TONE_OPTIONS: { label: string; value: TonePreference }[] = [
  { label: 'Gentle & soothing', value: 'gentle' },
  { label: 'Bright & energizing', value: 'energizing' },
];

export const REMINDER_OPTIONS = [
  { label: 'Morning (8am)', value: '08:00' },
  { label: 'Midday (12pm)', value: '12:00' },
  { label: 'Evening (6pm)', value: '18:00' },
  { label: 'Night (9pm)', value: '21:00' },
];

export default function OnboardingQuizScreen() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    displayName: '',
    category: null,
    experience: null,
    sessionLength: null,
    tone: null,
    reminderTime: null,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertProfile({
        display_name: answers.displayName.trim() || null,
        first_manifestation_category: answers.category,
        experience_level: answers.experience,
        preferred_session_length_minutes: answers.sessionLength,
        tone_preference: answers.tone,
        reminder_time: answers.reminderTime,
        reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
      router.push('/onboarding/notifications');
    },
  });

  const steps: { title: string; content: React.ReactNode; canContinue: boolean }[] = [
    {
      title: 'What should we call you?',
      canContinue: true,
      content: (
        <TextField
          label="Your name (optional)"
          value={answers.displayName}
          onChangeText={(displayName) => setAnswers((a) => ({ ...a, displayName }))}
          autoComplete="name"
        />
      ),
    },
    {
      title: 'What do you want to grow first?',
      canContinue: !!answers.category,
      content: (
        <View style={styles.options}>
          {CATEGORIES.map((category) => (
            <OptionButton
              key={category}
              label={category}
              selected={answers.category === category}
              onPress={() => setAnswers((a) => ({ ...a, category }))}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'How familiar is visualization for you?',
      canContinue: !!answers.experience,
      content: (
        <View style={styles.options}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={answers.experience === option.value}
              onPress={() => setAnswers((a) => ({ ...a, experience: option.value }))}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'How long feels right for a session?',
      canContinue: !!answers.sessionLength,
      content: (
        <View style={styles.options}>
          {LENGTH_OPTIONS.map((minutes) => (
            <OptionButton
              key={minutes}
              label={`${minutes} minute${minutes > 1 ? 's' : ''}`}
              selected={answers.sessionLength === minutes}
              onPress={() => setAnswers((a) => ({ ...a, sessionLength: minutes }))}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'What tone feels like you?',
      canContinue: !!answers.tone,
      content: (
        <View style={styles.options}>
          {TONE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={answers.tone === option.value}
              onPress={() => setAnswers((a) => ({ ...a, tone: option.value }))}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'When would a gentle reminder help most?',
      canContinue: !!answers.reminderTime,
      content: (
        <View style={styles.options}>
          {REMINDER_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={answers.reminderTime === option.value}
              onPress={() => setAnswers((a) => ({ ...a, reminderTime: option.value }))}
            />
          ))}
        </View>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          {step + 1} of {steps.length}
        </ThemedText>
        <ThemedText type="subtitle">{currentStep.title}</ThemedText>
        {currentStep.content}

        {saveMutation.error ? (
          <ThemedText themeColor="danger">
            Couldn’t save your answers. Please try again.
          </ThemedText>
        ) : null}

        <Button
          label={isLastStep ? 'Save & continue' : 'Next'}
          disabled={!currentStep.canContinue}
          loading={saveMutation.isPending}
          onPress={() => (isLastStep ? saveMutation.mutate() : setStep(step + 1))}
          style={styles.nextButton}
        />
        {step > 0 ? (
          <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  options: {
    gap: Spacing.two,
  },
  nextButton: {
    marginTop: Spacing.three,
  },
});
