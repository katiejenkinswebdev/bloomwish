import { Alert, Linking, Platform } from 'react-native';

/** Open the OS subscription management page — the honest cancel path. */
export async function openManageSubscriptions(): Promise<void> {
  const url = Platform.select({
    ios: 'https://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions',
    default: '',
  });
  if (!url) {
    Alert.alert('Manage subscription', 'Open the App Store or Play Store subscription settings on your phone.');
    return;
  }
  await Linking.openURL(url);
}
