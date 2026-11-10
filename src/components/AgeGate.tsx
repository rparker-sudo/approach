import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ageFrom, AgeAnswer, MONTHS, yearOptions } from '../lib/age';
import { Button, colors, H1, Lockup, Screen, SelectField } from './ui';

/** "When were you born?" Month + year, both empty to start; Next stays off until both are set. */
export function AgeQuestion({ onAnswer, busy }: { onAnswer: (a: AgeAnswer) => void; busy?: boolean }) {
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  return (
    <>
      <View style={{ gap: 20, marginTop: 24, marginBottom: 8 }}>
        <Lockup badge={132} />
      </View>
      <H1>When were you born?</H1>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SelectField
          label="Month"
          placeholder="Month"
          value={month}
          options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
          onChange={setMonth}
        />
        <SelectField label="Year" placeholder="Year" value={year} options={yearOptions()} onChange={setYear} />
      </View>
      <Button
        title={busy ? 'One moment…' : 'Next'}
        disabled={month == null || year == null || busy}
        onPress={() => onAnswer(ageFrom(month!, year!))}
      />
    </>
  );
}

/** Full-screen age question (accounts and devices set up before 2.1). */
export function AgeQuestionScreen(props: { onAnswer: (a: AgeAnswer) => void; busy?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Screen>
        <AgeQuestion {...props} />
      </Screen>
    </SafeAreaView>
  );
}

/** Neutral block screen. No actions, no mention of age. */
export function NotEligible() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <Screen>
        <View style={{ gap: 24, marginTop: 48 }}>
          <Lockup badge={132} />
          <H1>Sorry, you're not eligible to use Approach right now.</H1>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
