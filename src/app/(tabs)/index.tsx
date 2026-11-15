import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import AttendanceCheck from '../../components/AttendanceCheck';
import CapNotice from '../../components/CapNotice';
import { ConsentBanner } from '../../components/Consent';
import RackCard from '../../components/RackCard';
import StationsCard from '../../components/StationsCard';
import HomeEquipmentSheet from '../../components/HomeEquipmentSheet';
import ReadinessCard from '../../components/ReadinessCard';
import ScreenHeader from '../../components/ScreenHeader';
import Sheet from '../../components/Sheet';
import VersionLine, { DroppedLine } from '../../components/VersionLine';
import TeamHome from '../../components/TeamHome';
import {
  Banner,
  Body,
  Button,
  Card,
  colors,
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
import { capExperience, resolveFor } from '../../lib/athlete';
import { addDays, breakOn, dateKey, dayTypeOn, eventsOn, formatKey, isHeavyLegs, mondayOf, today, weekPlan } from '../../lib/calendar';
import { getExercise } from '../../lib/exercises';
import { captainLine, dayAdvice } from '../../lib/generator';
import { cardsFor, fuelDay } from '../../lib/nutrition';
import { easingFor } from '../../lib/resolve';
import { formatMinutes } from '../../lib/rest';
import { canCheckIn, canLog } from '../../lib/backend';
import { useStore } from '../../lib/store';
import { BATTERY_LABEL } from '../../lib/testing';
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

/** G3 (copy review §2): today's check-in said pain. Not dismissible; no swaps, no questions. */
function PainCard({ pain }: { pain: boolean }) {
  if (!pain) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: colors.raised, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.warning, flexDirection: 'row', gap: 10 }}
    >
      <Text style={{ fontSize: 16, color: colors.warningText, fontWeight: '700' }}>!</Text>
      <Text style={{ fontSize: 16, lineHeight: 22, flex: 1 }}>
        Don&apos;t train through pain. Talk to your coach, parent, or athletic trainer before you lift today.
      </Text>
    </View>
  );
}

function LeaveNotice() {
  const { data, mutate } = useStore();
  if (!data.leaveNotice) return null;
  return <Banner action={{ label: 'Got it', onPress: () => mutate((d) => ({ ...d, leaveNotice: null })) }}>{data.leaveNotice}</Banner>;
}

