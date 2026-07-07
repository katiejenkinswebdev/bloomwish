import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { brandedAuthErrorMessage, signOut, updatePassword } from '@/features/auth/api';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, useIsPasswordRecovery } from '@/store/auth-store';

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const isPasswordRecovery = useIsPasswordRecovery();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(!!code);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isPasswordLongEnough = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    if (!code) return;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setExchangeError(brandedAuthErrorMessage(error));
        } else {
          // The recovery link is a one-time code — ensure the guard flips
          // even if the emitted event is missed for any reason.
          useAuthStore.getState().setPasswordRecovery(true);
        }
      })
      .finally(() => setIsExchanging(false));
  }, [code]);

  const updateMutation = useMutation({
    mutationFn: () => updatePassword(newPassword),
    onSuccess: async () => {
      // Require a fresh sign-in with the new password rather than dropping
      // the user straight into the app from a recovery session.
      await signOut();
      useAuthStore.getState().setPasswordRecovery(false);
      router.replace('/(auth)/sign-in');
    },
  });

  if (isExchanging) {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title">Verifying your link…</ThemedText>
      </Screen>
    );
  }

  if (exchangeError || (!isPasswordRecovery && !code)) {
    return (
      <Screen style={styles.container}>
        <ThemedText type="title">This link has expired</ThemedText>
        <ThemedText themeColor="textSecondary">
          {exchangeError ?? 'Request a new password reset link and try again.'}
        </ThemedText>
        <Button
          label="Back to sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
          style={styles.button}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Choose a new password</ThemedText>

      <TextField
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        errorText={
          newPassword.length > 0 && !isPasswordLongEnough ? 'At least 8 characters' : undefined
        }
      />
      <TextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        errorText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords don’t match' : undefined}
      />

      {updateMutation.error ? (
        <ThemedText themeColor="danger">{brandedAuthErrorMessage(updateMutation.error)}</ThemedText>
      ) : null}

      <Button
        label="Update password"
        loading={updateMutation.isPending}
        disabled={!isPasswordLongEnough || !passwordsMatch}
        onPress={() => updateMutation.mutate()}
        style={styles.button}
      />
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
});
