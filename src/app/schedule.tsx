import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Chip, ChipRow, colors, H2, Label, Note, Screen, Text } from '../components/ui';
import { WeekEditor } from '../components/week';
import { isHeavyLegs } from '../lib/calendar';
import { dayAdvice } from '../lib/generator';
import { useStore } from '../lib/store';
import type { DayType } from '../lib/types';
import { DAY_TYPES, WEEKDAYS } from '../lib/types';

/** Edit the default week: which session (or rest) goes on each weekday, and the usual volleyball week. */
export default function ScheduleScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { data, saveProgram } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  const [week, setWeek] = useState<DayType[]>(program?.volleyballWeek ?? []);
  const [lifts, setLifts] = useState<(string | null)[]>(program?.liftSchedule ?? []);

  if (!program) return <Screen><Body muted>Program not found.</Body></Screen>;
  const coach = data.profile?.role === 'coach';
  if (program.teamId && !coach) {
    return (
      <Screen>
        <Body muted>Your coach sets the team's lift days.</Body>
      </Screen>
    );
  }

  const changed =
    JSON.stringify(week) !== JSON.stringify(program.volleyballWeek) ||
    JSON.stringify(lifts) !== JSON.stringify(program.liftSchedule);
  const unused = program.sessions.filter((s) => !lifts.includes(s.id));

  function save() {
    saveProgram({
      ...program!,
      volleyballWeek: week,
      liftSchedule: lifts,
      ...(program!.teamId ? { unposted: true } : null),
    });
    router.back();
  }

  return (
    <Screen>
      <Body muted>
        Your normal week. Dates on the season calendar (matches, tournaments, days off) adjust this week automatically.
      </Body>

      <Card>
        <H2>Usual volleyball week</H2>
        <WeekEditor value={week} onChange={setWeek} />
      </Card>

      <View style={{ gap: 8 }}>
        <Label>Lift each day</Label>
        {WEEKDAYS.map((d, i) => {
          const sid = lifts[i];
          const session = program.sessions.find((s) => s.id === sid);
          const advice = dayAdvice(week, i, !!session, isHeavyLegs(session));
          return (
            <Card key={d} style={{ gap: 8, padding: 12 }}>
              <Text style={{ fontWeight: '600' }}>
                {d} <Text style={{ fontSize: 13, color: colors.muted }}>· {DAY_TYPES.find((x) => x.id === week[i])!.label}</Text>
              </Text>
              <ChipRow>
                <Chip label="Rest" selected={!sid} onPress={() => setLifts(lifts.map((x, k) => (k === i ? null : x)))} />
                {program.sessions.map((s) => (
                  <Chip key={s.id} label={s.name} selected={sid === s.id} onPress={() => setLifts(lifts.map((x, k) => (k === i ? s.id : x)))} />
                ))}
              </ChipRow>
              {advice ? <Text style={{ fontSize: 12 }}>{advice}</Text> : null}
            </Card>
          );
        })}
      </View>

      {unused.length ? <Note>{`Not on any day: ${unused.map((s) => s.name).join(', ')}.`}</Note> : null}
      {program.teamId ? (
        <Body muted style={{ fontSize: 13 }}>After saving, post the team workout to send the new days to athletes.</Body>
      ) : null}
      <Button title="Save lift days" disabled={!changed || !lifts.some(Boolean)} onPress={save} />
    </Screen>
  );
}
