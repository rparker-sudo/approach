import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, Icon } from '../../components/ui';
import { useStore } from '../../lib/store';

/**
 * Tabs: Lift (training), Fuel (nutrition), Plan (season/week), Progress (touch height and strength).
 * Route files keep their original names; only the labels changed.
 */
export default function TabsLayout() {
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  if (!data.profile) return <Redirect href="/onboarding" />;
  const coach = data.profile.role === 'coach';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          // Browsers: give icon + label room, plus the iPhone home-bar area.
          ...(Platform.OS === 'web' ? { height: 66 + insets.bottom, paddingTop: 4, paddingBottom: 4 + insets.bottom } : null),
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: coach ? 'Team' : 'Lift',
          tabBarIcon: ({ color }) => <Icon name={coach ? 'person.3' : 'dumbbell'} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarIcon: ({ color }) => <Icon name="fork.knife" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <Icon name="calendar" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          href: coach ? null : undefined,
          tabBarIcon: ({ color }) => <Icon name="volleyball" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
