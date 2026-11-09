import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import ReadinessCard from '../../components/ReadinessCard';
import ScreenHeader from '../../components/ScreenHeader';
import TeamHome from '../../components/TeamHome';
import {
  Body,
  Button,
  Card,
  colors,
  H1,
  H2,
  Icon,
  Label,
  NetTape,
  Note,
  Pill,
  Row,
  Screen,
  Text,
} from '../../components/ui';
import { addDays, dayTypeOn, isHeavyLegs, mondayOf, today, weekPlan } from '../../lib/calendar';
import { getExercise } from '../../lib/exercises';
import { captainLine, dayAdvice } from '../../lib/generator';
import { fuelDay, fuelTargets } from '../../lib/nutrition';
import { sessionForDate } from '../../lib/progression';
import { useStore } from '../../lib/store';
import { useTeams } from '../../lib/team';
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
  const { account, teams } = useTeams();
  const profile = data.profile!;
  const i = weekdayIndex();
  const now = new Date();
  const dateLine = `${now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}${
    profile.name ? ` · ${profile.name}` : ''
  }`;

  if (!activeProgram) {
    return (
      <Screen tab>
        <ScreenHeader title="Lift" subtitle={dateLine} />
        <NetTape />
        {teams.length ? (
          <Card>
            <H2>You're on {teams[0].name}</H2>
            <Body muted>Your coach hasn't posted a workout yet. It shows up here as soon as they do.</Body>
          </Card>
        ) : (
          <Card>
            <H2>No program yet</H2>
            <Body muted>Join your team with its code, or build your own program.</Body>
            <Button title="Join my team" icon="person.3" onPress={() => router.push(account ? '/join' : '/account')} />
            <Button kind="ghost" title="Build my own program" icon="wand.and.stars" onPress={() => router.push('/builder')} />
          </Card>
        )}
      </Screen>
    );
  }

  // Real dates: the season calendar and automatic lift moves apply.
  const day = today();
  const week = weekPlan(activeProgram, mondayOf(day));
  const todayPlan = week[i];
  const vb = todayPlan.dayType;
  const session = activeProgram.sessions.find((s) => s.id === todayPlan.sessionId);
  const todaySession = session ? sessionForDate(activeProgram, session, day) : null;
  const advice = todayPlan.note ?? dayAdvice(week.map((p) => p.dayType), i, !!session, isHeavyLegs(session));
  const nextVb = dayTypeOn(activeProgram, addDays(day, 1));
  const fuel = fuelDay(vb, !!session, nextVb === 'game' || nextVb === 'tournament');
  const targets = fuelTargets(fuel, profile.bodyWeightLb);

  const weekStart = startOfWeek();
  const doneThisWeek = data.logs.filter((l) => new Date(l.date) >= weekStart && l.programId === activeProgram.id);
  const doneToday = doneThisWeek.some((l) => new Date(l.date).toDateString() === now.toDateString());
  const planned = week.filter((p) => p.sessionId).length;

  return (
    <Screen tab>
      <ScreenHeader title="Lift" subtitle={dateLine} />
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{captainLine(activeProgram, day)}</Text>
      <ReadinessCard />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Today</Label>
          <Pill text={todayPlan.event?.label ?? DAY_TYPES.find((d) => d.id === vb)!.label} bg={colors.day[vb]} />
        </Row>
        {session ? (
          <>
            <H2>{session.name}</H2>
            <Body muted>{session.focus}</Body>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Pill text={todaySession!.block.label} />
              {todaySession!.light ? <Pill text="Lightened by coach" bg={colors.day.game} /> : null}
            </Row>
            {todaySession!.light ? <Note>Coach lightened today's lift. Same exercises, fewer sets, easy effort.</Note> : null}
            {!todaySession!.light && todaySession!.block.deload ? <Note>Deload week: fewer sets, easy effort. Let your body catch up.</Note> : null}
            <View style={{ gap: 4 }}>
              {todaySession!.exercises.slice(0, 4).map((e, k) => (
                <Text key={k} style={{ fontSize: 13 }}>
                  {getExercise(e.exerciseId).name} <Text style={{ color: colors.muted, fontSize: 13 }}>{e.sets} × {e.reps}</Text>
                </Text>
              ))}
              {todaySession!.exercises.length > 4 ? (
                <Text style={{ fontSize: 13, color: colors.muted }}>+ {todaySession!.exercises.length - 4} more</Text>
              ) : null}
            </View>
            {doneToday ? <Pill text="Done today" achievement /> : null}
            <Button
              title={doneToday ? 'Log it again' : 'Start workout'}
              icon="play.fill"
              onPress={() => router.push({ pathname: '/workout', params: { programId: activeProgram.id, sessionId: session.id } })}
            />
          </>
        ) : (
          <>
            <H2>{vb === 'game' || vb === 'tournament' ? 'Match day. No lifting.' : 'No lift today'}</H2>
            <Body muted>
              {vb === 'off' ? 'Recovery day. Sleep, eat, stretch.' : 'Volleyball only today. Next lift is coming up.'}
            </Body>
          </>
        )}
        {advice ? <Note>{advice}</Note> : null}
      </Card>

      <NetTape />

      <Pressable onPress={() => router.navigate('/fuel')}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Fuel</Label>
            <Icon name="chevron.right" size={14} color={colors.faint} />
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
            <Text style={{ fontSize: 13, color: colors.muted }}>Add your body weight in Settings to see gram targets.</Text>
          )}
        </Card>
      </Pressable>

      <Card>
        <Label>This week</Label>
        <Row style={{ gap: 6 }}>
          {WEEKDAYS.map((d, k) => {
            const lift = !!week[k].sessionId;
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + k);
            const done = doneThisWeek.some((l) => new Date(l.date).toDateString() === date.toDateString());
            return (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: k === i ? colors.ink : colors.faint, fontWeight: k === i ? '600' : '400' }}>{d}</Text>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.achievement : 'transparent',
                    borderWidth: done ? 0 : 1,
                    borderColor: lift ? colors.ink : colors.line,
                  }}
                >
                  {done ? <Icon name="checkmark" size={12} color={colors.bg} /> : lift ? <Text style={{ fontSize: 12, fontWeight: '600' }}>L</Text> : null}
                </View>
              </View>
            );
          })}
        </Row>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {doneThisWeek.length} of {planned} lifts done this week
        </Text>
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.raised, borderRadius: 8, padding: 10 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 16, fontWeight: '600', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
