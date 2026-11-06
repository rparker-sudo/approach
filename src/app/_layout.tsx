import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../components/ui';
import { StoreProvider } from '../lib/store';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.navy,
          headerTitleStyle: { color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="builder" options={{ title: 'Build a Program', presentation: 'modal' }} />
        <Stack.Screen name="program/[id]" options={{ title: 'Program' }} />
        <Stack.Screen name="session" options={{ title: 'Edit Session' }} />
        <Stack.Screen name="workout" options={{ title: 'Workout', gestureEnabled: false }} />
        <Stack.Screen name="import" options={{ title: 'Import Program', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </StoreProvider>
  );
}
