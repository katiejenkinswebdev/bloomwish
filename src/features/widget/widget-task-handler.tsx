import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { GardenWidget } from '@/features/widget/garden-widget';
import { WIDGET_STATE_STORAGE_KEY, type GardenWidgetState } from '@/features/widget/widget-state';

const EMPTY_STATE: GardenWidgetState = { status: 'empty', plantName: null, dreamId: null };

/**
 * Android widget lifecycle (added / resized / periodic update). Renders from
 * the last state the app cached — widgets can't query Supabase themselves.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== 'GardenWidget') return;

  let state = EMPTY_STATE;
  try {
    const cached = await AsyncStorage.getItem(WIDGET_STATE_STORAGE_KEY);
    if (cached) state = JSON.parse(cached) as GardenWidgetState;
  } catch {
    // Fall back to the empty garden.
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<GardenWidget state={state} />);
      break;
    default:
      break;
  }
}
