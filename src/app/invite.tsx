import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import QRCode from '../components/QRCode';
import { Body, Button, Card, colors, display, H2, Note, Text } from '../components/ui';
import { isDemoMode } from '../lib/backend';
import { joinUrl } from '../lib/links';
import { shareTeamInvite } from '../lib/share';
import { useTeams } from '../lib/team';

/** Big QR code a coach can project in the gym, screenshot, or share. */
export default function InviteScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams, account } = useTeams();
  const { width } = useWindowDimensions();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const link = joinUrl(team.joinCode);
  const size = Math.min(width - 64, 360);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16, alignItems: 'center' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: `Join ${team.name}` }} />
      {isDemoMode ? (
        <View style={{ alignSelf: 'stretch' }}>
          <Note>Demo mode: athletes on other phones can&apos;t join yet. Connect Supabase first (see the README).</Note>
        </View>
      ) : null}
      {link ? (
        <>
          <Text style={[display(20), { textAlign: 'center' }]}>{team.name}</Text>
          <QRCode value={link} size={size} />
          <Body muted style={{ textAlign: 'center' }}>
            Athletes scan with the iPhone Camera, make an account, and they&apos;re on the team.
          </Body>
          <Text style={[display(24), { textAlign: 'center' }]} selectable>
            {team.joinCode}
          </Text>
          <Text selectable style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
            {link}
          </Text>
        </>
      ) : (
        <Card style={{ alignSelf: 'stretch' }}>
          <H2>QR code needs your web address</H2>
          <Body muted>
            The QR code opens the browser version of Approach. Once it&apos;s on GitHub Pages, set EXPO_PUBLIC_APP_URL
            to its address (see the README) and the QR code appears here.
          </Body>
          <Note>{`Until then, athletes can enter team code ${team.joinCode} in the app.`}</Note>
        </Card>
      )}
      <View style={{ alignSelf: 'stretch' }}>
        <Button
          kind="secondary"
          title="Share link"
          icon="square.and.arrow.up"
          onPress={() => shareTeamInvite(team.name, team.joinCode, account?.name)}
        />
      </View>
    </ScrollView>
  );
}
