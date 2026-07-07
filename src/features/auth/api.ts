import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { Branding } from '@/config/branding';
import { supabase } from '@/lib/supabase/client';

const passwordResetRedirectTo = Linking.createURL('reset-password');
const emailVerificationRedirectTo = Linking.createURL('verify-email');

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: emailVerificationRedirectTo },
  });
  if (error) throw error;
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: emailVerificationRedirectTo },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectTo,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — nothing to clean up.
  }
}

/**
 * Sign in with Apple. Uses a nonce so the identity token Apple issues can
 * only ever be redeemed against this specific sign-in attempt.
 */
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}

let isGoogleSignInConfigured = false;
function configureGoogleSignInOnce() {
  if (isGoogleSignInConfigured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  isGoogleSignInConfigured = true;
}

export async function signInWithGoogle() {
  configureGoogleSignInOnce();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error('Google sign-in was cancelled or did not return an ID token.');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });
    if (error) throw error;
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      return;
    }
    throw err;
  }
}

/**
 * Deletes the signed-in user's account and all associated data.
 * Calls the `delete-account` Edge Function, which uses the service-role
 * Admin API — deleting the auth user cascades to every table via FK
 * `on delete cascade` (see supabase/migrations).
 */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut();
}

export const authRedirectUrls = {
  passwordReset: passwordResetRedirectTo,
  emailVerification: emailVerificationRedirectTo,
};

export const brandedAuthErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return `Something went wrong. Please try again, or reach out at ${Branding.supportEmail}.`;
};
