import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="starter-dream" />
    </Stack>
  );
}
