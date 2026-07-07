import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { deriveHealth, type HealthDecayConfig } from '@/features/dreams/health';
import type { DreamRow } from '@/lib/supabase/database.types';

/** Last-known state, read by the Android widget task handler. */
export const WIDGET_STATE_STORAGE_KEY = 'garden-widget-state';

export interface GardenWidgetState {
  status: 'thriving' | 'needs_water' | 'empty';
  plantName: string | null;
  dreamId: string | null;
}

/** Overall garden status + the plant most in need of attention. */
export function computeGardenWidgetState(
  dreams: DreamRow[],
  config?: HealthDecayConfig
): GardenWidgetState {
  const active = dreams.filter((d) => !d.harvested_at);
  if (active.length === 0) return { status: 'empty', plantName: null, dreamId: null };

  // Most in need = worst health, then longest since interaction.
  const severity = { dormant: 3, wilting: 2, healthy: 1, thriving: 0 } as const;
  const ranked = [...active].sort((a, b) => {
    const bySeverity = severity[deriveHealth(b, config)] - severity[deriveHealth(a, config)];
    if (bySeverity !== 0) return bySeverity;
    return (
      new Date(a.last_interacted_at).getTime() - new Date(b.last_interacted_at).getTime()
    );
  });
  const neediest = ranked[0];
  const needsWater = severity[deriveHealth(neediest, config)] >= 2;

  return needsWater
    ? { status: 'needs_water', plantName: neediest.title, dreamId: neediest.id }
    : { status: 'thriving', plantName: null, dreamId: null };
}

/**
 * Push the state to both home-screen widgets. Safe everywhere: native widget
 * modules only exist in dev/production builds, so failures are swallowed.
 */
export async function syncWidgets(state: GardenWidgetState): Promise<void> {
  await AsyncStorage.setItem(WIDGET_STATE_STORAGE_KEY, JSON.stringify(state)).catch(() => {});

  if (Platform.OS === 'ios') {
    try {
      const { ExtensionStorage } = await import('@bacons/apple-targets');
      const storage = new ExtensionStorage('group.com.bloomwish.app');
      storage.set('gardenStatus', state.status);
      if (state.plantName) storage.set('attentionPlantName', state.plantName);
      else storage.remove('attentionPlantName');
      if (state.dreamId) storage.set('attentionDreamId', state.dreamId);
      else storage.remove('attentionDreamId');
      ExtensionStorage.reloadWidget('BloomwishWidget');
    } catch {
      // Expo Go / simulator without the widget target — nothing to update.
    }
  }

  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      const { GardenWidget } = await import('@/features/widget/garden-widget');
      await requestWidgetUpdate({
        widgetName: 'GardenWidget',
        renderWidget: () => <GardenWidget state={state} />,
      });
    } catch {
      // Widget module absent (Expo Go) or no widget placed yet.
    }
  }
}
