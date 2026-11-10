import type { ConsentStatus } from '../lib/backend';
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

/** Settings → Your data line for an athlete. Null for adults. */
export function myConsentLine(status: ConsentStatus | undefined): string | null {
  switch (status) {
    case 'pending':
      return 'Parent consent: waiting';
    case 'training_only':
      return 'Parent consent: training only';
    case 'full':
      return 'Parent consent: training and check-ins';
    default:
      return null;
  }
}

/** Coach roster chip (F3). Null for adults. */
export function rosterChip(status: ConsentStatus): { label: string; tone: 'warning' | 'muted' } | null {
  switch (status) {
    case 'pending':
      return { label: 'Consent needed', tone: 'warning' };
    case 'training_only':
      return { label: 'Training only', tone: 'muted' };
    case 'full':
      return { label: 'Full', tone: 'muted' };
    default:
      return null;
  }
}
