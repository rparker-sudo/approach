import { router, Stack, useLocalSearchParams } from 'expo-router';
import { showAlert } from '../lib/dialog';
import { useMemo, useState } from 'react';
import { Pressable, View, Platform } from 'react-native';
import { Body, Button, Card, colors, H2, Label, Row, Screen, Text, TextInput, Icon } from '../components/ui';
import { getExercise } from '../lib/exercises';
import { useStore } from '../lib/store';
import type { LoggedSet, WorkoutLog } from '../lib/types';
import { uid } from '../lib/util';

function firstNumber(reps: string): string {
  const m = reps.match(/\d+/);
  return m ? m[0] : '';
}

export default function Workout() {
  const { programId, sessionId } = useLocalSearchParams<{ programId: string; sessionId: string }>();
  const { data, addLog } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  const session = program?.sessions.find((s) => s.id === sessionId);

  const initial = useMemo(() => {
    if (!session) return [];
    return session.exercises.map((e) => {
      // Pre-fill weight from the last time this exercise was logged.
      let lastWeight = '';
      for (const log of data.logs) {
        const entry = log.entries.find((x) => x.exerciseId === e.exerciseId);
        const w = entry?.sets.find((s) => s.done && s.weight)?.weight;
        if (w) {
          lastWeight = w;
          break;
        }
      }
      return {
        exerciseId: e.exerciseId,
        sets: Array.from({ length: e.sets }, (): LoggedSet => ({ weight: lastWeight, reps: firstNumber(e.reps), done: false })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const [entries, setEntries] = useState(initial);
  const [note, setNote] = useState('');

  if (!program || !session) return <Screen><Body muted>Workout not found.</Body></Screen>;

  const total = entries.reduce((n, e) => n + e.sets.length, 0);
  const done = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  function setSet(ei: number, si: number, patch: Partial<LoggedSet>) {
    setEntries((list) =>
      list.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })),
    );
  }

  function finish() {
    if (done === 0) {
      showAlert('No sets checked off', 'Tap the circle next to each set you finish, then save.');
      return;
    }
    const log: WorkoutLog = {
      id: uid(),
      date: new Date().toISOString(),
      programId: program!.id,
      sessionId: session!.id,
      sessionName: session!.name,
      entries,
      note: note.trim() || undefined,
      teamId: program!.teamId,
      synced: false,
    };
    addLog(log);
    showAlert(
      'Workout saved',
      `${done} of ${total} sets in.${program!.teamId ? ' Your coach can see it.' : ''} Refuel within an hour: protein and carbs.`,
    );
    router.back();
  }

  function cancel() {
    if (done === 0) return router.back();
    showAlert('Leave workout?', "Sets you've checked off won't be saved.", [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: session.name,
          headerLeft: () => (
            <Pressable onPress={cancel} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'web' ? 16 : 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          ),
        }}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Body muted>
          {done} / {total} sets
        </Body>
        <View style={{ flex: 1, height: 6, backgroundColor: colors.chartGrid, borderRadius: 3, marginLeft: 12 }}>
          <View style={{ width: `${total ? (done / total) * 100 : 0}%`, height: 6, backgroundColor: colors.achievement, borderRadius: 3 }} />
        </View>
      </Row>

      {session.exercises.map((plan, ei) => {
        const info = getExercise(plan.exerciseId);
        const entry = entries[ei];
        if (!entry) return null;
        return (
          <Card key={ei}>
            <H2>{info.name}</H2>
            <Body muted style={{ fontSize: 13 }}>
              Target: {plan.sets} × {plan.reps} · {plan.effort}
            </Body>
            <Body muted style={{ fontSize: 13 }}>{plan.notes ? `${plan.notes} · ` : ''}{info.cue}</Body>
            <Row style={{ gap: 8 }}>
              <Text style={[stylesLocal.col, { width: 34 }]}>Set</Text>
              {info.weighted ? <Text style={[stylesLocal.col, { flex: 1 }]}>Weight (lb)</Text> : null}
              <Text style={[stylesLocal.col, { flex: 1 }]}>{/s$/.test(plan.reps) ? 'Time / reps' : 'Reps'}</Text>
              <Text style={[stylesLocal.col, { width: 40, textAlign: 'center' }]}>Done</Text>
            </Row>
            {entry.sets.map((s, si) => (
              <Row key={si} style={{ gap: 8 }}>
                <Text style={{ width: 34, fontWeight: '700', color: colors.muted }}>{si + 1}</Text>
                {info.weighted ? (
                  <TextInput
                    style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.faint}
                    value={s.weight}
                    onChangeText={(t) => setSet(ei, si, { weight: t })}
                  />
                ) : null}
                <TextInput
                  style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}
                  keyboardType="numbers-and-punctuation"
                  value={s.reps}
                  onChangeText={(t) => setSet(ei, si, { reps: t })}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done }}
                  aria-checked={s.done}
                  accessibilityLabel={`Set ${si + 1} done`}
                  onPress={() => {
                    setSet(ei, si, { done: !s.done });
                    // Carry the weight forward to the next empty set.
                    const next = entry.sets[si + 1];
                    if (!s.done && next && !next.weight && s.weight) setSet(ei, si + 1, { weight: s.weight });
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: s.done ? colors.achievement : 'transparent',
                    borderWidth: s.done ? 0 : 2,
                    borderColor: colors.line,
                  }}
                >
                  {s.done ? <Icon name="checkmark" size={16} color={colors.bg} /> : null}
                </Pressable>
              </Row>
            ))}
          </Card>
        );
      })}

      <Label>How did it feel?</Label>
      <TextInput
        style={{ minHeight: 70, textAlignVertical: 'top' }}
        multiline
        placeholder="Optional note: sore knee, felt strong, etc."
        placeholderTextColor={colors.faint}
        value={note}
        onChangeText={setNote}
      />
      <Button title="Finish workout" icon="checkmark" onPress={finish} />
    </Screen>
  );
}

const stylesLocal = {
  get col() {
    return { fontSize: 12, fontWeight: '600' as const, color: colors.muted };
  },
};
