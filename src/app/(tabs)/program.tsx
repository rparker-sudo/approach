import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import ProgramDetail from '../../components/ProgramDetail';
import ScreenHeader from '../../components/ScreenHeader';
import { Body, Button, Card, colors, H2, Icon, Label, NetTape, Pill, Row, Screen } from '../../components/ui';
import { useStore } from '../../lib/store';
import type { Program } from '../../lib/types';
import { PHASES } from '../../lib/types';

export default function ProgramTab() {
  const { data, activeProgram } = useStore();
  const coach = data.profile?.role === 'coach';

  if (coach) {
    return (
      <Screen tab>
        <ScreenHeader title="Plan" subtitle="Your programs" />
        <Row>
          <View style={{ flex: 1 }}>
            <Button title="New program" icon="plus" onPress={() => router.push('/builder')} />
          </View>
        </Row>
        {data.programs.length === 0 ? (
          <Card>
            <NetTape />
            <H2>No programs yet</H2>
            <Body muted>
              Build one for a single athlete, or a group program (for example "Middles – Preseason") you can send to
              several players.
            </Body>
          </Card>
        ) : (
          data.programs.map((p) => <ProgramRow key={p.id} program={p} />)
        )}
      </Screen>
    );
  }

  const others = data.programs.filter((p) => p.id !== activeProgram?.id);
  return (
    <Screen tab>
      <ScreenHeader title="Plan" subtitle="Season, week, and match days" />
      {activeProgram ? (
        <ProgramDetail program={activeProgram} />
      ) : (
        <Card>
          <NetTape />
          <H2>No active program</H2>
          <Body muted>Build your own, or import one your coach sent you.</Body>
        </Card>
      )}
      <Row>
        <View style={{ flex: 1 }}>
          <Button kind="ghost" title="New program" icon="plus" onPress={() => router.push('/builder')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="ghost" title="Import from coach" icon="square.and.arrow.down" onPress={() => router.push('/import')} />
        </View>
      </Row>
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
  const assigned = data.athletes.filter((a) => a.programId === program.id).map((a) => a.name);
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
            {assigned.length ? <Body muted style={{ fontSize: 13 }}>Assigned: {assigned.join(', ')}</Body> : null}
          </View>
          <Icon name="chevron.right" size={14} color={colors.faint} />
        </Row>
      </Card>
    </Pressable>
  );
}
