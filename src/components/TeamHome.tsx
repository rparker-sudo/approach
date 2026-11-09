import { router } from 'expo-router';
import { showAlert, shareText } from '../lib/dialog';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { encodeProgram, useStore } from '../lib/store';
import type { Athlete, Position } from '../lib/types';
import { POSITIONS } from '../lib/types';
import { uid } from '../lib/util';
import ScreenHeader from './ScreenHeader';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H2, Icon, Label, NetTape, Row, Screen, Text } from './ui';

export async function shareProgram(programId: string, programs: ReturnType<typeof useStore>['data']['programs'], coachName?: string) {
  const p = programs.find((x) => x.id === programId);
  if (!p) return;
  const intro =
    `${coachName ? coachName + ' sent you' : 'Here is'} a training program: "${p.name}".\n\n` +
    'To open it in Load & Launch: go to Plan, tap Import from coach, then paste this whole message.\n\n';
  await shareText(intro + encodeProgram(p), `Load & Launch: ${p.name}`);
}

export default function TeamHome() {
  const { data, saveAthlete, deleteAthlete } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('Outside Hitter');
  const [open, setOpen] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    saveAthlete({ id: uid(), name: name.trim(), position, programId: null });
    setName('');
    setAdding(false);
  }

  return (
    <Screen tab>
      <ScreenHeader title="Team" subtitle={data.profile?.name} />

      <Card style={{ backgroundColor: colors.raised }}>
        <Label>How it works</Label>
        <Text style={{ lineHeight: 22 }}>
          Add your athletes. Build a program for each one, or one for a group. Tap Send. Players paste it into the app.
        </Text>
      </Card>

      {data.athletes.length === 0 && !adding ? (
        <Card>
          <NetTape />
          <H2>No athletes yet</H2>
          <Body muted>Add your players to track who has which program.</Body>
        </Card>
      ) : null}

      {data.athletes.map((a) => (
        <AthleteCard
          key={a.id}
          athlete={a}
          open={open === a.id}
          onToggle={() => setOpen(open === a.id ? null : a.id)}
          onAssign={(programId) => saveAthlete({ ...a, programId })}
          onDelete={() =>
            showAlert(`Remove ${a.name}?`, 'Their programs stay in your Programs list.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => deleteAthlete(a.id) },
            ])
          }
        />
      ))}

      {adding ? (
        <Card>
          <H2>Add athlete</H2>
          <Field placeholder="Name" value={name} onChangeText={setName} autoFocus />
          <Label>Position</Label>
          <ChipRow>
            {POSITIONS.map((p) => (
              <Chip key={p} label={p} selected={position === p} onPress={() => setPosition(p)} />
            ))}
          </ChipRow>
          <Row>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" title="Cancel" onPress={() => setAdding(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Add" disabled={!name.trim()} onPress={add} />
            </View>
          </Row>
        </Card>
      ) : (
        <Button title="Add athlete" icon="plus" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

function AthleteCard({
  athlete,
  open,
  onToggle,
  onAssign,
  onDelete,
}: {
  athlete: Athlete;
  open: boolean;
  onToggle: () => void;
  onAssign: (programId: string | null) => void;
  onDelete: () => void;
}) {
  const { data } = useStore();
  const program = data.programs.find((p) => p.id === athlete.programId);
  return (
    <Card>
      <Pressable onPress={onToggle}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <H2>{athlete.name}</H2>
            <Body muted style={{ fontSize: 14 }}>
              {athlete.position} · {program ? program.name : 'No program yet'}
            </Body>
          </View>
          <Icon name={open ? 'chevron.up' : 'chevron.down'} size={14} color={colors.faint} />
        </Row>
      </Pressable>
      {open ? (
        <View style={{ gap: 10 }}>
          {program ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  kind="secondary"
                  small
                  title="Send"
                  icon="square.and.arrow.up"
                  onPress={() => shareProgram(program.id, data.programs, data.profile?.name)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button kind="ghost" small title="View" onPress={() => router.push(`/program/${program.id}`)} />
              </View>
            </Row>
          ) : null}
          <Button
            small
            title={program ? 'Build a new program' : 'Build a program'}
            icon="wand.and.stars"
            onPress={() => router.push({ pathname: '/builder', params: { athleteId: athlete.id } })}
          />
          {data.programs.length > 0 ? (
            <>
              <Label>Or assign an existing program</Label>
              <ChipRow>
                {data.programs.map((p) => (
                  <Chip key={p.id} label={p.name} selected={p.id === athlete.programId} onPress={() => onAssign(p.id)} />
                ))}
              </ChipRow>
            </>
          ) : null}
          <Button small kind="danger" title="Remove athlete" onPress={onDelete} />
        </View>
      ) : null}
    </Card>
  );
}
