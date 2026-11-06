import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import TeamHome from '../../components/TeamHome';
import { Body, Button, Card, colors, H1, H2, Icon, Label, Pill, Row, Screen } from '../../components/ui';
import { getExercise } from '../../lib/exercises';
import { dayAdvice } from '../../lib/generator';
import { fuelDay, fuelTargets } from '../../lib/nutrition';
import { useStore } from '../../lib/store';
import { DAY_TYPES, WEEKDAYS } from '../../lib/types';
import { weekdayIndex } from '../../lib/util';

export default function Home() {
  const { data } = useStore();
  if (data.profile?.role === 'coach') return <TeamHome />;
  return <Today />;
}

function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - weekdayIndex(d));
  return s;
}

function Today() {
  const { data, activeProgram } = useStore();
  const profile = data.profile!;
  const i = weekdayIndex();
  const now = new Date();

  const header = (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Body muted>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Body>
        <H1>Hi {profile.name || 'there'}</H1>
      </View>
      <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={10}>
        <Icon name="gearshape.fill" color={colors.muted} size={24} />
      </Pressable>
    </Row>
  );

  if (!activeProgram) {
    return (
      <Screen tab>
        {header}
        <Card>
          <H2>No program yet</H2>
          <Body muted>Build one in a minute, or import one your coach sent you.</Body>
          <Button title="Build my program" icon="wand.and.stars" onPress={() => router.push('/builder')} />
          <Button kind="ghost" title="Import from coach" onPress={() => router.push('/import')} />
        </Card>
      </Screen>
    );
  }

  const vb = activeProgram.volleyballWeek[i];
  const sessionId = activeProgram.liftSchedule[i];
  const session = activeProgram.sessions.find((s) => s.id === sessionId);
  const heavy = !!session?.exercises.some((e) => getExercise(e.exerciseId).category === 'lower');
  const advice = dayAdvice(activeProgram.volleyballWeek, i, !!session, heavy);
  const nextVb = activeProgram.volleyballWeek[(i + 1) % 7];
  const fuel = fuelDay(vb, !!session, nextVb === 'game' || nextVb === 'tournament');
  const targets = fuelTargets(fuel, profile.bodyWeightLb);

  const weekStart = startOfWeek();
  const doneThisWeek = data.logs.filter((l) => new Date(l.date) >= weekStart && l.programId === activeProgram.id);
  const doneToday = doneThisWeek.some((l) => new Date(l.date).toDateString() === now.toDateString());
  const planned = activeProgram.liftSchedule.filter(Boolean).length;

  return (
    <Screen tab>
      {header}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Today</Label>
          <Pill text={DAY_TYPES.find((d) => d.id === vb)!.label} bg={colors.day[vb]} />
        </Row>
        {session ? (
          <>
            <H2>{session.name}</H2>
            <Body muted>{session.focus}</Body>
            <View style={{ gap: 4 }}>
              {session.exercises.slice(0, 4).map((e, k) => (
                <Body key={k} style={{ fontSize: 14 }}>
                  • {getExercise(e.exerciseId).name} — {e.sets} × {e.reps}
                </Body>
              ))}
              {session.exercises.length > 4 ? (
                <Body muted style={{ fontSize: 14 }}>+ {session.exercises.length - 4} more</Body>
              ) : null}
            </View>
            {doneToday ? (
              <Pill text="✓ Done today" color={colors.good} bg={colors.goodSoft} />
            ) : null}
            <Button
              title={doneToday ? 'Log it again' : 'Start workout'}
              icon="play.fill"
              onPress={() => router.push({ pathname: '/workout', params: { programId: activeProgram.id, sessionId: session.id } })}
            />
          </>
        ) : (
          <>
            <H2>{vb === 'game' || vb === 'tournament' ? 'Match day: no lifting' : 'No lift today'}</H2>
            <Body muted>
              {vb === 'off'
                ? 'Rest day. Sleep, eat well, and do some light stretching.'
                : 'Focus on volleyball today. Your next lift is coming up.'}
            </Body>
          </>
        )}
        {advice ? (
          <View style={{ backgroundColor: colors.warnSoft, padding: 10, borderRadius: 10 }}>
            <Text style={{ color: colors.warn, fontWeight: '600' }}>{advice}</Text>
          </View>
        ) : null}
      </Card>

      <Pressable onPress={() => router.navigate('/fuel')}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Today's fuel</Label>
            <Text style={{ color: colors.faint, fontSize: 20 }}>›</Text>
          </Row>
          <H2>{fuel.title}</H2>
          <Body muted>{fuel.summary}</Body>
          {targets ? (
            <Row style={{ gap: 8 }}>
              <Stat label="Carbs" value={`${targets.carbsG[0]}–${targets.carbsG[1]} g`} />
              <Stat label="Protein" value={`${targets.proteinG[0]}–${targets.proteinG[1]} g`} />
              <Stat label="Water" value={`${targets.fluidsOz[0]}+ oz`} />
            </Row>
          ) : (
            <Body muted style={{ fontSize: 13 }}>Add your body weight in Settings to see gram targets.</Body>
          )}
        </Card>
      </Pressable>

      <Card>
        <Label>This week</Label>
        <Row style={{ gap: 6 }}>
          {WEEKDAYS.map((d, k) => {
            const lift = !!activeProgram.liftSchedule[k];
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + k);
            const done = doneThisWeek.some((l) => new Date(l.date).toDateString() === date.toDateString());
            return (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: k === i ? colors.accent : colors.muted, fontWeight: '700' }}>{d}</Text>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.good : lift ? colors.accentSoft : colors.bg,
                  }}
                >
                  <Text style={{ color: done ? '#fff' : colors.accent, fontWeight: '800', fontSize: 12 }}>
                    {done ? '✓' : lift ? 'L' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </Row>
        <Body muted style={{ fontSize: 13 }}>
          {doneThisWeek.length} of {planned} lifts done this week
        </Body>
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '800', marginTop: 2 }}>{value}</Text>
    </View>
  );
}
