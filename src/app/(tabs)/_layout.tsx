import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { colors, fonts, Icon } from '../../components/ui';
import { useStore } from '../../lib/store';

/**
 * Brand modules: Load (training), Refuel (nutrition), Plan (season/week), Launch (progress).
 * Route files keep their original names; only the labels changed.
 */
export default function TabsLayout() {
  const { data } = useStore();
  if (!data.profile) return <Redirect href="/onboarding" />;
  const coach = data.profile.role === 'coach';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: coach ? 'Team' : 'Load',
          tabBarIcon: ({ color }) => <Icon name={coach ? 'person.3' : 'dumbbell'} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Refuel',
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
          title: 'Launch',
          href: coach ? null : undefined,
          tabBarIcon: ({ color }) => <Icon name="volleyball" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
