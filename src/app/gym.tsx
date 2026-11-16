import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Checkbox, colors, Label, Screen, Text } from '../components/ui';
import { showAlert } from '../lib/dialog';
import { EQUIPMENT, equipmentLabel, getExercise } from '../lib/exercises';
import { GENERAL_EQUIPMENT } from '../lib/generalLibrary';
import { isGeneral } from '../lib/general';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import type { Equipment } from '../lib/types';

/** F40 groups: the 10 existing items plus the 13 general items (general-library.md §2). */
const GROUPS: { title: string; ids: Equipment[] }[] = [
  { title: 'Free weights', ids: ['barbell', 'trap-bar', 'dumbbells', 'kettlebells', 'med-ball'] },
  { title: 'Racks and benches', ids: ['bench', 'pullup-bar', 'box'] },
  { title: 'Cables and bands', ids: ['cable', 'bands'] },
  { title: 'Machines', ids: GENERAL_EQUIPMENT.filter((e) => e.group === 'Machines').map((e) => e.id) },
  { title: 'Cardio', ids: GENERAL_EQUIPMENT.filter((e) => e.group === 'Cardio').map((e) => e.id) },
];
const label = (id: Equipment) => GENERAL_EQUIPMENT.find((e) => e.id === id)?.label ?? equipmentLabel(id, true) ?? EQUIPMENT.find((e) => e.id === id)?.label ?? id;

/** 2.3.0 F40 Gym equipment profile (Team settings → Gym equipment). Programs only use what's ticked. */
export default function GymScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { data } = useStore();
  const { teams, setGymEquipment } = useTeams();
  const team = teams.find((t) => t.id === teamId);
  const [picked, setPicked] = useState<Equipment[]>(team?.gymEquipment ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!team || !isGeneral(team)) return <Screen><Body muted>Team not found.</Body></Screen>;

  // Sessions that use an item being removed (each client switches to the closest exercise; warning, not a block).
  const removed = (team.gymEquipment ?? []).filter((e) => !picked.includes(e));
  const uses = (item: Equipment) =>
    data.programs
      .filter((p) => p.teamId === team.id)
      .flatMap((p) => p.sessions)
      .filter((s) => s.exercises.some((pe) => getExercise(pe.exerciseId).equipment.every((setup) => setup.length > 0 && setup.includes(item))));
  const warnings = removed.map((item) => ({ item, n: uses(item).length })).filter((w) => w.n > 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setGymEquipment(team!.id, picked);
      showAlert('Gym equipment saved. New and edited sessions use it.');
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Gym equipment' }} />
      <Text style={{ fontSize: 15 }}>Programs only use what you tick. Clients&apos; home equipment stays on their phones.</Text>
      {GROUPS.map((g) => (
        <View key={g.title} style={{ gap: 4 }}>
          <Label>{g.title}</Label>
          {g.ids.map((id) => (
            <View key={id} style={{ minHeight: 48, justifyContent: 'center' }}>
              <Checkbox checked={picked.includes(id)} onChange={(v) => setPicked((s) => (v ? [...s, id] : s.filter((x) => x !== id)))} label={label(id)}>
                <Text style={{ fontSize: 15 }}>{label(id)}</Text>
              </Checkbox>
            </View>
          ))}
        </View>
      ))}
      {warnings.map((w) => (
        <Text key={w.item} accessibilityRole="alert" style={{ fontSize: 13, color: colors.warningText }}>
          {`${w.n} ${w.n === 1 ? 'session uses' : 'sessions use'} the ${label(w.item).toLowerCase()}. They'll switch to the closest exercise for each client.`}
        </Text>
      ))}
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button large title={busy ? 'Saving…' : 'Save'} disabled={!picked.length || busy} onPress={save} />
    </Screen>
  );
}
