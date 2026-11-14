import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import EffortBoard from '../components/EffortBoard';
import { Body, Chip, ChipRow, Screen } from '../components/ui';
import { useTeams } from '../lib/team';

/** Athlete: the full team effort list (F10). On two teams, a team switcher sits at the top. */
export default function EffortScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams } = useTeams();
  const [pick, setPick] = useState<string | null>(null);
  const team = teams.find((t) => t.id === (pick ?? teamId)) ?? teams[0];
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Team effort' }} />
      {teams.length > 1 ? (
        <ChipRow>
          {teams.map((t) => (
            <Chip key={t.id} label={t.name} selected={team?.id === t.id} onPress={() => setPick(t.id)} />
          ))}
        </ChipRow>
      ) : null}
      {team ? <EffortBoard key={team.id} teamId={team.id} viewer="athlete" /> : <Body muted>Team not found.</Body>}
    </Screen>
  );
}
