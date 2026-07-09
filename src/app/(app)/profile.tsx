import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Branding } from '@/config/branding';
import { Spacing } from '@/constants/theme';
import { brandedAuthErrorMessage, deleteAccount, signOut, updatePassword } from '@/features/auth/api';
import { useUser } from '@/store/auth-store';

const DELETE_CONFIRMATION_WORD = 'DELETE';

export default function ProfileScreen() {
  const user = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleteSheetVisible, setIsDeleteSheetVisible] = useState(false);
  const [isPasswordSheetVisible, setIsPasswordSheetVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setError(brandedAuthErrorMessage(err));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // Root layout's Stack.Protected guard redirects to the auth group
      // automatically once the session clears.
    } catch (err) {
      setError(brandedAuthErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="title">Profile</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.email}>
        {user?.email}
      </ThemedText>

      {error ? (
        <ThemedText themeColor="danger" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Button
        label="Edit my preferences"
        variant="secondary"
        onPress={() => router.push('/preferences')}
      />

      <Button
        label="Change password"
        variant="secondary"
        onPress={() => setIsPasswordSheetVisible(true)}
        style={styles.stackedButton}
      />

      <Button
        label="Share feedback"
        variant="secondary"
        onPress={() => router.push('/feedback')}
        style={styles.stackedButton}
      />

      <View style={styles.legalLinks}>
        <ThemedText
          type="linkPrimary"
          onPress={() => WebBrowser.openBrowserAsync(Branding.termsUrl)}>
          Terms
        </ThemedText>
        <ThemedText
          type="linkPrimary"
          onPress={() => WebBrowser.openBrowserAsync(Branding.privacyPolicyUrl)}>
          Privacy policy
        </ThemedText>
      </View>

      <Button
        label="Sign out"
        variant="secondary"
        loading={isSigningOut}
        onPress={handleSignOut}
        style={styles.signOutButton}
      />

      <Button
        label="Delete account"
        variant="danger"
        onPress={() => setIsDeleteSheetVisible(true)}
        style={styles.deleteButton}
      />

      <Sheet
        visible={isPasswordSheetVisible}
        onClose={() => {
          setIsPasswordSheetVisible(false);
          setNewPassword('');
          setConfirmNewPassword('');
          setPasswordNotice(null);
        }}>
        <ThemedText type="subtitle">Change your password</ThemedText>
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          errorText={
            newPassword.length > 0 && newPassword.length < 8 ? 'At least 8 characters' : undefined
          }
        />
        <TextField
          label="Confirm new password"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          secureTextEntry
          autoCapitalize="none"
          errorText={
            confirmNewPassword.length > 0 && confirmNewPassword !== newPassword
              ? 'Passwords don’t match'
              : undefined
          }
        />
        {passwordNotice ? <ThemedText type="small">{passwordNotice}</ThemedText> : null}
        <Button
          label="Update password"
          loading={isChangingPassword}
          disabled={newPassword.length < 8 || newPassword !== confirmNewPassword}
          onPress={async () => {
            setIsChangingPassword(true);
            setPasswordNotice(null);
            try {
              await updatePassword(newPassword);
              setPasswordNotice('Password updated 🌱');
              setNewPassword('');
              setConfirmNewPassword('');
            } catch (err) {
              setPasswordNotice(brandedAuthErrorMessage(err));
            } finally {
              setIsChangingPassword(false);
            }
          }}
        />
        <Button
          label="Close"
          variant="ghost"
          onPress={() => {
            setIsPasswordSheetVisible(false);
            setNewPassword('');
            setConfirmNewPassword('');
            setPasswordNotice(null);
          }}
        />
      </Sheet>

      <Sheet
        visible={isDeleteSheetVisible}
        onClose={() => {
          setIsDeleteSheetVisible(false);
          setConfirmationInput('');
        }}>
        <ThemedText type="subtitle">Delete your account?</ThemedText>
        <ThemedText themeColor="textSecondary">
          This permanently deletes your dreams, sessions, signs, meditations, and every trophy
          you&apos;ve earned. This can&apos;t be undone.
        </ThemedText>
        <TextField
          label={`Type ${DELETE_CONFIRMATION_WORD} to confirm`}
          value={confirmationInput}
          onChangeText={setConfirmationInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          label="Permanently delete my account"
          variant="danger"
          disabled={confirmationInput !== DELETE_CONFIRMATION_WORD}
          loading={isDeleting}
          onPress={handleDeleteAccount}
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => {
            setIsDeleteSheetVisible(false);
            setConfirmationInput('');
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: {
    marginBottom: Spacing.four,
  },
  error: {
    marginBottom: Spacing.three,
  },
  signOutButton: {
    marginTop: Spacing.four,
  },
  stackedButton: {
    marginTop: Spacing.two,
  },
  legalLinks: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  deleteButton: {
    marginTop: Spacing.three,
  },
});
