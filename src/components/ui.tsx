import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#F3F5F9',
  card: '#FFFFFF',
  ink: '#0E1B2C',
  muted: '#5D6B7E',
  faint: '#9AA6B5',
  line: '#E3E8EF',
  navy: '#12355B',
  accent: '#F26B1D',
  accentSoft: '#FDEBDD',
  good: '#1F9D6B',
  goodSoft: '#DDF3EA',
  warn: '#B7791F',
  warnSoft: '#FCF1DC',
  danger: '#C53030',
  day: {
    off: '#E9EDF3',
    practice: '#DCE8F7',
    game: '#FDEBDD',
    tournament: '#FAD9C4',
  },
};

export function Icon({ name, size = 22, color = colors.ink }: { name: SFSymbol; size?: number; color?: string }) {
  return <SymbolView name={name} size={size} tintColor={color} fallback={<View style={{ width: size, height: size }} />} />;
}

/** `tab` = top-level tab screen with no navigation bar, so pad for the notch. */
export function Screen({ children, style, tab }: { children: ReactNode; style?: StyleProp<ViewStyle>; tab?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 48, gap: 14 }, tab && { paddingTop: insets.top + 12 }, style]}
      contentInsetAdjustmentBehavior={tab ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<any> }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: SFSymbol;
  disabled?: boolean;
  small?: boolean;
}) {
  const bg =
    kind === 'primary' ? colors.accent : kind === 'secondary' ? colors.navy : kind === 'danger' ? '#FDE2E2' : 'transparent';
  const fg = kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.navy : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.line },
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.navy, borderColor: colors.navy }]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

export function OptionCard({
  title,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  icon?: SFSymbol;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
    >
      {icon ? <Icon name={icon} size={26} color={selected ? colors.accent : colors.navy} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput placeholderTextColor={colors.faint} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Decrease" onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <Text style={styles.stepTxt}>−</Text>
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable accessibilityLabel="Increase" onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
        <Text style={styles.stepTxt}>+</Text>
      </Pressable>
    </View>
  );
}

export function Pill({ text, color = colors.navy, bg = colors.line }: { text: string; color?: string; bg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  optionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  optionSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 20, fontWeight: '700', color: colors.navy },
  stepVal: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
});
