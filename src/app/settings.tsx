import { router } from 'expo-router';
import { showAlert } from '../lib/dialog';
import { useState } from 'react';

import Constants from 'expo-constants';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H2, Label, Lockup, Row, Screen, Text } from '../components/ui';
import { isDemoMode, syncConfigProblem } from '../lib/backend';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import { POSITIONS } from '../lib/types';
import { parseNum } from '../lib/util';
import { NUTRITION_DISCLAIMER } from '../lib/nutrition';

export default function Settings() {
  const { data, setProfile, resetAll, setTheme } = useStore();
  const { account, teams, signOut, leaveTeam } = useTeams();
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
        <H2>Appearance</H2>
        <ChipRow>
          <Chip label="Dark" selected={(data.theme ?? 'dark') === 'dark'} onPress={() => setTheme('dark')} />
          <Chip label="Light" selected={data.theme === 'light'} onPress={() => setTheme('light')} />
        </ChipRow>
      </Card>

      <Card>
        <H2>Account</H2>
        <Text style={{ fontSize: 13, color: isDemoMode ? colors.warning : colors.muted }}>
          {syncConfigProblem
            ? `Team sync: Off (${syncConfigProblem})`
            : isDemoMode
              ? 'Team sync: Demo mode (this device only)'
              : 'Team sync: On'}
        </Text>
        {account ? (
          <>
            <Body muted>
              Signed in as {account.email}
              {isDemoMode ? ' (demo mode, this device only)' : ''}.
            </Body>
            {!coach && teams.length ? (
              teams.map((t) => (
                <Row key={t.id} style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600', flex: 1 }}>{t.name}</Text>
                  <Button
                    small
                    kind="ghost"
                    title="Leave"
                    onPress={() =>
                      showAlert(`Leave ${t.name}?`, "You'll stop getting this team's workouts.", [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Leave', style: 'destructive', onPress: () => leaveTeam(t.id).catch(() => {}) },
                      ])
                    }
                  />
                </Row>
              ))
            ) : null}
            <Button kind="ghost" title="Sign out" onPress={() => signOut().then(() => router.back())} />
          </>
        ) : (
          <>
            <Body muted>{coach ? 'Sign in to manage teams.' : 'Sign in to join your team.'}</Body>
            <Button kind="secondary" title="Sign in or create account" onPress={() => router.push('/account')} />
          </>
        )}
      </Card>

      {account ? null : (
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
      )}

      <Card>
        <H2>Your data</H2>
        <Body muted>{account ? 'Your profile and team workouts sync with your team. Body weight and personal notes stay on this phone.' : 'Everything is stored only on this phone. Nothing is uploaded.'}</Body>
        <Button
          kind="danger"
          title="Erase all data"
          onPress={() =>
            showAlert('Erase everything?', 'This deletes your programs, workouts and settings from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: () => {
                  signOut().catch(() => {});
                  resetAll();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Card>

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Lockup badge={96} />
        <Text style={{ fontSize: 12, color: colors.faint }}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Card>

      <Body muted style={{ fontSize: 12 }}>
        Training guidance is general education for healthy athletes. Learn new lifts with a qualified coach, and stop if
        anything hurts. {NUTRITION_DISCLAIMER}
      </Body>
    </Screen>
  );
}
