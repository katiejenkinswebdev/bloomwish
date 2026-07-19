import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Day & Night Garden: the app's look follows the sun, not the OS appearance
 * setting. Day runs 06:00–18:59 local; everything else is night. Users can
 * pin Day or Night in Preferences ("Garden clock").
 */
export type ThemeMode = 'auto' | 'day' | 'night';
export type ResolvedScheme = 'day' | 'night';

const STORAGE_KEY = 'bloomwish:theme-mode';

export const DAY_STARTS_HOUR = 6;
export const NIGHT_STARTS_HOUR = 19;

export function resolveByClock(date: Date = new Date()): ResolvedScheme {
  const hour = date.getHours();
  return hour >= DAY_STARTS_HOUR && hour < NIGHT_STARTS_HOUR ? 'day' : 'night';
}

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'auto',
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true });
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'auto' || stored === 'day' || stored === 'night') set({ mode: stored });
      })
      .catch(() => {});
  },

  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  },
}));
