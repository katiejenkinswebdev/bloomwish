import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';

import { GardenerIcon, GreenhouseIcon, SproutIcon } from '@/components/icons';
import { useTheme } from '@/hooks/use-theme';

/**
 * Web preview tab bar. NativeTabs (used on iOS/Android) is not stable on
 * react-native-web, so the browser gets expo-router's classic JS tabs — with
 * the Wishing Seed icon set, tinted by tab state.
 */
const GardenGlyph = ({ color }: { color: ColorValue }) => (
  <SproutIcon size={24} color={color as string} />
);
const GreenhouseGlyph = ({ color }: { color: ColorValue }) => (
  <GreenhouseIcon size={24} color={color as string} />
);
const ProfileGlyph = ({ color }: { color: ColorValue }) => (
  <GardenerIcon size={24} color={color as string} />
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
      <Tabs.Screen
        name="greenhouse"
        options={{ title: 'Greenhouse', tabBarIcon: GreenhouseGlyph }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ProfileGlyph }} />
    </Tabs>
  );
}
