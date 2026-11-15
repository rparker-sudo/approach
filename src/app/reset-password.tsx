import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, colors, Field, H1, Screen, Text, TextLink } from '../components/ui';
import { backend } from '../lib/backend';
import { homeAfterLogin, profileAfterLogin } from '../lib/signin';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';

/**
 * The password-reset link from the email opens https://app.approachstrength.com/reset-password (2.2.1 §1). The link
 * signs the person in for this one step; they choose a new password and go home.
 */
export default function ResetPassword() {
  const { data, setProfile } = useStore();
  const { setSignedIn } = useTeams();
  const [state, setState] = useState<'checking' | 'ready' | 'bad'>('checking');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    backend
      .consumeAuthLink()
      .then(async (r) => {
        if (!live) return;
        // Signed in by the link, or already signed in on this device.
        const a = r ? await backend.getAccount() : await backend.getAccount().catch(() => null);
        if (live) setState(a ? 'ready' : 'bad');
      })
      .catch((e) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : null);
        setState('bad');
      });
    return () => {
      live = false;
    };
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await backend.updatePassword(password);
      const a = await backend.getAccount();
      if (!a) throw new Error('Log in with your new password.');
      setProfile(profileAfterLogin(a, data.profile));
      setSignedIn(a);
      router.replace(await homeAfterLogin(a));
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
          <H1>Set a new password</H1>
          {state === 'checking' ? <Body muted>One moment…</Body> : null}
          {state === 'bad' ? (
            <>
              <Body muted>{error ?? 'That link has expired or was already used. Ask for a new one.'}</Body>
              <TextLink title="Log in" onPress={() => router.replace('/sign-in')} />
            </>
          ) : null}
          {state === 'ready' ? (
            <>
              <Field
                label="New password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Button title={busy ? 'Saving…' : 'Save password'} disabled={busy || password.length < 6} onPress={save} />
              {error ? <Text style={{ color: colors.errorText, fontSize: 14 }}>{error}</Text> : null}
            </>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
