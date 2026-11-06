import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BrandMark, colors, H1, Icon, Row, Text } from './ui';

export default function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Row style={{ flex: 1, gap: 10 }}>
        <BrandMark size={36} />
        <View style={{ flex: 1 }}>
          <H1>{title}</H1>
          {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </Row>
      <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={10}>
        <Icon name="gearshape" color={colors.muted} size={22} />
      </Pressable>
    </Row>
  );
}
