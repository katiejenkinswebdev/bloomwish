import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';


import { goBackOrHome } from '@/lib/navigation';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import type { FeedbackType } from '@/lib/supabase/database.types';
import { useTheme } from '@/hooks/use-theme';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Something’s broken' },
  { value: 'idea', label: 'An idea' },
  { value: 'love', label: 'Some love' },
];

export default function FeedbackScreen() {
  const theme = useTheme();
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
        email_followup_consent: emailConsent,
      });
      if (error) throw error;
    },
  });

  if (submitMutation.isSuccess) {
    return (
      <Screen style={styles.centeredScreen}>
        <ThemedText type="title" style={styles.centered}>
          Thank you
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          Every note helps the garden grow better.
        </ThemedText>
        <Button label="Done" onPress={() => goBackOrHome()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Tell us anything</ThemedText>

        <View style={styles.types}>
          {TYPES.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: type === option.value }}
              onPress={() => setType(option.value)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    type === option.value ? theme.primarySoft : theme.backgroundElement,
                  borderColor: type === option.value ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="small">{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        <TextField
          label="What’s on your mind?"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          style={styles.messageInput}
        />

        <View style={styles.consentRow}>
          <Switch
            value={emailConsent}
            onValueChange={setEmailConsent}
            accessibilityLabel="Allow email follow-up"
            trackColor={{ true: theme.primary }}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.consentText}>
            It’s okay to email me a follow-up about this.
          </ThemedText>
        </View>

        {submitMutation.error ? (
          <ThemedText themeColor="danger">Couldn’t send just now. Please try again.</ThemedText>
        ) : null}

        <Button
          label="Send"
          loading={submitMutation.isPending}
          disabled={message.trim().length < 3}
          onPress={() => submitMutation.mutate()}
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
  centeredScreen: {
    justifyContent: 'center',
    gap: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
  types: {
    gap: Spacing.two,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  messageInput: {
    minHeight: 130,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  consentText: {
    flex: 1,
  },
});
