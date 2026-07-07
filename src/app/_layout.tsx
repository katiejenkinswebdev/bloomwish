import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { queryClient } from '@/lib/query-client';
import {
  useAuthStore,
  useIsAuthInitializing,
  useIsPasswordRecovery,
  useSession,
} from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useSession();
  const isInitializing = useIsAuthInitializing();
  const isPasswordRecovery = useIsPasswordRecovery();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Keep the native splash screen up while the initial session check runs —
  // AnimatedSplashOverlay only hides it once this subtree first renders.
  if (isInitializing) return null;

  const isSignedIn = !!session && !isPasswordRecovery;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isSignedIn}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="create-dream" options={{ presentation: 'modal' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
