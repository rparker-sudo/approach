import { router } from 'expo-router';
import AccountForm from '../components/AccountForm';
import { Body, H2, Screen } from '../components/ui';
import { useStore } from '../lib/store';

/** Sign in from Settings or the Team/Plan tabs (for people who started without an account). */
export default function AccountScreen() {
  const { data, setProfile } = useStore();
  const role = data.profile?.role ?? 'athlete';
  return (
    <Screen>
      <H2>{role === 'coach' ? 'Coach account' : 'Athlete account'}</H2>
      <Body muted>
        {role === 'coach'
          ? 'Your account holds your teams and the workouts you post.'
          : 'An account lets you join your team and send your workouts to your coach.'}
      </Body>
      <AccountForm
        role={role}
        onDone={(a) => {
          if (data.profile) setProfile({ ...data.profile, name: a.name || data.profile.name, role: a.role });
          router.back();
        }}
      />
    </Screen>
  );
}