function Today() {
  const { data, activeProgram } = useStore();
  const [easingOpen, setEasingOpen] = useState(false);
  const [homeSheet, setHomeSheet] = useState(false);
  const painToday = !!(data.readinessLog ?? []).find((r) => r.day === dateKey(today()))?.pain;
  const { account, teams, consentFor } = useTeams();
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
        <PainCard pain={painToday} />
        <LeaveNotice />
        <NetTape />
        {teams.length ? (
          <Card>
            <H2>You&apos;re on {teams[0].name}</H2>
            <Body muted>Your coach hasn&apos;t posted a workout yet. It shows up here as soon as they do.</Body>
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

  // Parent consent (coached minors): the team plan is read-only until the coach records the form.
  const loggingLocked = !!activeProgram.teamId && !canLog(consentFor(activeProgram.teamId));
  // Check-ins: solo athletes keep them on the phone; team athletes need a team that allows them.
  const teamIds = teams.length ? teams.map((t) => t.id) : Object.keys(data.teamConsent ?? {});
  const showCheckIn = teamIds.length === 0 || teamIds.some((id) => canCheckIn(consentFor(id)));

  // Real dates: the season calendar and automatic lift moves apply.
  const day = today();
  const week = weekPlan(activeProgram, mondayOf(day), capExperience(data));
  const todayPlan = week[i];
  const vb = todayPlan.dayType;
  const session = activeProgram.sessions.find((s) => s.id === todayPlan.sessionId);
  // G-1: the athlete's version of today's session.
  const todaySession = session ? resolveFor(data, activeProgram, session, day) : null;
  const easing = easingFor(data.logs, day);
  const onBreak = !!todayPlan.break;
  const otherBreak = !onBreak ? breakOn(activeProgram, day, true) : undefined;
  const todaysEvents = eventsOn(activeProgram, day);
  const advice = todayPlan.note ?? dayAdvice(week.map((p) => p.dayType), i, !!session, isHeavyLegs(session));
  const nextVb = dayTypeOn(activeProgram, addDays(day, 1));
  const fuel = fuelDay(vb, !!session, nextVb === 'game' || nextVb === 'tournament');
  // F12: today's top Fuel card (no numbers), linking to Fuel.
  const topCard = cardsFor(vb, !!session, nextVb === 'game' || nextVb === 'tournament').today[0];

  const weekStart = startOfWeek();
  const doneThisWeek = data.logs.filter((l) => new Date(l.date) >= weekStart && l.programId === activeProgram.id);
  const doneToday = doneThisWeek.some((l) => new Date(l.date).toDateString() === now.toDateString());
  const planned = week.filter((p) => p.sessionId).length;

  return (
    <Screen tab>
      <ScreenHeader title="Lift" subtitle={dateLine} />
      <PainCard pain={painToday} />
      <LeaveNotice />
      {loggingLocked ? <ConsentBanner /> : null}
      {easing.active ? (
        <Pressable accessibilityRole="button" onPress={() => setEasingOpen(true)}>
          <View style={{ backgroundColor: colors.raised, padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.ink }}>
            <Text style={{ fontSize: 15, fontWeight: '600' }}>Easing back in this week.</Text>
          </View>
        </Pressable>
      ) : null}
      {easingOpen ? (
        <Sheet title="Easing back in" onClose={() => setEasingOpen(false)}>
          <Body>
            {`Lighter week: effort tops out at RPE 6 and weights start a little lower. Back to normal on ${formatKey(
              dateKey(addDays(new Date(`${easing.until}T12:00:00`), 1)),
              { month: 'short', day: 'numeric' },
            )}.`}
          </Body>
          <Button title="Got it" onPress={() => setEasingOpen(false)} />
        </Sheet>
      ) : null}
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{captainLine(activeProgram, day)}</Text>
      {showCheckIn ? <ReadinessCard /> : null}
      {activeProgram.teamId ? null : <CapNotice program={activeProgram} />}
      {activeProgram.teamId ? <AttendanceCheck program={activeProgram} /> : null}
      {/* F21: no rack card on a home day. */}
      {activeProgram.teamId && session?.location !== 'home' ? <RackCard teamId={activeProgram.teamId} /> : null}
      {/* F20: opens once the first time an upcoming home day appears (closing counts as bodyweight only). */}
      {homeSheet || (!data.homeEquipmentAsked && week.slice(i).some((p) => activeProgram.sessions.find((x) => x.id === p.sessionId)?.location === 'home')) ? (
        <HomeEquipmentSheet onClose={() => setHomeSheet(false)} />
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>Today</Label>
          <Pill text={todayPlan.event?.label ?? DAY_TYPES.find((d) => d.id === vb)!.label} bg={colors.day[vb]} />
        </Row>
        {todaysEvents.some((e) => e.teamName) ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {todaysEvents
              .map((e) => `${DAY_TYPES.find((d) => d.id === e.type)?.label ?? e.type}${e.label ? ` (${e.label})` : ''} · ${e.teamName ?? activeProgram.teamName ?? ''}`)
              .join('  ·  ')}
          </Text>
        ) : null}
        {otherBreak ? <Note>{`${otherBreak.teamName} break. Your lifting continues on ${activeProgram.teamName ?? 'your'} program.`}</Note> : null}
        {onBreak ? (
          <>
            <H2>Break week</H2>
            <Body muted>Extra recovery is optional.</Body>
            <Button kind="secondary" title="Extra recovery" onPress={() => router.push('/recovery')} />
          </>
        ) : todayPlan.test && activeProgram.teamId ? (
          <>
            <H2>Testing session</H2>
            <Body muted>{`${BATTERY_LABEL[todayPlan.test]}: warm-up, jump tests${todayPlan.test === 'jump' ? '' : ', then strength checks with your coach'}.`}</Body>
            <Button
              title="Start testing session"
              icon="play.fill"
              onPress={() => router.push({ pathname: '/testing', params: { teamId: activeProgram.teamId! } })}
            />
          </>
        ) : session ? (
          <>
            {session.location === 'home' ? (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{session.light ? '🏠 Light home' : '🏠 Home'}</Text>
                <H2>{session.light ? `Light home day · ${formatMinutes(todaySession!.estMinutes)}` : `Home workout · ${formatMinutes(todaySession!.estMinutes)}`}</H2>
                <Body muted>{session.light ? 'Easy movement. No weights today.' : session.name}</Body>
                {!data.homeEquipmentAsked ? (
                  <Text accessibilityRole="link" onPress={() => setHomeSheet(true)} style={{ fontSize: 14, textDecorationLine: 'underline' }}>
                    Set up home equipment
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <H2>{session.name}</H2>
                <Body muted>{session.focus}</Body>
              </>
            )}
            {activeProgram.teamId && session.format === 'stations' ? <StationsCard teamId={activeProgram.teamId} session={session} exercises={todaySession!.exercises} /> : null}
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Pill text={todaySession!.block.label} />
              {session.location === 'home' ? null : <Pill text={formatMinutes(todaySession!.estMinutes)} />}
              {todaySession!.light ? <Pill text="Lightened by coach" bg={colors.day.game} /> : null}
            </Row>
            {todaySession!.light ? <Note>Coach lightened today&apos;s lift. Same exercises, fewer sets, easy effort.</Note> : null}
            {!todaySession!.light && todaySession!.block.deload ? <Note>Deload week: fewer sets, easy effort. Let your body catch up.</Note> : null}
            <View style={{ gap: 4 }}>
              {todaySession!.exercises.slice(0, 4).map((e, k) => (
                <View key={k}>
                  <Text style={{ fontSize: 13 }}>
                    {getExercise(e.exerciseId).name} <Text style={{ color: colors.muted, fontSize: 13 }}>{e.sets} × {e.reps}</Text>
                  </Text>
                  <VersionLine exerciseId={e.exerciseId} teamExerciseId={e.teamExerciseId} teamId={activeProgram.teamId} />
                </View>
              ))}
              {todaySession!.exercises.length > 4 ? (
                <Text style={{ fontSize: 13, color: colors.muted }}>+ {todaySession!.exercises.length - 4} more</Text>
              ) : null}
              <DroppedLine count={todaySession!.dropped} />
            </View>
            {session.location === 'home' && !data.homeHintSeen ? (
              <Text style={{ fontSize: 13, color: colors.muted }}>Clear some space, wear sneakers, and stop if anything hurts.</Text>
            ) : null}
            {doneToday ? <Pill text="Done today" achievement /> : null}
            {loggingLocked ? (
              <Button title="Logging unlocks after consent." disabled onPress={() => {}} />
            ) : (
              <Button
                title={doneToday ? 'Log it again' : 'Start workout'}
                icon="play.fill"
                onPress={() => router.push({ pathname: '/workout', params: { programId: activeProgram.id, sessionId: session.id } })}
              />
            )}
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
        {!onBreak ? <Button kind="ghost" small title="Extra recovery" onPress={() => router.push('/recovery')} /> : null}
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
          {topCard ? <Text style={{ fontSize: 15, fontWeight: '600' }}>{`Tip: ${topCard.title}`}</Text> : null}
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
