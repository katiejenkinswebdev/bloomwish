import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';

import { PostHogProvider } from 'posthog-react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { identifyUser, posthog, resetAnalytics } from '@/features/analytics/analytics';
import { identifyCrashUser, initSentry, wrapRoot } from '@/features/analytics/sentry';
import { fetchProfile, profileQueryKey } from '@/features/profile/api';
import { endPurchasesSession, initializePurchases } from '@/features/purchases/purchases';
import { useResolvedScheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { useThemeStore } from '@/store/theme-store';
import {
  useAuthStore,
  useIsAuthInitializing,
  useIsPasswordRecovery,
  useSession,
} from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();
initSentry();

function RootNavigator() {
  const session = useSession();
  const isInitializing = useIsAuthInitializing();
  const isPasswordRecovery = useIsPasswordRecovery();

  const isSignedIn = !!session && !isPasswordRecovery;
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      initializePurchases(userId);
      identifyUser(userId);
      identifyCrashUser(userId);
    } else {
      endPurchasesSession();
      resetAnalytics();
      identifyCrashUser(null);
    }
  }, [userId]);

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
          <Stack.Screen name="release" options={{ presentation: 'modal' }} />
          <Stack.Screen name="immerse" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="greenhouse" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="meditation" options={{ presentation: 'modal' }} />
          <Stack.Screen name="harvest" options={{ presentation: 'modal' }} />
          <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-sign" options={{ presentation: 'modal' }} />
          <Stack.Screen name="preferences" options={{ presentation: 'modal' }} />
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

function RootLayout() {
  // The garden follows the sun (with a Preferences override), not the OS
  // appearance setting — see docs/redesign/HANDOFF.md.
  const scheme = useResolvedScheme();

  useEffect(() => {
    useAuthStore.getState().initialize();
    useThemeStore.getState().hydrate();
  }, []);

  const app = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={scheme === 'night' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );

  // Autocapture (screens + taps) only when a real PostHog key is configured.
  return posthog ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app;
}

export default wrapRoot(RootLayout);
