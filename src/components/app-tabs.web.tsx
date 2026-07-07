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

export default function AppTabs() {
  const theme = useTheme();

  const glyph = (emoji: string) => {
    const render = () => <TabGlyph emoji={emoji} />;
    render.displayName = `TabGlyph(${emoji})`;
    return render;
  };

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
      <Tabs.Screen name="index" options={{ title: 'Garden', tabBarIcon: glyph('🌱') }} />
      <Tabs.Screen name="greenhouse" options={{ title: 'Greenhouse', tabBarIcon: glyph('🏆') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: glyph('🙂') }} />
    </Tabs>
  );
}
