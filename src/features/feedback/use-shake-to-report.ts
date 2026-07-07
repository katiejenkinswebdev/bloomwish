import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD_G = 2.6;
const SHAKE_COOLDOWN_MS = 4000;

/**
 * Shake-to-report, internal builds only (spec 13). Opens the feedback form on
 * a firm shake; a cooldown stops double-triggers. Native only — the
 * accelerometer module doesn't exist on web.
 */
export function useShakeToReport(): void {
  useEffect(() => {
    if (!__DEV__ || Platform.OS === 'web') return;
    let lastTriggered = 0;
    let subscription: { remove: () => void } | undefined;
    try {
      Accelerometer.setUpdateInterval(150);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        if (magnitude > SHAKE_THRESHOLD_G && now - lastTriggered > SHAKE_COOLDOWN_MS) {
          lastTriggered = now;
          router.push('/feedback');
        }
      });
    } catch {
      // Accelerometer unavailable (simulator, web) — feedback stays reachable
      // from the profile screen.
    }
    return () => subscription?.remove();
  }, []);
}
