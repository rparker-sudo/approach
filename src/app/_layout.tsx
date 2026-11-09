import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import DialogHost from '../components/DialogHost';
import { colors, DisplayTitle } from '../components/ui';
import { StoreProvider, useStore } from '../lib/store';
import { TeamProvider } from '../lib/team';
import { applyTheme } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    InterTight_600SemiBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <StoreProvider>
      <ThemedApp />
    </StoreProvider>
  );
}

function ThemedApp() {
  const { ready, data } = useStore();
  const mode = data.theme ?? 'dark';
  applyTheme(mode);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready, mode]);

  if (!ready) return null;

  // Keyed on the theme so every screen re-renders with the new colors.
  return (
    <TeamProvider>
      <ThemeStack key={mode} />
    </TeamProvider>
  );
}

function ThemeStack() {
  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTitle: ({ children }) => <DisplayTitle>{children}</DisplayTitle>,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="builder" options={{ title: 'Build a program', presentation: 'modal' }} />
        <Stack.Screen name="program/[id]" options={{ title: 'Plan' }} />
        <Stack.Screen name="session" options={{ title: 'Edit session' }} />
        <Stack.Screen name="workout" options={{ title: 'Lift', gestureEnabled: false }} />
        <Stack.Screen name="import" options={{ title: 'Import program', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="team/[id]" options={{ title: 'Team' }} />
        <Stack.Screen name="join" options={{ title: 'Join a team', presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ title: 'Account', presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ title: 'Season calendar' }} />
        <Stack.Screen name="invite" options={{ title: 'Invite athletes' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'How to' }} />
        <Stack.Screen name="schedule" options={{ title: 'Lift days', presentation: 'modal' }} />
      </Stack>
      <DialogHost />
    </>
  );
}
