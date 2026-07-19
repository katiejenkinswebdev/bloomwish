import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';

import { DropletIcon } from '@/components/droplet-icon';
import { BoltIcon, SproutIcon, SunIcon } from '@/components/icons';
import { useTheme } from '@/hooks/use-theme';

/**
 * Web preview tab bar. NativeTabs (used on iOS/Android) is not stable on
 * react-native-web, so the browser gets expo-router's classic JS tabs — with
 * the Wishing Seed icon set, tinted by tab state.
 */
const GardenGlyph = ({ color }: { color: ColorValue }) => (
  <SproutIcon size={24} color={color as string} />
);
const WaterGlyph = ({ color }: { color: ColorValue }) => (
  <DropletIcon size={22} color={color as string} />
);
const FeedGlyph = ({ color }: { color: ColorValue }) => (
  <BoltIcon size={24} color={color as string} />
);
const SignsGlyph = ({ color }: { color: ColorValue }) => (
  <SunIcon size={24} color={color as string} />
);

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Garden', tabBarIcon: GardenGlyph }} />
      <Tabs.Screen name="water" options={{ title: 'Water', tabBarIcon: WaterGlyph }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: FeedGlyph }} />
      <Tabs.Screen name="signs" options={{ title: 'Signs', tabBarIcon: SignsGlyph }} />
    </Tabs>
  );
}
