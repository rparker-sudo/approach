import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHECKLIST } from '../lib/testingContent';
import { BRAND, Button, colors, H2, Icon, Text } from './ui';

/**
 * F25a: "Before your first testing day". Full-screen sheet (centered, max 640 wide on desktop).
 * First time: "I've read this" is enabled once the coach scrolls to the end (or at once if it all fits).
 * "View again": the same sheet with a Close button.
 */
export default function TestingChecklist({ mode, onRead, onClose }: { mode: 'first' | 'again'; onRead: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [atEnd, setAtEnd] = useState(false);
  const [box, setBox] = useState(0);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <H2>{CHECKLIST.title}</H2>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
            onLayout={(e) => setBox(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => {
              if (box && h <= box + 4) setAtEnd(true);
            }}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) setAtEnd(true);
            }}
            scrollEventThrottle={100}
          >
            <Text style={{ fontSize: 16, lineHeight: 22 }}>{CHECKLIST.intro}</Text>
            {CHECKLIST.sections.map((s, i) => (
              <View key={s.title} style={{ gap: 6 }}>
                <Text style={{ fontSize: 17, fontWeight: '700' }} accessibilityRole="header">{`${i + 1}. ${s.title}`}</Text>
                {s.items.map((it) => (
                  <View key={it} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 15 }}>•</Text>
                    <Text style={{ fontSize: 15, lineHeight: 21, flex: 1 }}>{it}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: 16, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, borderRadius: BRAND.radius.sm }}>
            {mode === 'first' ? (
              <>
                <Button title="I've read this" disabled={!atEnd} onPress={onRead} />
                {!atEnd ? (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                    <Icon name="chevron.down" size={14} color={colors.muted} />
                    <Text style={{ fontSize: 12, color: colors.muted }}>Scroll to the end to continue.</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Button title="Close" onPress={onClose} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
