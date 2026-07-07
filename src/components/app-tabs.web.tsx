import { Tabs } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Web preview tab bar. NativeTabs (used on iOS/Android) is not stable on
 * react-native-web, so the browser gets expo-router's classic JS tabs.
 */
function TabGlyph({ emoji }: { emoji: string }) {
  return <ThemedText style={{ fontSize: 18 }}>{emoji}</ThemedText>;
}

const GardenGlyph = () => <TabGlyph emoji="🌱" />;
const GreenhouseGlyph = () => <TabGlyph emoji="🏆" />;
const ProfileGlyph = () => <TabGlyph emoji="🙂" />;

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
