import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, Card, Chip, ChipRow, Field, H2, Label, Screen } from '../components/ui';
import { useStore } from '../lib/store';
import { POSITIONS } from '../lib/types';
import { parseNum } from '../lib/util';
import { NUTRITION_DISCLAIMER } from '../lib/nutrition';

export default function Settings() {
  const { data, setProfile, resetAll } = useStore();
  const [name, setName] = useState(data.profile?.name ?? '');
  const [weight, setWeight] = useState(data.profile?.bodyWeightLb ? String(data.profile.bodyWeightLb) : '');
  if (!data.profile) return null;
  const profile = data.profile;
  const coach = profile.role === 'coach';

  function save() {
    const w = parseNum(weight);
    setProfile({ ...profile, name: name.trim() || profile.name, bodyWeightLb: w > 0 ? w : null });
    router.back();
  }

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} />
      {!coach ? (
        <>
          <Field label="Body weight (lb)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="Optional" />
          <Label>Position</Label>
          <ChipRow>
            {POSITIONS.map((p) => (
              <Chip key={p} label={p} selected={profile.position === p} onPress={() => setProfile({ ...profile, position: p })} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <Button title="Save" onPress={save} />

      <Card>
        <H2>Mode</H2>
        <Body muted>You're using the app as {coach ? 'a coach' : 'an athlete'}.</Body>
        <Button
          kind="ghost"
          title={coach ? 'Switch to athlete mode' : 'Switch to coach mode'}
          onPress={() => {
            setProfile({ ...profile, role: coach ? 'athlete' : 'coach' });
            router.back();
          }}
        />
      </Card>

      <Card>
        <H2>Your data</H2>
        <Body muted>Everything is stored only on this phone. Nothing is uploaded.</Body>
        <Button
          kind="danger"
          title="Erase all data"
          onPress={() =>
            Alert.alert('Erase everything?', 'This deletes your programs, workouts and settings from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: () => {
                  resetAll();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Card>

      <Body muted style={{ fontSize: 12 }}>
        Training guidance is general education for healthy athletes. Learn new lifts with a qualified coach, and stop if
        anything hurts. {NUTRITION_DISCLAIMER}
      </Body>
    </Screen>
  );
}
