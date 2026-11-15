/**
 * Public addresses (2.2.1 §1, G-7). Set at build time (the GitHub Pages workflow reads the repository variables):
 *   EXPO_PUBLIC_APP_URL       the app, https://app.approachstrength.com
 *   EXPO_PUBLIC_SITE_URL      the website with the legal pages, https://approachstrength.com
 *   EXPO_PUBLIC_APP_STORE_ID  the App Store app id (numbers only), once the app is published
 * There is no fallback address: every link comes from these settings.
 */
const trim = (u: string | undefined) => (u ?? '').trim().replace(/\/+$/, '');

export const APP_URL = trim(process.env.EXPO_PUBLIC_APP_URL);
export const SITE_URL = trim(process.env.EXPO_PUBLIC_SITE_URL);
export const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID ?? '';
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '';

/** The page a team QR code opens: the browser version's join screen with the code filled in. */
export function joinUrl(code: string): string | null {
  return APP_URL ? `${APP_URL}/join?code=${encodeURIComponent(code)}` : null;
}
