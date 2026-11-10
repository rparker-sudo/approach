import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgeQuestionScreen } from '../../components/AgeGate';
import YourChoices, { DEFAULT_CHOICES } from '../../components/YourChoices';
import { colors, fonts, H1, Icon, Screen, Text } from '../../components/ui';
import type { AgeAnswer } from '../../lib/age';
import { backend } from '../../lib/backend';
import { useStore } from '../../lib/store';
import { useTeams } from '../../lib/team';

/**
 * Tabs: Lift (training), Fuel (nutrition), Plan (season/week), Progress (touch height and strength).
 * Route files keep their original names; only the labels changed.
 */
export default function TabsLayout() {
  const { data, setProfile, block } = useStore();
  const { account, checked, deleteAccount, signOut, refresh, teams, setMyChoices } = useTeams();
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  if (!data.profile) return <Redirect href="/onboarding" />;

  // Set up before 2.1 with no birth year on file: ask once, before anything else.
  const needsAge = data.profile.birthYear == null && account?.birthYear == null;
  if (needsAge) {
    if (!checked) return null;
    const profile = data.profile;
    const answer = async (a: AgeAnswer) => {
      if (a.under13) {
        setBusy(true);
        if (account) {
          // Request deletion of the account (S5's RPC); if that fails, at least sign out.
          await deleteAccount().catch(() => signOut().catch(() => {}));
        }
        block();
        return;
      }
      setProfile({ ...profile, birthYear: a.birthYear, isMinor: a.isMinor });
      // Team sync also sends it when the account loads; do it now so consent applies right away.
      if (account) backend.setBirthYear(a.birthYear, a.isMinor).then(refresh, () => {});
    };
    return <AgeQuestionScreen onAnswer={answer} busy={busy} />;
  }

  // P1.4 / F8: adults choose boxes 2–6 once after joining a team (and once for existing adult members).
  const needsChoices = data.profile.role === 'athlete' && account?.isMinor === false && teams.some((t) => t.myConsentVersion == null);
  if (needsChoices) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <Screen>
          <H1>Your choices</H1>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            Choose what Approach does for you on your team. You can change these later in Settings → Privacy.
          </Text>
          <YourChoices initial={DEFAULT_CHOICES} onSave={setMyChoices} />
        </Screen>
      </SafeAreaView>
    );
  }
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
