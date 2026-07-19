import { useSyncExternalStore } from 'react';

import { Colors } from '@/constants/theme';
import { resolveByClock, useThemeStore, type ResolvedScheme } from '@/store/theme-store';

// The local clock as an external store: re-check each minute so the day/night
// swap happens while the app is open.
function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

const serverSnapshot = (): ResolvedScheme => 'day';

/** The current garden scheme, from the local sun or the Preferences override. */
export function useResolvedScheme(): ResolvedScheme {
  const mode = useThemeStore((s) => s.mode);
  const clock = useSyncExternalStore(subscribeToClock, resolveByClock, serverSnapshot);
  return mode === 'auto' ? clock : mode;
}

export function useTheme() {
  const scheme = useResolvedScheme();
  return Colors[scheme === 'night' ? 'dark' : 'light'];
}
