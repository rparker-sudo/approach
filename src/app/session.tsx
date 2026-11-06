import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, colors, Field, H2, Label, Row, Screen, Stepper, styles } from '../components/ui';
import { CATEGORY_LABEL, EXERCISES, getExercise } from '../lib/exercises';
import { useStore } from '../lib/store';
import type { ExerciseCategory, ProgramExercise, Session } from '../lib/types';

const CATS: ExerciseCategory[] = ['power', 'lower', 'upper', 'core', 'prehab'];

export default function SessionScreen() {
  const { programId, sessionId } = useLocalSearchParams<{ programId: string; sessionId: string }>();
  const { data, saveProgram } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  const session = program?.sessions.find((s) => s.id === sessionId);
  const [picker, setPicker] = useState<{ replaceIndex: number | null } | null>(null);

  if (!program || !session) return <Screen><Body muted>Session not found.</Body></Screen>;
  const coach = data.profile?.role === 'coach';

  function update(next: Session) {
    saveProgram({ ...program!, sessions: program!.sessions.map((s) => (s.id === next.id ? next : s)) });
  }
  function setEx(i: number, patch: Partial<ProgramExercise>) {
    update({ ...session!, exercises: session!.exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= session!.exercises.length) return;
    const list = [...session!.exercises];
    [list[i], list[j]] = [list[j], list[i]];
    update({ ...session!, exercises: list });
  }
  function remove(i: number) {
    update({ ...session!, exercises: session!.exercises.filter((_, k) => k !== i) });
  }
  function pick(exerciseId: string) {
    if (picker?.replaceIndex != null) {
      setEx(picker.replaceIndex, { exerciseId });
    } else {
      update({ ...session!, exercises: [...session!.exercises, { exerciseId, sets: 3, reps: '8', effort: 'RPE 7' }] });
    }
    setPicker(null);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: session.name }} />
      {!coach && data.activeProgramId === program.id ? (
        <Button
          title="Start this workout"
          icon="play.fill"
          onPress={() => router.push({ pathname: '/workout', params: { programId: program.id, sessionId: session.id } })}
        />
      ) : null}

      <Field label="Session name" value={session.name} onChangeText={(t) => update({ ...session, name: t })} />
      <Body muted style={{ fontSize: 14 }}>{session.focus}</Body>

      {session.exercises.map((e, i) => {
        const info = getExercise(e.exerciseId);
        return (
          <Card key={`${e.exerciseId}-${i}`}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{CATEGORY_LABEL[info.category].toUpperCase()}</Text>
                <H2>{info.name}</H2>
                <Body muted style={{ fontSize: 13 }}>{info.cue}</Body>
              </View>
              <View style={{ gap: 2 }}>
                <Pressable accessibilityLabel="Move up" onPress={() => move(i, -1)} hitSlop={6}>
                  <Text style={{ fontSize: 18, color: colors.muted }}>▲</Text>
                </Pressable>
                <Pressable accessibilityLabel="Move down" onPress={() => move(i, 1)} hitSlop={6}>
                  <Text style={{ fontSize: 18, color: colors.muted }}>▼</Text>
                </Pressable>
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Sets</Label>
              <Stepper value={e.sets} min={1} max={10} onChange={(n) => setEx(i, { sets: n })} />
            </Row>
            <Row>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Label>Reps</Label>
                <TextInput style={[styles.input, { minWidth: 0 }]} value={e.reps} onChangeText={(t) => setEx(i, { reps: t })} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Label>Effort</Label>
                <TextInput style={[styles.input, { minWidth: 0 }]} value={e.effort} onChangeText={(t) => setEx(i, { effort: t })} />
              </View>
            </Row>
            <TextInput
              style={[styles.input, { fontSize: 14 }]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.faint}
              value={e.notes ?? ''}
              onChangeText={(t) => setEx(i, { notes: t })}
            />
            <Row>
              <View style={{ flex: 1 }}>
                <Button small kind="ghost" title="Swap" onPress={() => setPicker({ replaceIndex: i })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button small kind="danger" title="Remove" onPress={() => remove(i)} />
              </View>
            </Row>
          </Card>
        );
      })}

      <Button kind="secondary" title="Add exercise" icon="plus" onPress={() => setPicker({ replaceIndex: null })} />

      <Card>
        <Label>What does effort mean?</Label>
        <Body style={{ fontSize: 14 }}>
          RPE = how hard a set feels from 1–10. RPE 7 means you could have done about 3 more reps. Athletes should rarely
          go to failure, especially in-season.
        </Body>
      </Card>

      <Modal visible={!!picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <Row style={{ justifyContent: 'space-between', padding: 16 }}>
            <H2>{picker?.replaceIndex != null ? 'Swap exercise' : 'Add exercise'}</H2>
            <Pressable onPress={() => setPicker(null)} hitSlop={10}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8, paddingBottom: 48 }}>
            {CATS.map((c) => (
              <View key={c} style={{ gap: 8 }}>
                <Label>{CATEGORY_LABEL[c]}</Label>
                {EXERCISES.filter((x) => x.category === c).map((x) => (
                  <Pressable key={x.id} onPress={() => pick(x.id)}>
                    <Card style={{ padding: 12, gap: 2 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>{x.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 13 }}>{x.cue}</Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
