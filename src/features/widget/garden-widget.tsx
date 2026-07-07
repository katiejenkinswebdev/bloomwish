import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { BrandPalette } from '@/constants/brand-palette';
import type { GardenWidgetState } from '@/features/widget/widget-state';

/** Android home-screen widget: the garden at a glance. */
export function GardenWidget({ state }: { state: GardenWidgetState }) {
  const headline =
    state.status === 'needs_water'
      ? 'Needs a little water'
      : state.status === 'thriving'
        ? 'Your garden is thriving'
        : 'Plant your first dream';
  const glyph = state.status === 'needs_water' ? '💧' : state.status === 'thriving' ? '🌸' : '🌱';
  const uri =
    state.status === 'needs_water' && state.dreamId
      ? `bloomwish://water?dreamId=${state.dreamId}`
      : 'bloomwish://';

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BrandPalette.deepGreen,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
      <TextWidget
        text="✦ bloomwish"
        style={{ fontSize: 11, color: '#FBF3E7' }}
      />
      <TextWidget text={glyph} style={{ fontSize: 28, color: '#FFFFFF' }} />
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <TextWidget text={headline} style={{ fontSize: 14, color: '#FFFFFF' }} />
        {state.status === 'needs_water' && state.plantName ? (
          <TextWidget
            text={state.plantName}
            style={{ fontSize: 12, color: '#FBF3E7' }}
            maxLines={1}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
