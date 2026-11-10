import { useState } from 'react';
import { View } from 'react-native';
import type { AgeAnswer } from '../lib/age';
import { isDemoMode } from '../lib/backend';
import { openLegal } from '../lib/legal';
import { useStore } from '../lib/store';
import type { Account } from '../lib/backend';
import { useTeams } from '../lib/team';
import type { Role } from '../lib/types';
import { Body, Button, Chip, ChipRow, colors, Field, Note, Text } from './ui';

/** Sign up or sign in. Used in onboarding and from Settings. */
export default function AccountForm({
  role,
  onDone,
  submitLabel,
  age,
}: {
  role: Role;
  /** From the onboarding age question; otherwise the saved profile's birth year is used. */
  age?: Pick<AgeAnswer, 'birthYear' | 'isMinor'> | null;
  onDone: (account: Account) => void;
  submitLabel?: string;
}) {
  const { signUp, signIn } = useTeams();
  const { data } = useStore();
  const birthYear = age?.birthYear ?? data.profile?.birthYear;
  const isMinor = age?.isMinor ?? data.profile?.isMinor ?? true;
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = email.includes('@') && password.length >= 6 && (mode === 'signin' || (name.trim().length > 0 && birthYear != null));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const a =
        mode === 'signup'
          ? // Coach accounts are for adults 18 and older (the server enforces this too).
            await signUp({ email, password, name, role: isMinor ? 'athlete' : role, birthYear: birthYear!, isMinor })
          : await signIn(email, password);
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
        placeholder="you@example.com"
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
      {mode === 'signup' ? (
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
          By creating an account you agree to the{' '}
          <Text accessibilityRole="link" onPress={() => openLegal('terms')} style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'underline' }}>
            Terms
          </Text>{' '}
          and{' '}
          <Text accessibilityRole="link" onPress={() => openLegal('privacy')} style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'underline' }}>
            Privacy Notice
          </Text>
          .
        </Text>
      ) : null}
      {isDemoMode ? (
        <Note>
          Demo mode: accounts and teams are saved on this device only. Connect Supabase (see the README) to sync teams
          across phones.
        </Note>
      ) : (
        <Body muted style={{ fontSize: 13 }}>
          Your name and workouts are shared only with your team&apos;s coach.
        </Body>
      )}
    </View>
  );
}
