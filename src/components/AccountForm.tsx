import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { AgeAnswer } from '../lib/age';
import { isDemoMode } from '../lib/backend';
import { COACH_TERMS_VERSION, openLegal } from '../lib/legal';
import { useStore } from '../lib/store';
import type { Account } from '../lib/backend';
import { useTeams } from '../lib/team';
import type { Role } from '../lib/types';
import { CoachTermsCheckbox } from './CoachTerms';
import { Body, Button, colors, Field, Note, Text, TextLink } from './ui';

/**
 * Create an account (sign-up only; Log in is its own screen, 2.2.1 §9). Used in the Create path and from Settings.
 * Coaches also tick the separate Coach Terms checkbox (2.2.1 §8); sign-up as a coach is blocked until it's checked.
 */
export default function AccountForm({
  role,
  onDone,
  submitLabel,
  age,
  loginParams,
}: {
  role: Role;
  /** From the onboarding age question; otherwise the saved profile's birth year is used. */
  age?: Pick<AgeAnswer, 'birthYear' | 'isMinor'> | null;
  onDone: (account: Account) => void;
  submitLabel?: string;
  /** Passed on to the Log in screen by "Already have an account? Log in." */
  loginParams?: Record<string, string>;
}) {
  const { signUp } = useTeams();
  const { data } = useStore();
  const birthYear = age?.birthYear ?? data.profile?.birthYear;
  const isMinor = age?.isMinor ?? data.profile?.isMinor ?? true;
  const [name, setName] = useState('');
  const [coachTerms, setCoachTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coach accounts are for adults 18 and older (the server enforces this too).
  const asRole: Role = isMinor ? 'athlete' : role;
  const ready = email.includes('@') && password.length >= 6 && name.trim().length > 0 && birthYear != null && (asRole !== 'coach' || coachTerms);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const a = await signUp({
        email,
        password,
        name,
        role: asRole,
        birthYear: birthYear!,
        isMinor,
        ...(asRole === 'coach' && coachTerms ? { coachTermsVersion: COACH_TERMS_VERSION } : {}),
      });
      onDone(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Field label="Name" placeholder={role === 'coach' ? 'Coach Parker' : 'First and last name'} value={name} onChangeText={setName} autoComplete="name" />
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
      <Field label="Password" placeholder="At least 6 characters" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {asRole === 'coach' ? <CoachTermsCheckbox checked={coachTerms} onChange={setCoachTerms} /> : null}
      {error ? <Text style={{ color: colors.errorText, fontSize: 13 }}>{error}</Text> : null}
      <Button title={busy ? 'One moment…' : (submitLabel ?? 'Create account')} disabled={!ready || busy} onPress={submit} />
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
        By creating an account you agree to the{' '}
        <Text
          accessibilityRole="link"
          onPress={() => openLegal('terms')}
          style={{
            fontSize: 13,
            color: colors.muted,
            textDecorationLine: 'underline',
          }}
        >
          Terms
        </Text>{' '}
        and{' '}
        <Text
          accessibilityRole="link"
          onPress={() => openLegal('privacy')}
          style={{
            fontSize: 13,
            color: colors.muted,
            textDecorationLine: 'underline',
          }}
        >
          Privacy Notice
        </Text>
        .
      </Text>
      <TextLink title="Already have an account? Log in." onPress={() => router.push({ pathname: '/sign-in', params: loginParams ?? {} })} />
      {isDemoMode ? (
        <Note>Demo mode: accounts and teams are saved on this device only. Connect Supabase (see the README) to sync teams across phones.</Note>
      ) : (
        <Body muted style={{ fontSize: 13 }}>
          Your name and workouts are shared only with your team&apos;s coach.
        </Body>
      )}
    </View>
  );
}
