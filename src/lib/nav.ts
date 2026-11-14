import { router } from 'expo-router';

/** Back, or (after a browser refresh, a link or a new tab, when there's no history) to `fallback`. */
export function goBack(fallback: string = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
