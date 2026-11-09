/**
 * Public links for invites. Set in .env (or the GitHub Pages build settings):
 *   EXPO_PUBLIC_APP_URL       e.g. https://yourname.github.io/load-and-launch
 *   EXPO_PUBLIC_APP_STORE_ID  the App Store app id (numbers only), once the app is published
 */
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
export const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID ?? '';
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '';

/** The page a team QR code opens: the browser version's join screen with the code filled in. */
export function joinUrl(code: string): string | null {
  return APP_URL ? `${APP_URL}/join?code=${encodeURIComponent(code)}` : null;
}
