import { Stack } from 'expo-router';

export default function CreateDreamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="questions" />
      <Stack.Screen name="scene" />
      <Stack.Screen name="planting" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
