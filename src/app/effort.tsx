import { Stack, useLocalSearchParams } from 'expo-router';
import EffortBoard from '../components/EffortBoard';
import { Body, Screen } from '../components/ui';
import { useTeams } from '../lib/team';

/** Athlete: the full team effort list (F10). */
export default function EffortScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams } = useTeams();
  const team = teams.find((t) => t.id === teamId);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Team effort' }} />
      {team ? <EffortBoard teamId={team.id} viewer="athlete" /> : <Body muted>Team not found.</Body>}
    </Screen>
  );
}
