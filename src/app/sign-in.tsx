import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, colors, Field, H1, Note, Screen, Text, TextLink } from '../components/ui';
import { backend, isDemoMode } from '../lib/backend';
import { homeAfterLogin, profileAfterLogin, roleParam } from '../lib/signin';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';

const MISMATCH = "That email and password don't match. Try again.";

/**
 * Log in (2.2.1 §9, UX F1 v3.2). Email and password only: no age question and no role picker, because the account
 * already has its birth year and role. Also opened from the website as /sign-in?role=coach|athlete (the role only
 * preselects the role card if they go on to create an account; unknown values are ignored).
 */
export default function SignIn() {
  const params = useLocalSearchParams<{ role?: string; code?: string }>();
  const role = roleParam(params.role);
  const code = typeof params.code === 'string' && params.code ? params.code : undefined;
  const { data, setProfile } = useStore();
  const { signIn } = useTeams();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const createParams = { create: '1', ...(role ? { role } : {}), ...(code ? { code } : {}) };
  const back = () => router.replace({ pathname: '/onboarding', params: code ? { code } : {} });

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const a = await signIn(email, password);
      setProfile(profileAfterLogin(a, data.profile));
      router.replace(await homeAfterLogin(a, code));
    } catch (e) {
      const msg = e instanceof Error ? e.message : MISMATCH;
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    setBusy(true);
    setError(null);
    try {
      await backend.requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          <View style={{ alignSelf: 'flex-start' }}>
            <TextLink title="Back" onPress={mode === 'forgot' ? () => setMode('login') : back} style={{ textDecorationLine: 'none', fontWeight: '600' }} />
          </View>
          {mode === 'login' ? (
            <>
              <H1>Log in</H1>
              <Field
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={() => email && password && !busy && submit()}
              />
              <Button title={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email.trim() || !password} onPress={submit} />
              {error ? (
                <Text accessibilityRole="alert" style={{ color: colors.errorText, fontSize: 14 }}>
                  {error}
                </Text>
              ) : null}
              <TextLink
                title="Forgot password?"
                onPress={() => {
                  setError(null);
                  setSent(false);
                  setMode('forgot');
                }}
              />
              <TextLink title="New here? Create an account" onPress={() => router.replace({ pathname: '/onboarding', params: createParams })} />
              {isDemoMode ? <Note>Demo mode: accounts are saved on this device only.</Note> : null}
            </>
          ) : (
            <>
              <H1>Reset your password</H1>
              <Body muted>Enter your account email. We&apos;ll send a link to set a new password.</Body>
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
              <Button title={busy ? 'Sending…' : 'Send link'} disabled={busy || !email.includes('@')} onPress={sendReset} />
              {sent ? <Body muted>If that email has an account, a link is on its way. Open it on this device.</Body> : null}
              {error ? <Text style={{ color: colors.errorText, fontSize: 14 }}>{error}</Text> : null}
            </>
          )}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
