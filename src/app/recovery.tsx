import { router, Stack } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Body, Card, colors, H2, Icon, Note, Pill, Row, Screen, Text } from '../components/ui';
import { addDays, dateKey, dayTypeOn, planForDate, today } from '../lib/calendar';
import { getExercise } from '../lib/exercises';
import { RECOVERY_NOTE, recoveryList, suggestedRecovery } from '../lib/recovery';
import { useStore } from '../lib/store';

/** Today → Extra recovery (v2.2 T4): ER1–ER5, the suggested one first. Optional, 10–13 min, no equipment. */
export default function RecoveryScreen() {
  const { data, activeProgram } = useStore();
  const day = today();
  const pain = !!(data.readinessLog ?? []).find((r) => r.day === dateKey(day))?.pain;
  const type = (d: Date) => (activeProgram ? dayTypeOn(activeProgram, d) : 'off');
  const isMatch = (t: string) => t === 'game' || t === 'tournament';
  const ctx = {
    dayAfterMatch: isMatch(type(addDays(day, -1))),
    matchWeek: isMatch(type(addDays(day, 1))) || isMatch(type(addDays(day, 2))),
    upperDay: (() => {
      const sid = activeProgram ? planForDate(activeProgram, day).sessionId : null;
      const ex = activeProgram?.sessions.find((x) => x.id === sid)?.exercises.map((e) => getExercise(e.exerciseId).category) ?? [];
      return ex.filter((c) => c === 'upper').length > ex.filter((c) => c === 'lower').length;
    })(),
    position: data.profile?.position,
  };
  const first = suggestedRecovery(ctx);
  const list = recoveryList(ctx);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Extra recovery' }} />
      {pain ? (
        // Not treatment: on a pain day there's no recommendation, only the G3 message (safety §5).
        <Note>Don&apos;t train through pain. Talk to your coach, parent, or athletic trainer before you lift today.</Note>
      ) : null}
      <Body muted>Optional, about 10–13 minutes, no equipment. Counts toward Hours and Overall (up to 2 a week).</Body>
      {isMatch(type(day)) ? <Note>Match day: only after you compete.</Note> : null}
      <Text style={{ fontSize: 13, color: colors.muted }}>{RECOVERY_NOTE}</Text>
      {list.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/workout', params: { recovery: s.id } })}
        >
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>{s.name}</H2>
              <Icon name="chevron.right" size={14} color={colors.faint} />
            </Row>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Pill text={`about ${s.estMinutes} min`} />
              {s.id === first && !pain ? <Pill text="Suggested today" /> : null}
            </Row>
            <Text style={{ fontSize: 13, color: colors.muted }}>{s.focus}</Text>
            <View style={{ gap: 2 }}>
              {s.exercises.map((e, i) => (
                <Text key={i} style={{ fontSize: 13 }}>{`${getExercise(e.exerciseId).name} · ${e.sets} × ${e.reps}`}</Text>
              ))}
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
