import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Branding } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import {
  brandedAuthErrorMessage,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from '@/features/auth/api';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInMutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  });
  const appleMutation = useMutation({ mutationFn: signInWithApple });
  const googleMutation = useMutation({ mutationFn: signInWithGoogle });

  const isBusy =
    signInMutation.isPending || appleMutation.isPending || googleMutation.isPending;
  const error = signInMutation.error ?? appleMutation.error ?? googleMutation.error;

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">{Branding.appName}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.tagline}>
        {Branding.tagline}
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
        autoComplete="password"
        textContentType="password"
      />

      {error ? (
        <ThemedText themeColor="danger" style={styles.error}>
          {brandedAuthErrorMessage(error)}
        </ThemedText>
      ) : null}

      <Link href="/(auth)/forgot-password" asChild>
        <ThemedText type="linkPrimary" style={styles.forgotLink}>
          Forgot password?
        </ThemedText>
      </Link>

      <Button
        label="Sign in"
        loading={signInMutation.isPending}
        disabled={isBusy || !email || !password}
        onPress={() => signInMutation.mutate()}
        style={styles.primaryButton}
      />

      <ThemedText themeColor="textSecondary" style={styles.dividerText}>
        or continue with
      </ThemedText>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={Spacing.three}
          style={styles.appleButton}
          onPress={() => appleMutation.mutate()}
        />
      )}

      <Button
        label="Continue with Google"
        variant="secondary"
        loading={googleMutation.isPending}
        disabled={isBusy}
        onPress={() => googleMutation.mutate()}
      />

      <Link href="/(auth)/sign-up" asChild>
        <ThemedText type="linkPrimary" style={styles.signUpLink}>
          New here? Create an account
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
  tagline: {
    marginBottom: Spacing.four,
  },
  error: {
    marginTop: -Spacing.one,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  primaryButton: {
    marginTop: Spacing.two,
  },
  dividerText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  appleButton: {
    height: 52,
  },
  signUpLink: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
