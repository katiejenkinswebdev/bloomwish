import { useEffect } from 'react';
import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD_G = 2.6;
const SHAKE_COOLDOWN_MS = 4000;

/**
 * Shake-to-report, internal builds only (spec 13). Opens the feedback form on
 * a firm shake; a cooldown stops double-triggers.
 */
export function useShakeToReport(): void {
  useEffect(() => {
    if (!__DEV__) return;
    let lastTriggered = 0;
    Accelerometer.setUpdateInterval(150);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude > SHAKE_THRESHOLD_G && now - lastTriggered > SHAKE_COOLDOWN_MS) {
        lastTriggered = now;
        router.push('/feedback');
      }
    });
    return () => subscription.remove();
  }, []);
}
