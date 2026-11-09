import { useState } from 'react';
import { View } from 'react-native';
import { isDemoMode } from '../lib/backend';
import type { Account } from '../lib/backend';
import { useTeams } from '../lib/team';
import type { Role } from '../lib/types';
import { Body, Button, Chip, ChipRow, colors, Field, Note, Text } from './ui';

/** Sign up or sign in. Used in onboarding and from Settings. */
export default function AccountForm({
  role,
  onDone,
  submitLabel,
}: {
  role: Role;
  onDone: (account: Account) => void;
  submitLabel?: string;
}) {
  const { signUp, signIn } = useTeams();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = email.includes('@') && password.length >= 6 && (mode === 'signin' || name.trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const a = mode === 'signup' ? await signUp({ email, password, name, role }) : await signIn(email, password);
      onDone(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <ChipRow>
        <Chip label="New account" selected={mode === 'signup'} onPress={() => setMode('signup')} />
        <Chip label="I have an account" selected={mode === 'signin'} onPress={() => setMode('signin')} />
      </ChipRow>
      {mode === 'signup' ? (
        <Field
          label="Name"
          placeholder={role === 'coach' ? 'Coach Parker' : 'First and last name'}
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />
      ) : null}
      <Field
        label="Email"
        placeholder="you@school.org"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
      <Button
        title={busy ? 'One moment…' : submitLabel ?? (mode === 'signup' ? 'Create account' : 'Sign in')}
        disabled={!ready || busy}
        onPress={submit}
      />
      {isDemoMode ? (
        <Note>
          Demo mode: accounts and teams are saved on this device only. Connect Supabase (see the README) to sync teams
          across phones.
        </Note>
      ) : (
        <Body muted style={{ fontSize: 13 }}>
          Your name and workouts are shared only with your team's coach.
        </Body>
      )}
    </View>
  );
}
