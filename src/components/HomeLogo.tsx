import { router } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { BrandMark } from './ui';

/** The Approach Strength mark on every page; tapping it goes to the home screen (Lift / team home). */
export default function HomeLogo({ size = 28, onPress }: { size?: number; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Approach Strength home"
      hitSlop={8}
      onPress={onPress ?? (() => router.dismissTo('/'))}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Platform.OS === 'web' ? 12 : 0 }}
    >
      <BrandMark size={size} />
    </Pressable>
  );
}
