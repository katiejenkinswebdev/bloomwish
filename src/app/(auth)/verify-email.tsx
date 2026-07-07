import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { brandedAuthErrorMessage, resendVerificationEmail } from '@/features/auth/api';
import { supabase } from '@/lib/supabase/client';

export default function VerifyEmailScreen() {
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();
  const [isExchanging, setIsExchanging] = useState(!!code);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        // On success the session is now set — the root layout's
        // Stack.Protected guard takes over and moves us into the app.
        if (error) setExchangeError(brandedAuthErrorMessage(error));
      })
      .finally(() => setIsExchanging(false));
  }, [code]);

  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmail((email ?? '').trim()),
  });

  if (isExchanging) {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title">Confirming your email…</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Check your email</ThemedText>
      <ThemedText themeColor="textSecondary">
        {email
          ? `We sent a confirmation link to ${email}. Tap it to verify your account.`
          : 'We sent a confirmation link to your email. Tap it to verify your account.'}
      </ThemedText>

      {exchangeError ? <ThemedText themeColor="danger">{exchangeError}</ThemedText> : null}

      {resendMutation.isSuccess ? (
        <ThemedText themeColor="primary">Email resent — check your inbox.</ThemedText>
      ) : null}
      {resendMutation.error ? (
        <ThemedText themeColor="danger">{brandedAuthErrorMessage(resendMutation.error)}</ThemedText>
      ) : null}

      <Button
        label="Resend email"
        variant="secondary"
        loading={resendMutation.isPending}
        disabled={!email}
        onPress={() => resendMutation.mutate()}
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
  button: {
    marginTop: Spacing.two,
  },
  backLink: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
