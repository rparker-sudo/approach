import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform } from 'react-native';
import AccountForm from '../components/AccountForm';
import JoinTeamForm from '../components/JoinTeamForm';
import { Body, Button, Card, H2, Screen } from '../components/ui';
import { showAlert } from '../lib/dialog';
import { APP_STORE_URL } from '../lib/links';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';

/**
 * Join a team. Opened from Plan → Join a team, or from a coach's QR code / link:
 *   <APP_URL>/join?code=ABC123
 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data, setProfile } = useStore();
  const { account, checked } = useTeams();

  // First time in the app: run setup, which picks up the code.
  if (!data.profile) return <Redirect href={{ pathname: '/onboarding', params: code ? { code } : {} }} />;
  if (!checked) return <Screen><Body muted>Loading…</Body></Screen>;

  const done = (teamName: string, coachName?: string) => {
    showAlert(`You're on ${teamName}`, coachName ? `Coach ${coachName} posts your workouts.` : undefined);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen>
      {Platform.OS === 'web' && APP_STORE_URL ? (
        <Card>
          <H2>Get the iPhone app</H2>
          <Body muted>Works best as the app. You can also keep using it here in the browser.</Body>
          <Button title="Open the App Store" onPress={() => Linking.openURL(APP_STORE_URL)} />
        </Card>
      ) : null}

      {!account ? (
        <>
          <H2>Make your athlete account</H2>
          <Body muted>Then you'll join your team{code ? ` (code ${code.toUpperCase()})` : ''}.</Body>
          <AccountForm
            role="athlete"
            onDone={(a) => {
              setProfile({ ...data.profile!, name: a.name || data.profile!.name, role: a.role });
            }}
          />
        </>
      ) : (
        <>
          <H2>Enter your team code</H2>
          <Body muted>Your coach has a 6-character code. Once you join, the team workout becomes your plan.</Body>
          <JoinTeamForm initialCode={code} autoJoin={!!code} onJoined={(team) => done(team.name, team.coachName)} />
        </>
      )}
    </Screen>
  );
}
