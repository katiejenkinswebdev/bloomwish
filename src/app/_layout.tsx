import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { fetchProfile, profileQueryKey } from '@/features/profile/api';
import { queryClient } from '@/lib/query-client';
import {
  useAuthStore,
  useIsAuthInitializing,
  useIsPasswordRecovery,
  useSession,
} from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const session = useSession();
  const isInitializing = useIsAuthInitializing();
  const isPasswordRecovery = useIsPasswordRecovery();

  const isSignedIn = !!session && !isPasswordRecovery;

  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    enabled: isSignedIn,
  });

  // Keep the native splash screen up while the initial session check (and,
  // when signed in, the first profile fetch) runs.
  if (isInitializing || (isSignedIn && profileQuery.isLoading)) return null;

  const needsOnboarding = isSignedIn && !profileQuery.data?.onboarding_completed_at;

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isSignedIn && !needsOnboarding}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="create-dream" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="revive" options={{ presentation: 'modal' }} />
          <Stack.Screen name="water" options={{ presentation: 'modal' }} />
          <Stack.Screen name="feed" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
