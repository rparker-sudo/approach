import { Linking, Platform } from 'react-native';
import { showAlert } from './dialog';
import { APP_URL } from './links';

/** Static legal pages in public/ (served next to the web app by GitHub Pages). */
export type LegalPage = 'privacy' | 'terms' | 'consent';

export const LEGAL_TITLES: Record<LegalPage, string> = {
  privacy: 'Privacy Notice',
  terms: 'Terms',
  consent: 'Parent consent form',
};

export function legalUrl(page: LegalPage): string | null {
  if (APP_URL) return `${APP_URL}/${page}.html`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/${page}.html`;
  return null;
}

/** Opens in a new tab (web) or the system browser (iPhone). */
export function openLegal(page: LegalPage) {
  const url = legalUrl(page);
  if (!url) {
    showAlert(LEGAL_TITLES[page], 'Set EXPO_PUBLIC_APP_URL (see the README) so the app can link to this page.');
    return;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  Linking.openURL(url).catch(() => showAlert(LEGAL_TITLES[page], `Open ${url} in your browser.`));
}
