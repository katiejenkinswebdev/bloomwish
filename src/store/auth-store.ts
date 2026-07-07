import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() call resolves. Keep the splash screen up until this flips. */
  isInitializing: boolean;
  /**
   * True from the moment a password-recovery deep link creates a session
   * until the user finishes setting a new password. While true, the root
   * layout keeps showing the (auth) group even though `session` is set —
   * otherwise Stack.Protected would whisk the user into the app mid-reset.
   */
  isPasswordRecovery: boolean;
  hasListener: boolean;
}

interface AuthActions {
  initialize: () => void;
  setPasswordRecovery: (value: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  user: null,
  isInitializing: true,
  isPasswordRecovery: false,
  hasListener: false,

  initialize: () => {
    if (get().hasListener) return;
    set({ hasListener: true });

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, isInitializing: false });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isInitializing: false,
        ...(event === 'PASSWORD_RECOVERY' ? { isPasswordRecovery: true } : {}),
        ...(event === 'SIGNED_OUT' ? { isPasswordRecovery: false } : {}),
      });
    });
  },

  setPasswordRecovery: (value) => set({ isPasswordRecovery: value }),
}));

export const useSession = () => useAuthStore((state) => state.session);
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthInitializing = () => useAuthStore((state) => state.isInitializing);
export const useIsPasswordRecovery = () => useAuthStore((state) => state.isPasswordRecovery);
