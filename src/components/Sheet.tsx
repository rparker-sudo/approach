import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND, colors, H2 } from './ui';

/** Bottom sheet (same look as the calendar day sheet). Tapping outside closes it. */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: BRAND.radius.lg,
          borderTopRightRadius: BRAND.radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          maxHeight: '85%',
          width: '100%',
          maxWidth: 640,
          alignSelf: 'center',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 20 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <H2>{title}</H2>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
