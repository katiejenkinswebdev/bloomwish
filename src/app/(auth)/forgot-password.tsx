import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { brandedAuthErrorMessage, requestPasswordReset } from '@/features/auth/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const resetMutation = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
  });

  if (resetMutation.isSuccess) {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title">Check your email</ThemedText>
        <ThemedText themeColor="textSecondary">
          If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
        </ThemedText>
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} style={styles.button} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Reset your password</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        We&apos;ll email you a link to choose a new one.
      </ThemedText>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      {resetMutation.error ? (
        <ThemedText themeColor="danger">{brandedAuthErrorMessage(resetMutation.error)}</ThemedText>
      ) : null}

      <Button
        label="Send reset link"
        loading={resetMutation.isPending}
        disabled={!email}
        onPress={() => resetMutation.mutate()}
        style={styles.button}
      />

      <Link href="/(auth)/sign-in" asChild>
        <ThemedText type="linkPrimary" style={styles.backLink}>
          Back to sign in
        </ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: Spacing.three,
  },
  subtitle: {
    marginBottom: Spacing.four,
  },
  button: {
    marginTop: Spacing.two,
  },
  backLink: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
