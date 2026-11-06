import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { useStore } from '../lib/store';
import type { Program } from '../lib/types';
import { EXPERIENCE, PHASES } from '../lib/types';
import { shareProgram } from './TeamHome';
import { Body, Button, Card, colors, H1, Label, Pill, Row } from './ui';
import { ProgramWeek } from './week';
import { weekdayIndex } from '../lib/util';

export default function ProgramDetail({ program, afterDelete }: { program: Program; afterDelete?: () => void }) {
  const { data, setActiveProgram, deleteProgram } = useStore();
  const coach = data.profile?.role === 'coach';
  const isActive = data.activeProgramId === program.id;
  const phase = PHASES.find((p) => p.id === program.phase)!;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <H1>{program.name}</H1>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Pill text={phase.label} bg={colors.accentSoft} color={colors.accent} />
          <Pill text={program.position} />
          <Pill text={EXPERIENCE.find((e) => e.id === program.experience)!.label} />
          {program.forName ? <Pill text={`For ${program.forName}`} /> : null}
        </Row>
        {program.author ? <Body muted style={{ fontSize: 13 }}>From {program.author}</Body> : null}
        <Body muted style={{ fontSize: 14 }}>{phase.blurb}</Body>
      </View>

      <Label>Weekly plan · tap a lift to see or edit it</Label>
      <ProgramWeek
        program={program}
        highlight={coach ? undefined : weekdayIndex()}
        onPressSession={(sessionId) => router.push({ pathname: '/session', params: { programId: program.id, sessionId } })}
      />

      <Card>
        {!coach && !isActive ? (
          <Button title="Use this program" icon="checkmark" onPress={() => setActiveProgram(program.id)} />
        ) : null}
        <Button
          kind="secondary"
          title="Change schedule & rebuild"
          icon="arrow.triangle.2.circlepath"
          onPress={() => router.push({ pathname: '/builder', params: { programId: program.id } })}
        />
        {coach ? (
          <Button
            title="Send to athletes"
            icon="square.and.arrow.up"
            onPress={() => shareProgram(program.id, data.programs, data.profile?.name)}
          />
        ) : null}
        <Button
          kind="danger"
          title="Delete program"
          onPress={() =>
            Alert.alert('Delete this program?', 'Workout history you logged is kept.', [
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
      </Card>
    </View>
  );
}
