import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { encodeProgram, useStore } from '../lib/store';
import type { Athlete, Position } from '../lib/types';
import { POSITIONS } from '../lib/types';
import { uid } from '../lib/util';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H1, H2, Icon, Label, Row, Screen } from './ui';

export async function shareProgram(programId: string, programs: ReturnType<typeof useStore>['data']['programs'], coachName?: string) {
  const p = programs.find((x) => x.id === programId);
  if (!p) return;
  const intro =
    `${coachName ? coachName + ' sent you' : 'Here is'} a training program: "${p.name}".\n\n` +
    'To open it: in the Volley Strength app, go to Program → Import from coach, then paste this whole message.\n\n';
  await Share.share({ message: intro + encodeProgram(p) });
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
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Body muted>{data.profile?.name}</Body>
          <H1>Your team</H1>
        </View>
        <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={10}>
          <Icon name="gearshape.fill" color={colors.muted} size={24} />
        </Pressable>
      </Row>

      <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>How it works</Text>
        <Text style={{ color: '#D6E2F0', lineHeight: 20 }}>
          1. Add your athletes. 2. Build a program for each athlete, or one for a group. 3. Tap Send. Players paste it into
          the app on their phones.
        </Text>
      </Card>

      {data.athletes.length === 0 && !adding ? (
        <Card>
          <H2>No athletes yet</H2>
          <Body muted>Add your players to keep track of who has which program.</Body>
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
            Alert.alert(`Remove ${a.name}?`, 'Their programs stay in your Programs list.', [
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
          <Text style={{ color: colors.faint, fontSize: 20 }}>{open ? '⌃' : '⌄'}</Text>
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
