import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import Sheet from '../components/Sheet';
import { backend, canLog } from '../lib/backend';
import { possessive } from '../lib/util';
import AccountForm from '../components/AccountForm';
import JoinTeamForm from '../components/JoinTeamForm';
import { Body, Button, Card, H2, OptionCard, Screen } from '../components/ui';
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
  const { account, checked, teams, setLiftProgram } = useTeams();
  const [choose, setChoose] = useState<{ joined: string; coachName?: string } | null>(null);
  const [pick, setPick] = useState<string | null>(null);

  // First time in the app: run setup, which picks up the code.
  if (!data.profile) return <Redirect href={{ pathname: '/onboarding', params: code ? { code } : {} }} />;
  if (!checked) return <Screen><Body muted>Loading…</Body></Screen>;

  const finish = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const done = (teamName: string, coachName?: string, general?: boolean) => {
    showAlert(`You're on ${teamName}`, coachName ? (general ? `Trainer ${coachName} posts your programs.` : `Coach ${coachName} posts your workouts.`) : undefined);
    finish();
  };
  const current = teams.find((t) => t.isLiftProgram) ?? teams[0];

  // F15a: joining a second team asks which lifting program to follow. Closing keeps the current one.
  if (choose && teams.length >= 2 && current) {
    const selected = pick ?? current.id;
    return (
      <Screen>
        <Sheet title={`You're on ${teams.length} teams`} onClose={finish}>
          <Body>Which team&apos;s lifting program do you want to follow? The other team&apos;s practices and matches still show on your schedule.</Body>
          {teams.map((t) => (
            <OptionCard
              key={t.id}
              title={`${t.name} lift program`}
              subtitle={t.id === current.id ? 'Current' : undefined}
              selected={selected === t.id}
              onPress={() => setPick(t.id)}
              caption={
                account?.isMinor !== false && !canLog(t.myPerms)
                  ? "You can log on this program once your coach records your parent's consent form."
                  : undefined
              }
            />
          ))}
          <Button
            title="Continue"
            onPress={async () => {
              if (selected !== current.id) {
                const t = teams.find((x) => x.id === selected)!;
                try {
                  await setLiftProgram(selected);
                  showAlert(`Following ${possessive(t.name)} lift program from your next session.`);
                } catch {
                  showAlert("Couldn't switch. Check your connection and try again.");
                }
              }
              finish();
            }}
          />
        </Sheet>
      </Screen>
    );
  }

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
          <Body muted>Then you&apos;ll join your team{code ? ` (code ${code.toUpperCase()})` : ''}.</Body>
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
          <JoinTeamForm initialCode={code} autoJoin={!!code} onJoined={async (team) => {
            // Ask the server: a join link can open the app before the team list has loaded.
            const mine = await backend.listMyTeams().catch(() => teams);
            if (mine.some((t) => t.id !== team.id)) setChoose({ joined: team.id, coachName: team.coachName });
            else done(team.name, team.coachName, team.kind === 'general');
          }} />
        </>
      )}
    </Screen>
  );
}
