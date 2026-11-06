import { router, Stack, useLocalSearchParams } from 'expo-router';
import ProgramDetail from '../../components/ProgramDetail';
import { Body, Screen } from '../../components/ui';
import { useStore } from '../../lib/store';

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const program = data.programs.find((p) => p.id === id);
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      {program ? <ProgramDetail program={program} afterDelete={() => router.back()} /> : <Body muted>Program not found.</Body>}
    </Screen>
  );
}
