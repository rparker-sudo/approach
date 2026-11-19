import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { resolveFor } from '../../lib/athlete';
import { canCheckIn } from '../../lib/backend';
import { breakOn, dateKey, today } from '../../lib/calendar';
import { getExercise } from '../../lib/exercises';
import { INTENSITY_LABEL, PAIN_TRAINER, programLine, scheduleFor, weekIndex } from '../../lib/general';
import { lengthLine } from '../../lib/resolve';
import { useStore } from '../../lib/store';
import { useTeams } from '../../lib/team';
import type { Program } from '../../lib/types';
import { WEEKDAYS } from '../../lib/types';
import { weekdayIndex } from '../../lib/util';
import HomeEquipmentSheet from '../HomeEquipmentSheet';
import RackCard from '../RackCard';
import ReadinessCard from '../ReadinessCard';
import ScreenHeader from '../ScreenHeader';
import StationsCard from '../StationsCard';
import VersionLine, { DroppedLine } from '../VersionLine';
import { Banner, Body, Button, Card, colors, H2, Icon, Label, Note, Pill, Row, Screen, Text } from '../ui';

/** G3 for general teams. The text is PAIN_TRAINER (pending Legal; one constant). */
function PainCard({ pain }: { pain: boolean }) {
  if (!pain) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: colors.raised, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.warning, flexDirection: 'row', gap: 10 }}>
      <Text style={{ fontSize: 16, color: colors.warningText, fontWeight: '700' }}>!</Text>
      <Text style={{ fontSize: 16, lineHeight: 22, flex: 1 }}>{PAIN_TRAINER}</Text>
    </View>
  );
}

/**
 * 2.3.0 F42: a client's Today in a general team. Every program posted to them (their own, their group's, the whole team's)
 * can have a session today; each one is resolved for this client through resolveSession (G-1).
 */
export default function ClientToday() {
  const { data, mutate } = useStore();
  const { teams, consentFor } = useTeams();
  const [homeSheet, setHomeSheet] = useState(false);
  const day = today();
  const i = weekdayIndex();
  const lift = teams.find((t) => t.isLiftProgram) ?? teams.find((t) => t.id === data.liftTeamId) ?? teams[0];
  const programs = data.programs.filter((p) => p.general && p.teamId && (!lift || p.teamId === lift.id));
  const painToday = !!(data.readinessLog ?? []).find((r) => r.day === dateKey(day))?.pain;
  const showCheckIn = teams.some((t) => canCheckIn(consentFor(t.id)));
  const profile = data.profile!;
  const dateLine = `${day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}${profile.name ? ` · ${profile.name}` : ''}`;

  const due = programs
    .map((p) => {
      const w = weekIndex(p, day);
      // A break (Calendar → Break) pauses every program that day.
      const sid = w == null || breakOn(p, day) ? null : scheduleFor(p, w)[i];
      const session = p.sessions.find((s) => s.id === sid);
      return session ? { program: p, session, resolved: resolveFor(data, p, session, day) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const doneToday = (p: Program) => data.logs.some((l) => l.programId === p.id && new Date(l.date).toDateString() === day.toDateString());
  const weekStart = new Date(day);
  weekStart.setDate(day.getDate() - i);

  return (
    <Screen tab>
      <ScreenHeader title="Today" subtitle={dateLine} />
      <PainCard pain={painToday} />
      {data.leaveNotice ? <Banner action={{ label: 'Got it', onPress: () => mutate((d) => ({ ...d, leaveNotice: null })) }}>{data.leaveNotice}</Banner> : null}
      {showCheckIn ? <ReadinessCard general /> : null}
      {lift ? <RackCard teamId={lift.id} /> : null}
      {homeSheet ? <HomeEquipmentSheet onClose={() => setHomeSheet(false)} /> : null}

      {programs.length === 0 ? (
        <Card>
          <H2>{lift ? `You're with ${lift.name}` : 'No program yet'}</H2>
          <Body muted>Your trainer hasn&apos;t posted a program yet. It shows up here as soon as they do.</Body>
        </Card>
      ) : due.length === 0 ? (
        <Card>
          <Label>Today</Label>
          <H2>No session today</H2>
          <Body muted>Rest, move easy, and come back for your next session.</Body>
          <Button kind="ghost" small title="Extra recovery" onPress={() => router.push('/recovery')} />
        </Card>
      ) : (
        due.map(({ program, session, resolved }) => (
          <Card key={`${program.id}-${session.id}`}>
            <Label>{programLine(program, day, false)}</Label>
            {program.groupName ? <Text style={{ fontSize: 13, color: colors.muted }}>{program.groupName}</Text> : null}
            <H2>{session.name}</H2>
            <Text style={{ fontSize: 15, color: colors.muted }}>{`${lengthLine(resolved).text}${lengthLine(resolved).planned ? ` ${lengthLine(resolved).planned}` : ''}`}</Text>
            {resolved.block.deload ? <Text style={{ fontSize: 13, color: colors.muted }}>Lighter week: fewer sets.</Text> : null}
            {resolved.light ? <Note>Your trainer lightened today&apos;s session. Same exercises, fewer sets, easy effort.</Note> : null}
            {session.location === 'home' && !data.homeEquipmentAsked ? (
              <Text accessibilityRole="link" onPress={() => setHomeSheet(true)} style={{ fontSize: 14, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
                Set up home equipment
              </Text>
            ) : null}
            {session.format === 'stations' ? <StationsCard teamId={program.teamId!} session={session} exercises={resolved.exercises} /> : null}
            <View style={{ gap: 4 }}>
              {resolved.exercises.slice(0, 5).map((e, k) => (
                <View key={k}>
                  <Text style={{ fontSize: 13 }}>
                    {getExercise(e.exerciseId).name}{' '}
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{e.cardio ? `${e.cardio.minutes} min · ${INTENSITY_LABEL[e.cardio.intensity]}` : `${e.sets} × ${e.reps}`}</Text>
                  </Text>
                  <VersionLine exerciseId={e.exerciseId} teamExerciseId={e.teamExerciseId} teamId={program.teamId} />
                </View>
              ))}
              {resolved.exercises.length > 5 ? <Text style={{ fontSize: 13, color: colors.muted }}>+ {resolved.exercises.length - 5} more</Text> : null}
              <DroppedLine count={resolved.dropped} />
            </View>
            {doneToday(program) ? <Pill text="Done today" achievement /> : null}
            <Button
              large
              title={doneToday(program) ? 'Log it again' : 'Start workout'}
              icon="play.fill"
              onPress={() => router.push({ pathname: '/workout', params: { programId: program.id, sessionId: session.id } })}
            />
          </Card>
        ))
      )}

      {programs.length ? (
        <Card>
          <Label>This week</Label>
          <Row style={{ gap: 6 }}>
            {WEEKDAYS.map((d, k) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + k);
              const has = programs.some((p) => {
                const w = weekIndex(p, date);
                return w != null && !!scheduleFor(p, w)[k];
              });
              const done = data.logs.some((l) => programs.some((p) => p.id === l.programId) && new Date(l.date).toDateString() === date.toDateString());
              return (
                <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: k === i ? colors.ink : colors.faint, fontWeight: k === i ? '600' : '400' }}>{d}</Text>
                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.achievement : 'transparent', borderWidth: done ? 0 : 1, borderColor: has ? colors.ink : colors.line }}>
                    {done ? <Icon name="checkmark" size={12} color={colors.bg} /> : has ? <Text style={{ fontSize: 12, fontWeight: '600' }}>S</Text> : null}
                  </View>
                </View>
              );
            })}
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
