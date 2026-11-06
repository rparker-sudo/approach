import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, View } from 'react-native';
import { colors, Icon } from '../../components/ui';
import { useStore } from '../../lib/store';

export default function TabsLayout() {
  const { ready, data } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!data.profile) return <Redirect href="/onboarding" />;
  const coach = data.profile.role === 'coach';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: coach ? 'Team' : 'Today',
          tabBarIcon: ({ color }) => <Icon name={coach ? 'person.3.fill' : 'sun.max.fill'} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: coach ? 'Programs' : 'Program',
          tabBarIcon: ({ color }) => <Icon name="calendar" color={color as string} />,
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
        name="progress"
        options={{
          title: 'Progress',
          href: coach ? null : undefined,
          tabBarIcon: ({ color }) => <Icon name="chart.line.uptrend.xyaxis" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
