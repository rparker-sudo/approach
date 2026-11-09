import { router } from 'expo-router';
import { showAlert } from '../lib/dialog';
import { View } from 'react-native';
import { useStore } from '../lib/store';
import type { Program } from '../lib/types';
import { EXPERIENCE, PHASES } from '../lib/types';
import { shareProgramCode } from '../lib/share';
import { useTeams } from '../lib/team';
import { formatDate } from '../lib/util';
import { Body, Button, Card, colors, Label, Pill, Row, Text } from './ui';
import { ProgramWeek } from './week';
import { weekdayIndex } from '../lib/util';

export default function ProgramDetail({ program, afterDelete }: { program: Program; afterDelete?: () => void }) {
  const { data, setActiveProgram, deleteProgram } = useStore();
  const coach = data.profile?.role === 'coach';
  const isActive = data.activeProgramId === program.id;
  const phase = PHASES.find((p) => p.id === program.phase)!;
  const { postTeamProgram } = useTeams();
  const team = !!program.teamId;
  const readOnly = team && !coach; // athletes follow the coach's team workout as posted

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '600' }}>{program.name}</Text>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Pill text={phase.label} bg={colors.day.game} />
          <Pill text={program.position} />
          <Pill text={EXPERIENCE.find((e) => e.id === program.experience)!.label} />
          {program.teamName ? <Pill text={`Team: ${program.teamName}`} achievement={!coach} /> : program.forName ? <Pill text={`For ${program.forName}`} /> : null}
        </Row>
        {program.author ? (
          <Body muted style={{ fontSize: 13 }}>
            {team ? `Posted by ${coach ? 'you' : `Coach ${program.author}`}` : `From ${program.author}`}
            {program.postedAt ? ` · updated ${formatDate(program.postedAt)}` : ''}
          </Body>
        ) : null}
        <Body muted style={{ fontSize: 13 }}>{phase.blurb}</Body>
      </View>

      <View style={{ gap: 4 }}>
        <Label>This week</Label>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {readOnly ? 'Tap a lift to see it. Your coach updates this plan.' : 'Tap a lift to see or edit it.'}
        </Text>
      </View>
      <ProgramWeek
        program={program}
        highlight={coach ? undefined : weekdayIndex()}
        onPressSession={(sessionId) => router.push({ pathname: '/session', params: { programId: program.id, sessionId } })}
      />

      <Card>
        {!coach && !isActive ? (
          <Button title={team ? 'Follow team plan' : 'Use this program'} icon="checkmark" onPress={() => setActiveProgram(program.id)} />
        ) : null}
        {coach && team && program.unposted ? (
          <Button
            title={`Post to ${program.teamName ?? 'team'}`}
            icon="square.and.arrow.up"
            onPress={() =>
              postTeamProgram(program.teamId!)
                .then(() => showAlert('Workout posted', 'Everyone on the roster has the new plan.'))
                .catch((e) => showAlert("Couldn't post", e instanceof Error ? e.message : 'Try again.'))
            }
          />
        ) : null}
        {coach && team ? (
          <Button kind="ghost" title="Open team" onPress={() => router.push(`/team/${program.teamId}`)} />
        ) : null}
        {!readOnly ? (
          <Button
            kind="secondary"
            title="Change schedule & rebuild"
            icon="arrow.triangle.2.circlepath"
            onPress={() => router.push({ pathname: '/builder', params: { programId: program.id, teamId: program.teamId } })}
          />
        ) : null}
        {coach && !team ? (
          <Button
            kind="ghost"
            title="Send as a code"
            icon="square.and.arrow.up"
            onPress={() => shareProgramCode(program, data.profile?.name)}
          />
        ) : null}
        {team ? null : (
        <Button
          kind="danger"
          title="Delete program"
          onPress={() =>
            showAlert('Delete this program?', 'Workout history you logged is kept.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteProgram(program.id);
                  afterDelete?.();
                },
              },
            ])
          }
        />
        )}
      </Card>
    </View>
  );
}
