import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { brandedAuthErrorMessage, signUpWithEmail } from '@/features/auth/api';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordLongEnough = password.length >= 8;

  const signUpMutation = useMutation({
    mutationFn: () => signUpWithEmail(email.trim(), password),
    onSuccess: () => {
      router.replace({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
    },
  });

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Create your account</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        A free garden of your own — no card required.
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
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        errorText={
          password.length > 0 && !isPasswordLongEnough ? 'At least 8 characters' : undefined
        }
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        errorText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords don’t match' : undefined}
      />

      {signUpMutation.error ? (
        <ThemedText themeColor="danger">{brandedAuthErrorMessage(signUpMutation.error)}</ThemedText>
      ) : null}

      <Button
        label="Create account"
        loading={signUpMutation.isPending}
        disabled={!email || !isPasswordLongEnough || !passwordsMatch}
        onPress={() => signUpMutation.mutate()}
        style={styles.primaryButton}
      />

      <Link href="/(auth)/sign-in" asChild>
        <ThemedText type="linkPrimary" style={styles.signInLink}>
          Already have an account? Sign in
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
  primaryButton: {
    marginTop: Spacing.two,
  },
  signInLink: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
