import { router } from 'expo-router';
import JoinTeamForm from '../components/JoinTeamForm';
import { Body, H2, Screen } from '../components/ui';
import { showAlert } from '../lib/dialog';

export default function JoinScreen() {
  return (
    <Screen>
      <H2>Enter your team code</H2>
      <Body muted>Your coach has a 6-character code. Once you join, the team workout becomes your plan.</Body>
      <JoinTeamForm
        onJoined={(team) => {
          showAlert(`You're on ${team.name}`, team.coachName ? `Coach ${team.coachName} posts your workouts.` : undefined);
          router.back();
        }}
      />
    </Screen>
  );
}
