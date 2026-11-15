import { Linking, Platform } from 'react-native';
import { showAlert } from './dialog';
import { SITE_URL } from './links';

export { COACH_TERMS_REASON, COACH_TERMS_VERSION } from './coachTerms';

/** Legal pages on the website (SITE_URL/privacy, /terms, /consent; 2.2.1 §1.3). */
export type LegalPage = 'privacy' | 'terms' | 'consent';

export const LEGAL_TITLES: Record<LegalPage, string> = {
  privacy: 'Privacy Notice',
  terms: 'Terms',
  consent: 'Parent consent form',
};

export function legalUrl(page: LegalPage, anchor?: string): string | null {
  return SITE_URL ? `${SITE_URL}/${page}${anchor ? `#${anchor}` : ''}` : null;
}

/** Terms §4, the Coach Terms (2.2.1 §8). */
export const coachTermsUrl = () => legalUrl('terms', 'coach-terms');

/** Opens in a new tab (web) or the system browser (iPhone). */
export function openLegal(page: LegalPage, anchor?: string) {
  const url = legalUrl(page, anchor);
  if (!url) {
    showAlert(LEGAL_TITLES[page], 'Set EXPO_PUBLIC_SITE_URL (see the README) so the app can link to this page.');
    return;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  Linking.openURL(url).catch(() => showAlert(LEGAL_TITLES[page], `Open ${url} in your browser.`));
}
