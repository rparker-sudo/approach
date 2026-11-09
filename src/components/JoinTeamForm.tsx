import { useState } from 'react';
import { View } from 'react-native';
import type { Team } from '../lib/backend';
import { normalizeCode } from '../lib/backend';
import { useTeams } from '../lib/team';
import { Button, colors, display, Text, TextInput } from './ui';

/** Athletes enter the 6-character code their coach shares. */
export default function JoinTeamForm({ onJoined }: { onJoined: (team: Team) => void }) {
  const { joinTeam } = useTeams();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = normalizeCode(code);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      onJoined(await joinTeam(clean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(normalizeCode(t).slice(0, 6))}
        placeholder="TEAM CODE"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        accessibilityLabel="Team code"
        style={[display(24), { textAlign: 'center', paddingVertical: 16 }]}
      />
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
      <Button title={busy ? 'Joining…' : 'Join team'} disabled={clean.length !== 6 || busy} onPress={join} />
    </View>
  );
}
