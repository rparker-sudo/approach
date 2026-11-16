import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import ProgramDetail from '../../components/ProgramDetail';
import ScreenHeader from '../../components/ScreenHeader';
import { Body, Button, Card, colors, H2, Icon, Label, NetTape, Pill, Row, Screen, Text } from '../../components/ui';
import { formatKey, today, upcomingEvents } from '../../lib/calendar';
import { liftDayCount } from '../../lib/generator';
import { useStore } from '../../lib/store';
import { isDraftKey, useTeams } from '../../lib/team';
import { goalLabel, isGeneral, programLine } from '../../lib/general';
import { useGeneralView } from '../../lib/useGeneral';
import { formatDate } from '../../lib/util';
import type { Program } from '../../lib/types';
import { PHASES } from '../../lib/types';

export default function ProgramTab() {
  const { data, activeProgram } = useStore();
  const { account, teams, postedFor } = useTeams();
  const coach = data.profile?.role === 'coach';
  const general = useGeneralView();

  if (coach) {
    const drafts = data.programs.filter((p) => !p.teamId);
    return (
      <Screen tab>
        <ScreenHeader title={general ? 'Program' : 'Plan'} subtitle={general ? 'Your programs' : 'Team workouts'} />
        {teams.length === 0 ? (
          <Card>
            <NetTape />
            <H2>No teams yet</H2>
            <Body muted>Make a team on the Team tab, then build its workout here or there.</Body>
          </Card>
        ) : (
          teams.map((t) => {
            const teamPrograms = data.programs.filter((x) => x.teamId === t.id);
            if (isGeneral(t)) {
              // 2.3.0: a general team's programs (drafts and posted), with goal and week.
              return (
                <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push(`/team/${t.id}`)}>
                  <Card>
                    <Label>{t.name}</Label>
                    {teamPrograms.length === 0 ? <H2>No programs yet</H2> : null}
                    {teamPrograms.map((p) => (
                      <Text key={p.id} style={{ fontSize: 15 }}>
                        {p.name} <Text style={{ fontSize: 13, color: colors.muted }}>· {isDraftKey(p.groupKey) ? `${goalLabel(p.goal)} · Draft` : programLine(p)}</Text>
                      </Text>
                    ))}
                  </Card>
                </Pressable>
              );
            }
            return (
              <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push(`/team/${t.id}`)}>
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Label>{t.name}</Label>
                      {teamPrograms.length === 0 ? <H2>No workout yet</H2> : null}
                      {teamPrograms.map((p) => {
                        const tp = postedFor(t.id, p.groupKey ?? 'all');
                        return (
                          <View key={p.id} style={{ gap: 4 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600' }}>
                              {p.groupName ?? 'Whole team'} <Text style={{ fontSize: 13, color: colors.muted }}>· {p.name}</Text>
                            </Text>
                            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                              <Pill text={PHASES.find((x) => x.id === p.phase)!.label} bg={colors.day.game} />
                              <Pill text={p.unposted || !tp ? 'Not posted' : `Posted ${formatDate(tp.updatedAt)}`} />
                            </Row>
                          </View>
                        );
                      })}
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                </Card>
              </Pressable>
            );
          })
        )}
        {/* F34: the volleyball generator isn't offered to a trainer with only general teams. */}
        {general ? null : (
          <>
            <Label>Other programs</Label>
            <Body muted style={{ fontSize: 13 }}>
              Drafts, or programs to send as a code to athletes who don&apos;t use a team.
            </Body>
            {drafts.map((p) => (
              <ProgramRow key={p.id} program={p} />
            ))}
            <Button kind="ghost" title="New program" icon="plus" onPress={() => router.push('/builder')} />
          </>
        )}
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
          <H2>{general ? `You're with ${teams[0].name}` : `You're on ${teams[0].name}`}</H2>
          <Body muted>{general ? "Your trainer hasn't posted a program yet. It shows up here as soon as they do." : "Your coach hasn't posted a workout yet. It shows up here as soon as they do."}</Body>
        </Card>
      ) : null}
      {general
        ? data.programs
            .filter((p) => p.general && p.teamId && p.id !== activeProgram?.id)
            .map((p) => <ProgramDetail key={p.id} program={p} />)
        : null}
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
          {general ? null : <Button kind="ghost" title="New program" icon="plus" onPress={() => router.push('/builder')} />}
        </View>
      </Row>
      {general ? null : <Button kind="ghost" title="Import a program code" icon="square.and.arrow.down" onPress={() => router.push('/import')} />}
      {others.length > 0 && !general ? (
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
  return (
    <Pressable onPress={() => router.push(`/program/${program.id}`)}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <H2>{program.name}</H2>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              <Pill text={PHASES.find((x) => x.id === program.phase)!.label} bg={colors.day.game} />
              <Pill text={`${liftDayCount(program)} lifts/wk`} />
            </Row>
            {program.teamName ? <Body muted style={{ fontSize: 13 }}>Team: {program.teamName}</Body> : null}
          </View>
          <Icon name="chevron.right" size={14} color={colors.faint} />
        </Row>
      </Card>
    </Pressable>
  );
}
