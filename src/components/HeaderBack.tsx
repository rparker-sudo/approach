import { router, useGlobalSearchParams } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { colors, Icon } from './ui';

/**
 * Header back button on every stacked screen. With history it goes back; on a fresh load (a browser refresh, a
 * link, a QR code or a new tab) there's no history, so it goes to the team page for team screens, otherwise Home.
 */
export default function HeaderBack() {
  const { teamId } = useGlobalSearchParams<{ teamId?: string }>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(typeof teamId === 'string' && teamId ? `/team/${teamId}` : '/');
      }}
      style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: Platform.OS === 'web' ? 12 : 0 }}
    >
      <Icon name="chevron.left" size={22} color={colors.ink} />
    </Pressable>
  );
}
