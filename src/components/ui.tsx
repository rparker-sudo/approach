import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Image,
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { BRAND, colors, display, fonts } from '../lib/theme';

export { colors, fonts, display, BRAND };

/* ---------- Text: brand fonts + tabular numbers everywhere ---------- */

function familyFor(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return fonts.medium;
    case '600':
    case '700':
    case '800':
    case '900':
    case 'bold':
      return fonts.semibold;
    default:
      return fonts.regular;
  }
}

/** Converts fontWeight into the matching bundled Inter file (custom fonts need one family per weight). */
function brandText(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat;
  return {
    color: colors.ink,
    fontFamily: rest.fontFamily ?? familyFor(fontWeight),
    fontVariant: ['tabular-nums'],
    ...rest,
  };
}

export function Text(props: TextProps) {
  return <RNText {...props} style={brandText(props.style)} />;
}

export function TextInput(props: TextInputProps) {
  return (
    <RNTextInput
      placeholderTextColor={colors.faint}
      keyboardAppearance={colors.mode}
      selectionColor={colors.ink}
      {...props}
      style={brandText([inputStyle(), props.style])}
    />
  );
}

/* ---------- Brand marks ---------- */

const MARK = { dark: require('../../assets/brand/mark-dark.png'), light: require('../../assets/brand/mark-light.png') };
const BADGE = { dark: require('../../assets/brand/badge-dark.png'), light: require('../../assets/brand/badge-light.png') };
const NET_TAPE = require('../../assets/brand/net-tape.png');

/** Barbell + chevron, no ball. For small sizes (headers). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return <Image source={MARK[colors.mode]} style={{ width: size, height: size }} accessibilityLabel={BRAND.name} />;
}

/** Mark inside the volleyball. For splash, onboarding, about. */
export function BrandBadge({ size = 120 }: { size?: number }) {
  return <Image source={BADGE[colors.mode]} style={{ width: size, height: size }} accessibilityLabel={BRAND.name} />;
}

/** "LOAD & LAUNCH" with the ampersand in steel. */
export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <Text style={display(size)} accessibilityLabel={BRAND.name}>
      LOAD <Text style={[display(size), { color: colors.muted }]}>&amp;</Text> LAUNCH
    </Text>
  );
}

export function Lockup({ badge = 120 }: { badge?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <BrandBadge size={badge} />
      <Wordmark size={24} />
      <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{BRAND.tagline}</Text>
    </View>
  );
}

/** White tape over dark mesh. Max one per screen. */
export function NetTape({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ height: 40, overflow: 'hidden', borderRadius: BRAND.radius.sm }, style]} accessibilityElementsHidden importantForAccessibility="no">
      <Image source={NET_TAPE} resizeMode="repeat" style={{ width: '100%', height: 40 }} />
    </View>
  );
}

/* ---------- Layout ---------- */

/** SF Symbol (iOS) → Material Symbols Outlined (browser/Android). Same outline style on both. */
const WEB_ICON: Partial<Record<string, AndroidSymbol>> = {
  'person.3': 'groups',
  dumbbell: 'fitness_center',
  'fork.knife': 'restaurant',
  calendar: 'calendar_month',
  volleyball: 'sports_volleyball',
  gearshape: 'settings',
  'chevron.right': 'chevron_right',
  'chevron.up': 'expand_less',
  'chevron.down': 'expand_more',
  checkmark: 'check',
  'checkmark.circle': 'check_circle',
  'play.fill': 'play_arrow',
  'wand.and.stars': 'auto_awesome',
  plus: 'add',
  'square.and.arrow.up': 'ios_share',
  'square.and.arrow.down': 'download',
  'arrow.triangle.2.circlepath': 'autorenew',
};

export function Icon({ name, size = 22, color }: { name: SFSymbol; size?: number; color?: string }) {
  return (
    <SymbolView
      name={{ ios: name, android: WEB_ICON[name], web: WEB_ICON[name] }}
      size={size}
      tintColor={color ?? colors.ink}
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

/** `tab` = top-level tab screen with no navigation bar, so pad for the notch. */
export function Screen({ children, style, tab }: { children: ReactNode; style?: StyleProp<ViewStyle>; tab?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 48, gap: 16 }, tab && { paddingTop: insets.top + 12 }, style]}
      contentInsetAdjustmentBehavior={tab ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      indicatorStyle={colors.mode === 'dark' ? 'white' : 'black'}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: BRAND.radius.lg,
          padding: 16,
          gap: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Screen title: display style. */
export function H1({ children }: { children: ReactNode }) {
  return <Text style={display(24)}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink }}>{children}</Text>;
}
/** Short section header: display style, small. */
export function Label({ children }: { children: ReactNode }) {
  return <Text style={[display(12), { color: colors.muted }]}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontSize: 16, lineHeight: 22, color: muted ? colors.muted : colors.ink }, style]}>{children}</Text>;
}

/** Header title for stack screens. */
export function DisplayTitle({ children }: { children: ReactNode }) {
  return (
    <Text numberOfLines={1} style={display(16)}>
      {children}
    </Text>
  );
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
  const bg = kind === 'primary' ? colors.primaryBg : kind === 'secondary' ? colors.raised : 'transparent';
  const fg = kind === 'primary' ? colors.primaryText : kind === 'danger' ? colors.error : colors.ink;
  const border = kind === 'primary' ? colors.primaryBg : kind === 'danger' ? colors.error : colors.line;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: BRAND.radius.md,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ fontSize: small ? 13 : 16, fontWeight: '600', color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BRAND.radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primaryBg : colors.line,
        backgroundColor: selected ? colors.primaryBg : colors.card,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '500', color: selected ? colors.primaryText : colors.ink }}>{label}</Text>
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
      aria-selected={selected}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: BRAND.radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.ink : colors.line,
        backgroundColor: selected ? colors.raised : colors.card,
      }}
    >
      {icon ? <Icon name={icon} size={26} color={selected ? colors.ink : colors.muted} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {selected ? <Icon name="checkmark.circle" size={22} color={colors.ink} /> : null}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput {...rest} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = {
    width: 34,
    height: 34,
    borderRadius: BRAND.radius.sm,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable accessibilityLabel="Decrease" onPress={() => onChange(Math.max(min, value - 1))} style={btn}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>−</Text>
      </Pressable>
      <Text style={{ minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{value}</Text>
      <Pressable accessibilityLabel="Increase" onPress={() => onChange(Math.min(max, value + 1))} style={btn}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>+</Text>
      </Pressable>
    </View>
  );
}

/** Small tag. `achievement` uses chrome: only for done/PR/streak moments. */
export function Pill({ text, achievement, bg }: { text: string; achievement?: boolean; bg?: string }) {
  return (
    <View
      style={{
        backgroundColor: achievement ? colors.achievement : bg ?? colors.raised,
        borderRadius: BRAND.radius.pill,
        borderWidth: achievement || bg ? 0 : 1,
        borderColor: colors.line,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: achievement ? colors.bg : colors.ink, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

/** Guidance note (not an error or warning: those use the status colors). */
export function Note({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.raised,
        padding: 12,
        borderRadius: BRAND.radius.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.ink,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '500' }}>{children}</Text>
    </View>
  );
}

function inputStyle(): TextStyle {
  return {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: BRAND.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.card,
  };
}
