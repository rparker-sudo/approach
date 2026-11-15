import type { Account } from './backend';
import { backend } from './backend';
import type { Profile } from './types';

export { roleParam } from './roleParam';

/**
 * This device's profile after logging in to an existing account. The account's role, name, position and age win; a
 * profile already on this device keeps its training settings. No birth year on the account (pre-2.1) leaves it empty,
 * so the age question appears once before the tabs.
 */
export function profileAfterLogin(account: Account, current: Profile | null): Profile {
  const age = account.birthYear != null ? { birthYear: account.birthYear, isMinor: account.isMinor ?? true } : { birthYear: undefined, isMinor: undefined };
  const base: Profile = current ?? {
    name: '',
    role: account.role,
    position: account.position ?? 'Outside Hitter',
    experience: 'beginner',
    phase: 'in',
    bodyWeightLb: null,
    liftDaysPerWeek: 2,
    volleyballWeek: ['practice', 'practice', 'practice', 'practice', 'practice', 'off', 'off'],
  };
  return {
    ...base,
    role: account.role,
    name: account.name || base.name,
    position: account.position ?? base.position,
    ...age,
    hasAccount: true,
  };
}

/** Where to go after logging in: coach → Team; athlete → Today, or Join team if they're on none. */
export async function homeAfterLogin(account: Account, code?: string): Promise<{ pathname: string; params?: Record<string, string> }> {
  if (code) return { pathname: '/join', params: { code } };
  if (account.role === 'coach') return { pathname: '/' };
  const teams = await backend.listMyTeams().catch(() => null);
  return teams && teams.length === 0 ? { pathname: '/join' } : { pathname: '/' };
}
