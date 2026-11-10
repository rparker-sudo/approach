import { Member, Perms, PERM_KEYS } from '../lib/backend';
import { openLegal } from '../lib/legal';
import { Banner } from './ui';

/** Minor athlete on a team whose parent consent isn't recorded yet (F2). */
export function ConsentBanner() {
  return (
    <Banner action={{ label: 'See the form', onPress: () => openLegal('consent') }}>
      Waiting for your parent&apos;s consent form. Your coach needs it before you can log. Ask your coach for the form.
    </Banner>
  );
}

/** Names for Settings → Your data (P1.6). */
export const PERM_LABELS: Record<keyof Perms, string> = {
  participation: 'Participation',
  checkins: 'Check-ins',
  shareCheckins: 'Share check-ins with my coach',
  boards: 'Team boards',
  attendance: 'Attendance & hours',
  testing: 'Testing days',
};

export function permCount(p: Perms) {
  return PERM_KEYS.filter((k) => p[k]).length;
}

/** Coach roster chips (F7). Adults show nothing. A form v1 record also gets a muted note. */
export function rosterChips(m: Member): { label: string; tone: 'warning' | 'muted' }[] {
  if (m.isMinor === false) return [];
  if (!m.perms.participation) return [{ label: 'Consent needed', tone: 'warning' }];
  const n = permCount(m.perms);
  const chips: { label: string; tone: 'warning' | 'muted' }[] = [{ label: n === 6 ? 'Consent: all' : `Consent: ${n} of 6`, tone: 'muted' }];
  if (m.consentVersion === 1) chips.push({ label: 'Form v2 needed for boards & testing', tone: 'muted' });
  return chips;
}
