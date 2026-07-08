import { View } from 'react-native';

/** A water droplet drawn with border radii — pairs with the rain animation. */
export function DropletIcon({ size = 26, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderTopLeftRadius: 0,
        borderTopRightRadius: size / 2,
        borderBottomLeftRadius: size / 2,
        borderBottomRightRadius: size / 2,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}
