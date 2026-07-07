import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { LargeSecureStore } from '@/lib/supabase/large-secure-store';
import type { Database } from '@/lib/supabase/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  );
}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On web (including Node static prerendering, where `window` doesn't
    // exist) sessions are not persisted — the app ships iOS/Android only.
    ...(isNative
      ? { storage: new LargeSecureStore(), persistSession: true }
      : { persistSession: false }),
    autoRefreshToken: isNative,
    // Native deep links hand us a plain `code` query param to exchange
    // manually (see reset-password.tsx) rather than URL-fragment tokens.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

if (isNative) {
  // Supabase stops auto-refreshing the session while the app is backgrounded.
  // Tie the refresh loop to app foreground/background state so the token
  // stays fresh the moment the user returns.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
