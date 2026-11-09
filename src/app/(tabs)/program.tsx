import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import ProgramDetail from '../../components/ProgramDetail';
import ScreenHeader from '../../components/ScreenHeader';
import { Body, Button, Card, colors, H2, Icon, Label, NetTape, Pill, Row, Screen } from '../../components/ui';
import { formatKey, today, upcomingEvents } from '../../lib/calendar';
import { useStore } from '../../lib/store';
import { teamProgramId, useTeams } from '../../lib/team';
import { formatDate } from '../../lib/util';
import type { Program } from '../../lib/types';
import { PHASES } from '../../lib/types';

export default function ProgramTab() {
  const { data, activeProgram } = useStore();
  const { account, teams, posted } = useTeams();
  const coach = data.profile?.role === 'coach';

  if (coach) {
    const drafts = data.programs.filter((p) => !p.teamId);
    return (
      <Screen tab>
        <ScreenHeader title="Plan" subtitle="Team workouts" />
        {teams.length === 0 ? (
          <Card>
            <NetTape />
            <H2>No teams yet</H2>
            <Body muted>Make a team on the Team tab, then build its workout here or there.</Body>
          </Card>
        ) : (
          teams.map((t) => {
            const p = data.programs.find((x) => x.id === teamProgramId(t.id));
            return (
              <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push(`/team/${t.id}`)}>
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Label>{t.name}</Label>
                      <H2>{p?.name ?? 'No workout yet'}</H2>
                      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                        {p ? <Pill text={PHASES.find((x) => x.id === p.phase)!.label} bg={colors.day.game} /> : null}
                        <Pill
                          text={p?.unposted ? 'Changes not posted' : posted[t.id] ? `Posted ${formatDate(posted[t.id].updatedAt)}` : 'Not posted'}
                        />
                      </Row>
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                </Card>
              </Pressable>
            );
          })
        )}
        <Label>Other programs</Label>
        <Body muted style={{ fontSize: 13 }}>
          Drafts, or programs to send as a code to athletes who don't use a team.
        </Body>
        {drafts.map((p) => (
          <ProgramRow key={p.id} program={p} />
        ))}
        <Button kind="ghost" title="New program" icon="plus" onPress={() => router.push('/builder')} />
      </Screen>
    );
  }

  const others = data.programs.filter((p) => p.id !== activeProgram?.id);
  const nextEvent = activeProgram ? upcomingEvents(activeProgram, today(), 1)[0] : undefined;
  const waitingForCoach = teams.length > 0 && !data.programs.some((p) => p.teamId);
  return (
    <Screen tab>
      <ScreenHeader
        title="Plan"
        subtitle={
          nextEvent
            ? `Next: ${nextEvent.type === 'tournament' ? 'Tournament' : 'Match'} ${formatKey(nextEvent.date)}`
            : teams.length
              ? teams.map((t) => t.name).join(' · ')
              : 'Season, week, and match days'
        }
      />
      {waitingForCoach ? (
        <Card>
          <NetTape />
          <H2>You're on {teams[0].name}</H2>
          <Body muted>Your coach hasn't posted a workout yet. It shows up here as soon as they do.</Body>
        </Card>
      ) : null}
      {activeProgram ? (
        <ProgramDetail program={activeProgram} />
      ) : waitingForCoach ? null : (
        <Card>
          <NetTape />
          <H2>No active program</H2>
          <Body muted>Join your team with its code, or build your own program.</Body>
        </Card>
      )}
      <Row>
        <View style={{ flex: 1 }}>
          <Button
            kind="ghost"
            title="Join a team"
            icon="person.3"
            onPress={() => router.push(account ? '/join' : '/account')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="ghost" title="New program" icon="plus" onPress={() => router.push('/builder')} />
        </View>
      </Row>
      <Button kind="ghost" title="Import a program code" icon="square.and.arrow.down" onPress={() => router.push('/import')} />
      {others.length > 0 ? (
        <>
          <Label>Other saved programs</Label>
          {others.map((p) => (
            <ProgramRow key={p.id} program={p} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function ProgramRow({ program }: { program: Program }) {
  const { data } = useStore();
  return (
    <Pressable onPress={() => router.push(`/program/${program.id}`)}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <H2>{program.name}</H2>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Pill text={PHASES.find((x) => x.id === program.phase)!.label} bg={colors.day.game} />
              <Pill text={`${program.liftSchedule.filter(Boolean).length} lifts/wk`} />
            </Row>
            {program.teamName ? <Body muted style={{ fontSize: 13 }}>Team: {program.teamName}</Body> : null}
          </View>
          <Icon name="chevron.right" size={14} color={colors.faint} />
        </Row>
      </Card>
    </Pressable>
  );
}
